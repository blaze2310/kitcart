"use client";

import { useState } from "react";
import Form from "next/form";
import { ChevronDown, Search } from "lucide-react";
import styles from "./explore-upgrade.module.css";

type Group = { name: string; children: string[] };
type Props = { groups: Group[]; categories: string[]; subcategories: string[]; query: string };

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function Facet({ title, name, options, selected, onChange }: {
  title: string;
  name: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <details className={styles.facet}>
      <summary>{title} <span>{selected.length || "All"}</span><ChevronDown size={16} aria-hidden /></summary>
      <div className={styles.options} role="group" aria-label={title}>
        <button type="button" onClick={() => onChange([])}>Select all</button>
        {options.map(({ value, label }) => (
          <label key={value}>
            <input type="checkbox" name={name} value={value} checked={selected.includes(value)}
              onChange={() => onChange(toggle(selected, value))} />
            {label}
          </label>
        ))}
      </div>
    </details>
  );
}

export default function ExploreFilters({ groups, categories, subcategories, query }: Props) {
  const [selectedCategories, setCategories] = useState(categories);
  const [selectedSubcategories, setSubcategories] = useState(subcategories);
  const available = groups.filter(({ name }) => !selectedCategories.length || selectedCategories.includes(name));
  return (
    <Form action="/explore" scroll={false} className={styles.toolbar} aria-label="Filter demo catalogue"
      onSubmit={(event) => event.currentTarget.querySelectorAll("details[open]").forEach((element) => element.removeAttribute("open"))}>
      <Facet title="Categories" name="category" options={groups.map(({ name }) => ({ value: name, label: name }))}
        selected={selectedCategories} onChange={(values) => {
          setCategories(values);
          const valid = new Set(groups.filter(({ name }) => !values.length || values.includes(name)).flatMap(({ children }) => children));
          setSubcategories((current) => current.filter((item) => valid.has(item)));
        }} />
      <Facet title="Subcategories" name="subcategory" selected={selectedSubcategories} onChange={setSubcategories}
        options={available.flatMap(({ children }) => children.map((value) => ({ value, label: value })))} />
      <div className={styles.search}>
        <Search size={18} aria-hidden />
        <input type="search" name="q" defaultValue={query} aria-label="Search demo products" placeholder="Search demo products…" />
      </div>
      <button className={styles.apply} type="submit">Apply &amp; search</button>
    </Form>
  );
}
