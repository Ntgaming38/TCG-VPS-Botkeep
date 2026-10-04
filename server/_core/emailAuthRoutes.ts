import { randomUUID } from "node:crypto";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { COOKIE_NAME, DEFAULT_SESSION_MS, REMEMBERED_SESSION_MS } from "@shared/const";
import { EMAIL_CODE_MAX_ATTEMPTS, EMAIL_CODE_RESEND_DELAY_MS, EMAIL_CODE_TTL_MS, generateEmailCode, hashEmailCode, verifyEmailCodeHash } from "./emailCodes";
import { ENV } from "./env";
import { sendAuthCodeEmail, isEmailSenderConfigured } from "./emailSender";
import { getSessionCookieOptions } from "./cookies";
import { hashPassword, verifyPassword } from "./passwordAuth";
import { sdk } from "./sdk";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function codeDigest(email: string, purpose: db.EmailAuthPurpose, code: string) {
  return hashEmailCode(email, purpose, code, ENV.emailCodeSecret);
}

function sendSession(req: Request, res: Response, user: NonNullable<Awaited<ReturnType<typeof db.getUserByOpenId>>>, rememberMe: boolean) {
  const expiresInMs = rememberMe ? REMEMBERED_SESSION_MS : DEFAULT_SESSION_MS;
  return sdk.createSessionToken(user.openId, {
    name: user.name || user.email || "User",
    sessionVersion: user.sessionVersion,
    expiresInMs,
  }).then((token) => {
    res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), ...(rememberMe ? { maxAge: expiresInMs } : {}) });
  });
}

async function issueCode(input: {
  email: string;
  purpose: db.EmailAuthPurpose;
  name?: string | null;
  passwordHash?: string | null;
  rememberMe?: boolean;
}) {
  const now = new Date();
  const previous = await db.getEmailAuthChallenge(input.email, input.purpose);
  if (previous && now.getTime() - previous.createdAt.getTime() < EMAIL_CODE_RESEND_DELAY_MS) {
    return "cooldown" as const;
  }

  const code = generateEmailCode();
  await db.upsertEmailAuthChallenge({
    email: input.email,
    purpose: input.purpose,
    name: input.name,
    passwordHash: input.passwordHash,
    rememberMe: input.rememberMe ? 1 : 0,
    codeHash: codeDigest(input.email, input.purpose, code),
    expiresAt: new Date(now.getTime() + EMAIL_CODE_TTL_MS),
    createdAt: now,
  });
  try {
    await sendAuthCodeEmail(input.email, code, input.purpose);
  } catch (error) {
    await db.deleteEmailAuthChallenge(input.email, input.purpose);
    throw error;
  }
  return "sent" as const;
}

async function validateCode(email: string, purpose: db.EmailAuthPurpose, code: unknown) {
  const challenge = await db.getEmailAuthChallenge(email, purpose);
  if (!challenge) return { error: "Mã không đúng hoặc đã hết hạn." };
  if (challenge.expiresAt.getTime() <= Date.now()) {
    await db.deleteEmailAuthChallenge(email, purpose);
    return { error: "Mã đã hết hạn. Hãy yêu cầu mã mới." };
  }
  if (challenge.attempts >= EMAIL_CODE_MAX_ATTEMPTS) {
    return { error: "Bạn đã nhập sai quá nhiều lần. Hãy yêu cầu mã mới." };
  }
  if (typeof code !== "string" || !/^\d{6}$/.test(code) || !verifyEmailCodeHash(challenge.codeHash, codeDigest(email, purpose, code))) {
    await db.incrementEmailAuthAttempts(challenge.id);
    return { error: "Mã không đúng hoặc đã hết hạn." };
  }
  return { challenge };
}

function databaseUnavailable(error: unknown) {
  return (error as { cause?: { code?: string }; code?: string })?.cause?.code === "ER_NO_SUCH_TABLE" ||
    (error as { code?: string })?.code === "ER_NO_SUCH_TABLE";
}

export function registerEmailAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!name || name.length > 100) return res.status(400).json({ error: "Tên phải từ 1 đến 100 ký tự" });
    if (email.length > 320 || !EMAIL_PATTERN.test(email)) return res.status(400).json({ error: "Email không hợp lệ" });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: "Mật khẩu cần từ 8 đến 128 ký tự" });
    if (email === ENV.adminEmail.trim().toLowerCase()) return res.status(409).json({ error: "Email quản trị dành riêng cho đăng nhập quản trị" });
    if (!isEmailSenderConfigured()) return res.status(503).json({ error: "Máy chủ chưa cấu hình Gmail SMTP để gửi mã xác nhận." });

    try {
      if (await db.getAuthCredentialByEmail(email)) return res.status(409).json({ error: "Email đã được đăng ký" });
      const outcome = await issueCode({
        email,
        purpose: "registration",
        name,
        passwordHash: await hashPassword(password),
        rememberMe: req.body?.rememberMe === true,
      });
      if (outcome === "cooldown") return res.status(429).json({ error: "Vui lòng đợi 60 giây trước khi gửi lại mã." });
      return res.status(202).json({ ok: true });
    } catch (error) {
      if (databaseUnavailable(error)) return res.status(503).json({ error: "Database chưa có bảng email auth. Cần áp dụng migration trước." });
      console.error("[EmailAuth] registration code delivery failed", error);
      return res.status(503).json({ error: "Không gửi được email. Kiểm tra cấu hình Gmail SMTP trên server." });
    }
  });

  app.post("/api/auth/register/verify", async (req: Request, res: Response) => {
    const email = normalizeEmail(req.body?.email);
    const code = req.body?.code;
    if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: "Email không hợp lệ" });
    try {
      const result = await validateCode(email, "registration", code);
      const challenge = result.challenge;
      if (!challenge) return res.status(400).json({ error: result.error || "Mã không đúng hoặc đã hết hạn." });
      if (!challenge.name || !challenge.passwordHash) return res.status(400).json({ error: "Yêu cầu đăng ký đã hết hạn. Hãy đăng ký lại." });

      const user = await db.createLocalAccount({
        openId: `local_${randomUUID()}`,
        name: challenge.name,
        email,
        passwordHash: challenge.passwordHash,
      });
      await db.deleteEmailAuthChallenge(email, "registration");
      await db.recordLoginEvent(user.id, "password");
      await sendSession(req, res, user, challenge.rememberMe === 1);
      return res.status(201).json({ ok: true });
    } catch (error) {
      if ((error as { code?: string })?.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Email đã được đăng ký" });
      if (databaseUnavailable(error)) return res.status(503).json({ error: "Database chưa có bảng email auth. Cần áp dụng migration trước." });
      console.error("[EmailAuth] registration verification failed", error);
      return res.status(500).json({ error: "Không thể xác nhận tài khoản." });
    }
  });

  app.post("/api/auth/password/forgot", async (req: Request, res: Response) => {
    const email = normalizeEmail(req.body?.email);
    if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: "Email không hợp lệ" });
    if (!isEmailSenderConfigured()) return res.status(503).json({ error: "Máy chủ chưa cấu hình Gmail SMTP để gửi mã." });
    try {
      const credential = await db.getAuthCredentialByEmail(email);
      if (credential) {
        const outcome = await issueCode({ email, purpose: "password_reset" });
        if (outcome === "cooldown") return res.json({ ok: true });
      }
      return res.json({ ok: true });
    } catch (error) {
      if (databaseUnavailable(error)) return res.status(503).json({ error: "Database chưa có bảng email auth. Cần áp dụng migration trước." });
      console.error("[EmailAuth] password reset code delivery failed", error);
      return res.status(503).json({ error: "Không gửi được email. Kiểm tra cấu hình Gmail SMTP trên server." });
    }
  });

  app.post("/api/auth/password/reset", async (req: Request, res: Response) => {
    const email = normalizeEmail(req.body?.email);
    const code = req.body?.code;
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: "Email không hợp lệ" });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: "Mật khẩu cần từ 8 đến 128 ký tự" });
    try {
      const result = await validateCode(email, "password_reset", code);
      if (result.error) return res.status(400).json({ error: result.error });
      const updated = await db.completeEmailPasswordReset(email, await hashPassword(password));
      await db.deleteEmailAuthChallenge(email, "password_reset");
      if (!updated) return res.status(400).json({ error: "Mã không đúng hoặc đã hết hạn." });
      return res.json({ ok: true });
    } catch (error) {
      if (databaseUnavailable(error)) return res.status(503).json({ error: "Database chưa có bảng email auth. Cần áp dụng migration trước." });
      console.error("[EmailAuth] password reset failed", error);
      return res.status(500).json({ error: "Không thể đặt lại mật khẩu." });
    }
  });
}