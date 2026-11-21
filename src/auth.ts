import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";

import { authorizeCredentials, credentialSessionCurrent } from "@/lib/auth/credentials";
import { resolveOAuthUser } from "@/lib/auth/oauth-accounts";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google, Facebook, GitHub,
    Credentials({
      credentials: { username: { type: "text" }, password: { type: "password" } },
      async authorize(input) {
        try {
          return await authorizeCredentials(input);
        } catch {
          // Auth.js can log callback request details on uncaught errors.
          console.error("KitCart credentials store unavailable.");
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, account, user, profile }) {
      if (account?.type === "credentials") {
        const version = user && "passwordVersion" in user ? user.passwordVersion : undefined;
        if (!user?.id || typeof version !== "string") return null;
        token.kitcartUserId = user.id;
        token.kitcartPasswordVersion = version;
      } else if (account) {
        token.kitcartPasswordVersion = "social";
        const { provider, providerAccountId } = account;
        if (
          (provider !== "google" && provider !== "facebook" && provider !== "github") ||
          !providerAccountId
        ) {
          throw new Error("Unsupported KitCart sign-in");
        }

        const rawEmail = user.email?.trim().toLowerCase();
        const email = rawEmail && rawEmail.length <= 254 ? rawEmail : null;
        const emailVerified =
          provider === "google" &&
          email !== null &&
          profile?.email_verified === true &&
          typeof profile.email === "string" &&
          profile.email.trim().toLowerCase() === email;

        const googleControlsEmail = emailVerified &&
          (email.endsWith("@gmail.com") || (typeof profile?.hd === "string" && profile.hd.trim().length > 0));

        try {
          token.kitcartUserId = await resolveOAuthUser({
            provider,
            providerAccountId,
            email,
            emailVerified,
            googleControlsEmail,
            displayName: user.name?.trim().slice(0, 150) || null,
            imageUrl: user.image ?? null,
          });
        } catch {
          // Do not pass database errors or provider profile details to Auth.js logs.
          throw new Error("Could not resolve the KitCart account");
        }
      }

      if (typeof token.kitcartPasswordVersion !== "string" || typeof token.kitcartUserId !== "string") return null;
      if (token.kitcartPasswordVersion !== "social") {
        try {
          if (!(await credentialSessionCurrent(token.kitcartUserId, token.kitcartPasswordVersion))) return null;
        } catch {
          return null;
        }
      }
      return typeof token.kitcartUserId === "string" ? token : null;
    },

    session({ session, token }) {
      if (typeof token.kitcartUserId !== "string") {
        throw new Error("Missing KitCart session identity");
      }
      session.user.id = token.kitcartUserId;
      return session;
    },
  },
});
