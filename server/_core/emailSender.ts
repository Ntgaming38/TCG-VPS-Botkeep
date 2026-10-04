import nodemailer from "nodemailer";
import { ENV } from "./env";

export function isEmailSenderConfigured() {
  return Boolean(ENV.smtpHost && ENV.smtpUser && ENV.smtpPass && ENV.smtpFrom);
}

export async function sendAuthCodeEmail(email: string, code: string, purpose: "registration" | "password_reset") {
  if (!isEmailSenderConfigured()) throw new Error("SMTP is not configured");

  const transporter = nodemailer.createTransport({
    host: ENV.smtpHost,
    port: ENV.smtpPort,
    secure: ENV.smtpSecure,
    auth: { user: ENV.smtpUser, pass: ENV.smtpPass },
  });
  const isRegistration = purpose === "registration";
  await transporter.sendMail({
    from: ENV.smtpFrom,
    to: email,
    subject: isRegistration ? "Mã xác nhận tài khoản TCG Manager" : "Mã đặt lại mật khẩu TCG Manager",
    text: [
      isRegistration ? "Mã xác nhận đăng ký tài khoản của bạn:" : "Mã đặt lại mật khẩu của bạn:",
      "",
      code,
      "",
      "Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.",
    ].join("\n"),
  });
}