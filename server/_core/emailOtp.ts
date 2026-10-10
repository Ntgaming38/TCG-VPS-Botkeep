import { createHash, randomInt } from "node:crypto";
import nodemailer from "nodemailer";
import { and, eq } from "drizzle-orm";
import { emailAuthChallenges } from "../../drizzle/schema";
import { getDb } from "../db";
import { ENV } from "./env";

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

export function isEmailOtpConfigured() {
  return Boolean(ENV.smtpUser && ENV.smtpPass);
}

function hashCode(email: string, purpose: string, code: string) {
  return createHash("sha256").update(`${ENV.emailCodeSecret}:${email}:${purpose}:${code}`).digest("hex");
}

export function generateOtpCode() {
  return String(randomInt(100000, 1000000));
}

async function sendOtpEmail(to: string, code: string, purposeLabel: string) {
  const transporter = nodemailer.createTransport({
    host: ENV.smtpHost,
    port: ENV.smtpPort,
    secure: ENV.smtpSecure,
    auth: { user: ENV.smtpUser, pass: ENV.smtpPass },
  });
  await transporter.sendMail({
    from: ENV.smtpFrom,
    to,
    subject: `Mã xác nhận TCG Manager: ${code}`,
    text: `Mã xác nhận ${purposeLabel} TCG Manager của bạn là: ${code}\nMã có hiệu lực ${OTP_TTL_MINUTES} phút. Không chia sẻ mã này cho bất kỳ ai.`,
  });
}

/** Tạo (hoặc thay thế) thử thách OTP cho email + mục đích, rồi gửi mã qua Gmail. */
export async function issueEmailOtp(email: string, purpose: "registration" | "password_reset", extra?: { name?: string; passwordHash?: string; rememberMe?: boolean }) {
  if (!isEmailOtpConfigured()) throw new Error("Máy chủ chưa cấu hình Gmail (SMTP_USER/SMTP_PASS).");
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  await db.insert(emailAuthChallenges).values({
    email,
    purpose,
    codeHash: hashCode(email, purpose, code),
    name: extra?.name?.slice(0, 100) ?? null,
    passwordHash: extra?.passwordHash ?? null,
    rememberMe: extra?.rememberMe ? 1 : 0,
    expiresAt,
    attempts: 0,
  }).onDuplicateKeyUpdate({
    set: {
      codeHash: hashCode(email, purpose, code),
      name: extra?.name?.slice(0, 100) ?? null,
      passwordHash: extra?.passwordHash ?? null,
      rememberMe: extra?.rememberMe ? 1 : 0,
      expiresAt,
      attempts: 0,
    },
  });
  try {
    await sendOtpEmail(email, code, purpose === "password_reset" ? "đặt lại mật khẩu" : "đăng ký");
  } catch (error) {
    console.error("[EmailOTP] send failed", error);
    throw new Error("Không gửi được email mã xác nhận. Kiểm tra cấu hình Gmail trên máy chủ.");
  }
}

/** Kiểm tra mã OTP; đúng thì xóa thử thách và trả về bản ghi (để dùng name/passwordHash đã lưu). */
export async function consumeEmailOtp(email: string, purpose: "registration" | "password_reset", code: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [challenge] = await db.select().from(emailAuthChallenges)
    .where(and(eq(emailAuthChallenges.email, email), eq(emailAuthChallenges.purpose, purpose)))
    .limit(1);
  if (!challenge) throw new Error("Mã xác nhận không tồn tại hoặc đã hết hạn. Hãy yêu cầu mã mới.");
  if (challenge.expiresAt.getTime() < Date.now()) {
    await db.delete(emailAuthChallenges).where(eq(emailAuthChallenges.id, challenge.id));
    throw new Error("Mã xác nhận đã hết hạn. Hãy yêu cầu mã mới.");
  }
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    await db.delete(emailAuthChallenges).where(eq(emailAuthChallenges.id, challenge.id));
    throw new Error("Nhập sai quá nhiều lần. Hãy yêu cầu mã mới.");
  }
  if (challenge.codeHash !== hashCode(email, purpose, code.trim())) {
    await db.update(emailAuthChallenges).set({ attempts: challenge.attempts + 1 }).where(eq(emailAuthChallenges.id, challenge.id));
    throw new Error(`Mã xác nhận không đúng (còn ${OTP_MAX_ATTEMPTS - challenge.attempts - 1} lần thử).`);
  }
  await db.delete(emailAuthChallenges).where(eq(emailAuthChallenges.id, challenge.id));
  return challenge;
}
