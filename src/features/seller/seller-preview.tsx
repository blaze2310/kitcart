"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Check, ChevronLeft, ClipboardList, Eye, Package, ShieldCheck } from "lucide-react";
import { checklist, deliverableHints } from "./seller-requirements";
import styles from "./seller.module.css";

type Group = { name: string; children: string[] };
type Screen = "setup" | "checklist" | "listing" | "myListings";
type Verification = "not_started" | "pending" | "needs_attention" | "verified";
type Draft = {
  title: string; category: string; subcategory: string; price: string;
  readme: string; compatibility: string; deliverableLink: string; guide: string;
};
type Saved = { title: string; category: string; subcategory: string; status: "Draft" | "Pending review" };

const empty: Draft = {
  title: "", category: "", subcategory: "", price: "", readme: "",
  compatibility: "", deliverableLink: "", guide: "",
};
const status = {
  not_started: "Set up your seller account",
  pending: "Verification in progress",
  needs_attention: "Verification needs attention",
  verified: "Seller setup complete",
};
const key = "kitcart-seller-preview-v1";

export default function SellerPreview({ groups }: { groups: Group[] }) {
  const [screen, setScreen] = useState<Screen>("setup");
  const [verification, setVerification] = useState<Verification>("not_started");
  const [draft, setDraft] = useState<Draft>(empty);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [cover, setCover] = useState<File | null>(null);
  const [extraImages, setExtraImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [deliverable, setDeliverable] = useState<File | null>(null);
  const [resetFiles, setResetFiles] = useState(0);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof Draft | "cover" | "deliverable", string>>>({});
  const [media, setMedia] = useState<{ images: string[]; video?: string }>({ images: [] });

  useEffect(() => {
    try {
      const previous = JSON.parse(sessionStorage.getItem(key) ?? "null");
      if (previous?.draft) setDraft({ ...empty, ...previous.draft });
      if (Array.isArray(previous?.saved)) setSaved(previous.saved);
    } catch { /* A blocked or invalid browser store should not stop the preview. */ }
  }, []);

  useEffect(() => {
    if (!preview) return;
    const images = (cover ? [cover, ...extraImages] : extraImages).map((file) => URL.createObjectURL(file));
    const clip = video ? URL.createObjectURL(video) : undefined;
    setMedia({ images, video: clip });
    return () => {
      images.forEach((url) => URL.revokeObjectURL(url));
      if (clip) URL.revokeObjectURL(clip);
    };
  }, [preview, cover, extraImages, video]);

  function go(next: Screen) {
    if (verification !== "verified" && next !== "setup") return;
    setScreen(next);
    setPreview(false);
    setErrors({});
    setMessage("");
  }

  function change(name: keyof Draft, value: string) {
    setDraft((current) => name === "category"
      ? { ...current, category: value, subcategory: "" }
      : { ...current, [name]: value });
    setErrors((current) => ({ ...current, [name]: undefined, ...(name === "category" ? { subcategory: undefined } : {}) }));
  }

  function remember(nextDraft: Draft, rows: Saved[]) {
    try {
      sessionStorage.setItem(key, JSON.stringify({ draft: nextDraft, saved: rows }));
      return true;
    } catch { return false; }
  }

  function saveDraft() {
    const rows = saved.filter((row) => row.status !== "Draft");
    const next: Saved[] = [...rows, { title: draft.title.trim() || "Untitled listing", category: draft.category, subcategory: draft.subcategory, status: "Draft" }];
    setSaved(next);
    const stored = remember(draft, next);
    setMessage(stored
      ? "Draft saved in this browser tab. Files stay local and must be selected again after a refresh."
      : "Draft kept for this visit. Browser storage was unavailable.");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (verification !== "verified") return;
    const issues: typeof errors = {};
    if (!draft.title.trim()) issues.title = "Enter a product name.";
    const group = groups.find(({ name }) => name === draft.category);
    if (!group) issues.category = "Choose a category.";
    if (!group?.children.includes(draft.subcategory)) issues.subcategory = "Choose a subcategory in this category.";
    if (!/^\d+(\.\d{1,2})?$/.test(draft.price.trim()) || !Number.isFinite(Number(draft.price)) || Number(draft.price) <= 0)
      issues.price = "Enter a price greater than zero, with up to two decimals.";
    if (!draft.readme.trim()) issues.readme = "Describe the product and what’s included.";
    if (!draft.guide.trim()) issues.guide = "Add installation or usage instructions.";
    if (!cover?.type.startsWith("image/")) issues.cover = "Select at least one product image.";
    if (!deliverable && !draft.deliverableLink.trim()) issues.deliverable = "Select the paid deliverable or provide a copy link.";
    if (draft.deliverableLink.trim()) {
      try {
        const url = new URL(draft.deliverableLink.trim());
        if (url.protocol !== "https:" || url.username || url.password) throw new Error();
      } catch { issues.deliverableLink = "Enter an HTTPS copy link without credentials."; }
    }
    setErrors(issues);
    if (Object.keys(issues).length) {
      setMessage("Check the fields marked below before submitting.");
      return;
    }
    const next: Saved[] = [...saved.filter((row) => row.status !== "Draft"), {
      title: draft.title.trim(), category: draft.category, subcategory: draft.subcategory, status: "Pending review",
    }];
    setSaved(next);
    remember(empty, next);
    setDraft(empty);
    setCover(null);
    setExtraImages([]);
    setVideo(null);
    setDeliverable(null);
    setResetFiles((value) => value + 1);
    go("myListings");
    setMessage("Demo submission recorded in this preview. Nothing was uploaded or published.");
  }

  function error(name: keyof typeof errors) {
    return errors[name] && <small className={styles.error} id={`seller-error-${name}`}>{errors[name]}</small>;
  }

  const children = groups.find(({ name }) => name === draft.category)?.children ?? [];
  const verified = verification === "verified";

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>KITCART FOR CREATORS</span>
          <h1>Start selling</h1>
          <p>From a finished digital product to a listing ready for review.</p>
        </div>
        <span className={styles.badge}>Seller preview</span>
      </header>
      <p className={styles.notice}>This is a demo. No sign-in, real verification, uploads, or publication. Use sample information only.</p>
      <nav className={styles.steps} aria-label="Seller steps">
        {([["setup", "Seller setup"], ["checklist", "Before you upload"], ["listing", "Create listing"], ["myListings", "My Listings"]] as const).map(([id, label], i) => (
          <button key={id} type="button" aria-current={screen === id ? "step" : undefined}
            disabled={!verified && id !== "setup"} onClick={() => go(id)}><span>{String(i+1).padStart(2,"0")}</span>{label}</button>
        ))}
      </nav>

      {screen === "setup" && (
        <section className={styles.panel}>
          <ShieldCheck size={28} aria-hidden="true" />
          <h2>{status[verification]}</h2>
          <p>Both identity and payout details must be verified before a seller can upload a product.</p>
          <dl className={styles.checks}>
            <div><dt>Identity</dt><dd>{verified ? "Sample verified" : verification === "pending" || verification === "needs_attention" ? "Sample pending" : "Not started"}</dd></div>
            <div><dt>Payout details</dt><dd>{verified ? "Sample verified" : verification === "needs_attention" ? "Sample correction required" : verification === "pending" ? "Sample pending" : "Not started"}</dd></div>
          </dl>
          {verification === "pending" && <p role="status">In the live flow, uploading stays locked while your checks are in progress.</p>}
          {verification === "needs_attention" && <p role="status">Sample feedback: the payout details could not be verified. Retry this check before uploading.</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={() => {
              setVerification("verified");
              setMessage("");
              setScreen("checklist");
            }}>Continue as sample verified seller <ArrowRight size={17} aria-hidden="true" /></button>
            {!verified && <>
              <button type="button" className={styles.secondary} onClick={() => setVerification("pending")}>{verification === "needs_attention" ? "Retry sample check" : "Preview pending verification"}</button>
              <button type="button" className={styles.secondary} onClick={() => setVerification("needs_attention")}>Preview correction needed</button>
            </>}
          </div>
        </section>
      )}

      {verified && screen === "checklist" && (
        <section className={styles.panel}>
          <ClipboardList size={28} aria-hidden="true" />
          <h2>Before you upload</h2>
          <p>Have these four things ready.</p>
          <ul className={styles.checklist}>
            {checklist.map(([title, copy]) => <li key={title}><Check size={18} aria-hidden="true" /><div><strong>{title}</strong><p>{copy}</p></div></li>)}
          </ul>
          <button type="button" className={styles.primary} onClick={() => go("listing")}>Continue to upload <ArrowRight size={17} aria-hidden="true" /></button>
        </section>
      )}

      {verified && screen === "listing" && (
        <section className={styles.panel}>
          <h2>Create your listing</h2>
          <p>Choose what you’re selling, then add a preview and the separate paid package.</p>
          {message && <p className={styles.notice} role="status">{message}</p>}
          <form key={resetFiles} className={styles.form} onSubmit={submit} noValidate hidden={preview}>
            <div className={styles.two}>
              <label>Main category *
                <select required value={draft.category} aria-invalid={!!errors.category} aria-describedby={errors.category ? "seller-error-category" : undefined} onChange={(event) => change("category", event.target.value)}>
                  <option value="">Select a category</option>
                  {groups.map(({ name }) => <option key={name}>{name}</option>)}
                </select>{error("category")}
              </label>
              <label>Subcategory *
                <select required disabled={!draft.category} value={draft.subcategory} aria-invalid={!!errors.subcategory} aria-describedby={errors.subcategory ? "seller-error-subcategory" : undefined} onChange={(event) => change("subcategory", event.target.value)}>
                  <option value="">Select a subcategory</option>
                  {children.map((name) => <option key={name}>{name}</option>)}
                </select>{error("subcategory")}
              </label>
            </div>
            {draft.subcategory && <p className={styles.notice}><strong>Typical paid deliverable:</strong> {deliverableHints[draft.subcategory]}</p>}

            <fieldset>
              <legend>Public listing</legend>
              <div className={styles.two}>
                <label>Product name *<input required maxLength={120} value={draft.title} onChange={(e) => change("title", e.target.value)} aria-invalid={!!errors.title} aria-describedby={errors.title ? "seller-error-title" : undefined} />{error("title")}</label>
                <label>Price (₹) *<input required inputMode="decimal" value={draft.price} onChange={(e) => change("price", e.target.value)} aria-invalid={!!errors.price} aria-describedby={errors.price ? "seller-error-price" : undefined} />{error("price")}</label>
              </div>
              <label>Product description / README *<textarea required rows={4} value={draft.readme} onChange={(e) => change("readme", e.target.value)} aria-invalid={!!errors.readme} aria-describedby={errors.readme ? "seller-error-readme" : undefined} />{error("readme")}</label>
              <label>Software and prerequisites<textarea rows={2} placeholder="Apps, versions, integrations, dependencies, fonts or subscriptions" value={draft.compatibility} onChange={(e) => change("compatibility", e.target.value)} /></label>
              <label>Cover image *<small>Select an actual screenshot or preview image.</small><input required type="file" accept="image/*" aria-invalid={!!errors.cover} aria-describedby={errors.cover ? "seller-error-cover" : undefined} onChange={(e) => { setCover(e.target.files?.[0] ?? null); setErrors((current) => ({ ...current, cover: undefined })); }} />{error("cover")}</label>
              <div className={styles.two}>
                <label>Extra images <small>Optional</small><input type="file" accept="image/*" multiple onChange={(e) => setExtraImages(Array.from(e.target.files ?? []))} /></label>
                <label>Demo video <small>Optional</small><input type="file" accept="video/*" onChange={(e) => setVideo(e.target.files?.[0] ?? null)} /></label>
              </div>
            </fieldset>
            <fieldset>
              <legend>Paid package · private in the live flow</legend>
              <label>Final deliverable *<small>Choose a file or enter a copy link. Formats above are examples, not an allowlist.</small>
                <input type="file" aria-invalid={!!errors.deliverable} aria-describedby={errors.deliverable ? "seller-error-deliverable" : undefined} onChange={(e) => { setDeliverable(e.target.files?.[0] ?? null); setErrors((current) => ({ ...current, deliverable: undefined })); }} />{error("deliverable")}
              </label>
              <label>Copy link instead of a file<input type="url" placeholder="https://…" value={draft.deliverableLink} onChange={(e) => change("deliverableLink", e.target.value)} aria-invalid={!!errors.deliverableLink} aria-describedby={errors.deliverableLink ? "seller-error-deliverableLink" : undefined} />{error("deliverableLink")}</label>
              <label>Installation or usage guide *<textarea required rows={4} value={draft.guide} onChange={(e) => change("guide", e.target.value)} aria-invalid={!!errors.guide} aria-describedby={errors.guide ? "seller-error-guide" : undefined} />{error("guide")}</label>
            </fieldset>
            <div className={styles.actions}>
              <button type="button" className={styles.secondary} onClick={saveDraft}>Save draft</button>
              <button type="button" className={styles.secondary} onClick={() => setPreview(true)}><Eye size={17} aria-hidden="true" /> Preview as customer</button>
              <button type="submit" className={styles.primary}>Submit for review <ArrowRight size={17} aria-hidden="true" /></button>
            </div>
          </form>

          {preview && <article className={styles.customerPreview}>
            <button type="button" className={styles.secondary} onClick={() => setPreview(false)}><ChevronLeft size={17} aria-hidden="true" /> Back to listing</button>
            <p className={styles.eyebrow}>CUSTOMER PREVIEW</p>
            <p>{[draft.category, draft.subcategory].filter(Boolean).join(" / ")}</p>
            <h3>{draft.title.trim() || "Untitled listing"}</h3>
            <p>Sold by <strong>Demo Creator</strong></p>
            {draft.price.trim() && <p className={styles.price}>₹{draft.price}</p>}
            <div className={styles.previewMedia}>
              {media.images.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- browser-local file preview
                <img key={url} src={url} alt={i ? `Product image ${i + 1}` : "Product cover"} />
              ))}
              {media.video && <video src={media.video} controls playsInline aria-label="Product demo" />}
            </div>
            <p className={styles.multiline}>{draft.readme}</p>
            {draft.compatibility.trim() && <><h4>Software and prerequisites</h4><p className={styles.multiline}>{draft.compatibility}</p></>}
          </article>}
        </section>
      )}

      {verified && screen === "myListings" && (
        <section className={styles.panel}>
          <Package size={28} aria-hidden="true" />
          <h2>My Listings</h2>
          <p>Demo drafts and review submissions for this tab. Pending listings are not public.</p>
          {message && <p className={styles.notice} role="status">{message}</p>}
          {saved.length === 0 ? <p>You haven’t saved any demo listings yet.</p> : <ul className={styles.listings}>
            {saved.map((row, i) => <li key={i}><div><strong>{row.title}</strong><p>{[row.category, row.subcategory].filter(Boolean).join(" / ")}</p></div>
              <span className={styles.badge}>{row.status}</span>
              {row.status === "Draft" && <button type="button" className={styles.secondary} onClick={() => go("listing")}>Edit draft</button>}
            </li>)}
          </ul>}
          <button type="button" className={styles.primary} onClick={() => go("checklist")}>Before you upload <ArrowRight size={17} aria-hidden="true" /></button>
        </section>
      )}
    </main>
  );
}
