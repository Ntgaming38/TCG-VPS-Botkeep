import { createServer, get, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { gunzipSync } from "node:zlib";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createResponseCompression } from "./_core/responseCompression";

const BIG_JS = "console.log('tcg');\n".repeat(600); // ~12.6 KB of compressible JS
const BIG_JSON = JSON.stringify({ items: Array.from({ length: 200 }, (_, i) => ({ id: i, name: `card-${i}` })) });
const FAKE_PNG = Buffer.alloc(4096, 7);

let server: Server;
let baseUrl: string;

function rawGet(path: string, acceptEncoding?: string) {
  return new Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: Buffer }>((resolve, reject) => {
    const headers: Record<string, string> = {};
    if (acceptEncoding) headers["accept-encoding"] = acceptEncoding;
    get(`${baseUrl}${path}`, { headers }, res => {
      const chunks: Buffer[] = [];
      res.on("data", chunk => chunks.push(Buffer.from(chunk)));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }));
    }).on("error", reject);
  });
}

beforeAll(async () => {
  const app = express();
  app.use(createResponseCompression());
  app.get("/assets/app.js", (_req, res) => {
    res.type("application/javascript").send(BIG_JS);
  });
  app.get("/api/data", (_req, res) => {
    res.json(JSON.parse(BIG_JSON));
  });
  app.get("/small", (_req, res) => {
    res.type("text/plain").send("ok");
  });
  app.get("/img.png", (_req, res) => {
    res.type("image/png").send(FAKE_PNG);
  });
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
});

describe("response compression (gzip)", () => {
  it("nén file JS lớn khi client chấp nhận gzip, giải nén ra đúng nội dung gốc", async () => {
    const res = await rawGet("/assets/app.js", "gzip");
    expect(res.status).toBe(200);
    expect(res.headers["content-encoding"]).toBe("gzip");
    expect(res.headers.vary).toContain("Accept-Encoding");
    expect(res.body.length).toBeLessThan(BIG_JS.length / 2);
    expect(gunzipSync(res.body).toString("utf8")).toBe(BIG_JS);
  });

  it("nén cả JSON của API", async () => {
    const res = await rawGet("/api/data", "gzip");
    expect(res.status).toBe(200);
    expect(res.headers["content-encoding"]).toBe("gzip");
    expect(gunzipSync(res.body).toString("utf8")).toBe(BIG_JSON);
  });

  it("không nén khi client không chấp nhận gzip", async () => {
    const res = await rawGet("/assets/app.js");
    expect(res.status).toBe(200);
    expect(res.headers["content-encoding"]).toBeUndefined();
    expect(res.body.toString("utf8")).toBe(BIG_JS);
  });

  it("không nén nội dung nhỏ dưới ngưỡng 1 KB", async () => {
    const res = await rawGet("/small", "gzip");
    expect(res.status).toBe(200);
    expect(res.headers["content-encoding"]).toBeUndefined();
    expect(res.body.toString("utf8")).toBe("ok");
  });

  it("không nén ảnh (định dạng đã nén sẵn)", async () => {
    const res = await rawGet("/img.png", "gzip");
    expect(res.status).toBe(200);
    expect(res.headers["content-encoding"]).toBeUndefined();
    expect(res.body.equals(FAKE_PNG)).toBe(true);
  });
});
