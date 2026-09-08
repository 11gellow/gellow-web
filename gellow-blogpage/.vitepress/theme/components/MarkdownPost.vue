<script setup lang="ts">
import { Content, useData } from "vitepress";
import { computed, nextTick, onMounted, onBeforeUnmount, ref } from "vue";

interface OutlineItem { id: string; text: string; level: number }
const { frontmatter } = useData();
const outline = ref<OutlineItem[]>([]);
const activeId = ref("");
const article = ref<HTMLElement>();
const panel = ref<HTMLElement>();
const progress = ref(0);
const hidden = ref(false);
const position = ref<{ x: number; y: number }>();
const size = ref({ width: 270, height: 260 });
const panelStyle = computed(() => position.value ? { left: `${position.value.x}px`, top: `${position.value.y}px`, right: 'auto' } : {});
const perimeter = computed(() => `M 2 2 H ${size.value.width - 2} V ${size.value.height - 2} H 2 V 2`);
let observer: IntersectionObserver | undefined;
let resize: ResizeObserver | undefined;
let frame = 0;
let lastY = 0;
let directionDistance = 0;
let drag: { id: number; x: number; y: number; left: number; top: number } | undefined;
function clampPosition(x: number, y: number) {
  position.value = { x: Math.max(0, Math.min(x, innerWidth - size.value.width)), y: Math.max(4, Math.min(y, innerHeight - size.value.height)) };
}
function startDrag(event: PointerEvent) {
  if (event.button !== 0 || (event.target as HTMLElement).closest('nav')) return;
  const rect = panel.value!.getBoundingClientRect();
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
  panel.value!.setPointerCapture(event.pointerId);
  event.preventDefault();
}
function moveDrag(event: PointerEvent) {
  if (drag?.id === event.pointerId) clampPosition(drag.left + event.clientX - drag.x, drag.top + event.clientY - drag.y);
}
function endDrag() { drag = undefined; }
function updateReading() {
  frame = 0;
  const y = Math.max(0, window.scrollY);
  const delta = y - lastY;
  directionDistance = Math.sign(delta) === Math.sign(directionDistance) ? directionDistance + delta : delta;
  if (y < 60) hidden.value = false;
  else if (Math.abs(directionDistance) > 10) hidden.value = directionDistance > 0;
  lastY = y;
  if (article.value) {
    const rect = article.value.getBoundingClientRect();
    const start = rect.top + y;
    const distance = start + rect.height - innerHeight;
    progress.value = distance > 0 ? Math.min(1, Math.max(0, y / distance)) : 1;
  }
}
function scheduleReading() { if (!frame) frame = requestAnimationFrame(updateReading); }
function onResize() {
  if (position.value) clampPosition(position.value.x, position.value.y);
  scheduleReading();
}

function collectOutline() {
  const headings = [...document.querySelectorAll<HTMLElement>(".markdown-body h2[id], .markdown-body h3[id]")];
  outline.value = headings.map((heading) => ({ id: heading.id, text: heading.textContent?.replace(/#$/, "").trim() || heading.id, level: Number(heading.tagName.slice(1)) }));
  if (!headings.length) return;
  observer = new IntersectionObserver((entries) => {
    const visible = entries.find((entry) => entry.isIntersecting);
    if (visible) activeId.value = (visible.target as HTMLElement).id;
  }, { rootMargin: "-18% 0px -72%" });
  headings.forEach((heading) => observer.observe(heading));
}

onMounted(async () => {
  document.title = `${frontmatter.value.title} | Gellow Blog`;
  await nextTick();
  collectOutline();
  await nextTick();
  lastY = window.scrollY;
  resize = new ResizeObserver(() => {
    if (panel.value) size.value = { width: panel.value.offsetWidth, height: panel.value.offsetHeight };
    onResize();
  });
  if (article.value) resize.observe(article.value);
  if (panel.value) resize.observe(panel.value);
  window.addEventListener('scroll', scheduleReading, { passive: true });
  window.addEventListener('resize', onResize);
  updateReading();
});
onBeforeUnmount(() => {
  observer?.disconnect();
  resize?.disconnect();
  cancelAnimationFrame(frame);
  window.removeEventListener('scroll', scheduleReading);
  window.removeEventListener('resize', onResize);
});
</script>

<template>
  <header class="fusion-header reading-header" :class="{ 'is-hidden': hidden }"><div class="wrap fusion-nav"><div class="fusion-brand"><div class="fusion-kicker">markdown / full reading page</div><h1 class="title" :title="frontmatter.title">{{ frontmatter.title }}</h1></div><nav class="fusion-menu"><a class="fusion-link" href="/">Home</a></nav></div><div class="reading-progress" role="progressbar" aria-label="文章阅读进度" :aria-valuenow="Math.round(progress * 100)" :aria-valuemin="0" :aria-valuemax="100"><div :style="{ clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` }"></div></div></header>
  <main class="wrap markdown-post-layout">
    <article ref="article" class="post-detail markdown-post pixel">
      <div class="blog-entry-meta"><span class="tag">{{ frontmatter.slug }}</span><time class="date">{{ frontmatter.date }}</time></div>
      <p v-if="frontmatter.description" class="markdown-summary">{{ frontmatter.description }}</p>
      <Content class="post-detail-content markdown-body" />
      <a class="btn btn-blue back-inline" href="/">Back To Blog</a>
    </article>
    <aside v-if="outline.length" ref="panel" class="markdown-outline pixel" :style="panelStyle" aria-label="文章目录，可拖动边框移动" @pointerdown="startDrag" @pointermove="moveDrag" @pointerup="endDrag" @pointercancel="endDrag" @lostpointercapture="endDrag">
      <svg class="outline-progress" :viewBox="`0 0 ${size.width} ${size.height}`" aria-hidden="true"><defs><linearGradient id="reading-rainbow" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ff8ad8"/><stop offset="33%" stop-color="#ffe66d"/><stop offset="66%" stop-color="#9be564"/><stop offset="100%" stop-color="#29adff"/></linearGradient></defs><path :d="perimeter" pathLength="100" fill="none" stroke="url(#reading-rainbow)" stroke-width="4" :stroke-dasharray="`${progress * 100} 100`" /></svg>
      <div class="notes-panel-kicker">On This Page</div><h2>文章目录</h2>
      <nav><a v-for="item in outline" :key="item.id" :href="`#${item.id}`" :class="{ nested: item.level === 3, active: activeId === item.id }">{{ item.text }}</a></nav>
    </aside>
  </main>
  <footer class="fusion-footer">Gellow Blog · Markdown</footer>
</template>
