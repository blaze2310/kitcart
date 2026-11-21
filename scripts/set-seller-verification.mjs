import pg from "pg";

const [email, identity, payout] = process.argv.slice(2);
const valid = ["not_started", "pending", "needs_attention", "verified"];
if (!email?.includes("@") || !valid.includes(identity) || !valid.includes(payout) || !process.env.DATABASE_URL?.trim()) {
  console.error("Usage: node --env-file=.env.local scripts/set-seller-verification.mjs EMAIL IDENTITY_STATUS PAYOUT_STATUS");
  console.error(`Allowed statuses: ${valid.join(", ")}`);
  process.exit(1);
}
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
try {
  await db.connect();
  const result = await db.query(
    `INSERT INTO public.seller_verifications (user_id, identity_status, payout_status)
     SELECT id, $2, $3 FROM public.users WHERE lower(email) = lower($1) AND is_active
     ON CONFLICT (user_id) DO UPDATE SET identity_status = EXCLUDED.identity_status,
     payout_status = EXCLUDED.payout_status, updated_at = now()`, [email.trim(), identity, payout],
  );
  if (!result.rowCount) { console.error("No active KitCart account matched that email."); process.exitCode = 1; }
  else console.log("Seller verification updated.");
} catch (error) {
  console.error(`Verification update failed (${error?.code ?? "unknown"}).`);
  process.exitCode = 1;
} finally { await db.end(); }
