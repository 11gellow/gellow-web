<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useData } from "vitepress";
import BlogHome from "./components/BlogHome.vue";
import BlogPost from "./components/BlogPost.vue";
import PixelLoader from "./components/PixelLoader.vue";

const { frontmatter } = useData();
const pageKind = computed(() => frontmatter.value.pageKind ?? "home");

onMounted(() => {
  void import("../../js/feedback.js");
});
</script>

<template>
  <PixelLoader :kind="pageKind" />
  <BlogPost v-if="pageKind === 'post'" />
  <BlogHome v-else />
  <div id="toast-stack" class="toast-stack" aria-live="polite" aria-atomic="false"></div>
</template>
