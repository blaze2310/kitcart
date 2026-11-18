import "server-only";

import { getDb } from "../db";

type OAuthIdentity = {
  provider: "google" | "facebook" | "github";
  providerAccountId: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  imageUrl: string | null;
};

export async function resolveOAuthUser(identity: OAuthIdentity): Promise<string> {
  const { provider, providerAccountId, email, emailVerified, displayName, imageUrl } = identity;
  const db = await getDb().connect();

  let discard = false;
  try {
    await db.query("BEGIN");

    // Serialize first sign-ins for this provider account, not by email.
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
      `${provider}:${providerAccountId}`,
    ]);

    const existing = await db.query<{ id: string; is_active: boolean }>(
      `SELECT u.id, u.is_active
       FROM public.oauth_accounts AS a
       JOIN public.users AS u ON u.id = a.user_id
       WHERE a.provider = $1 AND a.provider_account_id = $2`,
      [provider, providerAccountId],
    );

    let userId = existing.rows[0]?.id;
    if (userId) {
      if (!existing.rows[0].is_active) throw new Error("Inactive KitCart account");
    } else {
      const created = await db.query<{ id: string }>(
        `INSERT INTO public.users (email, email_verified_at, display_name, image_url)
         VALUES ($1, CASE WHEN $2::boolean THEN NOW() END, $3, $4)
         RETURNING id`,
        [email, emailVerified, displayName, imageUrl],
      );

      userId = created.rows[0].id;
      await db.query(
        `INSERT INTO public.oauth_accounts (user_id, provider, provider_account_id)
         VALUES ($1, $2, $3)`,
        [userId, provider, providerAccountId],
      );
    }

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
