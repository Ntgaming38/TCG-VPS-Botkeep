import { describe, expect, it } from "vitest";
import { createRgbGradient, DEFAULT_RGB_EFFECT_COLORS, DEFAULT_RGB_EFFECTS_ENABLED, DEFAULT_RGB_EFFECTS_SPEED, readRgbEffectsColors, readRgbEffectsEnabled, readRgbEffectsSpeed, RGB_EFFECTS_COLORS_STORAGE_KEY, RGB_EFFECTS_SPEED_STORAGE_KEY, RGB_EFFECTS_STORAGE_KEY, RGB_EFFECT_SPEEDS, saveRgbEffectsColors, saveRgbEffectsEnabled, saveRgbEffectsSpeed } from "../client/src/lib/rgbEffects";

function createStorage(initial?: Record<string, string>) {
  const values = new Map<string, string>();
  Object.entries(initial || {}).forEach(([key, value]) => values.set(key, value));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("RGB effect preference", () => {
  it("bật hiệu ứng mặc định và tôn trọng lựa chọn tắt đã lưu", () => {
    expect(readRgbEffectsEnabled(createStorage())).toBe(true);
    expect(readRgbEffectsEnabled(createStorage({ [RGB_EFFECTS_STORAGE_KEY]: "false" }))).toBe(false);
  });

  it("lưu lựa chọn hiệu ứng theo thiết bị", () => {
    const storage = createStorage();
    saveRgbEffectsEnabled(false, storage);
    expect(storage.getItem(RGB_EFFECTS_STORAGE_KEY)).toBe("false");
  });

  it("hỗ trợ tốc độ chậm, bình thường và nhanh với mặc định an toàn", () => {
    expect(RGB_EFFECT_SPEEDS).toEqual(["slow", "normal", "fast"]);
    expect(readRgbEffectsSpeed(createStorage())).toBe("normal");
    expect(readRgbEffectsSpeed(createStorage({ [RGB_EFFECTS_SPEED_STORAGE_KEY]: "fast" }))).toBe("fast");
    expect(readRgbEffectsSpeed(createStorage({ [RGB_EFFECTS_SPEED_STORAGE_KEY]: "unknown" }))).toBe("normal");
  });

  it("lưu tốc độ RGB đã chọn theo thiết bị", () => {
    const storage = createStorage();
    saveRgbEffectsSpeed("slow", storage);
    expect(storage.getItem(RGB_EFFECTS_SPEED_STORAGE_KEY)).toBe("slow");
  });

  it("lưu và khôi phục bảng màu gradient tùy chỉnh theo thiết bị", () => {
    const storage = createStorage();
    const colors = ["#FF0000", "#00FF00", "#0000FF", "#AA00FF"] as const;
    saveRgbEffectsColors([...colors], storage);

    expect(storage.getItem(RGB_EFFECTS_COLORS_STORAGE_KEY)).toBe(JSON.stringify(colors));
    expect(readRgbEffectsColors(storage)).toEqual(colors);
    expect(createRgbGradient([...colors])).toContain("#AA00FF 82%");
  });

  it("dùng bảng màu mặc định khi dữ liệu bảng màu không hợp lệ", () => {
    const storage = createStorage({ [RGB_EFFECTS_COLORS_STORAGE_KEY]: '["not-a-color"]' });
    expect(readRgbEffectsColors(storage)).toEqual(DEFAULT_RGB_EFFECT_COLORS);
  });

  it("có giá trị mặc định nhất quán để nút đặt lại khôi phục", () => {
    const storage = createStorage();
    saveRgbEffectsEnabled(DEFAULT_RGB_EFFECTS_ENABLED, storage);
    saveRgbEffectsSpeed(DEFAULT_RGB_EFFECTS_SPEED, storage);
    saveRgbEffectsColors(DEFAULT_RGB_EFFECT_COLORS, storage);

    expect(DEFAULT_RGB_EFFECTS_ENABLED).toBe(true);
    expect(DEFAULT_RGB_EFFECTS_SPEED).toBe("normal");
    expect(readRgbEffectsEnabled(storage)).toBe(true);
    expect(readRgbEffectsSpeed(storage)).toBe("normal");
    expect(readRgbEffectsColors(storage)).toEqual(DEFAULT_RGB_EFFECT_COLORS);
  });
});
