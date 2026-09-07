<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps<{ kind: string }>();
const mounted = ref(true);
const hidden = ref(false);
let hideTimer = 0;
let removeTimer = 0;

const loaderCopy = computed(() => {
  const variants: Record<string, { glyph: string; glyphClass: string; title: string; copy: string }> = {
    home: { glyph: "B", glyphClass: "loader-glyph-blog", title: "Booting Blog", copy: "正在装载文章流。" },
    post: { glyph: "P", glyphClass: "loader-glyph-post", title: "Loading Post", copy: "正在装载正文和摘要。" },
    notes: { glyph: "N", glyphClass: "loader-glyph-notes", title: "Notes Console", copy: "loading~~~" },
    editor: { glyph: "E", glyphClass: "loader-glyph-display", title: "Post Editor", copy: "loading~~~" },
    display: { glyph: "D", glyphClass: "loader-glyph-display", title: "Display Console", copy: "loading~~~" },
    arcade: { glyph: "A", glyphClass: "", title: "Gellow Arcade", copy: "loading~~~" },
  };
  return variants[props.kind] ?? variants.home;
});

function clearTimers() {
  window.clearTimeout(hideTimer);
  window.clearTimeout(removeTimer);
}

function startLoader() {
  clearTimers();
  mounted.value = true;
  hidden.value = false;
  document.documentElement.classList.add("gellow-loading");
  document.documentElement.classList.add("is-page-loading");

  hideTimer = window.setTimeout(() => {
    hidden.value = true;
    removeTimer = window.setTimeout(async () => {
      mounted.value = false;
      await nextTick();
      document.documentElement.classList.remove("gellow-loading");
      document.documentElement.classList.remove("is-page-loading");
    }, 520);
  }, 720);
}

onMounted(startLoader);

watch(() => props.kind, startLoader);

onUnmounted(() => {
  clearTimers();
  document.documentElement.classList.remove("gellow-loading");
  document.documentElement.classList.remove("is-page-loading");
});
</script>

<template>
  <div v-if="mounted" class="page-loader" :class="{ 'is-hidden': hidden }">
    <div class="loader-shell pixel">
      <div class="loader-marquee">Insert Coin To Load</div>
      <div class="loader-core">
        <div class="loader-glyph" :class="loaderCopy.glyphClass">{{ loaderCopy.glyph }}</div>
        <div class="loader-copy">
          <strong>{{ loaderCopy.title }}</strong>
          <p>{{ loaderCopy.copy }}</p>
          <div class="loader-bar"><span></span></div>
        </div>
      </div>
    </div>
  </div>
</template>
