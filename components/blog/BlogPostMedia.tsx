import type { BlogPost } from "@/lib/blog/types";
import { BlogLottiePlayer } from "./BlogLottiePlayer";
import styles from "./BlogPost.module.css";

type BlogPostMediaProps = {
  post: BlogPost;
};

export function BlogPostMedia({ post }: BlogPostMediaProps) {
  return (
    <div className={styles.heroMedia}>
      {post.lottieJson ? (
        <BlogLottiePlayer
          animationData={post.lottieJson}
          fallbackSrc={post.lottieThumbnail || post.thumbnail}
          title={post.title}
        />
      ) : post.thumbnail ? (
        <img className={styles.heroImage} src={post.thumbnail} alt={post.thumbnailAlt ?? ""} loading="eager" />
      ) : null}
    </div>
  );
}

