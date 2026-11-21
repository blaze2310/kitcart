"use client";

import Link from "next/link";
import ProductDescription from "@/features/shop/marketplace/description-format";

import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { ArrowRight, Check, ChevronLeft, ClipboardList, Eye, Package, ShieldCheck, X } from "lucide-react";
import {
  checklist, compatibleLink, emptyDraft, fileExtension, fileIssue, findSubcategory, imageTypes,
  listingLimits, maxExtras, maxImages, sellerGroups, videoTypes, type ListingDraft, type Verification,
} from "./seller-requirements";
import type { SellerListing } from "@/lib/seller/listings";
import styles from "./seller.module.css";
import polish from "./seller-polish.module.css";
import productStyles from "@/features/shop/marketplace/product-detail.module.css";
import SellerProductGallery from "./seller-product-gallery";

type Screen = "setup" | "checklist" | "listing" | "myListings";
type Files = Record<"main" | "cover" | "image" | "video" | "pdf" | "extra", File[]>;
const emptyFiles: Files = { main: [], cover: [], image: [], video: [], pdf: [], extra: [] };
const checkLabels: Record<Verification, string> = {
  not_started: "Not started", pending: "Pending", needs_attention: "Needs attention", verified: "Verified",
};
const listingLabels = { pending_review: "Pending review", approved: "Approved", rejected: "Rejected" };

export default function SellerPreview({ signedIn, sellerName, identity, payout, draft, listings, unavailable, canSell, testing }: {
  signedIn: boolean; sellerName?: string | null; identity: Verification; payout: Verification;
  draft: ListingDraft; listings: SellerListing[]; unavailable?: boolean; canSell: boolean; testing: boolean;
}) {
  const [screen, setScreen] = useState<Screen>(canSell ? "checklist" : "setup");
  const [values, setValues] = useState(draft);
  const [savedDraft, setSavedDraft] = useState(Object.values(draft).some(Boolean));
  const [rows, setRows] = useState(listings);
  const [files, setFiles] = useState<Files>(emptyFiles);
  const [delivery, setDelivery] = useState<"file" | "link">(draft.deliverableLink ? "link" : "file");
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState("");
  const [fileErrors, setFileErrors] = useState<Partial<Record<keyof Files, string>>>({});
  const [working, setWorking] = useState(false);
  const busy = useRef(false);
  const [media, setMedia] = useState<{ images: string[]; clip?: string }>({ images: [] });
  const [formKey, setFormKey] = useState(0);

  const category = sellerGroups.find(group => group.name === values.category);
  const subcategory = findSubcategory(values.category, values.subcategory);
  const format = subcategory?.formats.find(item => item.name === values.platform);
  const hasFiles = Boolean(format?.extensions.length);
  const hasLinks = Boolean(format?.links?.length);
  const wantsLink = hasLinks && (!hasFiles || delivery === "link");
  const required = <span className={polish.required} aria-hidden="true">*</span>;

  useEffect(() => () => {
    media.images.forEach(url => URL.revokeObjectURL(url));
    if (media.clip) URL.revokeObjectURL(media.clip);
  }, [media]);

  function showPreview() {
    const images = [...files.cover, ...files.image].map(file => URL.createObjectURL(file));
    const clip = files.video[0] ? URL.createObjectURL(files.video[0]) : undefined;
    setMedia({ images, clip });
    setPreview(true);
  }

  function closePreview() {
    setPreview(false);
    setMedia({ images: [] });
  }

  function go(next: Screen) {
    if ((!canSell && next !== "setup") || busy.current) return;
    closePreview();
    setMessage("");
    setScreen(next);
  }

  function change(name: keyof ListingDraft, value: string) {
    if (name === "category" || name === "subcategory" || name === "platform") {
      setValues(current => {
        if (name === "platform") return { ...current, platform: value, deliverableLink: "" };
        if (name === "category") return { ...current, category: value, subcategory: "", platform: "", deliverableLink: "" };
        const next = findSubcategory(current.category, value);
        return { ...current, subcategory: value, platform: next?.formats.length === 1 ? next.formats[0].name : "", deliverableLink: "" };
      });
      setDelivery("file");
      setFiles(current => ({ ...current, main: [], extra: [], pdf: [] }));
      setFileErrors(current => ({ ...current, main: undefined, extra: undefined, pdf: undefined }));
    } else setValues(current => ({ ...current, [name]: value }));
    setMessage("");
  }

  function chooseDelivery(value: "file" | "link") {
    setDelivery(value);
    setFiles(current => ({ ...current, main: [] }));
    setFileErrors(current => ({ ...current, main: undefined }));
    setValues(current => ({ ...current, deliverableLink: "" }));
  }

  function pick(role: keyof Files, extensions: string[], max = 1) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(event.currentTarget.files ?? []);
      // The input must be cleared to allow the same file to be selected again.
      event.currentTarget.value = "";
      if (!selected.length) return;

      const invalid = selected.map(file => fileIssue(file, extensions, listingLimits[role])).find(Boolean);
      if (invalid) {
        setFileErrors(current => ({ ...current, [role]: invalid }));
        return; // Keep earlier valid selections on a bad new selection.
      }

      const previous = files[role];
      const uniqueNew = selected.filter(file => !previous.some(saved =>
        saved.name === file.name && saved.size === file.size && saved.lastModified === file.lastModified));
      const next = max > 1 ? [...previous, ...uniqueNew] : selected.slice(-1);
      if (next.length > max) {
        setFileErrors(current => ({ ...current, [role]: `You can upload up to ${max} files here. Remove one before adding more.` }));
        return;
      }
      setFiles(current => ({ ...current, [role]: next }));
      setFileErrors(current => ({ ...current, [role]: undefined }));
      setMessage("");
    };
  }

  function removeFile(role: keyof Files, index: number) {
    setFiles(current => ({ ...current, [role]: current[role].filter((_, i) => i !== index) }));
    setFileErrors(current => ({ ...current, [role]: undefined }));
    setMessage("");
  }

  async function save(submit: boolean) {
    if (!canSell || busy.current) return;
    if (submit) {
      if (!format || !values.title.trim() || !values.readme.trim() || !values.compatibility.trim() || !values.guide.trim())
        return setMessage("Choose a format and add a name, description, software requirements, and setup guide.");
      if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(values.price.trim()) || Number(values.price) <= 0 || Number(values.price) > 21474836.47)
        return setMessage("Enter a valid INR price with up to two decimal places.");
      if (!files.cover.length) return setMessage("Select a compatible product cover image.");
      if (subcategory?.requiresExtraImage && !files.image.length) return setMessage("Add a mobile screenshot as well as the desktop cover.");
      if (subcategory?.requiredExtra && !files.extra.some(file => fileExtension(file.name) === subcategory.requiredExtra))
        return setMessage(`Add a sample ${subcategory.requiredExtra} dataset.`);
      if (subcategory?.pdfPreview && !files.pdf.length) return setMessage("Add a separate PDF preview of the slides.");
      if (!wantsLink && !files.main.length) return setMessage(`Choose the paid product file. Accepted: ${format.extensions.join(", ")}.`);
      if (wantsLink && !compatibleLink(values.deliverableLink.trim(), format.links ?? []))
        return setMessage(`Enter a supported HTTPS template/copy link for ${format.name}.`);
      if (Object.values(files).flat().reduce((sum, file) => sum + file.size, 0) > (listingLimits.total - 1) * 1024 * 1024)
        return setMessage(`Keep the combined files under ${listingLimits.total - 1} MB.`);
      if (Object.values(fileErrors).some(Boolean)) return setMessage("Replace or clear files marked as incompatible.");
    }
    busy.current = true;
    setWorking(true);
    setMessage(submit ? "Uploading your listing…" : "Saving draft…");
    try {
      const fields = { ...values, deliverableLink: wantsLink ? values.deliverableLink : "" };
      const body = new FormData();
      if (submit) {
        Object.entries(fields).forEach(([key, value]) => body.append(key, value));
        Object.entries(files).forEach(([role, list]) => {
          if (role !== "main" || !wantsLink) list.forEach(file => body.append(role, file));
        });
      }
      const response = await fetch("/api/seller/listings", {
        method: "POST",
        ...(submit ? { body } : { body: JSON.stringify(fields), headers: { "Content-Type": "application/json" } }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result) {
        setMessage(result?.error ?? "Could not save the listing. Check your connection and try again.");
        return;
      }
      if (submit) {
        setRows(current => [result.listing, ...current]);
        setSavedDraft(false);
        setValues(emptyDraft);
        setFiles(emptyFiles);
        setFileErrors({});
        setFormKey(key => key + 1);
        setDelivery("file");
        setScreen("myListings");
        setMessage("Listing submitted for review. Its files are saved and nothing has been published.");
      } else {
        setSavedDraft(true);
        setMessage("Draft saved. Files upload on submission, so reselect them if you leave or reload this page.");
      }
    } catch {
      setMessage("Could not reach KitCart. Your form is still here. Try again.");
    } finally {
      setWorking(false);
      busy.current = false;
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save(true);
  }

  function upload(role: keyof Files, label: string, extensions: string[], max = 1, hint?: string, key?: string) {
    const error = fileErrors[role];
    const inputId = `seller-file-${role}`;
    const caption = label.replace(/\s*\*$/, "");
    const isRequired = label.endsWith("*");
    const selectedFiles = files[role];
    return <div key={key ?? role} className={polish.uploadBlock}>
      <label htmlFor={inputId} className={polish.uploadLabel}><span className={polish.fieldCaption}>{caption}{isRequired && required}</span></label>
      <small className={polish.uploadHint}>
        {hint ? `${hint} ` : ""}Accepted: {extensions.join(", ")}. Up to {listingLimits[role]} MB per file.
      </small>
      <input id={inputId} type="file" accept={extensions.join(",")} multiple={max > 1}
        onChange={pick(role, extensions, max)} aria-invalid={Boolean(error)}
        aria-describedby={error ? `seller-error-${role}` : undefined} />
      {error && <small className={styles.error} id={`seller-error-${role}`} role="alert">{error}</small>}
      {selectedFiles.length > 0 && <ul className={polish.fileList} aria-label={`${caption} selected files`}>
        {selectedFiles.map((file, index) => <li key={`${file.name}-${file.size}-${file.lastModified}-${index}`} className={polish.fileRow}>
          <span title={file.name}>{file.name}</span>
          <button type="button" className={polish.removeFile} disabled={working}
            aria-label={`Remove ${file.name}`} title={`Remove ${file.name}`}
            onClick={() => removeFile(role, index)}><X size={15} aria-hidden="true" /></button>
        </li>)}
      </ul>}
    </div>;
  }

  const formatKey = `${values.category}/${values.subcategory}/${values.platform}`;
  return (
    <main className={`${styles.page} ${preview ? polish.pageWide : ""}`}>
      <header className={styles.hero}>
        <div><span className={styles.eyebrow}>KITCART FOR CREATORS</span>
          <h1>Start selling</h1><p>From a finished digital product to a listing ready for review.</p>
        </div>
        <span className={styles.badge}>{testing ? "Local seller test mode" : "Seller workspace"}</span>
      </header>
      {testing && <p className={styles.notice}>Identity and payout verification are skipped for this local session. Your account is not marked as verified.</p>}
      <nav className={styles.steps} aria-label="Seller steps">
        {([["setup", "Seller setup"], ["checklist", "Before you upload"], ["listing", "Create listing"], ["myListings", "My listings"]] as const)
          .map(([id, label], i) => <button key={id} type="button" aria-current={screen === id ? "step" : undefined}
            disabled={working || (!canSell && id !== "setup")} onClick={() => go(id)}><span>{String(i + 1).padStart(2, "0")}</span>{label}</button>)}
      </nav>

      {(!canSell || screen === "setup") && <section className={styles.panel}>
        <ShieldCheck size={28} aria-hidden="true" />
        <h2>{unavailable ? "Seller workspace unavailable" : !signedIn ? "Sign in to start selling" : testing ? "Seller test mode" : canSell ? "Seller setup complete" : "Seller verification required"}</h2>
        {unavailable ? <p>Try again after the seller database is available.</p> : !testing && <p>Identity and payout details both need approval before you can upload a product.</p>}
        {!signedIn && <div className={styles.actions}><Link className={styles.primary} href="/login">Sign in <ArrowRight size={17} /></Link>
          <Link className={styles.secondary} href="/signup">Create an account</Link></div>}
        {signedIn && !unavailable && <dl className={styles.checks}>
          <div><dt>Identity</dt><dd>{checkLabels[identity]}</dd></div>
          <div><dt>Payout details</dt><dd>{checkLabels[payout]}</dd></div>
        </dl>}
        {signedIn && !canSell && !unavailable && <Link href="/help">Contact KitCart support about verification</Link>}
        {canSell && <button type="button" className={styles.primary} onClick={() => go("checklist")}>Continue <ArrowRight size={17} /></button>}
      </section>}

      {canSell && screen === "checklist" && <section className={styles.panel}>
        <ClipboardList size={28} aria-hidden="true" /><h2>Before you upload</h2>
        <ul className={styles.checklist}>{checklist.map(([title, copy]) => <li key={title}><Check size={18} aria-hidden="true" />
          <div><strong>{title}</strong><p>{copy}</p></div></li>)}</ul>
        <button type="button" className={styles.primary} onClick={() => go("listing")}>Continue to upload <ArrowRight size={17} /></button>
      </section>}

      {canSell && screen === "listing" && <section className={preview ? polish.previewShell : styles.panel}>
        {!preview && <><h2>Create your listing</h2><p>Choose what you’re selling, then add the preview and the separate paid package.</p></>}
        {message && <p className={styles.notice} role="status">{message}</p>}
        <form key={formKey} className={styles.form} onSubmit={submit} noValidate hidden={preview} aria-busy={working}>
          <fieldset disabled={working}><legend>Product type</legend>
            <div className={styles.two}>
              <label><span className={polish.fieldCaption}>Main category{required}</span><select className={polish.select} value={values.category} onChange={e => change("category", e.target.value)} required>
                <option value="">Select a category</option>{sellerGroups.map(item => <option key={item.name}>{item.name}</option>)}
              </select></label>
              <label><span className={polish.fieldCaption}>Subcategory{required}</span><select className={polish.select} value={values.subcategory} disabled={!category} onChange={e => change("subcategory", e.target.value)} required>
                <option value="">Select a subcategory</option>{category?.children.map(item => <option key={item.name}>{item.name}</option>)}
              </select></label>
            </div>
            {subcategory && subcategory.formats.length > 1 && <label><span className={polish.fieldCaption}>Platform or product format{required}</span>
              <select className={polish.select} value={values.platform} onChange={e => change("platform", e.target.value)} required>
                <option value="">Select a platform or format</option>{subcategory.formats.map(item => <option key={item.name}>{item.name}</option>)}
              </select></label>}
            {subcategory && <p><strong>Product requirements:</strong> {subcategory.delivery}</p>}
          </fieldset>
          <fieldset disabled={working}><legend>Public listing preview</legend>
            <div className={styles.two}>
              <label><span className={polish.fieldCaption}>Product name{required}</span><input maxLength={120} value={values.title} onChange={e => change("title", e.target.value)} required /></label>
              <label><span className={polish.fieldCaption}>Price (₹){required}</span><input inputMode="decimal" maxLength={14} value={values.price} onChange={e => change("price", e.target.value)} required /></label>
            </div>
            <label><span className={polish.fieldCaption}>Product description{required}</span><textarea rows={4} maxLength={10000} value={values.readme} onChange={e => change("readme", e.target.value)} required /></label>
            <label><span className={polish.fieldCaption}>Software and prerequisites{required}</span><small>{subcategory?.software ?? "List required apps, versions or dependencies. Enter None if not applicable."}</small>
              <textarea rows={2} maxLength={4000} value={values.compatibility} onChange={e => change("compatibility", e.target.value)} required /></label>
            {upload("cover", subcategory?.requiresExtraImage ? "Desktop cover screenshot *" : "Cover image *", imageTypes, 1, subcategory?.preview)}
            <div className={`${styles.two} ${polish.mediaUploadRow}`}>
              {upload("image", "Extra screenshots", imageTypes, maxImages,
                `Upload up to ${maxImages} more product images.`)}
              {upload("video", "Demo video", videoTypes, 1, subcategory ? `Optional video. ${subcategory.proof}` : "Optional. Show the product working.")}
            </div>
            {subcategory?.pdfPreview && upload("pdf", "PDF slide preview *", [".pdf"], 1, "Separate from the editable presentation.", `pdf/${formatKey}`)}
          </fieldset>
          <fieldset disabled={working}><legend>Private buyer package</legend>
            {format && hasLinks && hasFiles && <label>Delivery method
              <select className={polish.select} value={delivery} onChange={e => chooseDelivery(e.target.value === "link" ? "link" : "file")}>
                <option value="file">Upload a file</option><option value="link">Provide a copy link</option>
              </select></label>}
            {!format && <p>Choose a category, subcategory and format to see what you can submit.</p>}
            {format && wantsLink && <label><span className={polish.fieldCaption}>Buyer copy / duplicate link{required}</span><small>Use a {format.name} share link that buyers are allowed to copy. Access is reviewed before publication.</small>
              <input type="url" maxLength={2048} placeholder="https://…" value={values.deliverableLink} onChange={e => change("deliverableLink", e.target.value)} required /></label>}
            {format && !wantsLink && upload("main", "Final deliverable *", format.extensions, 1, format.note, `main/${formatKey}`)}
            {Boolean(format?.extras?.length) && upload("extra", subcategory?.requiredExtra ? "Sample dataset *" : "Supporting files", format?.extras ?? [], maxExtras,
              subcategory?.requiredExtra ? "Include sample data buyers can use to test the dashboard." : `Optional unless advertised. Up to ${maxExtras} files.`, `extra/${formatKey}`)}
            <label><span className={polish.fieldCaption}>Installation or usage guide{required}</span><small>{subcategory?.guide}</small>
              <textarea rows={4} maxLength={12000} value={values.guide} onChange={e => change("guide", e.target.value)} required /></label>
            {subcategory && <p><strong>After-payment package:</strong> {subcategory.package}</p>}
          </fieldset>
          <div className={styles.actions}>
            <button type="button" disabled={working} className={styles.secondary} onClick={() => void save(false)}>Save draft</button>
            <button type="button" disabled={working} className={styles.secondary} onClick={showPreview}><Eye size={17} /> Preview as customer</button>
            <button type="submit" disabled={working} className={styles.primary}>{working ? "Saving…" : "Submit for review"} <ArrowRight size={17} /></button>
          </div>
        </form>

        {preview && <article className={polish.customerPreview}>
          <button type="button" className={styles.secondary} onClick={closePreview}>
            <ChevronLeft size={17} /> Back to listing
          </button>
          <div className={productStyles.heading}>
            <p className={productStyles.kicker}>{[values.category, values.subcategory].filter(Boolean).join(" / ") || "DIGITAL PRODUCT"}</p>
            <h3 className={polish.productTitle}>{values.title.trim() || "Untitled listing"}</h3>
            <p className={productStyles.muted}>By {sellerName || "KitCart seller"} · Customer preview only</p>
          </div>
          <div className={productStyles.columns}>
            <section className={productStyles.panel} aria-labelledby="seller-preview-media">
              <h4 className={polish.panelTitle} id="seller-preview-media">Product previews</h4>
              <SellerProductGallery title={values.title.trim() || "Untitled listing"} images={media.images} video={media.clip} />
              {files.pdf[0] && <p className={productStyles.muted}>A PDF slide preview is included with this listing.</p>}
            </section>
            <section className={productStyles.panel} aria-labelledby="seller-preview-details">
              <h4 className={polish.panelTitle} id="seller-preview-details">About this product</h4>
              <div className={productStyles.descriptionScroll} role="region" aria-label="Product description" tabIndex={0}>
              <ProductDescription text={values.readme.trim() || "Your product description will appear here."} />
              {values.compatibility.trim() && <>
                <h5 className={polish.detailTitle}>Software and prerequisites</h5>
                <p className={styles.multiline}>{values.compatibility}</p>
              </>}
              </div>
<div className={productStyles.priceBlock}>
                <p className={productStyles.seller}>Sold by <strong>{sellerName || "KitCart seller"}</strong></p>
                <span className={productStyles.muted}>Preview price</span>
                <strong className={productStyles.price}>
                  {values.price.trim() && Number.isFinite(Number(values.price))
                    ? `₹${Number(values.price).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
                    : "Price not added"}
                </strong>
                <div className={productStyles.actions}>
                  <button type="button" className={productStyles.secondary} disabled>Add to cart</button>
                  <button type="button" className={polish.buyButton} disabled>Buy now</button>
                </div>
                <p className={productStyles.muted}>Customer actions become available only after review and publication.</p>
              </div>
            </section>
          </div>
        </article>}
      </section>}

      {canSell && screen === "myListings" && <section className={styles.panel}>
        <Package size={28} aria-hidden="true" /><h2>My listings</h2>
        <p>Submitted listings are private until publication. Only you can download your uploaded files here.</p>
        {message && <p className={styles.notice} role="status">{message}</p>}
        {savedDraft && <p><button type="button" className={styles.secondary} onClick={() => go("listing")}>Edit saved draft</button></p>}
        {!rows.length ? <p>No submissions yet.</p> : <ul className={styles.listings}>{rows.map(row => <li key={row.id}>
          <div><strong>{row.title}</strong><p>{row.category} / {row.subcategory}</p>
            {row.files.length > 0 && <div className={styles.downloads}>{row.files.map(file =>
              <a key={file.id} href={`/api/seller/files/${file.id}`} download>{file.name}</a>)}</div>}
          </div><span className={styles.badge}>{listingLabels[row.status]}</span>
        </li>)}</ul>}
        <button type="button" className={styles.primary} onClick={() => go("listing")}>Create listing <ArrowRight size={17} /></button>
      </section>}
    </main>
  );
}
