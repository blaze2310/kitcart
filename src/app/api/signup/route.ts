import { SignupError, checkSignup, startSignup, verifySignup } from "@/lib/auth/signup";

export async function POST(request: Request) {
  const reply = (body: object, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (request.headers.get("sec-fetch-site") && request.headers.get("sec-fetch-site") !== "same-origin") {
    return reply({ error: "Open signup directly from KitCart." }, 403);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return reply({ error: "Expected JSON." }, 415);
  }
  let input: Record<string, unknown>;
  try {
    const body = await request.text();
    if (body.length > 4096) throw new Error();
    const payload = JSON.parse(body);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error();
    input = payload;
  } catch {
    return reply({ error: "Invalid signup request." }, 400);
  }
  try {
    if (input.action === "check") {
      await checkSignup(input);
      return reply({ available: true });
    }
    if (input.action === "start") return reply({ id: await startSignup(input) });
    if (input.action === "verify" && typeof input.id === "string" && typeof input.code === "string") {
      await verifySignup(input.id, input.code);
      return reply({ verified: true });
    }
    return reply({ error: "Invalid signup request." }, 400);
  } catch (error) {
    if (error instanceof SignupError) return reply({ error: error.message, field: error.field }, error.status);
    return reply({ error: "KitCart could not complete signup. Please try again." }, 500);
  }
}
