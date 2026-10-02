import { describe, expect, it, vi } from "vitest";
import { fetchTrpcWithHtmlGuard } from "../client/src/lib/trpcFetch";

describe("tRPC HTML response guard", () => {
  it("giữ nguyên phản hồi JSON hợp lệ", async () => {
    const fetchImpl = vi.fn(async () => new Response('{"result":{"data":{"json":null}}}', {
      status: 200,
      headers: { "content-type": "application/json" },
    }));

    const response = await fetchTrpcWithHtmlGuard("/api/trpc/snkrShop.list", undefined, fetchImpl);
    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retry một lần khi proxy trả HTML rồi nhận JSON", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response("<!doctype html><html></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }))
      .mockResolvedValueOnce(new Response('{"result":{"data":{"json":[]}}}', {
        status: 200,
        headers: { "content-type": "application/json" },
      }));

    const response = await fetchTrpcWithHtmlGuard("/api/trpc/snkrShop.trendHistory7d", undefined, fetchImpl);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("trả lỗi JSON có thông báo rõ ràng nếu retry vẫn là HTML", async () => {
    const fetchImpl = vi.fn(async () => new Response("<!doctype html><html></html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    }));

    const response = await fetchTrpcWithHtmlGuard("/api/trpc/snkrShop.list", undefined, fetchImpl);
    const body = await response.json();
    expect(response.status).toBe(502);
    expect(body.error.json.message).toContain("HTML thay vì JSON");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
