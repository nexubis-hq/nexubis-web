import { getRelatedPostSummaries } from "@/lib/blog/related-posts";
import { sanitizeBlogPostHtml } from "@/lib/blog/sanitize-post-html";
import { collectPortableTextHeadings } from "@/lib/blog/heading-ids";
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

export async function BlogPostTemplate({ post }: BlogPostTemplateProps) {
  const portableText = post.bodyPortableText;
  const { html, toc } = portableText
    ? { html: undefined, toc: collectPortableTextHeadings(portableText) }
    : sanitizeBlogPostHtml(post.bodyHtml ?? "");
  const relatedPosts = await getRelatedPostSummaries(post);

  return (
    <main className={styles.page}>
      <section className={styles.contentSection}>
        <div className={styles.container}>
          <div className={styles.layout}>
            <article className={styles.articleColumn}>
              <BlogPostHeader post={post} />
              <BlogPostMedia post={post} />
              <BlogRichText html={html} portableText={portableText} />
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

