import { randomUUID } from "node:crypto";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { COOKIE_NAME, DEFAULT_SESSION_MS, REMEMBERED_SESSION_MS } from "@shared/const";
import { ENV } from "./env";
import { getSessionCookieOptions } from "./cookies";
import { hashPassword } from "./passwordAuth";
import { consumeEmailOtp, isEmailOtpConfigured, issueEmailOtp } from "./emailOtp";
import { sdk } from "./sdk";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
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

export function registerEmailAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const rememberMe = req.body?.rememberMe === true;
    if (!name || name.length > 100) return res.status(400).json({ error: "Tên hiển thị không hợp lệ" });
    if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: "Email không hợp lệ" });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: "Mật khẩu cần từ 8 đến 128 ký tự" });
    if (email === ENV.adminEmail.trim().toLowerCase()) return res.status(409).json({ error: "Email quản trị dành riêng cho đăng nhập quản trị" });
    try {
      if (await db.getAuthCredentialByEmail(email)) return res.status(409).json({ error: "Email đã được đăng ký" });
      const user = await db.createLocalAccount({
        openId: "local_" + randomUUID(),
        name,
        email,
        passwordHash: await hashPassword(password),
      });
      await db.recordLoginEvent(user.id, "password");
      await sendSession(req, res, user, rememberMe);
      return res.status(201).json({ ok: true });
    } catch (error) {
      if ((error as { code?: string })?.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Email đã được đăng ký" });
      console.error("[EmailAuth] direct registration failed", error);
      return res.status(500).json({ error: "Không thể tạo tài khoản." });
    }
  });
  app.post("/api/auth/register/verify", (_req: Request, res: Response) => {
    return res.status(410).json({ error: "Đăng ký dùng mã xác nhận đã được thay bằng đăng ký trực tiếp email + mật khẩu." });
  });
  app.post("/api/auth/password/forgot", async (req: Request, res: Response) => {
    const email = normalizeEmail(req.body?.email);
    if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: "Email không hợp lệ" });
    if (!isEmailOtpConfigured()) return res.status(503).json({ error: "Máy chủ chưa cấu hình Gmail nên chưa gửi được mã xác nhận." });
    try {
      const credential = await db.getAuthCredentialByEmail(email);
      if (!credential) return res.status(404).json({ error: "Email chưa được đăng ký tài khoản" });
      await issueEmailOtp(email, "password_reset");
      return res.json({ ok: true });
    } catch (error) {
      console.error("[EmailAuth] forgot password failed", error);
      return res.status(500).json({ error: error instanceof Error ? error.message : "Không thể gửi mã xác nhận." });
    }
  });
  app.post("/api/auth/password/reset", async (req: Request, res: Response) => {
    const email = normalizeEmail(req.body?.email);
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: "Email không hợp lệ" });
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: "Mã xác nhận gồm 6 chữ số" });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: "Mật khẩu mới cần từ 8 đến 128 ký tự" });
    try {
      const credential = await db.getAuthCredentialByEmail(email);
      if (!credential) return res.status(404).json({ error: "Email chưa được đăng ký tài khoản" });
      await consumeEmailOtp(email, "password_reset", code);
      await db.upsertAuthCredential(credential.userId, email, await hashPassword(password));
      await db.revokeAllUserSessions(credential.userId);
      return res.json({ ok: true });
    } catch (error) {
      console.error("[EmailAuth] reset password failed", error);
      return res.status(400).json({ error: error instanceof Error ? error.message : "Không thể đặt lại mật khẩu." });
    }
  });
}
