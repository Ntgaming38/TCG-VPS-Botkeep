import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { storagePut } from "../storage";
import { sdk } from "./sdk";
import { runChyusenMonitor } from "../chyusenMonitor";
import { runMarketplaceAutoSync } from "../marketplaceMonitor";

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
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.post("/api/scheduled/chyusen-monitor", async (req, res) => {
    try {
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

  // Image upload endpoint
  app.post("/api/upload-image", async (req, res) => {
    try {
      const { base64, filename, contentType } = req.body;
      if (!base64 || !filename) {
        return res.status(400).json({ error: "Missing base64 or filename" });
      }
      const buffer = Buffer.from(base64, "base64");
      const ext = filename.split(".").pop() || "png";
      const key = `products/${Date.now()}.${ext}`;
      const result = await storagePut(key, buffer, contentType || "image/png");
      res.json({ url: result.url, key: result.key });
    } catch (error: any) {
      console.error("[Upload] Error:", error.message);
      res.status(500).json({ error: error.message });
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
  if (process.env.NODE_ENV === "development") {
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
  });
}

startServer().catch(console.error);
