<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { data as posts } from "../../../site/posts.data";
import WelcomeStage from './WelcomeStage.vue';
import { welcomeSession } from '../welcome';
import IdentityNavigation from './IdentityNavigation.vue';
const welcomeOpen = ref(!welcomeSession.entered);
const expandWelcome = ref(false);
function navigateIdentity(action: 'home' | 'blog') {
  gameOpen.value = false;
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (action === 'home') { expandWelcome.value = true; welcomeSession.entered = false; welcomeOpen.value = true; }
  else { welcomeSession.entered = true; welcomeOpen.value = false; }
}
const gameOpen = ref(false);
const scrollProgress = ref(0);
let progressFrame = 0;
let pageResizeObserver: ResizeObserver | undefined;

function updateProgress() {
  progressFrame = 0;
  const distance = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress.value = distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 1;
}

function scheduleProgress() {
  if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
}
const gameLoaded = ref(false);
const gameWindow = ref<HTMLElement | null>(null);
const gameHandle = ref<HTMLElement | null>(null);
let dragPointerId: number | null = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let positioned = false;

function formatDate(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function applyGameWindowPosition(left: number, top: number) {
  const element = gameWindow.value;
  if (!element) return;
  const maxLeft = Math.max(12, window.innerWidth - element.offsetWidth - 12);
  const maxTop = Math.max(12, window.innerHeight - element.offsetHeight - 12);
  element.style.left = `${Math.min(Math.max(12, left), maxLeft)}px`;
  element.style.top = `${Math.min(Math.max(12, top), maxTop)}px`;
  element.style.right = "auto";
  positioned = true;
}

function openArcadeWindow() {
  gameLoaded.value = true;
  gameOpen.value = true;
}

function startDrag(event: PointerEvent) {
  if ((event.target as HTMLElement).closest(".game-window-close") || !gameWindow.value) return;
  const rect = gameWindow.value.getBoundingClientRect();
  dragPointerId = event.pointerId;
  dragOffsetX = event.clientX - rect.left;
  dragOffsetY = event.clientY - rect.top;
  applyGameWindowPosition(rect.left, rect.top);
  gameHandle.value?.setPointerCapture(event.pointerId);
  gameWindow.value.classList.add("is-dragging");
}

function moveDrag(event: PointerEvent) {
  if (dragPointerId !== event.pointerId) return;
  applyGameWindowPosition(event.clientX - dragOffsetX, event.clientY - dragOffsetY);
}

function endDrag(event: PointerEvent) {
  if (dragPointerId !== event.pointerId) return;
  dragPointerId = null;
  gameWindow.value?.classList.remove("is-dragging");
  if (gameHandle.value?.hasPointerCapture(event.pointerId)) {
    gameHandle.value.releasePointerCapture(event.pointerId);
  }
}

function handleResize() {
  scheduleProgress();
  if (gameOpen.value && positioned && gameWindow.value) {
    const rect = gameWindow.value.getBoundingClientRect();
    applyGameWindowPosition(rect.left, rect.top);
  }
}

onMounted(() => {
  window.addEventListener("resize", handleResize);
  window.addEventListener("scroll", scheduleProgress, { passive: true });
  pageResizeObserver = new ResizeObserver(scheduleProgress);
  pageResizeObserver.observe(document.body);
  updateProgress();
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
  window.removeEventListener("scroll", scheduleProgress);
  pageResizeObserver?.disconnect();
  cancelAnimationFrame(progressFrame);
});
</script>

<template>
  <WelcomeStage v-if="welcomeOpen" :expand-from-card="expandWelcome" @enter="welcomeOpen = false" />
  <div class="home-content" :class="{ 'awaiting-welcome': welcomeOpen }" :inert="welcomeOpen">
  <header class="fusion-header home-header-style">
    <div class="wrap fusion-nav">
      <div class="brand-block">
        <IdentityNavigation @navigate="navigateIdentity" />
        <div class="brand-copy">
          <h1 class="title">Gellow Blog</h1>
          <div class="subtitle">Insert Coin To Read</div>
        </div>
      </div>
    </div>
    <div class="reading-progress" role="progressbar" aria-label="文章列表浏览进度" :aria-valuenow="Math.round(scrollProgress * 100)" :aria-valuemin="0" :aria-valuemax="100">
      <div :style="{ clipPath: `inset(0 ${(1 - scrollProgress) * 100}% 0 0)` }"></div>
    </div>
  </header>

  <button
    id="pacman-launch-button"
    class="pacman-launch-button"
    type="button"
    aria-label="Open Pac-Man"
    @click="openArcadeWindow"
  >
    <img :src="'/assets/pacman.png'" alt="" />
  </button>

  <aside class="bookmark-dock" aria-label="Quick bookmarks">
    <a class="bookmark-tab" href="https://github.com/11gellow" target="_blank" rel="noopener noreferrer" data-toast-message="GitHub 已打开">
      <span class="bookmark-icon"><img src="https://github.githubassets.com/favicons/favicon-dark.svg" alt="GitHub" /></span>
      <span class="bookmark-preview"><strong>GitHub</strong></span>
    </a>
    <a class="bookmark-tab" href="https://steamcommunity.com/profiles/76561198444114302/" target="_blank" rel="noopener noreferrer" data-toast-message="Steam 已打开">
      <span class="bookmark-icon"><img src="https://store.steampowered.com/favicon.ico" alt="Steam" /></span>
      <span class="bookmark-preview"><strong>Steam</strong></span>
    </a>
    <a class="bookmark-tab" href="https://space.bilibili.com/518863790" target="_blank" rel="noopener noreferrer" data-toast-message="Bilibili 已打开">
      <span class="bookmark-icon"><img src="https://www.bilibili.com/favicon.ico" alt="Bilibili" /></span>
      <span class="bookmark-preview"><strong>Bilibili</strong></span>
    </a>
  </aside>

  <div v-show="gameOpen" ref="gameWindow" class="game-window is-open" @click.self="gameOpen = false">
    <div class="game-window-shell pixel">
      <div
        ref="gameHandle"
        class="game-window-head"
        @pointerdown="startDrag"
        @pointermove="moveDrag"
        @pointerup="endDrag"
        @pointercancel="endDrag"
      >
        <div><h2>Pac-Man Run</h2></div>
        <button class="game-window-close" type="button" aria-label="Close Pac-Man" data-toast-message="Pac-Man Arcade 已关闭" @click="gameOpen = false">×</button>
      </div>
      <div class="game-window-body">
        <iframe v-if="gameLoaded" title="Pac-Man Arcade" loading="lazy" src="/arcade.html"></iframe>
      </div>
    </div>
  </div>

  <main class="wrap fusion-shell">
    <section id="post-stream" class="post-stream">
      <div class="stream-head"><h2>Post Stream</h2></div>
      <div id="stream-list" class="stream-list">
        <article v-if="!posts.length" class="loading-card pixel">还没有 Markdown 文章。</article>
        <template v-else>
          <article v-for="post in posts" :key="post.url" class="blog-entry pixel">
            <div class="blog-entry-meta">
              <span class="tag">{{ post.slug }}</span>
              <span class="date">{{ formatDate(post.date) }}</span>
            </div>
            <h3>
              <a :href="post.url" :data-toast-message="`文章 ${post.title} 已打开`">{{ post.title }}</a>
            </h3>
            <p>{{ post.description }}</p>
            <a class="entry-readmore" :href="post.url" :data-toast-message="`文章 ${post.title} 已打开`">Read More</a>
          </article>
        </template>
      </div>
    </section>
  </main>

  <footer class="fusion-footer">Gellow Blog · Stream view</footer>
  </div>
</template>

<style scoped>
.awaiting-welcome :deep(.identity-card) { visibility: hidden; }
</style>
