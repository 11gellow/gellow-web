<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps<{ kind: string }>();
const mounted = ref(true);
const hidden = ref(false);
const entering = ref(false);
let hideTimer = 0;
let removeTimer = 0;
let navigationTimer = 0;

const loaderCopy = computed(() => {
  const variants: Record<string, { glyph: string; glyphClass: string; title: string; copy: string }> = {
    home: { glyph: "B", glyphClass: "loader-glyph-blog", title: "Booting Blog", copy: "正在装载文章流。" },
    post: { glyph: "P", glyphClass: "loader-glyph-post", title: "Loading Post", copy: "正在装载正文和摘要。" },
    "markdown-post": { glyph: "M", glyphClass: "loader-glyph-post", title: "Loading Markdown", copy: "正在渲染文章与目录。" },
    "not-found": { glyph: "?", glyphClass: "loader-glyph-post", title: "Route Missing", copy: "正在返回安全区域。" },
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
  window.clearTimeout(navigationTimer);
}

function syncPageClass() {
  document.documentElement.classList.toggle("gellow-arcade-page", props.kind === "arcade");
}

function startLoader() {
  clearTimers();
  syncPageClass();
  mounted.value = true;
  hidden.value = false;
  entering.value = false;
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

function shouldAnimateNavigation(event: MouseEvent, link: HTMLAnchorElement) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (link.target === "_blank" || link.hasAttribute("download")) return false;
  const href = link.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return false;
  const target = new URL(link.href, window.location.href);
  const current = new URL(window.location.href);
  return target.origin === current.origin && target.href !== current.href;
}

async function handleNavigation(event: MouseEvent) {
  const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
  if (!link || !shouldAnimateNavigation(event, link)) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  clearTimers();
  mounted.value = true;
  hidden.value = false;
  entering.value = true;
  await nextTick();
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => { entering.value = false; }));
  navigationTimer = window.setTimeout(() => { window.location.href = link.href; }, 280);
}

onMounted(() => {
  startLoader();
  document.addEventListener("click", handleNavigation, true);
});

watch(() => props.kind, startLoader);

onUnmounted(() => {
  clearTimers();
  document.removeEventListener("click", handleNavigation, true);
  document.documentElement.classList.remove("gellow-loading");
  document.documentElement.classList.remove("is-page-loading");
  document.documentElement.classList.remove("gellow-arcade-page");
});
</script>

<template>
  <div v-if="mounted" class="page-loader" :class="{ 'is-hidden': hidden, 'is-entering': entering }">
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
