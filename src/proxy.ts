export { auth as proxy } from "@/auth";

// Renew sessions for page navigations, not for assets, prefetches or
// server actions. Late asset responses must not restore a logged-out cookie.
export const config = {
  matcher: [{
    source: "/((?!api(?:/|$)|_next(?:/|$)).*)",
    has: [{ type: "header", key: "sec-fetch-dest", value: "document" }],
  }],
};
