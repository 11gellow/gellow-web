<script setup lang="ts">
import { onMounted, ref } from "vue";
import { data as posts } from "../../../site/posts.data";

const message = ref("正在跳转到 Markdown 文章...");
const destination = ref("/");

onMounted(() => {
  const slug = new URLSearchParams(location.search).get("slug")?.trim().normalize("NFC");
  const post = posts.find((item) => item.slug.trim().normalize("NFC") === slug);
  if (!post) { message.value = "没有找到对应的 Markdown 文章。"; return; }
  destination.value = post.url;
  location.replace(post.url);
});
</script>

<template>
  <header class="fusion-header"><div class="wrap fusion-nav"><div class="fusion-brand"><div class="fusion-kicker">legacy link bridge</div><h1 class="title">Post Redirect</h1></div><nav class="fusion-menu"><a class="fusion-link" href="/">Home</a></nav></div></header>
  <main class="wrap fusion-shell"><article class="post-detail pixel"><p>{{ message }}</p><a class="btn btn-blue back-inline" :href="destination">Continue</a></article></main>
</template>
