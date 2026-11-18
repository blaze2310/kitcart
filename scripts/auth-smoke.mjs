import assert from "node:assert/strict";

const base = new URL(process.argv[2] ?? "http://localhost:3000");
if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)) {
  throw new Error("Run the KitCart smoke check against your local server.");
}

for (const [path, title] of [
  ["/signup", "create your account"],
  ["/login", "welcome back"],
  ["/forgot-password", "reset your password"],
]) {
  const response = await fetch(new URL(path, base), {
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(response.status, 200, `${path} did not return HTTP 200`);
  const html = await response.text();
  const heading = html.match(/<h1\b[^>]*>(.*?)<\/h1>/is)?.[1]
    .replace(/<[^>]*>/g, "").trim().toLowerCase();
  assert.ok(heading?.startsWith(title), `${path} is missing the expected heading`);
  if (path === "/signup") {
    assert.match(html, /<button\b[^>]*class="[^"]*kc-phone-country-option[^"]*"[^>]*>\s*<span>[^<]+<\/span>\s*<span>\+\d+<\/span>/,
      "Signup should render country names and calling codes in the initial HTML");
  }
  console.log(`PASS ${path}`);
}
