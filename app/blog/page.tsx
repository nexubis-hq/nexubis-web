import type { Metadata } from "next";
import { BlogIndex } from "@/components/blog/BlogIndex";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getBlogIndexPosts } from "@/lib/blog/get-blog-index-posts";

const description =
  "This is where we think out loud, share what’s actually working, and say the quiet parts founders aren’t supposed to say. Come for the insights — stay for the real talk.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.nexubis.io"),
  title: "Nexubis - Dreamlab Blog",
  description,
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Nexubis - Dreamlab Blog",
    description,
    url: "/blog",
    type: "website",
  },
};

export const revalidate = 60;

export default async function BlogPage() {
  const { posts, categories } = await getBlogIndexPosts();

  return (
    <>
      <SiteHeader />
      <BlogIndex posts={posts} categories={categories} />
      <SiteFooter />
    </>
  );
}
