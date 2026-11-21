import { isValidUsername, USERNAME_MESSAGE } from "@/lib/auth/username";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import { auth } from "@/auth";
import { signOutToLogin } from "@/features/auth/actions/sign-out";
import { getDb } from "@/lib/db";
import { normalizePhone, phoneCountries } from "@/lib/auth/phone-country";
import ProfileForm, { type FormState } from "./ProfileForm";
import ProfilePhoto from "./ProfilePhoto";
import styles from "./account.module.css";
import "@/features/auth/styles/signup-modal.css";
import "@/features/auth/styles/profile-phone.css";

const firstBirthDate = "1900-01-01";

function todayInIndia(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function validBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < firstBirthDate || value > todayInIndia()) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function saveProfile(_previous: FormState, data: FormData): Promise<FormState> {
  "use server";

  const userId = (await auth())?.user?.id;
  if (!userId) redirect("/login");

  function field(name: string) {
    const value = data.get(name);
    return typeof value === "string" ? value.trim() : "";
  }

  const username = field("username");
  const phone = field("phone");
  const phoneCountry = field("phoneCountry");
  const dateOfBirth = field("dateOfBirth");
  const values = {
    username: username.slice(0, 50),
    phone: phone.slice(0, 32),
    phoneCountry: phoneCountry.slice(0, 2),
    dateOfBirth: dateOfBirth.slice(0, 10),
  };
  const error = (message: string) => ({ error: message, values });

  if (!isValidUsername(username)) {
    return error(USERNAME_MESSAGE);
  }
  if (!validBirthDate(dateOfBirth)) {
    return error("Choose a real date of birth between 1 January 1900 and today.");
  }

  let accountActive = false;
  try {
    const db = getDb();
    const current = await db.query<{ phone: string | null; phone_country_iso2: string | null }>(
      `SELECT p.phone_number AS phone, p.phone_country_iso2
       FROM public.users AS u
       LEFT JOIN public.user_profiles AS p ON p.user_id = u.id
       WHERE u.id = $1 AND u.is_active`,
      [userId],
    );
    const profile = current.rows[0];
    if (!profile) return error("Your KitCart account is unavailable. Sign out and try again.");

    const selected = profile.phone_country_iso2 ?? phoneCountry;
    const normalized = normalizePhone(phone, selected, profile.phone);
    if (!normalized) {
      return error("Choose a country calling code that matches your phone number.");
    }

    const result = await db.query<{ allowed: boolean }>(
      `WITH active_user AS (
         SELECT id FROM public.users WHERE id = $1 AND is_active FOR UPDATE
       ), saved AS (
         INSERT INTO public.user_profiles AS p (
           user_id, username, phone_number, date_of_birth,
           phone_country_iso2, phone_country_name, phone_calling_code
         )
         SELECT id, $2, $3, $4::date, $5, $6, $7 FROM active_user
         ON CONFLICT (user_id) DO UPDATE SET
           username = COALESCE(p.username, EXCLUDED.username),
           phone_number = COALESCE(p.phone_number, EXCLUDED.phone_number),
           date_of_birth = COALESCE(p.date_of_birth, EXCLUDED.date_of_birth),
           phone_country_iso2 = COALESCE(p.phone_country_iso2, EXCLUDED.phone_country_iso2),
           phone_country_name = COALESCE(p.phone_country_name, EXCLUDED.phone_country_name),
           phone_calling_code = COALESCE(p.phone_calling_code, EXCLUDED.phone_calling_code),
           updated_at = now()
         WHERE (p.phone_number IS NULL OR p.phone_number = EXCLUDED.phone_number)
           AND (p.username IS NULL OR p.phone_number IS NULL OR p.date_of_birth IS NULL
             OR p.phone_country_iso2 IS NULL)
       )
       SELECT EXISTS (SELECT 1 FROM active_user) AS allowed`,
      [userId, username, normalized.number, dateOfBirth, normalized.iso2, normalized.name, normalized.callingCode],
    );
    accountActive = result.rows[0]?.allowed === true;
  } catch (cause) {
    const dbError = cause as { code?: string; constraint?: string };
    if (dbError.code === "23505" && dbError.constraint === "idx_username_unique") {
      return error("That username is taken. Choose another one.");
    }
    if (dbError.code === "23505" && dbError.constraint === "idx_phone_unique") {
      return error("That phone number cannot be used. Enter a different number.");
    }
    return error("KitCart could not save your profile. Please try again.");
  }

  if (!accountActive) redirect("/login");
  redirect("/account");
}

async function AccountContent() {
  await connection();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const result = await getDb().query<{
    username: string | null;
    phone: string | null;
    phone_country_iso2: string | null;
    date_of_birth: string | null;
    email_verified: boolean;
    display_name: string | null;
    email: string | null;
    image_url: string | null;
    avatar_version: string | null;
  }>(
    `SELECT p.username, p.phone_number AS phone, p.phone_country_iso2,
            to_char(p.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
            u.email_verified_at IS NOT NULL AS email_verified,
            u.display_name, u.email, u.image_url, a.version AS avatar_version
     FROM public.users AS u
     LEFT JOIN public.user_profiles AS p ON p.user_id = u.id
     LEFT JOIN public.user_avatars AS a ON a.user_id = u.id
     WHERE u.id = $1 AND u.is_active`,
    [session.user.id],
  );

  const profile = result.rows[0];
  if (!profile) redirect("/login");

  const complete = Boolean(profile.username && profile.phone && profile.phone_country_iso2 && profile.date_of_birth);

  const name = profile.display_name || profile.username || "";
  const imageUrl = profile.avatar_version ? `/api/account/photo?v=${profile.avatar_version}`
    : profile.image_url && /^https:\/\//i.test(profile.image_url) ? profile.image_url : null;
  const fields = [
    ["Name", name],
    ["Username", profile.username],
    ["Email address", profile.email],
    ["Phone number", profile.phone],
    ["Date of birth", profile.date_of_birth && new Intl.DateTimeFormat("en-IN", {
      dateStyle: "long",
      timeZone: "UTC",
    }).format(new Date(profile.date_of_birth + "T00:00:00Z"))],
  ];

  return (
    <main className={`kc-profile ${styles.page}`}>
      <div className={styles.wrap}>
        <Link href="/" className={styles.back}><ArrowLeft size={16} aria-hidden="true" /> Back to shop</Link>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>YOUR KITCART ACCOUNT</p>
            <h1>My profile</h1>
            <p>See your account details and personalise your profile.</p>
          </div>
          <form action={signOutToLogin}>
            <button className={styles.action} type="submit"><LogOut size={16} aria-hidden="true" /> Log out</button>
          </form>
        </header>

        <div className={styles.grid}>
          <section className={styles.card} aria-label="Profile photo">
            <ProfilePhoto key={session.user.id} name={name} imageUrl={imageUrl} />
          </section>
          <section className={`${styles.card} ${styles.details}`} aria-labelledby="profile-details">
            <h2 id="profile-details">Personal details</h2>
            {profile.email && !profile.email_verified && <p className={styles.warning}>Your email is not verified in KitCart yet.</p>}
            <dl className={styles.fields}>
              {fields.map(([label, value]) => (
                <div key={label}><dt>{label}</dt><dd>{value || "Not provided"}</dd></div>
              ))}
            </dl>
            {!complete && (
              <div className={styles.setup}>
                <h3>Complete your profile</h3>
                <p className={styles.note}>Add any missing details to finish setting up your KitCart account.</p>
                <ProfileForm
                  save={saveProfile}
                  initial={{
                    username: profile.username ?? "",
                    phone: profile.phone ?? "",
                    phoneCountry: profile.phone_country_iso2 ?? "",
                    dateOfBirth: profile.date_of_birth ?? "",
                  }}
                  countries={phoneCountries}
                />
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <AccountContent />
    </Suspense>
  );
}
