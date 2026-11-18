import { isValidPassword } from "@/lib/auth/password";
import { completeReset, normalizeResetEmail, resetSettings, sendReset } from "@/lib/auth/password-reset";

export async function POST(request: Request) {
  const reply = (body: object, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  const site = request.headers.get("sec-fetch-site");
  if ((site && site !== "same-origin") ||
      !request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return reply({ error: "Open password recovery directly from KitCart." }, 403);
  }
  let data: Record<string, unknown>;
  try {
    const body = await request.text();
    if (body.length > 2048) return reply({ error: "Invalid request." }, 400);
    data = JSON.parse(body);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
  } catch {
    return reply({ error: "Invalid request." }, 400);
  }

  const email = normalizeResetEmail(data.email);
  if (!email) return reply({ error: "Enter a valid email address." }, 400);
  const settings = resetSettings();
  if (!settings) return reply({ error: "Email recovery is not available in this environment." }, 503);

  if (data.action === "start") {
    try {
      // Detailed eligibility feedback is only reachable in local development.
      const result = await sendReset(email, settings);
      if (result === "ineligible") {
        return reply({ error: "No KitCart password account can be reset with this email. Check the address or sign in with the provider you used to join." }, 400);
      }
      if (result === "limited") {
        return reply({ error: "A code may already be in your inbox. If you need a new one, wait before requesting it again." }, 429);
      }
      return reply({ sent: true });
    } catch {
      console.error("KitCart could not process a password reset email.");
      return reply({ error: "KitCart couldn’t send a reset code right now. Try again in a minute." }, 503);
    }
  }

  if (data.action !== "complete" || typeof data.code !== "string" ||
      typeof data.password !== "string" || !isValidPassword(data.password) ||
      data.password !== data.confirmPassword) {
    return reply({ error: "Check that the new passwords match and meet the password requirements." }, 400);
  }
  try {
    const result = await completeReset(email, data.code, data.password, settings);
    if (result === "same-password") {
      return reply({ error: "Choose a password different from your current one. You can still use this reset code before it expires." }, 422);
    }
    if (result === "updated") {
      return reply({ message: "Password updated." });
    }
    return reply({ error: "That reset code is invalid, expired, or already used. Request a new code if needed." }, 400);
  } catch {
    return reply({ error: "KitCart could not reset your password. Try again later." }, 503);
  }
}
