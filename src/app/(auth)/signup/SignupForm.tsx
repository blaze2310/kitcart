"use client";

import { USERNAME_MESSAGE, USERNAME_PATTERN, isValidUsername } from "@/lib/auth/username";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Info, Mail, Phone, ShieldCheck, X } from "lucide-react";
import { useAuthRobot } from "@/features/auth/components/AuthShell";
import BirthDatePicker, { isValidBirthDate } from "@/features/auth/components/BirthDatePicker";
import PhoneCountryPicker, { type PhoneCountry } from "@/features/auth/components/PhoneCountryPicker";
import "@/features/auth/styles/profile-phone.css";
import CodeSlots from "@/features/auth/components/CodeSlots";
import "@/features/auth/styles/signup-modal.css";

type IdentityField = "email" | "username";
type CheckResult = { error?: string; field?: IdentityField; available?: boolean };

async function checkIdentity(input: Partial<Record<IdentityField, string>>, signal: AbortSignal) {
  const response = await fetch("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "check", ...input }),
    signal,
  });
  return await response.json() as CheckResult;
}

const passwordValid = (s: string) => /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,15}$/.test(s);

export default function SignupForm({ countries }: { countries: PhoneCountry[] }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [birthDateInvalid, setBirthDateInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [notice, setNotice] = useState("");
  const [checking, setChecking] = useState(false);
  const [identityErrors, setIdentityErrors] = useState<Partial<Record<IdentityField, string>>>({});
  const fieldRequests = useRef<Partial<Record<IdentityField, AbortController>>>({});
  const checkingForm = useRef(false);
  const [step, setStep] = useState<"choose" | "code" | "signing-in" | "done">("choose");
  const [challengeId, setChallengeId] = useState("");
  const [otpNotice, setOtpNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const requestInProgress = useRef(false);
  const [code, setCode] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const { setUsernameFocused, setPasswordVisible, passwordVisible: visible, sad, wave } = useAuthRobot();

  useEffect(() => {
    if (notice) noticeRef.current?.scrollIntoView({ block: "nearest" });
  }, [notice]);

  function checkMismatch() {
    if (!confirm || password === confirm) return;
    setNotice("Passwords do not match.");
    sad();
  }

  useEffect(() => {
    if (step === "code") dialogRef.current?.querySelector<HTMLInputElement>(".kc-otp-input")?.focus();
  }, [step]);

  function updateIdentity(field: IdentityField, value: string) {
    fieldRequests.current[field]?.abort();
    setIdentityErrors(previous => ({ ...previous, [field]: undefined }));
    if (field === "email") setEmail(value);
    else setUsername(value);
  }

  async function checkField(field: IdentityField, value: string) {
    if (checkingForm.current || !value.trim()) return;
    fieldRequests.current[field]?.abort();
    const controller = new AbortController();
    fieldRequests.current[field] = controller;
    try {
      const result = await checkIdentity({ [field]: value }, AbortSignal.any([controller.signal, AbortSignal.timeout(8_000)]));
      if (!controller.signal.aborted && result.field === field) {
        setIdentityErrors(previous => ({ ...previous, [field]: result.error }));
      }
    } catch {
      // The submit check retries and shows a message if the server is unavailable.
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (checkingForm.current || dialogRef.current?.open) return;
    if (!isValidUsername(username.trim())) return setNotice(USERNAME_MESSAGE);
    if (!phoneCountry) return setNotice("Choose your country calling code.");
    if (!isValidBirthDate(dateOfBirth)) {
      setNotice("");
      setBirthDateInvalid(true);
      event.currentTarget.querySelector<HTMLButtonElement>("#signup-dob")?.focus();
      return;
    }
    if (!passwordValid(password)) return setNotice("Password must contain 8–15 characters, one uppercase letter, one number and one special character.");
    if (password !== confirm) {
      checkMismatch();
      return;
    }
    checkingForm.current = true;
    setChecking(true);
    fieldRequests.current.email?.abort();
    fieldRequests.current.username?.abort();
    setNotice("");
    try {
      const result = await checkIdentity({ email, username }, AbortSignal.timeout(8_000));
      if (result.available !== true) {
        if (result.field && result.error) {
          const { field, error } = result;
          setIdentityErrors(previous => ({ ...previous, [field]: error }));
          requestAnimationFrame(() => form.querySelector<HTMLInputElement>(`#signup-${field}`)?.focus());
        } else {
          setNotice(result.error || "Could not check your details. Please try again.");
        }
        return;
      }
      setIdentityErrors({});
    } catch {
      setNotice("Could not check your details. Please try again.");
      return;
    } finally {
      setChecking(false);
      checkingForm.current = false;
    }
    setChallengeId("");
    setOtpNotice("");
    setStep("choose");
    setCode("");
    wave();
    dialogRef.current?.showModal();
  }

  async function sendOrVerify(action: "start" | "verify") {
    if (requestInProgress.current) return;
    requestInProgress.current = true;
    setBusy(true);
    setOtpNotice("");
    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "start"
          ? { action, username, email, phone, phoneCountry, dateOfBirth, password, confirmPassword: confirm }
          : { action, id: challengeId, code }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409 && (result.field === "email" || result.field === "username")) {
          const field = result.field as IdentityField;
          setIdentityErrors(previous => ({ ...previous, [field]: result.error }));
          dialogRef.current?.close();
          document.getElementById(`signup-${field}`)?.focus();
        } else {
          setOtpNotice(result.error || "KitCart could not complete the request.");
        }
      } else if (action === "start" && typeof result.id === "string") {
        setChallengeId(result.id);
        setCode("");
        if (step === "code") setOtpNotice("A new code has been sent.");
        setStep("code");
      } else if (action === "verify" && result.verified === true) {
        setCode("");
        setPassword("");
        setConfirm("");
        setChallengeId("");
        setStep("signing-in");

        // Reuse the normal credentials sign-in only after signup has been verified.
        try {
          const session = await signIn("credentials", {
            username: username.trim(),
            password,
            redirect: false,
            redirectTo: "/",
          });
          if (session?.ok && !session.error) {
            window.location.assign("/");
            return;
          }
        } catch {
          // The account already exists, even if session creation failed.
        }
        setStep("done");
      }
    } catch {
      setOtpNotice("Could not connect to KitCart. Please try again.");
    } finally {
      requestInProgress.current = false;
      setBusy(false);
    }
  }

  function closeDialog() {
    if (!requestInProgress.current) dialogRef.current?.close();
  }

  const accountCreated = step === "signing-in" || step === "done";

  return (
    <>
      <section className="kc-glass kc-auth-card kc-signup-card kc-enter" aria-label="Create a KitCart account">
          <span className="kc-eyebrow"><ShieldCheck size={13} /> JOIN THE KITCART FAMILY</span>
          <h1 className="kc-heading">Create your account<span>.</span></h1>
          <p className="kc-subtitle">Create an account with your email and phone number.</p>

          <form className="kc-form kc-signup-form" onSubmit={submit}>
            <div className="kc-signup-fields" role="region" aria-label="Sign-up fields">
              <div>
                <label className="kc-field-label" htmlFor="signup-username">Username</label>
                <input id="signup-username" name="username" className="kc-input" required maxLength={50} pattern={USERNAME_PATTERN}
                  autoComplete="username" value={username} readOnly={checking}
                  aria-invalid={!!identityErrors.username} aria-describedby={identityErrors.username ? "signup-username-error" : undefined}
                  onChange={e => updateIdentity("username", e.target.value)} onFocus={() => setUsernameFocused(true)}
                  onBlur={e => { setUsernameFocused(false); void checkField("username", e.currentTarget.value); }}
                  placeholder="Choose a username" />
                {identityErrors.username && <p id="signup-username-error" className="kc-dob-error" role="alert">{identityErrors.username}</p>}
              </div>
              <div>
                <label className="kc-field-label" htmlFor="signup-email">Email address</label>
                <input id="signup-email" name="email" className="kc-input" type="email" autoComplete="email" required maxLength={254}
                  value={email} readOnly={checking}
                  aria-invalid={!!identityErrors.email} aria-describedby={identityErrors.email ? "signup-email-error" : undefined}
                  onChange={e => updateIdentity("email", e.target.value)}
                  onBlur={e => { if (e.currentTarget.validity.valid) void checkField("email", e.currentTarget.value); }}
                  placeholder="you@example.com" />
                {identityErrors.email && <p id="signup-email-error" className="kc-dob-error" role="alert">{identityErrors.email}</p>}
              </div>
              <div className="kc-profile">
                <label className="kc-field-label" htmlFor="signup-phone">Phone number</label>
                <div className="kc-input kc-phone-row">
                  <PhoneCountryPicker
                    countries={countries}
                    value={phoneCountry}
                    onChange={setPhoneCountry}
                    displayedCode={countries.find(({ iso2 }) => iso2 === phoneCountry)?.callingCode ?? ""}
                    locked={false}
                  />
                  <input id="signup-phone" name="phone" className="kc-phone-number" type="tel"
                    autoComplete="tel-national" placeholder="Phone number" required maxLength={32}
                    value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>
              <BirthDatePicker value={dateOfBirth} invalid={birthDateInvalid} onChange={value => { setDateOfBirth(value); setBirthDateInvalid(false); }} />
              <div>
                <div className="kc-password-label">
                  <label className="kc-field-label" htmlFor="signup-password">Password</label>
                  <span className="kc-password-info">
                    <button type="button" className="kc-info-trigger" aria-label="View password requirements" aria-describedby="signup-password-rules"><Info size={16} /></button>
                    <span id="signup-password-rules" role="tooltip" className="kc-password-tooltip">
                      <strong>Password requirements</strong>
                      <span>8–15 characters</span>
                      <span>At least one uppercase letter (A–Z)</span>
                      <span>At least one number (0–9)</span>
                      <span>At least one special character (@, #, $, !, %)</span>
                    </span>
                  </span>
                </div>
                <div className="kc-password">
                  <input id="signup-password" name="password" className="kc-input" type={visible ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={15} value={password} onChange={e => setPassword(e.target.value)} onBlur={() => { setPasswordVisible(false); }} placeholder="Create a password" />
                  <button type="button" className="kc-eye" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onMouseDown={e => e.preventDefault()} onClick={() => setPasswordVisible(!visible)}>{visible ? <EyeOff size={19} /> : <Eye size={19} />}</button>
                </div>
              </div>
              <div><label className="kc-field-label" htmlFor="signup-confirm">Confirm password</label><input id="signup-confirm" name="confirmPassword" className="kc-input" type="password" autoComplete="new-password" required maxLength={15} value={confirm} onChange={e => { setConfirm(e.target.value); if (notice === "Passwords do not match.") setNotice(""); }} onBlur={checkMismatch} placeholder="Confirm your password" /></div>
              {notice && <p ref={noticeRef} className="kc-feedback" role="alert">{notice}</p>}
            </div>
            <button className="kc-primary-button" type="submit" disabled={checking}>{checking ? "Checking details…" : "Create Account"} <span className="kc-small-arrow" aria-hidden="true">→</span></button>
          </form>
          <p className="kc-footer">Already have an account? <Link href="/login" onClick={wave}>Sign In</Link></p>
          <p className="kc-notice">Verify your email to finish creating your account.</p>
      </section>

      <dialog ref={dialogRef} className="kc-glass kc-otp-dialog" aria-labelledby="kc-otp-title" aria-describedby="kc-otp-description" onCancel={e => { if (busy || accountCreated) e.preventDefault(); }}
        onClose={() => { setStep("choose"); setCode(""); setChallengeId(""); setOtpNotice(""); }} onClick={e => { if (e.target === e.currentTarget && !accountCreated) closeDialog(); }}>
        <div className="kc-otp-dialog-content">
          {!accountCreated && <button className="kc-modal-close" type="button" disabled={busy} onClick={closeDialog} aria-label="Close verification"><X size={20} /></button>}
          <span className="kc-verify-icon"><ShieldCheck size={27} /></span>
          {accountCreated ? (
            <>
              <h2 id="kc-otp-title" className="kc-heading">Email verified<span>.</span></h2>
              <p id="kc-otp-description" className="kc-subtitle" role="status">
                {step === "signing-in"
                  ? "Account created. Signing you in…"
                  : "Your account was created, but automatic sign-in didn’t finish. Sign in using your new account."}
              </p>
              {step === "done" && <Link className="kc-primary-button" href="/login">Sign in</Link>}
            </>
          ) : step === "choose" ? (
            <>
              <h2 id="kc-otp-title" className="kc-heading">Verify your email<span>.</span></h2>
              <p id="kc-otp-description" className="kc-subtitle">Send a six-digit code to the email you entered.</p>
              <div className="kc-otp-methods" role="group" aria-label="OTP delivery channel">
                <button className="kc-otp-method" aria-pressed="true" type="button"><Mail size={23} /><strong>Email</strong><small>{email}</small></button>
                <button className="kc-otp-method" disabled type="button"><Phone size={23} /><strong>Phone</strong><small>Not available yet</small></button>
              </div>
              <button className="kc-primary-button" type="button" disabled={busy} onClick={() => void sendOrVerify("start")}>
                {busy ? "Sending…" : "Send email code"}
              </button>
            </>
          ) : (
            <form onSubmit={event => {
              event.preventDefault();
              if (code.length === 6) void sendOrVerify("verify");
            }}>
              <h2 id="kc-otp-title" className="kc-heading">Enter your code<span>.</span></h2>
              <p id="kc-otp-description" className="kc-subtitle">Check <strong>{email}</strong>. The code expires in 10 minutes.</p>
              <div className="kc-code-wrapper"><CodeSlots value={code} onChange={setCode} length={6} /></div>
              <button className="kc-primary-button" type="submit" disabled={busy || code.length !== 6}>
                Verify OTP
              </button>
              <div className="kc-verify-actions">
                <button type="button" disabled={busy} onClick={closeDialog}>Edit signup details</button>
                <button type="button" disabled={busy} onClick={() => void sendOrVerify("start")}>Resend code</button>
              </div>
            </form>
          )}
          {otpNotice && <p className="kc-notice" role="status">{otpNotice}</p>}
        </div>
      </dialog>
    </>
  );
}
