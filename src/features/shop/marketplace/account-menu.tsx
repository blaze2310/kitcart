"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { CircleHelp, LogOut, UserRound } from "lucide-react";
import { signOutToLogin } from "@/features/auth/actions/sign-out";
import styles from "./account-menu.module.css";
import navbar from "./home.module.css";

export default function AccountMenu({ signedIn, name, avatarUrl }: { signedIn: boolean; name?: string | null; avatarUrl?: string | null }) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  return (
    <div
      className={styles.account}
      ref={container}
      onBlur={event => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={event => {
        if (event.key !== "Escape" || !open) return;
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }}
    >
      <button
        ref={trigger}
        type="button"
        className={`${navbar.navIcon} ${styles.trigger}`}
        aria-label={signedIn ? "Account options" : "Sign in or sign up"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(value => !value)}
      >
        {signedIn && avatarUrl && failedPhoto !== avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- private photo requests need the browser session.
          <img className={styles.photo} src={avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailedPhoto(avatarUrl)} />
        ) : <UserRound size={19} aria-hidden="true" />}
      </button>
      <div className={styles.panel} id={panelId} hidden={!open}>
        <div className={styles.title}>
          <span>{signedIn ? "YOUR ACCOUNT" : "WELCOME TO KITCART"}</span>
          <strong>{signedIn ? name || "KitCart member" : "Make yourself at home."}</strong>
        </div>
        {signedIn ? (
          <>
            <Link className={styles.row} href="/account" onClick={() => setOpen(false)}><UserRound size={17} aria-hidden="true" /> My profile</Link>
            <Link className={styles.row} href="/help" onClick={() => setOpen(false)}><CircleHelp size={17} aria-hidden="true" /> Help &amp; support</Link>
            <form className={styles.signOut} action={signOutToLogin}>
              <button className={styles.row} type="submit"><LogOut size={17} aria-hidden="true" /> Log out</button>
            </form>
          </>
        ) : (
          <>
            <Link className={styles.row} href="/login" onClick={() => setOpen(false)}>Sign in</Link>
            <Link className={`${styles.row} ${styles.primary}`} href="/signup" onClick={() => setOpen(false)}>Create an account</Link>
          </>
        )}
      </div>
    </div>
  );
}
