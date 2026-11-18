"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Mail, RotateCw, ShieldCheck } from "lucide-react";
import styles from "./actions.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"start" | "code" | "done">("start");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || step === "done") return;
    const form = new FormData(event.currentTarget);
    const action = step === "start" ? "start" : "complete";
    inFlight.current = true;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "start" ? { action, email } : {
          action, email, code,
          password: form.get("password"),
          confirmPassword: form.get("confirmPassword"),
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const result = await response.json();
      if (!response.ok) {
        setNotice(result.error || "KitCart could not complete the request.");
      } else if (action === "start") {
        if (result.sent === true) {
          setStep("code");
        } else {
          setNotice("KitCart couldn’t send a reset code. Try again.");
        }
      } else {
        setCode("");
        setStep("done");
      }
    } catch {
      setNotice("Could not reach KitCart. Try again.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="kc-glass kc-auth-card kc-signup-card kc-enter" aria-label="Password recovery">
      <span className="kc-eyebrow"><ShieldCheck size={13} /> ACCOUNT SECURITY</span>
      <h1 className="kc-heading">{step === "done" ? "Password updated" : "Reset your password"}<span>.</span></h1>
      {step === "done" ? (
        <>
          <p className="kc-subtitle">Sign in with your KitCart username or email and your new password.</p>
          <Link className="kc-primary-button" href="/login">Back to sign in</Link>
        </>
      ) : (
        <>
          <p className="kc-subtitle">
            {step === "start" ? "Enter the email for your KitCart password account." : "Check your inbox for the latest code. It expires in 10 minutes."}
          </p>
          <form className="kc-form kc-signup-form" onSubmit={submit} autoComplete="off">
            <div className="kc-signup-fields">
              <div>
                <label className="kc-field-label" htmlFor="reset-email">Email address</label>
                <input id="reset-email" type="email" className="kc-input" required autoComplete="off" autoCapitalize="none" spellCheck={false}
                  maxLength={254} value={email} readOnly={busy || step === "code"} onChange={e => { setEmail(e.target.value); setNotice(""); }} />
              </div>
              {step === "code" && (
                <>
                  <div>
                    <label className="kc-field-label" htmlFor="reset-code">8-digit reset code</label>
                    <input id="reset-code" className="kc-input" required inputMode="numeric" autoComplete="one-time-code"
                      pattern="[0-9]{8}" maxLength={8} value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, ""))} />
                  </div>
                  <div>
                    <label className="kc-field-label" htmlFor="reset-password">New password</label>
                    <input id="reset-password" name="password" type="password" className="kc-input" required
                      minLength={8} maxLength={15} autoComplete="new-password" aria-describedby="reset-password-rules" />
                    <p id="reset-password-rules" className="kc-notice">8–15 characters, including an uppercase letter, a number, and a special character.</p>
                  </div>
                  <div>
                    <label className="kc-field-label" htmlFor="reset-confirm">Confirm new password</label>
                    <input id="reset-confirm" name="confirmPassword" type="password" className="kc-input" required
                      minLength={8} maxLength={15} autoComplete="new-password" />
                  </div>
                </>
              )}
            </div>
            {notice && (
              <p className={styles.notice} role="alert">{notice}</p>
            )}
            <button className="kc-primary-button" type="submit" disabled={busy}>
              {busy ? "Please wait…" : step === "start" ? "Send reset code" : "Update password"}
            </button>
            {step === "code" && (
              <div className={styles.actions}>
                <button type="button" className={styles.action} disabled={busy}
                  onClick={() => { setStep("start"); setEmail(""); setCode(""); setNotice(""); }}>
                  <Mail size={16} aria-hidden="true" /> Change email
                </button>
                <button type="button" className={styles.action} disabled={busy}
                  onClick={() => { setStep("start"); setCode(""); setNotice(""); }}>
                  <RotateCw size={16} aria-hidden="true" /> Request another code
                </button>
              </div>
            )}
          </form>
          <div className={styles.footer}>
            <Link href="/login">Back to sign in</Link>
            {step === "start" && <Link href="/signup">Create an account</Link>}
          </div>
        </>
      )}
    </section>
  );
}
