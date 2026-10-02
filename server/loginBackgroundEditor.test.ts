import { describe, expect, it } from "vitest";
import { getLoginBackgroundCropRect } from "../client/src/lib/loginBackgroundEditor";

describe("login background crop", () => {
  it("giữ tỷ lệ 16:9 và cắt chính giữa khi chưa điều chỉnh", () => {
    const crop = getLoginBackgroundCropRect(2400, 1200, { zoom: 1, positionX: 0, positionY: 0, brightness: 1 });
    expect(crop.width / crop.height).toBeCloseTo(16 / 9);
    expect(crop.x).toBeCloseTo(133.333, 2);
    expect(crop.y).toBe(0);
  });

  it("thu nhỏ vùng cắt và di chuyển theo điều chỉnh người dùng", () => {
    const crop = getLoginBackgroundCropRect(2400, 1200, { zoom: 2, positionX: 1, positionY: 0, brightness: 1 });
    expect(crop.width).toBeCloseTo(1066.666, 2);
    expect(crop.x).toBeCloseTo(1333.333, 2);
  });
});
