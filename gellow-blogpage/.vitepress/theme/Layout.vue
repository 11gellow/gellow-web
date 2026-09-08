<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useData } from "vitepress";
import BlogHome from "./components/BlogHome.vue";
import BlogPost from "./components/BlogPost.vue";
import ArcadePage from "./components/ArcadePage.vue";
import MarkdownPost from "./components/MarkdownPost.vue";
import NotFound from "./components/NotFound.vue";
import PixelLoader from "./components/PixelLoader.vue";

const { frontmatter, page } = useData();
const pageKind = computed(() => page.value.isNotFound ? "not-found" : (frontmatter.value.pageKind ?? "home"));

onMounted(() => {
  void import("../../js/feedback.js");
});
</script>

<template>
  <PixelLoader :kind="pageKind" />
  <MarkdownPost v-if="pageKind === 'markdown-post'" :key="page.relativePath" />
  <NotFound v-else-if="pageKind === 'not-found'" />
  <BlogPost v-else-if="pageKind === 'post'" />
  <ArcadePage v-else-if="pageKind === 'arcade'" />
  <BlogHome v-else />
  <div id="toast-stack" class="toast-stack" aria-live="polite" aria-atomic="false"></div>
</template>
