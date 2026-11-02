
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

async function AccountContent() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <section className="kc-glass rounded-3xl p-8 w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-3">
          Welcome to KitCart!
        </h1>

        <p className="mb-2">
          Google authentication was successful.
        </p>

        <p className="mb-6 text-sm opacity-75">
          Signed in as {session.user.email ?? session.user.name}
        </p>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="kc-primary-button">
            Sign Out
          </button>
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
