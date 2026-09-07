<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import {
  getCachedPublicContent,
  refreshPublicContent,
  sortPosts,
  type BlogPostRecord,
} from "../content-api";

const NOTES_PASSWORD = "aaa8524493";

const posts = ref<BlogPostRecord[]>([]);
const loadError = ref("");
const gameOpen = ref(false);
const gameLoaded = ref(false);
const gameWindow = ref<HTMLElement | null>(null);
const gameHandle = ref<HTMLElement | null>(null);
const passwordOpen = ref(false);
const passwordInput = ref<HTMLInputElement | null>(null);
const passwordValue = ref("");
const passwordError = ref(false);

let clickTimer = 0;
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

function showFeedback(message: string, title = "System Notice", variant = "info") {
  window.GellowFeedback?.showToast(message, title, variant);
}

async function loadPosts() {
  const cached = getCachedPublicContent();
  if (cached) posts.value = sortPosts(Array.isArray(cached.posts) ? cached.posts : []);

  try {
    const payload = await refreshPublicContent();
    posts.value = sortPosts(Array.isArray(payload.posts) ? payload.posts : []);
    loadError.value = "";
  } catch (error) {
    if (!cached) loadError.value = error instanceof Error ? error.message : "network request failed";
    console.warn("Unable to initialize merged blog homepage.", error);
  }
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

function queueArcadeOpen() {
  window.clearTimeout(clickTimer);
  clickTimer = window.setTimeout(() => {
    openArcadeWindow();
    clickTimer = 0;
  }, 220);
}

function openPasswordModal() {
  window.clearTimeout(clickTimer);
  clickTimer = 0;
  passwordError.value = false;
  passwordValue.value = "";
  passwordOpen.value = true;
  window.setTimeout(() => passwordInput.value?.focus(), 20);
}

function submitPassword() {
  if (passwordValue.value === NOTES_PASSWORD) {
    passwordOpen.value = false;
    showFeedback("Notes Console 已打开", "Access Granted", "success");
    window.setTimeout(() => {
      window.location.href = "/notes/";
    }, 220);
    return;
  }

  passwordError.value = true;
  showFeedback("Notes Password Error", "Access Denied", "error");
  passwordInput.value?.select();
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

function handleEscape(event: KeyboardEvent) {
  if (event.key === "Escape" && passwordOpen.value) passwordOpen.value = false;
}

function handleResize() {
  if (gameOpen.value && positioned && gameWindow.value) {
    const rect = gameWindow.value.getBoundingClientRect();
    applyGameWindowPosition(rect.left, rect.top);
  }
}

onMounted(() => {
  void loadPosts();
  document.addEventListener("keydown", handleEscape);
  window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
  window.clearTimeout(clickTimer);
  document.removeEventListener("keydown", handleEscape);
  window.removeEventListener("resize", handleResize);
});
</script>

<template>
  <header class="fusion-header home-header-style">
    <div class="wrap fusion-nav">
      <div class="brand-block">
        <div class="identity-card pixel">
          <img class="avatar" :src="'/assets/KindGellow.png'" alt="Profile avatar" />
          <div class="identity-meta">
            <div class="presence-line"><span class="online-dot" aria-hidden="true"></span> online</div>
            <div class="username">KindGellow</div>
          </div>
        </div>
        <div class="brand-copy">
          <h1 class="title">Gellow Blog</h1>
          <div class="subtitle">Insert Coin To Read</div>
        </div>
      </div>
    </div>
  </header>

  <button
    id="pacman-launch-button"
    class="pacman-launch-button"
    type="button"
    aria-label="Open Pac-Man"
    @click="queueArcadeOpen"
    @dblclick="openPasswordModal"
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

  <div v-show="passwordOpen" class="password-modal" @click.self="passwordOpen = false">
    <div class="password-modal-shell pixel" role="dialog" aria-modal="true" aria-labelledby="notes-password-title">
      <div class="password-modal-head">
        <h2 id="notes-password-title">Notes Access</h2>
        <button class="password-modal-close" type="button" aria-label="Close password dialog" data-toast-message="Notes Access 已关闭" @click="passwordOpen = false">×</button>
      </div>
      <form class="password-form" @submit.prevent="submitPassword">
        <label class="password-field" for="notes-password-input">Password</label>
        <input id="notes-password-input" ref="passwordInput" v-model="passwordValue" name="password" type="password" autocomplete="off" required />
        <p v-show="passwordError" class="password-error">密码错误</p>
        <div class="password-actions">
          <button class="btn btn-yellow" type="submit" data-toast-defer>Enter Notes</button>
          <button class="btn btn-red" type="button" data-toast-message="Notes Access 已关闭" @click="passwordOpen = false">Cancel</button>
        </div>
      </form>
    </div>
  </div>

  <main class="wrap fusion-shell">
    <section id="post-stream" class="post-stream">
      <div class="stream-head"><h2>Post Stream</h2></div>
      <div id="stream-list" class="stream-list">
        <article v-if="loadError" class="archive-empty pixel">文章流加载失败：{{ loadError }}</article>
        <article v-else-if="!posts.length" class="loading-card pixel">正在加载文章流...</article>
        <template v-else>
          <article v-for="post in posts" :key="post.id" class="blog-entry pixel">
            <div class="blog-entry-meta">
              <span class="tag">{{ post.slug }}</span>
              <span class="date">{{ formatDate(post.publishedAt) }}</span>
            </div>
            <h3>
              <a :href="`/blogs/post.html?slug=${encodeURIComponent(post.slug)}`" :data-toast-message="`文章 ${post.title} 已打开`">{{ post.title }}</a>
            </h3>
            <p>{{ post.summary }}</p>
            <a class="entry-readmore" :href="`/blogs/post.html?slug=${encodeURIComponent(post.slug)}`" :data-toast-message="`文章 ${post.title} 已打开`">Read More</a>
          </article>
        </template>
      </div>
    </section>
  </main>

  <footer class="fusion-footer">Gellow Blog · Stream view</footer>
</template>
