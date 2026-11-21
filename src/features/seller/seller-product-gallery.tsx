"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import styles from "@/features/shop/marketplace/product-detail.module.css";
import polish from "./seller-polish.module.css";

type Props = { title: string; images: string[]; video?: string };

/** The same thumbnail-rail / main-stage interaction as the live product detail page. */
export default function SellerProductGallery({ title, images, video }: Props) {
  const [selected, setSelected] = useState<number | "video">(0);
  const validSelection = selected === "video" && video ? "video"
    : typeof selected === "number" && images[selected] ? selected : images.length ? 0 : video ? "video" : 0;
  const imageSource = typeof validSelection === "number" ? images[validSelection] : undefined;

  return <div className={styles.gallery}>
    <div className={styles.mediaRail} role="group" aria-label="Product media">
      {images.map((url, index) => <button key={url} type="button" aria-pressed={validSelection === index}
        aria-label={`View image ${index + 1} of ${images.length}`} onClick={() => setSelected(index)}>
        <span className={styles.imageThumb} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- previews use local object URLs. */}
          <img className={polish.thumbnail} src={url} alt="" />
        </span>
        {index === 0 ? "Cover" : `Image ${index + 1}`}
      </button>)}
      {video && <button type="button" aria-pressed={validSelection === "video"} onClick={() => setSelected("video")}
        aria-label="View demo video"><Play size={21} aria-hidden="true" />Video</button>}
    </div>
    <figure className={styles.figure}>
      <div className={styles.mediaFrame}>
        {imageSource ? (
          // eslint-disable-next-line @next/next/no-img-element -- browser-generated object URLs.
          <img className={polish.stageImage} src={imageSource} alt={`${title}: preview image ${Number(validSelection) + 1}`} />
        ) : validSelection === "video" && video ? (
          <video controls playsInline preload="metadata" aria-label={`${title} demo video`} src={video} />
        ) : (
          <div className={polish.emptyStage}>Add a cover image to preview your product.</div>
        )}
      </div>
      <figcaption className={styles.mediaCaption}>
        {imageSource ? `Product preview ${Number(validSelection) + 1} of ${images.length}`
          : validSelection === "video" ? "Seller-provided demo video" : "Add an image to see a preview"}
      </figcaption>
    </figure>
  </div>;
}
