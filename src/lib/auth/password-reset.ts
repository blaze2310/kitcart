import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { PoolClient } from "pg";
import { getDb } from "../db";
import { otpEmailSettings, sendOtpEmail } from "./otp-email";
import { hashPassword, isValidPassword, verifyPassword } from "./password";

export function normalizeResetEmail(input: unknown) {
  if (typeof input !== "string") return null;
  const email = input.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? email : null;
}

export const resetSettings = otpEmailSettings;

type Settings = NonNullable<ReturnType<typeof resetSettings>>;

function digest(secret: string, id: string, code: string) {
  return createHmac("sha256", secret).update(`kitcart:password-reset:${id}:${code}`).digest();
}

async function transaction<T>(work: (db: PoolClient) => Promise<T>): Promise<T> {
  const db = await getDb().connect();
  let discard = false;
  try {
    await db.query("BEGIN");
    const result = await work(db);
    await db.query("COMMIT");
    return result;
  } catch (error) {
    try { await db.query("ROLLBACK"); } catch { discard = true; }
    throw error;
  } finally {
    db.release(discard);
  }
}

export async function sendReset(email: string, settings: Settings) {
  const code = String(randomInt(100_000_000)).padStart(8, "0");
  const result = await transaction<"ready" | "ineligible" | "limited">(async (db) => {
    // Local-only shared send limit prevents flooding the mail quota.
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended('kitcart:reset:mail', 0))");
    const user = await db.query<{ id: string }>(
      `SELECT u.id FROM public.users AS u
       JOIN public.password_credentials AS c ON c.user_id = u.id
       WHERE lower(u.email) = $1 AND u.is_active AND u.email_verified_at IS NOT NULL
       ORDER BY u.id LIMIT 2 FOR UPDATE OF u`, [email],
    );
    if (user.rows.length !== 1) return "ineligible";
    const rate = await db.query<{ total: number; count: number; cooling: boolean }>(
      `SELECT count(*)::int AS total,
        count(*) FILTER (WHERE destination = $1)::int AS count,
        coalesce(bool_or(destination = $1 AND resend_available_at > now()), false) AS cooling
       FROM public.verification_challenges WHERE purpose = 'password_reset'
        AND channel = 'email' AND created_at > now() - interval '30 minutes'`, [email],
    );
    const { total, count, cooling } = rate.rows[0];
    if (total >= 20 || count >= 3 || cooling) return "limited";
    const userId = user.rows[0].id;
    const id = crypto.randomUUID();
    await db.query(
      `INSERT INTO public.verification_challenges
        (id, user_id, channel, destination, purpose, code_hash, expires_at, resend_available_at)
       VALUES ($1, $2, 'email', $3, 'password_reset', $4, now() + interval '10 minutes', now() + interval '60 seconds')`,
      [id, userId, email, digest(settings.secret, id, code).toString("hex")],
    );
    return "ready";
  });

  if (result !== "ready") return result;
  const text = `Your KitCart password reset code is ${code}. Enter it within 10 minutes. If you didn't request this, ignore this email.`;
  await sendOtpEmail(settings, email, {
    subject: "Reset your KitCart password",
    text,
    html: `<div style="font-family:Arial,sans-serif;color:#11142b;max-width:530px;margin:auto">
      <div style="background:#11142b;color:#f7f8fc;padding:20px;font-size:23px;font-weight:bold">Kit<span style="color:#a8a2ff">Cart</span></div>
      <div style="padding:22px;border:1px solid #dddaf2"><h1 style="font-size:24px">Reset your password</h1>
      <p>Enter this code on the KitCart reset screen.</p>
      <p style="background:#efedff;color:#21165e;padding:16px;text-align:center;font:700 29px monospace;letter-spacing:3px">${code}</p>
      <p>The code expires in 10 minutes. Don’t share it.</p><p>If you didn’t request this, you can ignore this email.</p></div></div>`,
  });
  return "sent" as const;
}

export async function completeReset(email: string, code: string, password: string, settings: Settings) {
  if (!/^\d{8}$/.test(code) || !isValidPassword(password)) return "invalid" as const;
  return transaction(async (db) => {
    const user = await db.query<{ id: string; password_hash: string }>(
      `SELECT u.id, c.password_hash FROM public.users u JOIN public.password_credentials c ON c.user_id = u.id
       WHERE lower(u.email) = $1 AND u.is_active AND u.email_verified_at IS NOT NULL
       ORDER BY u.id LIMIT 2 FOR UPDATE OF u, c`, [email],
    );
    if (user.rows.length !== 1) return "invalid" as const;
    const userId = user.rows[0].id;
    const challenge = await db.query<{ id: string; code_hash: string; usable: boolean }>(
      `SELECT id, code_hash, (expires_at > now() AND consumed_at IS NULL AND attempts < max_attempts) AS usable
       FROM public.verification_challenges
       WHERE user_id = $1 AND destination = $2 AND channel = 'email' AND purpose = 'password_reset'
       ORDER BY created_at DESC, id DESC LIMIT 1 FOR UPDATE`, [userId, email],
    );
    const row = challenge.rows[0];
    if (!row?.usable) return "invalid" as const;
    const expected = Buffer.from(row.code_hash, "hex");
    const actual = digest(settings.secret, row.id, code);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      await db.query("UPDATE public.verification_challenges SET attempts = attempts + 1 WHERE id = $1", [row.id]);
      return "invalid" as const;
    }

    if (await verifyPassword(password, user.rows[0].password_hash)) {
      return "same-password" as const;
    }

    const hash = await hashPassword(password);
    await db.query(
      "UPDATE public.password_credentials SET password_hash = $2, password_updated_at = clock_timestamp() WHERE user_id = $1",
      [userId, hash],
    );
    await db.query(
      "UPDATE public.verification_challenges SET consumed_at = now() WHERE user_id = $1 AND purpose = 'password_reset' AND consumed_at IS NULL",
      [userId],
    );
    return "updated" as const;
  });
}
