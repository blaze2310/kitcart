"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import { Camera, ImagePlus, Trash2, UserRound } from "lucide-react";
import styles from "./account.module.css";

const allowedImages = ["image/jpeg", "image/png", "image/webp"];
const maxImageBytes = 5 * 1024 * 1024;

export default function ProfilePhoto({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const inProgress = useRef(false);
  const [savedPhoto, setSavedPhoto] = useState<string | null | undefined>(undefined);
  const [failed, setFailed] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  const candidate = savedPhoto === undefined ? imageUrl : savedPhoto;
  const photo = candidate === failed ? null : candidate;
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(word => Array.from(word)[0]).join("").toUpperCase();

  async function changePhoto(file?: File) {
    if (inProgress.current) return;
    inProgress.current = true;
    setPending(true);
    setError("");
    setNotice(file ? "Saving photo…" : "Removing photo…");
    try {
      const response = await fetch("/api/account/photo", file ? {
        method: "POST", headers: { "Content-Type": file.type }, body: file,
      } : { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || (file ? typeof result.imageUrl !== "string" : result.imageUrl !== null)) {
        throw new Error(result.error || "The photo could not be updated. Try again.");
      }
      setFailed(null);
      setSavedPhoto(result.imageUrl);
      router.refresh();
      setNotice(file ? "Profile photo saved." : "Profile photo removed.");
    } catch (cause) {
      setNotice("");
      setError(cause instanceof Error && !(cause instanceof SyntaxError) && !(cause instanceof TypeError)
        ? cause.message : "The photo could not be updated. Try again.");
    } finally {
      setPending(false);
      inProgress.current = false;
    }
  }

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!allowedImages.includes(file.type) || !file.size || file.size > maxImageBytes) {
      setNotice("");
      setError("Choose a JPG, PNG or WebP image up to 5 MB.");
      return;
    }
    void changePhoto(file);
  }

  return (
    <div className={styles.photo} aria-busy={pending}>
      <div className={styles.avatar}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- private avatar requests need the viewer's session cookie.
          <img src={photo} alt="Profile photo" referrerPolicy="no-referrer" onError={() => setFailed(photo)} />
        ) : (
          <span aria-hidden="true">{initials || <UserRound size={40} />}</span>
        )}
      </div>
      <h2>Profile photo</h2>
      <div className={styles.photoActions}>
        <button className={styles.action} type="button" disabled={pending} onClick={() => input.current?.click()}>
          {candidate ? <Camera size={16} aria-hidden="true" /> : <ImagePlus size={16} aria-hidden="true" />}
          {candidate ? "Change photo" : "Upload photo"}
        </button>
        {candidate && (
          <button className={`${styles.action} ${styles.remove}`} type="button" disabled={pending} onClick={() => void changePhoto()}>
            <Trash2 size={15} aria-hidden="true" /> Remove photo
          </button>
        )}
        <input ref={input} type="file" accept={allowedImages.join(",")} hidden onChange={choosePhoto} />
      </div>
      <p className={styles.note}>JPG, PNG or WebP · Up to 5 MB</p>
      {error && <p className={styles.warning} role="alert">{error}</p>}
      {notice && <p className={styles.note} role="status">{notice}</p>}
    </div>
  );
}
