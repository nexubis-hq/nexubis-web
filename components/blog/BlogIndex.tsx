"use client";

import { useMemo, useState } from "react";
import type { BlogCategory, BlogPostSummary } from "@/lib/blog/types";
import { BlogCard } from "@/components/blog/BlogCard";
import { BlogFilters } from "@/components/blog/BlogFilters";
import styles from "./BlogIndex.module.css";

type BlogIndexProps = {
  posts: BlogPostSummary[];
  categories: BlogCategory[];
};

export function BlogIndex({ posts, categories }: BlogIndexProps) {
  const [activeCategories, setActiveCategories] = useState<string[]>([]);

  const visiblePosts = useMemo(() => {
    if (activeCategories.length === 0) return posts;
    return posts.filter((post) => activeCategories.includes(post.categorySlug));
  }, [activeCategories, posts]);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroTitleWrap}>
            <h1 className={styles.heading}>
              <span className={styles.headingLead}>Not your</span> average
              <br />
              agency blog
            </h1>
          </div>
          <div className={styles.introRow}>
            <p className={styles.intro}>
              This is where we think out loud, share what&rsquo;s actually working, and
              say the quiet parts founders aren&rsquo;t supposed to say. Come for the
              insights &mdash; stay for the real talk.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.postsSection}>
        <div className={styles.container}>
          <BlogFilters
            categories={categories}
            activeCategories={activeCategories}
            onChange={setActiveCategories}
          />
        </div>
        <div className={styles.container}>
          <div className={styles.grid} aria-live="polite">
            {visiblePosts.map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
