import Link from "next/link";
import { PortableText } from "@portabletext/react";
import type { PortableTextComponents } from "@portabletext/react";
import { createHeadingId } from "@/lib/blog/heading-ids";
import { sanityImageUrl } from "@/lib/blog/sanity-image-url";
import styles from "./BlogPost.module.css";

type BlogRichTextProps = {
  html?: string;
  portableText?: unknown[];
};

function getPortableTextBlockText(value: unknown) {
  if (!value || typeof value !== "object") return "";

  const children = (value as { children?: Array<{ text?: string }> }).children ?? [];
  return children.map((child) => child.text ?? "").join("").trim();
}

function isInternalHref(href: string) {
  return href.startsWith("/");
}

export function BlogRichText({ html, portableText }: BlogRichTextProps) {
  if (portableText) {
    const headingIds = new Map<string, number>();

    const components: PortableTextComponents = {
      block: {
        normal: ({ children }) => <p>{children}</p>,
        h2: ({ children, value }) => (
          <h2 id={createHeadingId(getPortableTextBlockText(value), headingIds)}>{children}</h2>
        ),
        h3: ({ children, value }) => (
          <h3 id={createHeadingId(getPortableTextBlockText(value), headingIds)}>{children}</h3>
        ),
        h4: ({ children, value }) => (
          <h4 id={createHeadingId(getPortableTextBlockText(value), headingIds)}>{children}</h4>
        ),
        blockquote: ({ children }) => <blockquote>{children}</blockquote>,
      },
      list: {
        bullet: ({ children }) => <ul>{children}</ul>,
        number: ({ children }) => <ol>{children}</ol>,
      },
      listItem: {
        bullet: ({ children }) => <li>{children}</li>,
        number: ({ children }) => <li>{children}</li>,
      },
      marks: {
        strong: ({ children }) => <strong>{children}</strong>,
        em: ({ children }) => <em>{children}</em>,
        accent: ({ children }) => <span className={styles.accentText}>{children}</span>,
        link: ({ children, value }) => {
          const href = typeof value?.href === "string" ? value.href : "";
          if (!href) return <>{children}</>;

          if (isInternalHref(href)) {
            return <Link href={href} prefetch={false}>{children}</Link>;
          }

          const newTab = /^https?:\/\//.test(href);
          return (
            <a href={href} target={newTab ? "_blank" : undefined} rel={newTab ? "noreferrer" : undefined}>
              {children}
            </a>
          );
        },
      },
      types: {
        image: ({ value }) => {
          const imageUrl = sanityImageUrl(value as { asset?: { _ref?: string } } | null | undefined);
          if (!imageUrl) return null;

          return (
            <figure>
              <img src={imageUrl} alt={value?.alt ?? ""} loading="lazy" decoding="async" />
              {value?.caption ? <figcaption>{value.caption}</figcaption> : null}
            </figure>
          );
        },
      },
    };

    return (
      <div className={styles.richText}>
        <PortableText value={portableText} components={components} />
      </div>
    );
  }

  return <div className={styles.richText} dangerouslySetInnerHTML={{ __html: html ?? "" }} />;
}

