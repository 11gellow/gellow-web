<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

const props = defineProps<{ kind: string }>();
const mounted = ref(true);
const hidden = ref(false);
let hideTimer = 0;
let removeTimer = 0;

onMounted(() => {
  const startTime = Date.now();
  document.documentElement.classList.add("is-page-loading");
  const waitMs = Math.max(0, 720 - (Date.now() - startTime));
  hideTimer = window.setTimeout(() => {
    hidden.value = true;
    document.documentElement.classList.remove("is-page-loading");
    removeTimer = window.setTimeout(() => {
      mounted.value = false;
    }, 520);
  }, waitMs);
});

onUnmounted(() => {
  window.clearTimeout(hideTimer);
  window.clearTimeout(removeTimer);
  document.documentElement.classList.remove("is-page-loading");
});
</script>

<template>
  <div v-if="mounted" class="page-loader" :class="{ 'is-hidden': hidden }">
    <div class="loader-shell pixel">
      <div class="loader-marquee">Insert Coin To Load</div>
      <div class="loader-core">
        <div class="loader-glyph" :class="kind === 'post' ? 'loader-glyph-post' : 'loader-glyph-blog'">
          {{ kind === "post" ? "P" : "B" }}
        </div>
        <div class="loader-copy">
          <strong>{{ kind === "post" ? "Loading Post" : "Booting Blog" }}</strong>
          <p>{{ kind === "post" ? "正在装载正文和摘要。" : "正在装载文章流。" }}</p>
          <div class="loader-bar"><span></span></div>
        </div>
      </div>
    </div>
  </div>
</template>
