"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Eye, EyeOff, Info, Mail, Phone, ShieldCheck, X } from "lucide-react";
import { useAuthRobot } from "@/components/auth/AuthShell";
import CodeSlots from "@/components/auth/CodeSlots";
import "@/styles/signup-modal.css";

type Channel = "email" | "phone";
const passwordValid = (s: string) => /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,15}$/.test(s);

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [notice, setNotice] = useState("");
  const [step, setStep] = useState<"choose" | "code">("choose");
  const [channel, setChannel] = useState<Channel>("email");
  const [code, setCode] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { setUsernameFocused, setPasswordVisible, passwordVisible: visible, sad, wave } = useAuthRobot();
  const modalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (modalTimer.current) clearTimeout(modalTimer.current); }, []);

  function checkMismatch() {
    if (!confirm || password === confirm) return;
    setNotice("Passwords do not match.");
    sad();
  }

  useEffect(() => {
    if (step === "code") dialogRef.current?.querySelector<HTMLInputElement>(".kc-otp-input")?.focus();
  }, [step]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(username)) return setNotice("Username must begin with a letter and contain only letters and numbers.");
    if (!/^\+[1-9]\d{7,14}$/.test(phone.replace(/[\s()-]/g, ""))) return setNotice("Enter your phone with country code, for example +91 98765 43210.");
    if (!passwordValid(password)) return setNotice("Password must contain 8–15 characters, one uppercase letter, one number and one special character.");
    if (password !== confirm) {
      checkMismatch();
      return;
    }
    setNotice("");
    setChannel("email");
    setStep("choose");
    setCode("");
    wave();
    if (modalTimer.current) clearTimeout(modalTimer.current);
    modalTimer.current = setTimeout(() => dialogRef.current?.showModal(), 900);
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  return (
    <>
      <section className="kc-glass kc-auth-card kc-enter" aria-label="Create a KitCart account">
          <span className="kc-eyebrow"><ShieldCheck size={13} /> JOIN THE KITCART FAMILY</span>
          <h1 className="kc-heading">Create your account<span>.</span></h1>
          <p className="kc-subtitle">Create an account with your email and phone number.</p>

          <form className="kc-form kc-signup-form" onSubmit={submit}>
            <div><label className="kc-field-label" htmlFor="signup-username">Username</label><input id="signup-username" name="username" className="kc-input" required autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} onFocus={() => setUsernameFocused(true)} onBlur={() => setUsernameFocused(false)} placeholder="Choose a username" /></div>
            <div><label className="kc-field-label" htmlFor="signup-email">Email address</label><input id="signup-email" name="email" className="kc-input" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
            <div><label className="kc-field-label" htmlFor="signup-phone">Phone number</label><input id="signup-phone" name="phone" className="kc-input" type="tel" autoComplete="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" /></div>
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
            {notice && <p className="kc-feedback" role="alert">{notice}</p>}
            <button className="kc-primary-button" type="submit">Create Account <span className="kc-small-arrow" aria-hidden="true">→</span></button>
          </form>
          <p className="kc-footer">Already have an account? <Link href="/login" onClick={wave}>Sign In</Link></p>
          <p className="kc-notice">Interface preview only. No account is created and no OTP is sent.</p>
      </section>

      <dialog ref={dialogRef} className="kc-glass kc-otp-dialog" aria-labelledby="kc-otp-title" aria-describedby="kc-otp-description" onClose={() => { setStep("choose"); setCode(""); }} onClick={e => { if (e.target === e.currentTarget) closeDialog(); }}>
        <div className="kc-otp-dialog-content">
          <button className="kc-modal-close" type="button" onClick={closeDialog} aria-label="Close verification"><X size={20} /></button>
          <span className="kc-verify-icon"><ShieldCheck size={27} /></span>
          {step === "choose" ? (
            <>
              <h2 id="kc-otp-title" className="kc-heading">Choose OTP delivery<span>.</span></h2>
              <p id="kc-otp-description" className="kc-subtitle">Both contact details are required. Where would you like to receive your verification code?</p>
              <div className="kc-otp-methods" role="group" aria-label="OTP delivery channel">
                <button className="kc-otp-method" aria-pressed={channel === "email"} onClick={() => setChannel("email")} type="button"><Mail size={23} /><strong>Email</strong><small>{email}</small></button>
                <button className="kc-otp-method" aria-pressed={channel === "phone"} onClick={() => setChannel("phone")} type="button"><Phone size={23} /><strong>Phone</strong><small>{phone}</small></button>
              </div>
              <button className="kc-primary-button" type="button" onClick={() => { setCode(""); setStep("code"); }}>Continue to OTP preview →</button>
              <p className="kc-notice" role="status">Preview only — no email or SMS will be sent until authentication is connected.</p>
            </>
          ) : (
            <>
              <h2 id="kc-otp-title" className="kc-heading">Verify your account<span>.</span></h2>
              <p id="kc-otp-description" className="kc-subtitle">{channel === "email" ? "Email" : "Phone"} selected: <strong>{channel === "email" ? email : phone}</strong></p>
              <div className="kc-code-wrapper"><CodeSlots value={code} onChange={setCode} length={6} /></div>
              <button className="kc-primary-button" type="button" disabled title="Real OTP verification is not connected">Verify &amp; Continue</button>
              <p className="kc-notice" role="status">{code.length === 6 ? "Code entered; verification is not connected yet." : "OTP preview only — no code has been sent."}</p>
              <div className="kc-verify-actions"><button type="button" onClick={() => { setCode(""); setStep("choose"); }}>Change delivery method</button><button type="button" disabled title="OTP delivery is not connected">Resend code</button></div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
