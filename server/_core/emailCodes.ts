import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
export const EMAIL_CODE_RESEND_DELAY_MS = 60 * 1000;
export const EMAIL_CODE_MAX_ATTEMPTS = 5;

export type EmailCodePurpose = "registration" | "password_reset";

export function generateEmailCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashEmailCode(email: string, purpose: EmailCodePurpose, code: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`${purpose}\0${email}\0${code}`)
    .digest("hex");
}

export function verifyEmailCodeHash(expectedHash: string, actualHash: string) {
  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(actualHash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}