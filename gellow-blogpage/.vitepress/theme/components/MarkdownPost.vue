<script setup lang="ts">
import { Content, useData } from "vitepress";
import { nextTick, onMounted, ref } from "vue";

interface OutlineItem { id: string; text: string; level: number }
const { frontmatter } = useData();
const outline = ref<OutlineItem[]>([]);
const activeId = ref("");

function collectOutline() {
  const headings = [...document.querySelectorAll<HTMLElement>(".markdown-body h2[id], .markdown-body h3[id]")];
  outline.value = headings.map((heading) => ({ id: heading.id, text: heading.textContent?.replace(/#$/, "").trim() || heading.id, level: Number(heading.tagName.slice(1)) }));
  if (!headings.length) return;
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.find((entry) => entry.isIntersecting);
    if (visible) activeId.value = (visible.target as HTMLElement).id;
  }, { rootMargin: "-18% 0px -72%" });
  headings.forEach((heading) => observer.observe(heading));
}

onMounted(async () => {
  document.title = `${frontmatter.value.title} | Gellow Blog`;
  await nextTick();
  collectOutline();
});
</script>

<template>
  <header class="fusion-header"><div class="wrap fusion-nav"><div class="fusion-brand"><div class="fusion-kicker">markdown / full reading page</div><h1 class="title">{{ frontmatter.title }}</h1></div><nav class="fusion-menu"><a class="fusion-link" href="/">Home</a></nav></div></header>
  <main class="wrap markdown-post-layout">
    <article class="post-detail markdown-post pixel">
      <div class="blog-entry-meta"><span class="tag">{{ frontmatter.slug }}</span><time class="date">{{ frontmatter.date }}</time></div>
      <p v-if="frontmatter.description" class="markdown-summary">{{ frontmatter.description }}</p>
      <Content class="post-detail-content markdown-body" />
      <a class="btn btn-blue back-inline" href="/">Back To Blog</a>
    </article>
    <aside v-if="outline.length" class="markdown-outline pixel" aria-label="文章目录">
      <div class="notes-panel-kicker">On This Page</div><h2>文章目录</h2>
      <nav><a v-for="item in outline" :key="item.id" :href="`#${item.id}`" :class="{ nested: item.level === 3, active: activeId === item.id }">{{ item.text }}</a></nav>
    </aside>
  </main>
  <footer class="fusion-footer">Gellow Blog · Markdown</footer>
</template>
