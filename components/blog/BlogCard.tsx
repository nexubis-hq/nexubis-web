import Link from "next/link";
import type { BlogPostSummary } from "@/lib/blog/types";
import styles from "./BlogIndex.module.css";

type BlogCardProps = {
  post: BlogPostSummary;
};

export function BlogCard({ post }: BlogCardProps) {
  const href = `/post/${post.slug}`;

  return (
    <article className={styles.card}>
      <Link className={styles.mediaLink} href={href} aria-label={post.title} prefetch={false}>
        {post.featured ? (
          <span className={styles.featuredTag}>Featured</span>
        ) : null}
        {post.thumbnail ? (
          <img
            className={styles.cardImage}
            src={post.thumbnail}
            alt={post.thumbnailAlt ?? ""}
            loading="lazy"
          />
        ) : null}
      </Link>

      <div className={styles.categoryTag}>
        {post.categoryIcon ? (
          <img className={styles.categoryIcon} src={post.categoryIcon} alt="" loading="lazy" />
        ) : null}
        <span>{post.category}</span>
      </div>

      <div className={styles.cardBody}>
        <h2 className={styles.cardTitle}>
          <Link href={href} prefetch={false}>
            {post.title}
          </Link>
        </h2>
        <p className={styles.excerpt}>{post.excerpt}</p>
        <Link className={styles.readLink} href={href} prefetch={false}>
          <span className={styles.readText}>Read full article</span>
          <span className={styles.readArrow} aria-hidden="true">
            &rarr;
          </span>
        </Link>
      </div>
    </article>
  );
}
