import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { load } from "cheerio";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

const API_URL = process.env.GELLOW_CONTENT_API || "https://warp.gellow.top/api/content/admin";
const root = resolve(import.meta.dirname, "..");
const postsDir = resolve(root, "site/posts");
const assetsDir = resolve(root, "assets/posts");

const yamlString = (value) => JSON.stringify(String(value ?? ""));
const safePart = (value) => String(value || "post").normalize("NFC").replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "") || "post";
const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

async function migrateBody(post) {
  const $ = load(`<main id="migration-root">${post.content || ""}</main>`, null, false);
  $(".PDq2pG_selectionAnchor").remove();
  $("script, style").remove();

  let imageIndex = 0;
  for (const image of $("img").toArray()) {
    const src = $(image).attr("src") || "";
    const match = src.match(/^data:image\/([^;,]+);base64,(.+)$/s);
    if (!match) continue;
    imageIndex += 1;
    const extension = ({ jpeg: "jpg", "svg+xml": "svg" })[match[1]] || safePart(match[1]);
    const filename = `${post.publishedAt || "undated"}-${post.id}-image-${imageIndex}.${extension}`;
    await writeFile(resolve(assetsDir, filename), Buffer.from(match[2], "base64"));
    $(image).attr("src", `../../assets/posts/${filename}`);
  }

  $("[data-attachment-url]").each((_, element) => {
    const url = $(element).attr("data-attachment-url");
    if (!url) return;
    const name = $(element).find(".attachment-name").text().trim() || "附件";
    $(element).replaceWith(`<a href="${url}">${escapeHtml(name)}</a>`);
  });

  $("pre").each((_, element) => {
    const text = $(element).text().replace(/^\n+|\n+$/g, "");
    $(element).replaceWith(`<pre><code>${escapeHtml(text)}</code></pre>`);
  });

  const firstHeading = $("#migration-root").children("h1").first();
  if (firstHeading.text().trim() === String(post.title).trim()) firstHeading.remove();
  let majorHeadingSeen = false;
  $("h1, h2, h3").each((_, element) => {
    if (element.tagName === "h1") { element.tagName = "h2"; majorHeadingSeen = true; }
    else if (element.tagName === "h2" && majorHeadingSeen) element.tagName = "h3";
    else if (element.tagName === "h3") element.tagName = "h4";
  });

  const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-", emDelimiter: "*" });
  turndown.use(gfm);
  turndown.addRule("preserveVideo", { filter: ["video", "audio", "iframe"], replacement: (_content, node) => `\n\n${node.outerHTML}\n\n` });
  return turndown.turndown($("#migration-root").html() || "").replace(/\n{3,}/g, "\n\n").trim();
}

async function main() {
  const response = await fetch(API_URL, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Unable to read posts: ${response.status}`);
  const payload = await response.json();
  const posts = Array.isArray(payload.posts) ? payload.posts : [];

  await mkdir(postsDir, { recursive: true });
  await mkdir(assetsDir, { recursive: true });
  for (const name of await readdir(postsDir)) if (name.endsWith(".md")) await rm(resolve(postsDir, name));

  const manifest = [];
  for (const post of posts) {
    const filename = `${post.publishedAt || "undated"}-${safePart(post.slug)}.md`;
    const body = await migrateBody(post);
    const markdown = [
      "---",
      "pageKind: markdown-post",
      `title: ${yamlString(post.title)}`,
      `description: ${yamlString(post.summary)}`,
      `date: ${yamlString(post.publishedAt)}`,
      `updated: ${yamlString(post.updatedAt)}`,
      `slug: ${yamlString(post.slug)}`,
      `legacyId: ${Number(post.id)}`,
      "tags: []",
      "outline: [2, 3]",
      "---",
      "",
      body,
      "",
    ].join("\n");
    await writeFile(resolve(postsDir, filename), markdown, "utf8");
    manifest.push({ id: post.id, slug: post.slug, file: `site/posts/${filename}` });
  }
  await writeFile(resolve(root, "site/posts-migration.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Migrated ${manifest.length} posts from ${API_URL}.`);
}

await main();
