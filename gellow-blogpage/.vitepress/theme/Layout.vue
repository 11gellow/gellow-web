<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useData } from "vitepress";
import BlogHome from "./components/BlogHome.vue";
import BlogPost from "./components/BlogPost.vue";
import ArcadePage from "./components/ArcadePage.vue";
import DisplayConsole from "./components/DisplayConsole.vue";
import NotesIndex from "./components/NotesIndex.vue";
import PostEditor from "./components/PostEditor.vue";
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
  <NotesIndex v-else-if="pageKind === 'notes'" />
  <PostEditor v-else-if="pageKind === 'editor'" />
  <DisplayConsole v-else-if="pageKind === 'display'" />
  <ArcadePage v-else-if="pageKind === 'arcade'" />
  <BlogHome v-else />
  <div id="toast-stack" class="toast-stack" aria-live="polite" aria-atomic="false"></div>
</template>
