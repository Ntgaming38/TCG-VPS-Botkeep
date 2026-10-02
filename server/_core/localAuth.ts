import type { Express, Request, Response } from "express";
import { randomUUID, timingSafeEqual } from "node:crypto";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { hashPassword, verifyPassword } from "./passwordAuth";

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function registerLocalAuthRoutes(app: Express) {
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body ?? {};
      if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ error: "Thiếu email/password" });
      }
      const normalizedEmail = email.trim().toLowerCase();
      let user: Awaited<ReturnType<typeof db.getUserByOpenId>>;

      if (
        ENV.adminPassword &&
        normalizedEmail === ENV.adminEmail.trim().toLowerCase() &&
        safeEqual(password, ENV.adminPassword)
      ) {
        const openId = ENV.adminOpenId;
        await db.upsertUser({
          openId,
          name: "Admin",
          email: ENV.adminEmail,
          loginMethod: "local",
          lastSignedIn: new Date(),
          role: "admin",
        });
        user = await db.getUserByOpenId(openId);
      } else {
        const credential = await db.getAuthCredentialByEmail(normalizedEmail);
        if (!credential || !(await verifyPassword(password, credential.passwordHash))) {
          return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
        }
        user = await db.getUserById(credential.userId);
        if (!user) return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
        await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        user = await db.getUserByOpenId(user.openId);
        await db.recordLoginEvent(credential.userId, "password");
      }

      if (!user) return res.status(500).json({ error: "Không thể tạo phiên đăng nhập" });
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "User",
        sessionVersion: user.sessionVersion ?? 0,
        expiresInMs: ONE_YEAR_MS,
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return res.json({ ok: true });
    } catch (e: any) {
      console.error("[LocalAuth] login failed", e?.cause ?? e);
      const root = e?.cause?.message || e?.message || String(e);
      return res.status(500).json({ error: `Login failed: ${root}` });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      if (!name || name.length > 100) return res.status(400).json({ error: "Tên phải từ 1 đến 100 ký tự" });
      if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Email không hợp lệ" });
      }
      if (password.length < 12 || password.length > 128) {
        return res.status(400).json({ error: "Mật khẩu cần từ 12 đến 128 ký tự" });
      }
      if (email === ENV.adminEmail.trim().toLowerCase()) {
        return res.status(409).json({ error: "Email quản trị dành riêng cho đăng nhập quản trị" });
      }
      if (await db.getAuthCredentialByEmail(email)) {
        return res.status(409).json({ error: "Email đã được đăng ký" });
      }

      const user = await db.createLocalAccount({
        openId: `local_${randomUUID()}`,
        name,
        email,
        passwordHash: await hashPassword(password),
      });
      await db.recordLoginEvent(user.id, "password");
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || name,
        sessionVersion: user.sessionVersion,
        expiresInMs: ONE_YEAR_MS,
      });
      res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      return res.status(201).json({ ok: true });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Email đã được đăng ký" });
      console.error("[LocalAuth] registration failed", error);
      return res.status(500).json({ error: "Không thể tạo tài khoản" });
    }
  });

  app.post("/api/auth/logout", async (_req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    return res.json({ ok: true });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (user.isCron) return res.status(403).json({ error: "cron-only" });
      return res.json({ user });
    } catch {
      return res.status(401).json({ error: "unauthorized" });
    }
  });
}
