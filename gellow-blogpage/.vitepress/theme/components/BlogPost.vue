<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  getCachedPublicContent,
  refreshPublicContent,
  type BlogPostRecord,
} from "../content-api";

const post = ref<BlogPostRecord | null>(null);
const errorMessage = ref("");

function formatDate(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderContent(content: string) {
  if (!content.trim()) return "";
  if (/<\/?[a-z][\s\S]*>/i.test(content)) return content;
  return content
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`)
    .join("");
}

const contentHtml = computed(() => renderContent(post.value?.content ?? ""));

async function loadPost() {
  const slug = new URLSearchParams(window.location.search).get("slug")?.trim().normalize("NFC") ?? "";
  if (!slug) {
    errorMessage.value = "缺少 slug，无法打开文章。";
    return;
  }

  const cached = getCachedPublicContent();
  const cachedPost = cached?.posts?.find((entry) => entry.slug.trim().normalize("NFC") === slug);
  if (cachedPost) {
    post.value = cachedPost;
    document.title = `${cachedPost.title} | Gellow Blog`;
  }

  try {
    const payload = await refreshPublicContent();
    const freshPost = payload.posts.find((entry) => entry.slug.trim().normalize("NFC") === slug);
    if (!freshPost) throw new Error("post not found");
    post.value = freshPost;
    errorMessage.value = "";
    document.title = `${freshPost.title} | Gellow Blog`;
  } catch (error) {
    if (!cachedPost) {
      const message = error instanceof Error ? error.message : "network request failed";
      errorMessage.value = `文章加载失败：${message}`;
    }
    console.warn("Unable to load post detail.", error);
  }
}

function handleAttachmentClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  const card = target.closest<HTMLElement>("[data-attachment-action]");
  if (!card) return;
  event.preventDefault();

  const block = card.closest<HTMLElement>(".attachment-block");
  const preview = block?.querySelector<HTMLElement>(".attachment-preview");
  const kind = card.dataset.fileKind;
  const url = card.dataset.attachmentUrl;
  const canPreview = preview && ["audio", "video"].includes(kind ?? "");

  if (!canPreview) {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  const willOpen = preview.hidden;
  block?.classList.toggle("is-preview-open", willOpen);
  preview.hidden = !willOpen;
  card.setAttribute("aria-expanded", String(willOpen));
}

onMounted(() => void loadPost());
</script>

<template>
  <header class="fusion-header">
    <div class="wrap fusion-nav">
      <div class="fusion-brand">
        <div class="fusion-kicker">detail view / full reading page</div>
        <h1 class="title">Post Detail</h1>
      </div>
      <nav class="fusion-menu">
        <a class="fusion-link" href="/" data-toast-message="Blog Home 已打开">Home</a>
      </nav>
    </div>
  </header>

  <main class="wrap fusion-shell">
    <article id="post-detail" class="post-detail pixel" @click="handleAttachmentClick">
      <div v-if="errorMessage" class="archive-empty">{{ errorMessage }}</div>
      <div v-else-if="!post" class="loading-card">正在加载文章...</div>
      <template v-else>
        <div class="blog-entry-meta">
          <span class="tag">{{ post.slug }}</span>
          <span class="date">{{ formatDate(post.publishedAt) }}</span>
        </div>
        <h2>{{ post.title }}</h2>
        <p>{{ post.summary }}</p>
        <div class="post-detail-content" v-html="contentHtml"></div>
        <a class="btn btn-blue back-inline" href="/">Back To Blog</a>
      </template>
    </article>
  </main>

  <footer class="fusion-footer">Gellow Blog · Detail page</footer>
</template>
