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

  return (
    <div className={styles.gallery}>
      <div className={styles.mediaRail} role="group" aria-label="Product media">
        <button type="button" aria-pressed={selected === "image"} onClick={() => setSelected("image")}>
          <span className={styles.imageThumb} aria-hidden="true"><span>{artwork}</span></span>
          Image
        </button>
        <button type="button" aria-pressed={selected === "video"} onClick={() => setSelected("video")}>
          <Play size={21} aria-hidden="true" />
          Video
        </button>
      </div>
      <figure className={styles.figure}>
        {selected === "image" ? (
          <>
            <div className={styles.cover} role="img" aria-label={`Illustrated preview of ${title}`}>{artwork}</div>
            <figcaption>Illustrated product preview</figcaption>
          </>
        ) : (
          <>
            <video controls playsInline preload="metadata" aria-label={`Demo video for ${title}`} src={video} />
            <figcaption>Sample video · illustrative format walkthrough, no audio</figcaption>
          </>
        )}
      </figure>
    </div>
  );
}
