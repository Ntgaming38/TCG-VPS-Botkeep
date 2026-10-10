import { describe, expect, it } from "vitest";
import { generateOtpCode, OTP_MAX_ATTEMPTS, OTP_TTL_MINUTES } from "./_core/emailOtp";

describe("email OTP", () => {
  it("sinh mã 6 chữ số", () => {
    for (let i = 0; i < 20; i += 1) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it("hai mã liên tiếp hiếm khi trùng nhau", () => {
    const codes = new Set(Array.from({ length: 10 }, () => generateOtpCode()));
    expect(codes.size).toBeGreaterThan(1);
  });

  it("giới hạn TTL và số lần thử hợp lý", () => {
    expect(OTP_TTL_MINUTES).toBe(10);
    expect(OTP_MAX_ATTEMPTS).toBe(5);
  });
});
