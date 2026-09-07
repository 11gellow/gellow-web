<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getCachedAdminContent, refreshAdminContent, sortPosts, type BlogPostRecord } from "../content-api";

const posts = ref<BlogPostRecord[]>([]);
const status = ref("正在读取文章列表...");
const error = ref("");
const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }) : "--";
const statusLabel = (value: string) => value === "published" ? "PUBLISHED" : value === "archived" ? "ARCHIVED" : "DRAFT";

onMounted(async () => {
  document.title = "Gellow Notes Console";
  const cached = getCachedAdminContent();
  if (cached) { posts.value = sortPosts(cached.posts || []); status.value = `已载入 ${posts.value.length} 篇缓存文章。`; }
  try {
    const payload = await refreshAdminContent(); posts.value = sortPosts(payload.posts || []); status.value = `已载入 ${posts.value.length} 篇文章。`; error.value = "";
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "network request failed";
    if (!cached) error.value = `文章列表读取失败：${message}`;
    status.value = `读取失败：${message}`;
  }
});
</script>

<template>
  <header class="notes-minibar"><div class="wrap notes-minibar-inner"><a class="btn btn-notes-hub" href="/">Back To Blog</a></div></header>
  <main class="wrap notes-archive-shell"><section class="notes-side pixel">
    <div class="notes-panel-head notes-archive-head"><div><div class="notes-panel-kicker">Post Index</div><h1 class="section-title yellow">Article List</h1></div><a class="btn btn-green" href="/notes/editor.html?mode=new">New Post</a></div>
    <p class="notes-hint notes-archive-status">{{ status }}</p>
    <div class="article-grid article-grid-archive">
      <div v-if="error" class="empty-state">{{ error }}</div>
      <div v-else-if="!posts.length" class="empty-state">还没有文章。<br />点击右上角 <strong>New Post</strong> 创建第一篇文章。</div>
      <article v-for="post in posts" v-else :key="String(post.id)" class="article-card">
        <div class="article-card-head"><h3>{{ post.title }}</h3><span class="status-badge" :class="post.status">{{ statusLabel(post.status) }}</span></div>
        <div class="article-card-body"><p>{{ post.summary || "暂无摘要。" }}</p></div>
        <div class="article-card-footer"><div class="article-card-meta meta-line">{{ post.slug }}<br />{{ formatDate(post.publishedAt || post.updatedAt) }}</div><a class="btn btn-blue article-edit-link" :href="`/notes/editor.html?id=${post.id}`">Edit</a></div>
      </article>
    </div>
  </section></main>
</template>
