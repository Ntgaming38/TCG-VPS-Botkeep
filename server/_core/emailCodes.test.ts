import { describe, expect, it } from "vitest";
import { generateEmailCode, hashEmailCode, verifyEmailCodeHash } from "./emailCodes";

describe("email verification codes", () => {
  it("generates six digit codes and verifies a keyed hash", () => {
    const code = generateEmailCode();
    expect(code).toMatch(/^\d{6}$/);
    const hash = hashEmailCode("user@gmail.com", "registration", code, "test-secret");
    expect(verifyEmailCodeHash(hash, hashEmailCode("user@gmail.com", "registration", code, "test-secret"))).toBe(true);
    expect(verifyEmailCodeHash(hash, hashEmailCode("user@gmail.com", "password_reset", code, "test-secret"))).toBe(false);
  });

  it("rejects hashes of different lengths", () => {
    expect(verifyEmailCodeHash("abc", "abcd")).toBe(false);
  });
});