import type { Express, Request, Response } from "express";
import { randomUUID, timingSafeEqual } from "node:crypto";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";
import { COOKIE_NAME, DEFAULT_SESSION_MS, REMEMBERED_SESSION_MS } from "@shared/const";
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
      const rememberMe = req.body?.rememberMe === true;
      const expiresInMs = rememberMe ? REMEMBERED_SESSION_MS : DEFAULT_SESSION_MS;
      if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ error: "Thiếu email/password" });
      }
      const normalizedEmail = email.trim().toLowerCase();
      let user: Awaited<ReturnType<typeof db.getUserByOpenId>>;

      if (normalizedEmail === ENV.adminEmail.trim().toLowerCase()) {
        const existingAdmin = await db.getUserByOpenId(ENV.adminOpenId);
        const adminCredential = existingAdmin ? await db.getAuthCredentialByUserId(existingAdmin.id) : undefined;
        if (adminCredential) {
          if (!(await verifyPassword(password, adminCredential.passwordHash))) {
            return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
          }
        } else if (!ENV.adminPassword || !safeEqual(password, ENV.adminPassword)) {
          return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
        }

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
        if (user && !adminCredential) {
          await db.upsertAuthCredential(user.id, ENV.adminEmail.trim().toLowerCase(), await hashPassword(password));
        }
        if (user) await db.recordLoginEvent(user.id, "password");
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
        expiresInMs,
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, ...(rememberMe ? { maxAge: expiresInMs } : {}) });
      return res.json({ ok: true });
    } catch (e: any) {
      console.error("[LocalAuth] login failed", e?.cause ?? e);
      const root = e?.cause?.message || e?.message || String(e);
      return res.status(500).json({ error: `Login failed: ${root}` });
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
