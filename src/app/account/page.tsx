import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import CleanOAuthHash from "@/features/auth/components/CleanOAuthHash";
import { getDb } from "@/lib/db";
import { normalizePhone, phoneCountries } from "@/lib/auth/phone-country";
import ProfileForm, { type FormState } from "./ProfileForm";
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

  if (!/^[A-Za-z][A-Za-z0-9]{0,49}$/.test(username)) {
    return error("Choose a username up to 50 characters that starts with a letter and uses only letters and numbers.");
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
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const result = await getDb().query<{
    username: string | null;
    phone: string | null;
    phone_country_iso2: string | null;
    date_of_birth: string | null;
    email_verified: boolean;
  }>(
    `SELECT p.username, p.phone_number AS phone, p.phone_country_iso2,
            to_char(p.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
            u.email_verified_at IS NOT NULL AS email_verified
     FROM public.users AS u
     LEFT JOIN public.user_profiles AS p ON p.user_id = u.id
     WHERE u.id = $1 AND u.is_active`,
    [session.user.id],
  );

  const profile = result.rows[0];
  if (!profile) redirect("/login");

  const complete = Boolean(profile.username && profile.phone && profile.phone_country_iso2 && profile.date_of_birth);

  return (
    <main className="kc-profile min-h-screen flex items-center justify-center px-6 py-12">
      <CleanOAuthHash />
      <section className="kc-glass rounded-3xl p-8 w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-3">
          {complete ? "Welcome to KitCart!" : "Complete your profile"}
        </h1>

        {complete ? (
          <p className="mb-6 text-sm opacity-75">Signed in as {profile.username}</p>
        ) : (
          <>
            <p className="mb-4 text-sm opacity-75">
              Add any missing details to finish setting up your KitCart account.
            </p>
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
          </>
        )}

        {!profile.email_verified && (
          <p className="mb-4 text-sm opacity-75">Your email is not verified in KitCart yet.</p>
        )}

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="kc-primary-button">Sign Out</button>
        </form>
      </section>
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
