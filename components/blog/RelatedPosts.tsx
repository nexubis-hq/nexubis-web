import Link from "next/link";
import type { BlogPostSummary } from "@/lib/blog/types";
import styles from "./BlogPost.module.css";

type RelatedPostsProps = {
  posts: BlogPostSummary[];
};

export function RelatedPosts({ posts }: RelatedPostsProps) {
  if (posts.length === 0) return null;

  return (
    <section className={styles.relatedSection} aria-labelledby="related-posts-heading">
      <div className={styles.container}>
        <h2 id="related-posts-heading" className={styles.relatedHeading}>
          Related Posts
        </h2>
        <div className={styles.relatedGrid}>
          {posts.map((post) => {
            const href = `/post/${post.slug}`;

            return (
              <article key={post.slug} className={styles.relatedCard}>
                <Link href={href} className={styles.relatedMedia} aria-label={post.title}>
                  {post.thumbnail ? (
                    <img src={post.thumbnail} alt="" loading="lazy" className={styles.relatedImage} />
                  ) : null}
                </Link>
                <h3 className={styles.relatedTitle}>
                  <Link href={href}>{post.title}</Link>
                </h3>
                <p className={styles.relatedExcerpt}>{post.excerpt}</p>
                <Link href={href} className={styles.relatedReadLink}>
                  <span className={styles.relatedReadText}>Read full article</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

