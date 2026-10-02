import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { parse as parseCookieHeader } from "cookie";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

const GOOGLE_STATE_COOKIE = "tcg_google_oauth_state";
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

function safeEqual(left: string, right: string) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function loginError(res: Response, reason: string) {
  return res.redirect(302, `/login?authError=${encodeURIComponent(reason)}`);
}

function isGoogleConfigured() {
  return Boolean(ENV.googleClientId && ENV.googleClientSecret && ENV.googleRedirectUri);
}

export function registerGoogleAuthRoutes(app: Express) {
  app.get("/api/auth/google", (req: Request, res: Response) => {
    if (!isGoogleConfigured()) return loginError(res, "google_not_configured");

    const state = randomBytes(32).toString("hex");
    res.cookie(GOOGLE_STATE_COOKIE, state, {
      ...getSessionCookieOptions(req),
      sameSite: "lax",
      maxAge: STATE_MAX_AGE_MS,
    });

    const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorizationUrl.search = new URLSearchParams({
      client_id: ENV.googleClientId,
      redirect_uri: ENV.googleRedirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    }).toString();
    return res.redirect(302, authorizationUrl.toString());
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const cookies = parseCookieHeader(req.headers.cookie ?? "");
    const expectedState = cookies[GOOGLE_STATE_COOKIE];
    const receivedState = typeof req.query.state === "string" ? req.query.state : "";
    res.clearCookie(GOOGLE_STATE_COOKIE, {
      ...getSessionCookieOptions(req),
      sameSite: "lax",
    });

    if (!isGoogleConfigured()) return loginError(res, "google_not_configured");
    if (!expectedState || !receivedState || !safeEqual(expectedState, receivedState)) {
      return loginError(res, "google_state_invalid");
    }
    if (typeof req.query.error === "string" || typeof req.query.code !== "string") {
      return loginError(res, "google_cancelled");
    }

    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: req.query.code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: ENV.googleRedirectUri,
          grant_type: "authorization_code",
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const tokenData = await tokenResponse.json() as { id_token?: unknown };
      if (!tokenResponse.ok || typeof tokenData.id_token !== "string") {
        return loginError(res, "google_token_failed");
      }

      const { payload } = await jwtVerify(tokenData.id_token, GOOGLE_JWKS, {
        audience: ENV.googleClientId,
        issuer: ["https://accounts.google.com", "accounts.google.com"],
      });
      const subject = typeof payload.sub === "string" ? payload.sub : "";
      const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
      const emailVerified = payload.email_verified === true || payload.email_verified === "true";
      if (!subject || !email || !emailVerified) return loginError(res, "google_email_unverified");

      const isAdmin = email === ENV.adminEmail.trim().toLowerCase();
      const googleOpenId = `google_${createHash("sha256").update(subject).digest("hex").slice(0, 57)}`;
      const openId = isAdmin ? ENV.adminOpenId : googleOpenId;
      await db.upsertUser({
        openId,
        name: typeof payload.name === "string" ? payload.name : email,
        email,
        loginMethod: "google",
        lastSignedIn: new Date(),
        role: isAdmin ? "admin" : "user",
      });
      const user = await db.getUserByOpenId(openId);
      if (!user) return loginError(res, "google_account_failed");

      await db.recordLoginEvent(user.id, "google");
      const sessionToken = await sdk.createSessionToken(openId, {
        name: user.name || email,
        sessionVersion: user.sessionVersion,
        expiresInMs: ONE_YEAR_MS,
      });
      res.cookie(COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_MS,
      });
      return res.redirect(302, "/thong-ke");
    } catch (error) {
      console.error("[GoogleAuth] callback failed", error);
      return loginError(res, "google_callback_failed");
    }
  });
}