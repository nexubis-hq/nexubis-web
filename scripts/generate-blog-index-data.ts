import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { BlogCategory, BlogIndexData, BlogPostSummary } from "@/lib/blog/types";

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
const POSTS_OUTPUT = path.join(OUTPUT_DIR, "posts.json");
const CATEGORIES_OUTPUT = path.join(OUTPUT_DIR, "categories.json");

const EXPECTED_PUBLISHED_POSTS = 88;
const EXPECTED_EXCLUDED_POSTS = 3;

type CsvRecord = Record<string, string>;

const CATEGORY_FILTER_ORDER = [
  "empowering-dreams",
  "founders-diary",
  "ai-x-nexubis",
  "startup-stack",
  "company",
  "for-professionals",
] as const;

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

function isValidPublishedDate(value: string) {
  return Boolean(value) && !Number.isNaN(Date.parse(value));
}

function sortByWebflowCollectionOrder(a: CsvRecord, b: CsvRecord) {
  const featuredDelta = Number(b.Featured === "true") - Number(a.Featured === "true");
  if (featuredDelta !== 0) return featuredDelta;

  const indexDelta = Number(b.Index || 0) - Number(a.Index || 0);
  if (indexDelta !== 0) return indexDelta;

  return Date.parse(b["Published On"]) - Date.parse(a["Published On"]);
}

function assertUniqueSlugs(posts: BlogPostSummary[]) {
  const seen = new Set<string>();

  for (const post of posts) {
    if (seen.has(post.slug)) {
      throw new Error(`Duplicate Blog slug detected: ${post.slug}`);
    }
    seen.add(post.slug);
  }
}

function writeJson(filePath: string, value: unknown) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function generateBlogIndexData(): BlogIndexData {
  const categoryRecords = parseCsv(readFileSync(CATEGORIES_CSV, "utf8"));
  const categories: BlogCategory[] = categoryRecords
    .filter(
      (record) =>
        record.Archived !== "true" &&
        record.Draft !== "true" &&
        isValidPublishedDate(record["Published On"]),
    )
    .map((record) => ({
      label: record.Name,
      slug: record.Slug,
      icon: record.Icon || null,
    }))
    .sort((a, b) => {
      const aIndex = CATEGORY_FILTER_ORDER.indexOf(
        a.slug as (typeof CATEGORY_FILTER_ORDER)[number],
      );
      const bIndex = CATEGORY_FILTER_ORDER.indexOf(
        b.slug as (typeof CATEGORY_FILTER_ORDER)[number],
      );
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

  const categoryMap = new Map(categories.map((category) => [category.slug, category]));
  const records = parseCsv(readFileSync(BLOG_CSV, "utf8"));
  const draftRecords = records.filter((record) => record.Draft === "true").length;
  const archivedRecords = records.filter((record) => record.Archived === "true").length;
  const invalidPublishedDateRecords = records.filter(
    (record) => !isValidPublishedDate(record["Published On"]),
  ).length;

  const posts: BlogPostSummary[] = records
    .filter(
      (record) =>
        record.Archived !== "true" &&
        record.Draft !== "true" &&
        isValidPublishedDate(record["Published On"]),
    )
    .sort(sortByWebflowCollectionOrder)
    .map((record) => {
      const category = categoryMap.get(record.Category);

      return {
        title: record.Name,
        slug: record.Slug,
        excerpt: record.Excerpt,
        category: category?.label ?? record.Category,
        categorySlug: record.Category,
        categoryIcon: category?.icon ?? null,
        publishedAt: record["Published On"],
        thumbnail: record.Thumbnail || null,
        featured: record.Featured === "true",
      };
    });

  assertUniqueSlugs(posts);

  const data: BlogIndexData = {
    posts,
    categories,
    stats: {
      totalRecords: records.length,
      excludedRecords: records.length - posts.length,
      draftRecords,
      archivedRecords,
      invalidPublishedDateRecords,
    },
  };

  if (data.posts.length !== EXPECTED_PUBLISHED_POSTS) {
    throw new Error(
      `Expected ${EXPECTED_PUBLISHED_POSTS} published Blog summaries, got ${data.posts.length}`,
    );
  }

  if (data.stats.excludedRecords !== EXPECTED_EXCLUDED_POSTS) {
    throw new Error(
      `Expected ${EXPECTED_EXCLUDED_POSTS} excluded Blog records, got ${data.stats.excludedRecords}`,
    );
  }

  return data;
}

const data = generateBlogIndexData();

mkdirSync(OUTPUT_DIR, { recursive: true });
writeJson(POSTS_OUTPUT, data.posts);
writeJson(CATEGORIES_OUTPUT, {
  categories: data.categories,
  stats: data.stats,
});

console.log(`Generated ${data.posts.length} Blog summaries.`);
console.log(`Excluded ${data.stats.excludedRecords} records.`);
console.log(`Categories: ${data.categories.map((category) => category.label).join(", ")}`);
