import type { Express, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

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
      if (!ENV.adminPassword) {
        return res.status(500).json({ error: "ADMIN_PASSWORD chưa cấu hình trên server" });
      }
      if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ error: "Thiếu email/password" });
      }
      if (email.trim().toLowerCase() !== ENV.adminEmail.toLowerCase() || !safeEqual(password, ENV.adminPassword)) {
        return res.status(401).json({ error: "Sai email hoặc mật khẩu" });
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
      const user = await db.getUserByOpenId(openId);
      const sessionToken = await sdk.createSessionToken(openId, {
        name: user?.name || "Admin",
        sessionVersion: user?.sessionVersion ?? 0,
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
