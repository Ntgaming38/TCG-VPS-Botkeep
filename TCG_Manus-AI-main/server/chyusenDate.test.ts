import { describe, expect, it } from "vitest";
import { formatChyusenDayMonth, formatChyusenDayMonthInput, formatChyusenDaysRemaining, getChyusenDaysRemaining, getChyusenDeadlineTone, isChyusenDeadlineToday, isChyusenRegistrationExpired, parseChyusenDayMonth } from "../shared/chyusenDate";

describe("Chyusen day/month dates", () => {
  it("hiển thị ngày theo dd/mm và bỏ năm, giờ", () => {
    expect(formatChyusenDayMonth(new Date("2026-08-13T01:30:00.000Z"))).toBe("13/08");
  });

  it("tự gán năm tại thời điểm lưu theo múi giờ Nhật Bản", () => {
    const saved = parseChyusenDayMonth("05/01", new Date("2027-01-02T10:00:00.000Z"));
    expect(saved?.toISOString()).toBe("2027-01-04T15:00:00.000Z");
  });

  it("không chấp nhận ngày hoặc tháng không hợp lệ", () => {
    expect(parseChyusenDayMonth("31/02", new Date("2027-01-02T10:00:00.000Z"))).toBeNull();
    expect(parseChyusenDayMonth("05-01", new Date("2027-01-02T10:00:00.000Z"))).toBeNull();
  });

  it("tự chèn dấu gạch chéo sau khi người dùng nhập ngày", () => {
    expect(formatChyusenDayMonthInput("1a2-3")).toBe("12/3");
    expect(formatChyusenDayMonthInput("12034")).toBe("12/03");
  });

  it("chỉ cảnh báo quá hạn sau khi đã qua hết ngày đăng ký theo giờ Nhật Bản", () => {
    expect(isChyusenRegistrationExpired("2026-08-13T00:00:00+09:00", new Date("2026-08-13T12:00:00+09:00"))).toBe(false);
    expect(isChyusenRegistrationExpired("2026-08-13T00:00:00+09:00", new Date("2026-08-14T00:01:00+09:00"))).toBe(true);
  });

  it("hiển thị số ngày còn lại theo ngày Nhật Bản", () => {
    const now = new Date("2026-08-10T12:00:00+09:00");
    expect(getChyusenDaysRemaining("2026-08-13T00:00:00+09:00", now)).toBe(3);
    expect(formatChyusenDaysRemaining("2026-08-13T00:00:00+09:00", now)).toBe("Còn 3 ngày");
    expect(formatChyusenDaysRemaining("2026-08-10T00:00:00+09:00", now)).toBe("Hôm nay là hạn cuối");
    expect(formatChyusenDaysRemaining("2026-08-08T00:00:00+09:00", now)).toBe("Đã quá hạn 2 ngày");
    expect(isChyusenDeadlineToday("2026-08-10T00:00:00+09:00", now)).toBe(true);
    expect(isChyusenDeadlineToday("2026-08-11T00:00:00+09:00", now)).toBe(false);
  });

  it("tăng màu cảnh báo khi chỉ còn tối đa ba ngày", () => {
    const now = new Date("2026-08-10T12:00:00+09:00");
    expect(getChyusenDeadlineTone("2026-08-20T00:00:00+09:00", now)).toBe("normal");
    expect(getChyusenDeadlineTone("2026-08-13T00:00:00+09:00", now)).toBe("warning");
    expect(getChyusenDeadlineTone("2026-08-11T00:00:00+09:00", now)).toBe("urgent");
    expect(getChyusenDeadlineTone("2026-08-09T00:00:00+09:00", now)).toBe("expired");
  });
});
