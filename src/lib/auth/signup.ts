import "server-only";

import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import parsePhoneNumber, { isSupportedCountry, type CountryCode } from "libphonenumber-js/max";
import type { PoolClient } from "pg";
import { getDb } from "../db";
import { otpEmailSettings, sendOtpEmail } from "./otp-email";
import { hashPassword, isValidPassword } from "./password";

export class SignupError extends Error {
  constructor(message: string, public status = 400, public field?: "email" | "username") { super(message); }
}

const rejectedCode = "That code is incorrect, expired, or already used. Request a new code if needed.";
const names = new Intl.DisplayNames(["en"], { type: "region" });

function settings() {
  const settings = otpEmailSettings();
  if (!settings) throw new SignupError("Email signup is not configured in this environment.", 503);
  return settings;
}

function digest(secret: string, id: string, code: string) {
  return createHmac("sha256", secret).update(`kitcart:signup:${id}:${code}`).digest("hex");
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

type SignupLookup = Pick<PoolClient, "query">;
const emailInUse = "This email already has a KitCart account. Sign in or use a different email.";
const usernameInUse = "This username is already taken. Choose a different username.";

function validEmail(email: string) {
  return email.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email);
}

function validUsername(username: string) {
  return /^[A-Za-z][A-Za-z0-9]{0,49}$/.test(username);
}

async function assertSignupAvailable(db: SignupLookup, email?: string, username?: string) {
  if (email) {
    const result = await db.query("SELECT 1 FROM public.users WHERE lower(email) = $1 LIMIT 1", [email]);
    if (result.rowCount) throw new SignupError(emailInUse, 409, "email");
  }
  if (username) {
    const result = await db.query(
      "SELECT 1 FROM public.user_profiles WHERE lower(username) = lower($1) LIMIT 1", [username],
    );
    if (result.rowCount) throw new SignupError(usernameInUse, 409, "username");
  }
}

export async function checkSignup(input: Record<string, unknown>) {
  // This local feedback intentionally distinguishes existing accounts.
  if (process.env.NODE_ENV !== "development") throw new SignupError("Signup checks are unavailable.", 503);
  const hasEmail = typeof input.email === "string";
  const hasUsername = typeof input.username === "string";
  const email = hasEmail ? (input.email as string).trim().toLowerCase() : undefined;
  const username = hasUsername ? (input.username as string).trim() : undefined;
  if (email !== undefined && !validEmail(email)) throw new SignupError("Enter a valid email address.", 400, "email");
  if (username !== undefined && !validUsername(username)) {
    throw new SignupError("Use 1–50 letters or numbers, starting with a letter.", 400, "username");
  }
  if (!hasEmail && !hasUsername) throw new SignupError("Enter an email or username.");
  await assertSignupAvailable(getDb(), email, username);
}

async function lockEmail(db: PoolClient, email: string) {
  await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`signup:${email}`]);
}

function phoneDetails(value: string, country?: string) {
  if (value.length > 32 || !/^\+[0-9() .-]+$/.test(value)) return null;
  const phone = parsePhoneNumber(value, { extract: false });
  if (!phone?.country || !phone.isValid()) return null;
  if (country !== undefined && phone.country !== country) return null;
  return {
    number: phone.number, iso2: phone.country, name: names.of(phone.country) ?? phone.country,
    callingCode: `+${phone.countryCallingCode}`,
  };
}

function validDob(value: string) {
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "1900-01-01" || value > today) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function signupEmail(code: string) {
  return {
    subject: "Your KitCart verification code",
    text: `Your KitCart verification code is ${code}.

Enter it on the KitCart signup screen within 10 minutes. Do not share this code.

If you didn't request this, you can ignore this email.`,
    html: `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#eef0fa;font-family:Arial,Helvetica,sans-serif;color:#11142b;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Finish setting up your KitCart account. Your code expires in 10 minutes.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eef0fa;">
<tr><td align="center" style="padding:32px 14px;">
<!--[if mso]><table role="presentation" width="540" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:540px;">
<tr><td style="padding:24px 26px;background-color:#11142b;border-radius:18px 18px 0 0;">
<span style="color:#f7f8fc;font-size:25px;font-weight:700;">Kit<span style="color:#a8a2ff;">Cart</span></span>
</td></tr>
<tr><td style="padding:28px 26px;background-color:#ffffff;border-radius:0 0 18px 18px;">
<p style="margin:0 0 10px;color:#5342b4;font-size:12px;font-weight:700;letter-spacing:1.5px;">ACCOUNT VERIFICATION</p>
<h1 style="margin:0 0 12px;font-size:28px;line-height:1.25;color:#11142b;">Verify your email</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:1.55;color:#424662;">Enter the code below on the KitCart signup screen to create your account.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr><td align="center" style="padding:16px 8px;background-color:#efedff;border:1px solid #d5ceff;border-radius:12px;">
<p style="margin:0;font-family:Consolas,Monaco,monospace;font-size:34px;line-height:1.25;font-weight:700;letter-spacing:4px;color:#21165e;">${code}</p>
</td></tr>
</table>
<p style="margin:18px 0 0;font-size:14px;line-height:1.55;color:#424662;">This code expires in <strong>10 minutes</strong>. Don&rsquo;t share it with anyone.</p>
<p style="margin:22px 0 0;padding-top:16px;border-top:1px solid #e4e6f2;font-size:13px;line-height:1.55;color:#535870;">Didn&rsquo;t request this? You can ignore this email.</p>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`,
  };
}

export async function startSignup(input: Record<string, unknown>) {
  const delivery = settings();
  const { secret } = delivery;
  const field = (name: string) => typeof input[name] === "string" ? input[name] : "";
  const email = field("email").trim().toLowerCase();
  const username = field("username").trim();
  const password = field("password");
  const dob = field("dateOfBirth");
  const country = field("phoneCountry");
  const national = field("phone").trim();
  const selected = /^[A-Z]{2}$/.test(country) && isSupportedCountry(country as CountryCode)
    ? country as CountryCode : undefined;
  const parsed = selected && national.length <= 32 && /^\+?[0-9() .-]+$/.test(national)
    ? parsePhoneNumber(national, { defaultCountry: selected, extract: false }) : undefined;
  const phone = parsed && selected ? phoneDetails(parsed.number, selected) : null;

  if (!validEmail(email)) throw new SignupError("Enter a valid email address.", 400, "email");
  if (!validUsername(username)) throw new SignupError("Use 1–50 letters or numbers, starting with a letter.", 400, "username");
  if (!phone) throw new SignupError("Choose a country calling code and enter a valid number for that country.");
  if (!validDob(dob)) throw new SignupError("Choose a valid date of birth.");
  if (password !== field("confirmPassword") || !isValidPassword(password)) {
    throw new SignupError("Check that your passwords match and meet the password requirements.");
  }

  const id = randomUUID();
  const code = String(randomInt(1_000_000)).padStart(6, "0");
  await transaction(async (db) => {
    // Cap the total number of signup sends across addresses during local testing.
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended('kitcart:signup:mail', 0))");
    await lockEmail(db, email);
    await assertSignupAvailable(db, email, username);
    const recent = await db.query<{ total: number; count: number; cooling: boolean }>(
      `SELECT count(*)::int AS total, count(*) FILTER (WHERE destination = $1)::int AS count,
           coalesce(bool_or(destination = $1 AND resend_available_at > now()), false) AS cooling
       FROM public.verification_challenges
       WHERE channel = 'email' AND purpose = 'signup'
         AND created_at > now() - interval '30 minutes'`, [email],
    );
    if (recent.rows[0].total >= 20 || recent.rows[0].count >= 3 || recent.rows[0].cooling) {
      throw new SignupError("Wait before requesting another code. You can request up to three in 30 minutes.", 429);
    }

    const hash = await hashPassword(password);
    await db.query(
      `UPDATE public.verification_challenges SET consumed_at = now()
       WHERE destination = $1 AND channel = 'email' AND purpose = 'signup' AND consumed_at IS NULL`, [email],
    );
    const pending = await db.query<{ id: string }>(
      `INSERT INTO public.pending_registrations
         (username, email, phone_number, password_hash, date_of_birth, expires_at)
       VALUES ($1, $2, $3, $4, $5::date, now() + interval '10 minutes') RETURNING id`,
      [username, email, phone.number, hash, dob],
    );
    await db.query(
      `INSERT INTO public.verification_challenges
         (id, pending_registration_id, channel, purpose, destination, code_hash,
          expires_at, resend_available_at)
       VALUES ($1, $2, 'email', 'signup', $3, $4, now() + interval '10 minutes',
               now() + interval '60 seconds')`, [id, pending.rows[0].id, email, digest(secret, id, code)],
    );
    await db.query(
      `DELETE FROM public.pending_registrations
       WHERE lower(email) = $1 AND expires_at < now() - interval '30 minutes'`, [email],
    );
  });

  try {
    await sendOtpEmail(delivery, email, signupEmail(code));
  } catch {
    throw new SignupError("Could not send the code. Wait one minute and try again.", 502);
  }

  return id;
}

export async function verifySignup(id: string, code: string) {
  const { secret } = settings();
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(id) || !/^\d{6}$/.test(code)) {
    throw new SignupError(rejectedCode);
  }

  let success: boolean;
  try {
    success = await transaction(async (db) => {
      const lookup = await db.query<{ destination: string }>(
        `SELECT destination FROM public.verification_challenges
         WHERE id = $1 AND channel = 'email' AND purpose = 'signup'`, [id],
      );
      const email = lookup.rows[0]?.destination;
      if (!email) return false;
      await lockEmail(db, email);
      const result = await db.query<{
        code_hash: string; username: string; phone_number: string; password_hash: string; dob: string;
        pending_id: string;
      }>(
        `SELECT v.code_hash, p.username, p.phone_number, p.password_hash,
                p.date_of_birth::text AS dob, p.id AS pending_id
         FROM public.verification_challenges v
         JOIN public.pending_registrations p ON p.id = v.pending_registration_id
         WHERE v.id = $1 AND v.channel = 'email' AND v.purpose = 'signup'
           AND v.destination = $2 AND p.email = $2 AND v.consumed_at IS NULL
           AND p.completed_at IS NULL AND v.expires_at > now() AND p.expires_at > now()
           AND v.attempts < v.max_attempts
         FOR UPDATE OF v, p`, [id, email],
      );
      const row = result.rows[0];
      if (!row) return false;
      const expected = Buffer.from(row.code_hash, "hex");
      const actual = Buffer.from(digest(secret, id, code), "hex");
      if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
        await db.query("UPDATE public.verification_challenges SET attempts = attempts + 1 WHERE id = $1", [id]);
        return false;
      }
      const phone = phoneDetails(row.phone_number);
      if (!phone || !validDob(row.dob ?? "")) return false;
      await assertSignupAvailable(db, email, row.username);
      const user = await db.query<{ id: string }>(
        "INSERT INTO public.users (email, email_verified_at) VALUES ($1, now()) RETURNING id", [email],
      );
      const userId = user.rows[0].id;
      await db.query(
        `INSERT INTO public.user_profiles
           (user_id, username, phone_number, date_of_birth, phone_country_iso2, phone_country_name, phone_calling_code)
         VALUES ($1, $2, $3, $4::date, $5, $6, $7)`,
        [userId, row.username, phone.number, row.dob, phone.iso2, phone.name, phone.callingCode],
      );
      await db.query("INSERT INTO public.password_credentials (user_id, password_hash) VALUES ($1, $2)",
        [userId, row.password_hash]);
      // Consume this code and any other outstanding signup codes for the same email.
      await db.query(
        `UPDATE public.verification_challenges SET consumed_at = now()
         WHERE destination = $1 AND channel = 'email' AND purpose = 'signup' AND consumed_at IS NULL`, [email],
      );
      await db.query(
        `UPDATE public.pending_registrations SET completed_at = now()
         WHERE id = $1`, [row.pending_id],
      );
      return true;
    });
  } catch (error) {
    const pgError = error as { code?: string; constraint?: string };
    if (pgError.code === "23505") {
      if (pgError.constraint === "idx_username_unique") throw new SignupError(usernameInUse, 409, "username");
      throw new SignupError("That username or phone number is already in use. Start signup again with different details.", 409);
    }
    throw error;
  }
  if (!success) throw new SignupError(rejectedCode);
}
