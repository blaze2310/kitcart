import { getDb } from "@/lib/db";
import { auth } from "@/auth";
import { UserRound } from "lucide-react";
import { connection } from "next/server";
import AccountMenu from "./account-menu";
import styles from "./account-menu.module.css";
import navbar from "./home.module.css";

export function AccountNavigationFallback() {
  return <span className={`${navbar.navIcon} ${styles.loading}`} aria-hidden="true"><UserRound size={19} /></span>;
}

export default async function AccountNavigation() {
  await connection();
  const session = await auth();
  const userId = session?.user?.id;
  let avatarUrl: string | null = null;
  if (userId) {
    try {
      const { rows: [row] } = await getDb().query<{ version: string | null; image_url: string | null }>(
        `SELECT a.version, u.image_url FROM public.users u
         LEFT JOIN public.user_avatars a ON a.user_id = u.id WHERE u.id = $1 AND u.is_active`, [userId],
      );
      if (row?.version) avatarUrl = `/api/account/photo?v=${row.version}`;
      else if (row?.image_url && /^https:\/\//i.test(row.image_url)) avatarUrl = row.image_url;
    } catch {
      // Leave the account menu usable if profile storage is unavailable.
    }
  }
  return <AccountMenu key={userId ?? "guest"} signedIn={Boolean(userId)} name={session?.user?.name} avatarUrl={avatarUrl} />;
}
