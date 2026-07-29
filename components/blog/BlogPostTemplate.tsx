import { getRelatedPostSummaries } from "@/lib/blog/related-posts";
import { sanitizeBlogPostHtml } from "@/lib/blog/sanitize-post-html";
import type { BlogPost } from "@/lib/blog/types";
import { BlogPostHeader } from "./BlogPostHeader";
import { BlogPostMedia } from "./BlogPostMedia";
import { BlogRichText } from "./BlogRichText";
import { BlogShowreel } from "./BlogShowreel";
import { BlogTableOfContents } from "./BlogTableOfContents";
import { RelatedPosts } from "./RelatedPosts";
import styles from "./BlogPost.module.css";

type BlogPostTemplateProps = {
  post: BlogPost;
};

export function BlogPostTemplate({ post }: BlogPostTemplateProps) {
  const { html, toc } = sanitizeBlogPostHtml(post.bodyHtml);
  const relatedPosts = getRelatedPostSummaries(post);

  return (
    <main className={styles.page}>
      <section className={styles.contentSection}>
        <div className={styles.container}>
          <div className={styles.layout}>
            <article className={styles.articleColumn}>
              <BlogPostHeader post={post} />
              <BlogPostMedia post={post} />
              <BlogRichText html={html} />
              <BlogShowreel
                enabled={post.showreelEnabled}
                url={post.showreelUrl}
                title={post.title}
              />
            </article>
            <BlogTableOfContents items={toc} />
          </div>
        </div>
      </section>
      <RelatedPosts posts={relatedPosts} />
    </main>
  );
}

