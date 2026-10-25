import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Tính năng thông báo đẩy (Web Push) phải được nối đủ các tầng", () => {
  it("schema có bảng lưu subscription theo thiết bị và khoá VAPID của server", () => {
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain("push_subscriptions");
    expect(schema).toContain("push_config");
    expect(schema).toContain("vapidPrivateKeyJwk");
  });

  it("router push chỉ cho người đã đăng nhập: key công khai, đăng ký, hủy đăng ký, gửi thử", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("push: router({");
    expect(routers).toContain("getPublicKey: protectedProcedure");
    expect(routers).toContain("subscribe: protectedProcedure");
    expect(routers).toContain("unsubscribe: protectedProcedure");
    expect(routers).toContain("sendTest: protectedProcedure");
    // Khoá riêng VAPID không bao giờ được trả ra API.
    expect(routers).not.toContain("vapidPrivateKeyJwk");
  });

  it("service worker nhận push và mở đúng trang khi chạm vào thông báo", () => {
    expect(existsSync(join(root, "client/public/sw.js"))).toBe(true);
    const sw = read("client/public/sw.js");
    expect(sw).toContain('addEventListener("push"');
    expect(sw).toContain("showNotification");
    expect(sw).toContain('addEventListener("notificationclick"');
    const main = read("client/src/main.tsx");
    expect(main).toContain('register("/sw.js")');
  });

  it("trang Cài đặt có mục Thông báo đẩy với nút bật/tắt trên từng thiết bị", () => {
    const settings = read("client/src/pages/Settings.tsx");
    expect(settings).toContain("PushNotificationSettings");
    expect(settings).toContain("Thông báo đẩy");
    const component = read("client/src/components/PushNotificationSettings.tsx");
    expect(component).toContain("Notification.requestPermission()");
    expect(component).toContain("subscribeToPush");
    expect(component).toContain("unsubscribeFromPush");
  });

  it("thông báo Chyusen mới được tạo thì mới đẩy — bản ghi trùng (upsert) không đẩy lại", () => {
    const chyusenDb = read("server/chyusenDb.ts");
    const createFn = chyusenDb.slice(chyusenDb.indexOf("export async function createChyusenNotification"));
    expect(createFn).toContain("sendPushToUser");
    expect(createFn).toContain("if (!existing)");
  });

  it("đồng bộ giá SNKR tự động gom biến động theo người dùng và đẩy một thông báo tổng hợp", () => {
    const snkrShopDb = read("server/snkrShopDb.ts");
    expect(snkrShopDb).toContain("priceChangesByUser");
    expect(snkrShopDb).toContain("buildSnkrPriceChangePush");
    expect(snkrShopDb).toContain("sendPushToUser");
    const syncFn = snkrShopDb.slice(snkrShopDb.indexOf("export async function syncSnkrShopItem"));
    expect(syncFn).toContain("priceChange");
  });
});
