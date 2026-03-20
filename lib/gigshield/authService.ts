import { createOtpForPhone, createSession, createUserIfMissingByPhone, consumeOtpVerification } from "./mockDb";

function generateOtp6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
export const OTP_TTL_MS = 1000 * 60 * 5; // 5 minutes

export function sendOtp(args: { phone: string }) {
  const normalizedPhone = args.phone.replace(/\D/g, "");
  const otp = generateOtp6();
  const now = Date.now();
  const expiresAt = now + OTP_TTL_MS;
  createOtpForPhone({ phone: normalizedPhone, otp, expiresAt });
  return { otpForDebug: otp }; // demo-only; route handler can hide in prod.
}

export function verifyOtp(args: { phone: string; otp: string }) {
  const normalizedPhone = args.phone.replace(/\D/g, "");
  const now = Date.now();

  const result = consumeOtpVerification({ phone: normalizedPhone, otp: args.otp, now });
  if (!result.ok) {
    return { ok: false as const, reason: result.reason };
  }

  // If user exists, login; else create.
  const user = createUserIfMissingByPhone({ phone: normalizedPhone, role: normalizedPhone === "9000000000" ? "admin" : "user" });
  const sessionId = createSession({ userId: user.id, expiresAt: now + SESSION_TTL_MS });
  return { ok: true as const, user, sessionId };
}

