import type { TableOfContentsItem } from "@/lib/blog/sanitize-post-html";
import styles from "./BlogPost.module.css";

type BlogTableOfContentsProps = {
  items: TableOfContentsItem[];
};

export function BlogTableOfContents({ items }: BlogTableOfContentsProps) {
  if (items.length === 0) return null;

  return (
    <aside className={styles.sidebar} aria-label="Article table of contents">
      <ul className={styles.tocList}>
        {items.map((item) => (
          <li key={item.id} className={styles.tocItem}>
            <a className={styles.tocLink} data-level={item.level} href={`#${item.id}`}>
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}

