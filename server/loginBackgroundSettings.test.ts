import { describe, expect, it } from "vitest";
import { DEFAULT_LOGIN_BACKGROUND_URL, LOGIN_BACKGROUND_STORAGE_KEY, pickDailyLoginBackground, readLoginBackgroundDailyEligibleUrls, readLoginBackgroundDailyRandom, readLoginBackgroundHistory, readLoginBackgroundUrl, rememberLoginBackgroundUrl, removeLoginBackgroundUrl, resolveLoginBackgroundUrl, saveLoginBackgroundDailyEligibleUrls, saveLoginBackgroundDailyRandom, saveLoginBackgroundUrl } from "../client/src/lib/loginBackground";

function createStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial) values.set(LOGIN_BACKGROUND_STORAGE_KEY, initial);
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
}

describe("login background setting", () => {
  it("dùng nền mặc định nếu chưa có hoặc có URL không an toàn", () => {
    expect(readLoginBackgroundUrl(createStorage())).toBe(DEFAULT_LOGIN_BACKGROUND_URL);
    expect(readLoginBackgroundUrl(createStorage("https://example.com/image.png"))).toBe(DEFAULT_LOGIN_BACKGROUND_URL);
  });

  it("lưu và đọc lại đường dẫn nền từ kho lưu trữ", () => {
    const storage = createStorage();
    const url = "/manus-storage/login-backgrounds/1/background_abc.png";
    expect(saveLoginBackgroundUrl(url, storage)).toBe(url);
    expect(readLoginBackgroundUrl(storage)).toBe(url);
  });

  it("lưu tối đa sáu nền gần đây, ưu tiên nền mới nhất và không lặp lại", () => {
    const storage = createStorage();
    for (let index = 0; index < 7; index += 1) rememberLoginBackgroundUrl(`/manus-storage/login-backgrounds/1/background_${index}.png`, storage);
    const history = rememberLoginBackgroundUrl("/manus-storage/login-backgrounds/1/background_4.png", storage);
    expect(history).toHaveLength(6);
    expect(history[0].url).toContain("background_4.png");
    expect(readLoginBackgroundHistory(storage)).toHaveLength(6);
  });

  it("xóa riêng một nền khỏi danh sách gần đây", () => {
    const storage = createStorage();
    const first = "/manus-storage/login-backgrounds/1/first.png";
    const second = "/manus-storage/login-backgrounds/1/second.png";
    rememberLoginBackgroundUrl(first, storage);
    rememberLoginBackgroundUrl(second, storage);
    expect(removeLoginBackgroundUrl(first, storage).map((item) => item.url)).toEqual([second]);
  });

  it("chọn nền ổn định theo ngày khi bật nền ngẫu nhiên", () => {
    const storage = createStorage();
    const first = "/manus-storage/login-backgrounds/1/first.png";
    const second = "/manus-storage/login-backgrounds/1/second.png";
    rememberLoginBackgroundUrl(first, storage);
    rememberLoginBackgroundUrl(second, storage);
    saveLoginBackgroundDailyRandom(true, storage);
    const date = new Date(2026, 7, 14);
    expect(readLoginBackgroundDailyRandom(storage)).toBe(true);
    expect(resolveLoginBackgroundUrl(storage, date)).toBe(pickDailyLoginBackground(readLoginBackgroundHistory(storage), date));
  });

  it("chỉ chọn nền được phép trong vòng quay hằng ngày", () => {
    const storage = createStorage();
    const first = "/manus-storage/login-backgrounds/1/first.png";
    const second = "/manus-storage/login-backgrounds/1/second.png";
    rememberLoginBackgroundUrl(first, storage);
    rememberLoginBackgroundUrl(second, storage);
    const history = readLoginBackgroundHistory(storage);
    saveLoginBackgroundDailyEligibleUrls([first], storage);
    saveLoginBackgroundDailyRandom(true, storage);
    expect(readLoginBackgroundDailyEligibleUrls(history, storage)).toEqual([first]);
    expect(resolveLoginBackgroundUrl(storage, new Date(2026, 7, 14))).toBe(first);
  });
});
