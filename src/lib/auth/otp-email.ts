import "server-only";

export function otpEmailSettings() {
  const key = process.env.BREVO_API_KEY?.trim();
  const sender = process.env.BREVO_SENDER_EMAIL?.trim();
  const secret = process.env.AUTH_SECRET?.trim();

  if (process.env.NODE_ENV !== "development" || !key || !secret ||
      !sender || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(sender)) return null;

  return { key, sender, secret };
}

type Settings = NonNullable<ReturnType<typeof otpEmailSettings>>;

export async function sendOtpEmail(
  { key, sender }: Settings,
  recipient: string,
  { subject, text, html }: { subject: string; text: string; html: string },
) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "KitCart", email: sender },
      to: [{ email: recipient }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (response.status !== 201) {
    console.error("Brevo rejected KitCart OTP delivery (HTTP %d).", response.status);
    throw new Error("KitCart OTP email not accepted");
  }
}
