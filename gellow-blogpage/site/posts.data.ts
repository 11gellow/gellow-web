import { createContentLoader } from "vitepress";

export interface MarkdownPostSummary {
  title: string;
  description: string;
  date: string;
  updated: string;
  slug: string;
  url: string;
}

export default createContentLoader("posts/*.md", {
  transform(pages): MarkdownPostSummary[] {
    return pages
      .map(({ url, frontmatter }) => ({
        title: String(frontmatter.title || "Untitled"),
        description: String(frontmatter.description || ""),
        date: String(frontmatter.date || ""),
        updated: String(frontmatter.updated || ""),
        slug: String(frontmatter.slug || ""),
        url,
      }))
      .sort((left, right) => Date.parse(right.date || right.updated) - Date.parse(left.date || left.updated));
  },
});

declare const data: MarkdownPostSummary[];
export { data };
