import type { BlogPost } from "@/lib/blog/types";
import styles from "./BlogPost.module.css";

type BlogPostHeaderProps = {
  post: BlogPost;
};

function formatDate(value: string | undefined) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function BlogPostHeader({ post }: BlogPostHeaderProps) {
  return (
    <header className={styles.articleHeader}>
      <ol className={styles.breadcrumbList} aria-label="Breadcrumb">
        <li>Dreamlab</li>
        <li aria-hidden="true">›</li>
        <li>{post.category}</li>
      </ol>

      <h1 className={styles.title}>{post.title}</h1>

      <div className={styles.authorBlock}>
        <p>
          <span>by </span>
          <strong>{post.author}</strong>
        </p>
        <p>Last updated {formatDate(post.updatedAt || post.publishedAt)}</p>
      </div>
    </header>
  );
}

