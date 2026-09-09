<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted } from "vue";
import { useData } from "vitepress";
import BlogHome from "./components/BlogHome.vue";
import BlogPost from "./components/BlogPost.vue";
import ArcadePage from "./components/ArcadePage.vue";
import MarkdownPost from "./components/MarkdownPost.vue";
import NotFound from "./components/NotFound.vue";
import PixelLoader from "./components/PixelLoader.vue";
import VinylPlayer from "./components/VinylPlayer.vue";
import AmbientBackground from "./components/AmbientBackground.vue";

const { frontmatter, page } = useData();
const LocalEditor = import.meta.env.DEV ? defineAsyncComponent(() => import('./components/PostEditor.vue')) : null;
const isDraftPreview = import.meta.env.DEV && typeof window !== 'undefined' && window.self !== window.top;
const pageKind = computed(() => page.value.isNotFound ? "not-found" : (frontmatter.value.pageKind ?? "home"));

onMounted(() => {
  void import("../../js/feedback.js");
});
</script>

<template>
  <AmbientBackground />
  <PixelLoader :kind="pageKind" />
  <VinylPlayer v-if="!isDraftPreview && pageKind !== 'local-editor'" />
  <component :is="LocalEditor" v-if="LocalEditor && pageKind === 'local-editor'" />
  <MarkdownPost v-else-if="pageKind === 'markdown-post'" :key="page.relativePath" />
  <NotFound v-else-if="pageKind === 'not-found'" />
  <BlogPost v-else-if="pageKind === 'post'" />
  <ArcadePage v-else-if="pageKind === 'arcade'" />
  <BlogHome v-else :key="pageKind" :directory="pageKind === 'links'" :notes="pageKind === 'note'" />
  <div id="toast-stack" class="toast-stack" aria-live="polite" aria-atomic="false"></div>
</template>
