"use client";

import type { BlogCategory } from "@/lib/blog/types";
import styles from "./BlogIndex.module.css";

type BlogFiltersProps = {
  categories: BlogCategory[];
  activeCategories: string[];
  onChange: (categories: string[]) => void;
};

export function BlogFilters({
  categories,
  activeCategories,
  onChange,
}: BlogFiltersProps) {
  function toggleCategory(slug: string) {
    if (activeCategories.includes(slug)) {
      onChange(activeCategories.filter((category) => category !== slug));
      return;
    }

    onChange([...activeCategories, slug]);
  }

  return (
    <fieldset className={styles.filters} aria-label="Blog categories">
      <legend className={styles.filterLegend}>Categories</legend>
      <div className={styles.filterList}>
        {categories.map((category) => {
          const checked = activeCategories.includes(category.slug);
          return (
            <label
              className={checked ? styles.filterOptionActive : styles.filterOption}
              key={category.slug}
            >
              {category.icon ? (
                <img className={styles.filterIcon} src={category.icon} alt="" loading="lazy" />
              ) : null}
              <input
                className={styles.filterInput}
                type="checkbox"
                checked={checked}
                onChange={() => toggleCategory(category.slug)}
              />
              <span className={styles.filterCheckbox} aria-hidden="true" />
              <span>{category.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
