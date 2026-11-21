"use client";

import { useState, type ReactNode } from "react";
import { Play } from "lucide-react";
import styles from "./product-detail.module.css";

export default function ProductGallery({ title, artwork, video }: {
  title: string;
  artwork: ReactNode;
  video: string;
}) {
  const [selected, setSelected] = useState<"image" | "video">("image");
  const isImage = selected === "image";

  return (
    <div className={styles.gallery}>
      <div className={styles.mediaRail} role="group" aria-label="Product media">
        <button type="button" aria-pressed={isImage} onClick={() => setSelected("image")}>
          <span className={styles.imageThumb} aria-hidden="true"><span>{artwork}</span></span>
          Image
        </button>
        <button type="button" aria-pressed={!isImage} onClick={() => setSelected("video")}>
          <Play size={21} aria-hidden="true" />
          Video
        </button>
      </div>
      <figure className={styles.figure}>
        <div className={styles.mediaFrame}>
          {isImage ? (
            <div className={styles.cover} role="img" aria-label={`Illustrated preview of ${title}`}>{artwork}</div>
          ) : (
            <video controls playsInline preload="metadata" aria-label={`Demo video for ${title}`} src={video} />
          )}
        </div>
        <figcaption className={styles.mediaCaption}>
          <span data-visible={isImage} aria-hidden={!isImage}>Illustrated product preview</span>
          <span data-visible={!isImage} aria-hidden={isImage}>Sample video · illustrative format walkthrough, no audio</span>
        </figcaption>
      </figure>
    </div>
  );
}
