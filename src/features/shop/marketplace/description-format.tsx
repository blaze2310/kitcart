import type { ReactNode } from "react";
import styles from "./product-detail.module.css";

/** Plain-text seller descriptions with limited, safe Markdown-like emphasis.
 *  No HTML is parsed; text stays escaped by React.
 */
function inlineBold(text: string): ReactNode[] {
  const fragments = text.split(/(\*\*[^*\r\n]+\*\*)/g);
  return fragments.map((fragment, index) =>
    fragment.startsWith("**") && fragment.endsWith("**") && fragment.length > 4
      ? <strong key={index}>{fragment.slice(2, -2)}</strong>
      : fragment,
  );
}

export default function ProductDescription({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const lines = (text || "").replace(/\r\n?/g, "\n").split("\n");
  let bullets: ReactNode[] = [];

  const flushBullets = (lineIndex: number) => {
    if (!bullets.length) return;
    nodes.push(<ul className={styles.descriptionBullets} key={`list-${lineIndex}`}>{bullets}</ul>);
    bullets = [];
  };

  lines.forEach((original, index) => {
    const line = original.trim();
    if (!line) {
      flushBullets(index);
      if (nodes.length) nodes.push(<div className={styles.descriptionGap} aria-hidden="true" key={`gap-${index}`} />);
      return;
    }

    const bullet = line.match(/^(?:[-•*]\s+)(.+)$/);
    if (bullet) {
      bullets.push(<li key={`bullet-${index}`}>{inlineBold(bullet[1])}</li>);
      return;
    }
    flushBullets(index);

    // Seller can write **Section** or ## Section. Lines ending in : are
    // treated as section headings (e.g. "Key features:").
    const heading = line.match(/^#{1,3}\s+(.+)$/)
      ?? line.match(/^\*\*(.+)\*\*:?$/)
      ?? line.match(/^([^:]{2,70}):$/);
    if (heading) {
      nodes.push(<h3 className={styles.descriptionSubheading} key={`heading-${index}`}>{inlineBold(heading[1].replace(/:$/, ""))}</h3>);
      return;
    }

    // Also make a short label bold when a subsection starts inline.
    // Example: "Intended users: Designers and developers".
    const prefix = line.match(/^([A-Za-z][A-Za-z &/()\-]{2,45}):\s+(.+)$/);
    if (prefix) {
      nodes.push(<p className={styles.descriptionLine} key={`line-${index}`}><strong>{prefix[1]}:</strong> {inlineBold(prefix[2])}</p>);
    } else {
      nodes.push(<p className={styles.descriptionLine} key={`line-${index}`}>{inlineBold(line)}</p>);
    }
  });
  flushBullets(lines.length);

  return <div className={styles.descriptionFormatted}>{nodes}</div>;
}
