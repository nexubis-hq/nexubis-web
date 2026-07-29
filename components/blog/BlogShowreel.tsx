import { toYouTubeEmbedUrl } from "@/lib/blog/post-url";
import styles from "./BlogPost.module.css";

type BlogShowreelProps = {
  enabled: boolean;
  url?: string | null;
  title: string;
};

export function BlogShowreel({ enabled, url, title }: BlogShowreelProps) {
  if (!enabled || !url) return null;

  const embedUrl = toYouTubeEmbedUrl(url);
  if (!embedUrl) return null;

  return (
    <div className={styles.showreel}>
      <iframe
        className={styles.showreelFrame}
        src={embedUrl}
        title={`${title} showreel`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
