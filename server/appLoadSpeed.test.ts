import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Mở app từ màn hình chính phải nhanh: service worker trả vỏ app đã lưu
// ngay lập tức (stale-while-revalidate) thay vì chờ mạng, và các trang
// được tải lười theo route để cục JS mở đầu nhỏ lại.
describe("Tốc độ mở app (PWA)", () => {
  const root = process.cwd();
  const read = (path: string) => readFileSync(join(root, path), "utf8");

  it("service worker mở trang theo kiểu stale-while-revalidate và chỉ cache phản hồi ok", () => {
    const sw = read("client/public/sw.js");
    expect(sw).toContain("stale-while-revalidate");
    expect(sw).toContain("tcg-app-shell-v2");
    expect(sw).toContain('request.mode === "navigate"');
    // Trang lỗi của nhà cung cấp (vd 503) không bao giờ được lưu làm vỏ app.
    expect(sw).toContain("fresh.ok");
    // /api/ vẫn tuyệt đối không qua cache.
    expect(sw).toContain('url.pathname.startsWith("/api/")');
  });

  it("App.tsx tải lười mọi trang theo route trong Suspense", () => {
    const app = read("client/src/App.tsx");
    expect(app).toContain("Suspense");
    expect(app).toContain('lazy(() => import("./pages/Dashboard"))');
    expect(app).toContain('lazy(() => import("./pages/Products"))');
    expect(app).toContain('lazy(() => import("./pages/Inventory"))');
    // Không còn import tĩnh các trang nặng vào cục mở đầu.
    expect(app).not.toContain('import Dashboard from "./pages/Dashboard"');
    expect(app).not.toContain('import Products from "./pages/Products"');
    expect(app).not.toContain('import Reports from "./pages/Reports"');
  });
});
