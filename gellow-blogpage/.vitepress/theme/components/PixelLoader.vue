<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps<{ kind: string }>();
const mounted = ref(true);
const hidden = ref(false);
let hideTimer = 0;
let removeTimer = 0;

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
