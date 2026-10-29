import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "node:path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerLocalAuthRoutes } from "./localAuth";
import { registerEmailAuthRoutes } from "./emailAuthRoutes";
import { registerGoogleAuthRoutes } from "./googleAuth";
import { registerStorageProxy } from "./storageProxy";
import { ENV } from "./env";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { createResponseCompression } from "./responseCompression";
import { storagePut } from "../storage";
import { sdk } from "./sdk";
import { runChyusenMonitor } from "../chyusenMonitor";
import { runMarketplaceAutoSync } from "../marketplaceMonitor";
import { runSnkrShopAutoSync } from "../snkrShopDb";
import { runTrashAutoCleanup } from "../trashAutoCleanup";
import { runScheduledAutoBackup } from "../backupScheduler";
import { startInternalScheduler } from "../internalScheduler";
import { runActivityLogCleanup } from "../activityLogCleanup";
import { validateProductImageUpload } from "../uploadImage";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Compress responses (gzip) — the SPA bundle is ~3 MB of JS and the host
  // connection is slow; this must wrap every route/static handler below.
  app.use(createResponseCompression());
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Serve local uploads (self-host). Forge proxy kept for old Manus data.
  app.use("/uploads", express.static(path.resolve(ENV.storageDir)));
  registerStorageProxy(app);
  registerLocalAuthRoutes(app);
  registerEmailAuthRoutes(app);
  registerGoogleAuthRoutes(app);
  if (ENV.oAuthServerUrl) registerOAuthRoutes(app);

  function checkCron(req: any): boolean {
    if (ENV.cronSecret && req.headers["x-cron-secret"] === ENV.cronSecret) return true;
    return false;
  }

  app.post("/api/scheduled/chyusen-monitor", async (req, res) => {
    try {
      if (checkCron(req)) {
        const summary = await runChyusenMonitor("selfhost-cron");
        return res.json({ ok: true, ...summary, timestamp: new Date().toISOString() });
      }
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const summary = await runChyusenMonitor(user.taskUid);
      return res.json({ ok: true, ...summary, timestamp: new Date().toISOString() });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Chyusen monitor]", message);
      return res.status(500).json({ error: message, timestamp: new Date().toISOString() });
    }
  });

  app.post("/api/scheduled/marketplace-auto-sync", async (req, res) => {
    try {
      if (checkCron(req)) {
        const summary = await runMarketplaceAutoSync("selfhost-cron");
        return res.json({ ok: true, ...summary, timestamp: new Date().toISOString() });
      }
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const summary = await runMarketplaceAutoSync(user.taskUid);
      return res.json({ ok: true, ...summary, timestamp: new Date().toISOString() });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Marketplace auto sync]", message);
      return res.status(500).json({ error: message, timestamp: new Date().toISOString() });
    }
  });

  app.post("/api/scheduled/snkr-shop-auto-sync", async (req, res) => {
    try {
      if (checkCron(req)) {
        const summary = await runSnkrShopAutoSync("selfhost-cron");
        return res.json({ ok: true, ...summary, timestamp: new Date().toISOString() });
      }
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const summary = await runSnkrShopAutoSync(user.taskUid);
      return res.json({ ok: true, ...summary, timestamp: new Date().toISOString() });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Shop SNKR auto sync]", message);
      return res.status(500).json({ error: message, timestamp: new Date().toISOString() });
    }
  });

  app.post("/api/scheduled/trash-auto-cleanup", async (req, res) => {
    try {
      if (checkCron(req)) {
        const summary = await runTrashAutoCleanup("selfhost-cron");
        return res.json({ ok: true, ...summary, timestamp: new Date().toISOString() });
      }
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const summary = await runTrashAutoCleanup(user.taskUid);
      return res.json({ ok: true, ...summary, timestamp: new Date().toISOString() });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Trash auto cleanup]", message);
      return res.status(500).json({ error: message, timestamp: new Date().toISOString() });
    }
  });

  app.post("/api/scheduled/auto-backup", async (req, res) => {
    try {
      if (checkCron(req)) {
        const summary = await runScheduledAutoBackup("selfhost-cron");
        return res.json({ ok: true, ...summary, timestamp: new Date().toISOString() });
      }
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const summary = await runScheduledAutoBackup(user.taskUid);
      return res.json({ ok: true, ...summary, timestamp: new Date().toISOString() });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Auto backup]", message);
      return res.status(500).json({ error: message, timestamp: new Date().toISOString() });
    }
  });

  app.post("/api/scheduled/activity-log-cleanup", async (req, res) => {
    try {
      if (checkCron(req)) {
        const summary = await runActivityLogCleanup();
        return res.json({ ok: true, ...summary, timestamp: new Date().toISOString() });
      }
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const summary = await runActivityLogCleanup();
      return res.json({ ok: true, ...summary, timestamp: new Date().toISOString() });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Activity log cleanup]", message);
      return res.status(500).json({ error: message, timestamp: new Date().toISOString() });
    }
  });

  // Image upload endpoint — authenticated users only. Uploaded files are
  // served from this same origin, so the payload must also prove it is a
  // real raster image (see validateProductImageUpload).
  app.post("/api/upload-image", async (req, res) => {
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (user.isCron) {
      return res.status(403).json({ error: "Forbidden" });
    }
    try {
      const { base64, filename, contentType } = req.body ?? {};
      if (typeof base64 !== "string" || !base64) {
        return res.status(400).json({ error: "Missing base64 or filename" });
      }
      const buffer = Buffer.from(base64, "base64");
      const validated = validateProductImageUpload({ filename, contentType, buffer });
      const key = `products/${user.id}/${Date.now()}.${validated.ext}`;
      const result = await storagePut(key, buffer, validated.contentType);
      res.json({ url: result.url, key: result.key });
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error);
      const isValidationError =
        error instanceof Error &&
        /image|filename|size limit/i.test(message) &&
        !/storage|forge|s3/i.test(message);
      console.error("[Upload] Error:", message);
      res.status(isValidationError ? 400 : 500).json({ error: message });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  const isBundled = import.meta.url.includes("/dist/") || Boolean(process.argv[1]?.replace(/\\/g, "/").includes("/dist/"));
  if (process.env.NODE_ENV === "development" && !isBundled) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Self-hosted deployments have no external cron calling the
    // /api/scheduled/* endpoints, so the server schedules the automatic
    // sync jobs itself (Marketplace, Shop SNKR, Chyusen monitor).
    startInternalScheduler();
  });
}

startServer().catch(console.error);
