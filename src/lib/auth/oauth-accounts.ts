import "server-only";

import { getDb } from "../db";

type OAuthIdentity = {
  provider: "google" | "facebook" | "github";
  providerAccountId: string;
  email: string | null;
  emailVerified: boolean;
  googleControlsEmail: boolean;
  displayName: string | null;
  imageUrl: string | null;
};

export async function resolveOAuthUser(identity: OAuthIdentity): Promise<string> {
  const { provider, providerAccountId, email, emailVerified, displayName, imageUrl } = identity;
  const db = await getDb().connect();

  let discard = false;
  try {
    await db.query("BEGIN");

    // Serialize sign-ins for this provider subject, then coordinate with email signup.
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
      `${provider}:${providerAccountId}`,
    ]);

    const linkEmail = provider === "google" && emailVerified && identity.googleControlsEmail ? email : null;
    if (linkEmail) {
      await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`signup:${linkEmail}`]);
    }

    const { rows: [existing] } = await db.query<{
      id: string; is_active: boolean; email: string | null; email_verified: boolean; social_only: boolean;
    }>(
      `SELECT u.id, u.is_active, lower(u.email) AS email, u.email_verified_at IS NOT NULL AS email_verified,
              NOT EXISTS (SELECT 1 FROM public.password_credentials c WHERE c.user_id = u.id)
              AND NOT EXISTS (SELECT 1 FROM public.oauth_accounts other WHERE other.user_id = u.id AND other.id <> a.id) AS social_only
       FROM public.oauth_accounts AS a
       JOIN public.users AS u ON u.id = a.user_id
       WHERE a.provider = $1 AND a.provider_account_id = $2
       FOR UPDATE OF a, u`,
      [provider, providerAccountId],
    );

    if (existing && !existing.is_active) throw new Error("Inactive KitCart account");

    let userId = existing?.id;
    // When fixing an old duplicate, only move the verified Google link from a
    // matching social-only record. Never overwrite either user's profile.
    if (linkEmail && (!existing || (existing.social_only && existing.email_verified && existing.email === linkEmail))) {
      const { rows: candidates } = await db.query<{ id: string; is_active: boolean; google_subject: string | null }>(
        `SELECT u.id, u.is_active, g.provider_account_id AS google_subject
         FROM public.users u
         JOIN public.password_credentials c ON c.user_id = u.id
         LEFT JOIN public.oauth_accounts g ON g.user_id = u.id AND g.provider = 'google'
         WHERE lower(u.email) = $1 AND u.email_verified_at IS NOT NULL
         ORDER BY u.id LIMIT 2 FOR UPDATE OF u`,
        [linkEmail],
      );

      if (candidates.length > 1) throw new Error("Ambiguous KitCart account");
      const candidate = candidates[0];
      if (candidate) {
        if (!candidate.is_active || (candidate.google_subject && candidate.google_subject !== providerAccountId)) {
          throw new Error("Cannot link this KitCart account");
        }
        userId = candidate.id;
        if (existing && existing.id !== userId) {
          await db.query(
            "UPDATE public.oauth_accounts SET user_id = $1 WHERE provider = $2 AND provider_account_id = $3",
            [userId, provider, providerAccountId],
          );
        }
      }
    }

    if (!existing) {
      if (!userId) {
        const { rows: [created] } = await db.query<{ id: string }>(
          `INSERT INTO public.users (email, email_verified_at, display_name, image_url)
           VALUES ($1, CASE WHEN $2::boolean THEN NOW() END, $3, $4)
           RETURNING id`,
          [email, emailVerified, displayName, imageUrl],
        );
        userId = created.id;
      }
      await db.query(
        `INSERT INTO public.oauth_accounts (user_id, provider, provider_account_id)
         VALUES ($1, $2, $3)`,
        [userId, provider, providerAccountId],
      );
    }

    if (!userId) throw new Error("Missing KitCart account");
    await db.query("COMMIT");
    return userId;
  } catch (error) {
    try {
      await db.query("ROLLBACK");
    } catch {
      discard = true;
    }
    throw error;
  } finally {
    db.release(discard);
  }
}
