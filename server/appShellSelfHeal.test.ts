import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

function readClientFile(path: string): string {
  return readFileSync(new URL(`../client/src/${path}`, import.meta.url), "utf8");
}

function readPublicFile(path: string): string {
  return readFileSync(new URL(`../client/public/${path}`, import.meta.url), "utf8");
}

const boundary = readClientFile("components/ErrorBoundary.tsx");
const sw = readPublicFile("sw.js");

describe("App tự chữa khi kẹt vỏ app cũ sau deploy", () => {
  it("màn hình lỗi tự dọn cache + hủy service worker rồi tải lại, tối đa 1 lần mỗi phiên", () => {
    expect(boundary).toContain("componentDidCatch");
    expect(boundary).toContain("tcg-shell-heal-attempted");
    expect(boundary).toContain("caches.delete(key)");
    expect(boundary).toContain("getRegistrations()");
    expect(boundary).toContain("window.location.reload()");
  });

  it("service worker bỏ tài nguyên /assets của bản cũ ngay khi vỏ app thay đổi", () => {
    expect(sw).toContain("freshText !== cachedText");
    expect(sw).toContain('pathname.startsWith("/assets/")');
    expect(sw).toContain("cache.delete(key)");
  });
});
