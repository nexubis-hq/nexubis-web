import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { BlogPost } from "@/lib/blog/types";

const BLOG_CSV = path.join(
  process.cwd(),
  "webflow-export",
  "cms",
  "Nexubis Next - Blogs - 67fc1a17eb59624612330057.csv",
);

const CATEGORIES_CSV = path.join(
  process.cwd(),
  "webflow-export",
  "cms",
  "Nexubis Next - Blog Categories - 680b4edded78e7991b9732ec.csv",
);

const OUTPUT_DIR = path.join(process.cwd(), "lib", "blog", "generated");
const FIXTURES_OUTPUT = path.join(OUTPUT_DIR, "post-fixtures.json");

const FIXTURE_SLUGS = [
  "how-it-all-started-and-almost-didnt",
  "circuit-securing-nexubis",
] as const;

const RELATED_POSTS_BY_SLUG: Record<(typeof FIXTURE_SLUGS)[number], string[]> = {
  "how-it-all-started-and-almost-didnt": [
    "ai-is-not-a-phase-its-an-era",
    "metamorphosis",
    "beyond-the-eu30-000",
  ],
  "circuit-securing-nexubis": [
    "ai-is-not-a-phase-its-an-era",
    "metamorphosis",
    "beyond-the-eu30-000",
  ],
};

type CsvRecord = Record<string, string>;

function parseCsv(csv: string): CsvRecord[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const nextChar = csv[index + 1];

    if (quoted) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  const [headers, ...records] = rows;
  if (!headers) return [];

  return records
    .filter((record) => record.some(Boolean))
    .map((record) =>
      Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""])),
    );
}

function parseLottieJson(record: CsvRecord): unknown | null {
  const source = record["Lottie Json Code"].trim();
  if (!source) return null;

  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`Invalid Lottie JSON for ${record.Slug}: ${(error as Error).message}`);
  }
}

function authorName(author: string) {
  if (author === "hannes") return "Hannes Oosthuizen";
  return author;
}

function assertUniqueSlugs(posts: BlogPost[]) {
  const seen = new Set<string>();

  for (const post of posts) {
    if (seen.has(post.slug)) {
      throw new Error(`Duplicate Blog fixture slug detected: ${post.slug}`);
    }
    seen.add(post.slug);
  }
}

function generateFixtures(): BlogPost[] {
  const categories = parseCsv(readFileSync(CATEGORIES_CSV, "utf8"));
  const categoryMap = new Map(categories.map((category) => [category.Slug, category.Name]));
  const records = parseCsv(readFileSync(BLOG_CSV, "utf8"));

  const fixtures = FIXTURE_SLUGS.map((slug) => {
    const matches = records.filter((record) => record.Slug === slug);
    if (matches.length !== 1) {
      throw new Error(`Expected one Blog fixture record for ${slug}, got ${matches.length}`);
    }

    const record = matches[0];
    if (record.Archived === "true" || record.Draft === "true") {
      throw new Error(`Blog fixture must be published and active: ${slug}`);
    }

    if (!record["Published On"] || Number.isNaN(Date.parse(record["Published On"]))) {
      throw new Error(`Blog fixture has no valid published date: ${slug}`);
    }

    return {
      title: record.Name,
      slug: record.Slug,
      excerpt: record.Excerpt,
      author: authorName(record.Author),
      category: categoryMap.get(record.Category) ?? record.Category,
      categorySlug: record.Category,
      publishedAt: record["Published On"],
      updatedAt: record["Updated On"] || undefined,
      bodyHtml: record.Content,
      thumbnail: record.Thumbnail || null,
      seoTitle: record["SEO : Title"] || null,
      seoDescription: record["SEO : Description"] || null,
      ogImage: record["SEO : Open Graph Image"] || null,
      showreelEnabled: record["Showreel Toggle"] === "true",
      showreelUrl: record["Showreel Link"] || null,
      lottieThumbnail: record["Lottie Thumbnail"] === "true" ? record.Thumbnail || null : null,
      lottieJson: parseLottieJson(record),
      relatedSlugs: RELATED_POSTS_BY_SLUG[slug],
      source: "fixture",
    } satisfies BlogPost;
  });

  assertUniqueSlugs(fixtures);
  return fixtures;
}

const fixtures = generateFixtures();

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(FIXTURES_OUTPUT, `${JSON.stringify(fixtures, null, 2)}\n`, "utf8");

console.log(`Generated ${fixtures.length} Blog post fixtures.`);
console.log(`Fixture slugs: ${fixtures.map((post) => post.slug).join(", ")}`);
