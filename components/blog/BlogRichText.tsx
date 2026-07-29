import styles from "./BlogPost.module.css";

type BlogRichTextProps = {
  html: string;
};

export function BlogRichText({ html }: BlogRichTextProps) {
  return <div className={styles.richText} dangerouslySetInnerHTML={{ __html: html }} />;
}

