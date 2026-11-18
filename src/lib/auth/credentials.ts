import "server-only";

import { getDb } from "../db";
import { isValidPassword, verifyPassword } from "./password";

const dummyHash = "$argon2id$v=19$m=65536,t=3,p=1$RelXgufWDWw0uvTu/xItMg$cyfV6I/clSvt3dssdHmZjb40aeCAeui8CfVGkpbdZe0";

export async function authorizeCredentials(input: Partial<Record<string, unknown>>) {
  const identifier = typeof input.username === "string" ? input.username.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const byEmail = identifier.includes("@");
  const validIdentifier = byEmail
    ? identifier.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(identifier)
    : /^[a-z][a-z0-9]{0,49}$/.test(identifier);
  if (!validIdentifier || !isValidPassword(password)) return null;

  const db = await getDb().connect();
  let discard = false;
  try {
    await db.query("BEGIN");
    // ponytail: serialize password checks for the local rollout. Replace the global gate
    // with a shared per-IP and per-identity limiter before exposing this publicly.
    const gate = await db.query<{ allowed: boolean }>(
      "SELECT pg_try_advisory_xact_lock(hashtextextended('kitcart:credentials', 0)) AS allowed",
    );
    if (!gate.rows[0].allowed) {
      await db.query("ROLLBACK");
      return null;
    }
    const result = await db.query<{
      id: string; email: string; display_name: string | null;
      username: string; password_hash: string; password_version: string;
    }>(
      `SELECT u.id, u.email, u.display_name, p.username, c.password_hash, extract(epoch FROM c.password_updated_at)::text AS password_version
       FROM public.user_profiles AS p JOIN public.users AS u ON u.id = p.user_id
       JOIN public.password_credentials AS c ON c.user_id = u.id
       WHERE CASE WHEN $2::boolean THEN lower(u.email) = $1 ELSE lower(p.username) = $1 END
         AND u.is_active AND u.email_verified_at IS NOT NULL
       ORDER BY u.id LIMIT 2 FOR SHARE OF u, c`, [identifier, byEmail],
    );
    const user = result.rows.length === 1 ? result.rows[0] : undefined;
    const limit = await db.query<{ total: number; failures: number }>(
      `SELECT count(*) FILTER (WHERE created_at > now() - interval '1 minute')::int AS total,
              count(*) FILTER (WHERE user_id IS NOT DISTINCT FROM $1::uuid
                  AND event_type = 'login_failed')::int AS failures
       FROM public.login_events
       WHERE provider = 'credentials' AND created_at > now() - interval '10 minutes'`,
      [user?.id ?? null],
    );

    if (limit.rows[0].total >= 40 || limit.rows[0].failures >= 8) {
      await db.query("ROLLBACK");
      return null;
    }
    const valid = await verifyPassword(password, user?.password_hash ?? dummyHash);
    await db.query(
      "INSERT INTO public.login_events (user_id, provider, event_type) VALUES ($1, 'credentials', $2)",
      [user?.id ?? null, valid && user ? "login_success" : "login_failed"],
    );
    await db.query("COMMIT");
    return valid && user ? { id: user.id, email: user.email, name: user.display_name ?? user.username, passwordVersion: user.password_version } : null;
  } catch (error) {
    try { await db.query("ROLLBACK"); } catch { discard = true; }
    throw error;
  } finally {
    db.release(discard);
  }
}

export async function credentialSessionCurrent(userId: string, version: string) {
  const result = await getDb().query(
    `SELECT 1 FROM public.password_credentials c JOIN public.users u ON u.id = c.user_id
     WHERE u.id = $1 AND u.is_active AND u.email_verified_at IS NOT NULL
       AND extract(epoch FROM c.password_updated_at)::text = $2`, [userId, version],
  );
  return result.rowCount === 1;
}
