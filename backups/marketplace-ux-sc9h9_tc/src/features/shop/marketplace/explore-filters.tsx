"use client";

import { useState } from "react";
import Form from "next/form";
import { ChevronDown, Search } from "lucide-react";
import styles from "./explore-upgrade.module.css";

type Group = { name: string; children: string[] };
type Props = {
  groups: Group[];
  categories: string[];
  subcategories: string[];
  query: string;
};

function Facet({ title, name, options, selected, onChange }: {
  title: string;
  name: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const count = options.filter((option) => selected.includes(option)).length;
  const all = options.length > 0 && count === options.length;
  const mixed = count > 0 && !all;

  return (
    <details className={styles.facet}>
      <summary>
        {title}
        <span>{all ? "All" : count ? String(count) : "Any"}</span>
        <ChevronDown size={16} aria-hidden />
      </summary>
      <div className={styles.options} role="group" aria-label={title}>
        <label className={styles.selectAll}>
          <input
            type="checkbox"
            checked={all}
            aria-checked={mixed ? "mixed" : all}
            ref={(input) => {
              if (input) input.indeterminate = mixed;
            }}
            onChange={() => onChange(all ? [] : [...options])}
          />
          Select all
        </label>
        {options.map((option) => (
          <label key={option}>
            <input
              type="checkbox"
              name={name}
              value={option}
              checked={selected.includes(option)}
              onChange={(event) => onChange(
                event.currentTarget.checked
                  ? [...selected, option]
                  : selected.filter((item) => item !== option),
              )}
            />
            {option}
          </label>
        ))}
      </div>
    </details>
  );
}

export default function ExploreFilters({ groups, categories, subcategories, query }: Props) {
  const [selectedCategories, setCategories] = useState(categories);
  const [selectedSubcategories, setSubcategories] = useState(subcategories);

  function subcategoriesFor(values: string[]) {
    return groups
      .filter(({ name }) => !values.length || values.includes(name))
      .flatMap(({ children }) => children);
  }

  function changeCategories(values: string[]) {
    setCategories(values);
    const valid = new Set(subcategoriesFor(values));
    setSubcategories((current) => current.filter((item) => valid.has(item)));
  }

  return (
    <Form
      action="/explore"
      scroll={false}
      className={styles.toolbar}
      aria-label="Filter demo catalogue"
      onSubmit={(event) => {
        event.currentTarget.querySelectorAll("details[open]").forEach((element) => {
          element.removeAttribute("open");
        });
      }}
    >
      <Facet title="Categories" name="category" options={groups.map(({ name }) => name)}
        selected={selectedCategories} onChange={changeCategories} />
      <Facet title="Subcategories" name="subcategory" options={subcategoriesFor(selectedCategories)}
        selected={selectedSubcategories} onChange={setSubcategories} />
      <div className={styles.search}>
        <Search size={18} aria-hidden />
        <input type="search" name="q" defaultValue={query}
          aria-label="Search demo products" placeholder="Search demo products…" />
      </div>
      <button className={styles.apply} type="submit">Apply &amp; search</button>
    </Form>
  );
}
