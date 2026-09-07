<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { getCachedAdminContent, normalizeSettings, refreshAdminContent, saveSettings, sortPosts, type BlogPostRecord, type ContentSettings } from "../content-api";

const posts = ref<BlogPostRecord[]>([]);
const settings = ref<ContentSettings>(normalizeSettings());
const board = ref<(string | null)[]>([null, null, null, null]);
const hint = ref("正在读取当前展示布局...");
const pickerOpen = ref(false);
const dragIndex = ref<number | null>(null);
const used = computed(() => new Set(board.value.filter(Boolean)));
const postFor = (slug: string | null) => posts.value.find((post) => post.slug === slug);
const hydrate = (payload: { posts?: BlogPostRecord[]; settings?: Partial<ContentSettings> }) => {
  posts.value = sortPosts(payload.posts || []); settings.value = normalizeSettings(payload.settings);
  board.value = [...settings.value.featured_home.slice(0, 4), null, null, null, null].slice(0, 4);
};
const feedback = (message: string, variant = "info") => window.GellowFeedback?.showToast(message, "System Notice", variant);
function drop(to: number) { if (dragIndex.value === null) return; const next = [...board.value]; [next[dragIndex.value], next[to]] = [next[to], next[dragIndex.value]]; board.value = next; dragIndex.value = null; hint.value = "展示顺序已调整，保存后会同步到前台。"; }
function add(slug: string) { const index = board.value.findIndex((item) => item === null); if (index < 0) { hint.value = "Mission Board 已满，需要先移除一个窗口。"; return; } board.value[index] = slug; board.value = [...board.value]; pickerOpen.value = false; hint.value = "展示窗口已加入，调整顺序后记得保存布局。"; }
async function save() { try { const response = await saveSettings({ ...settings.value, featured_home: board.value.filter((item): item is string => Boolean(item)) }); settings.value = normalizeSettings(response.settings); hydrate({ posts: posts.value, settings: settings.value }); hint.value = "Mission Board 布局已保存。"; feedback("Display Layout Saved", "success"); } catch (reason) { hint.value = `保存失败：${reason instanceof Error ? reason.message : "unknown error"}`; feedback("Display Layout Save Failed", "error"); } }
onMounted(async () => { document.title = "Gellow Display Console"; const cached = getCachedAdminContent(); if (cached) { hydrate(cached); hint.value = "Mission Board 缓存已载入。"; } try { hydrate(await refreshAdminContent()); hint.value = "Mission Board 布局已载入。"; } catch (reason) { hint.value = `读取失败：${reason instanceof Error ? reason.message : "network request failed"}`; } });
</script>

<template>
  <header><div class="wrap nav"><div><h1 class="title">Display Console</h1><div class="subtitle">Arrange Featured Windows</div></div><div class="nav-actions"><nav class="menu"><a class="btn btn-red" href="#home-stage">Home Stage</a></nav><a class="btn btn-notes-hub" href="/notes/">Back To Notes</a></div></div></header>
  <main class="wrap display-console-shell">
    <section class="hero" id="top"><div class="hero-main pixel"><div class="badge">Display Mode</div><h2>Mission Board<br />Stage Edit</h2><p>展示窗口新增、拖拽排序、模块删除、布局保存。</p><div class="hero-actions"><a class="btn btn-green" href="#home-stage">Edit Mission Board</a></div></div><aside class="hero-panel pixel"><h2 class="section-title green">Drag Log</h2><div class="status-line">[BOOT] display console online</div><div class="status-line">[TIP] drag only works inside this board</div><div class="status-line">[RULE] mission board 最多 4 个</div><div class="status-line">[SAVE] click save after layout changes</div></aside></section>
    <section class="display-console-grid"><section id="home-stage" class="display-board-panel pixel"><div class="display-board-head"><div><h3 class="section-title pink">Home Mission Board</h3><p>future home 页面 Mission Board 的四个展示槽位。</p></div><button class="btn btn-green" type="button" @click="pickerOpen = true">New Window</button></div>
      <div class="slot-grid-home"><div v-for="(slug, index) in board" :key="index" class="display-slot" @dragover.prevent @drop="drop(index)"><article v-if="postFor(slug)" class="display-card-home display-card" draggable="true" @dragstart="dragIndex = index"><button class="trash-button" type="button" aria-label="Remove display" @click="board[index] = null; board = [...board]; hint = '展示窗口已移除，保存后会同步这次变更。'"><svg viewBox="0 0 24 24"><path d="M9 3h6l1 2h4v3H4V5h4l1-2Zm-1 8h2v7H8v-7Zm6 0h2v7h-2v-7ZM6 8h12l-1 12H7L6 8Z" /></svg></button><h4>{{ postFor(slug)?.title }}</h4><p>{{ postFor(slug)?.summary || "完整内容会在文章详情页中展示。" }}</p></article><div v-else class="slot-empty">空位<br />可把文章拖到这里，或从右上角新增展示窗口。</div></div></div>
    </section></section>
    <section class="display-board-panel pixel"><div class="display-console-footer"><p class="notes-hint">{{ hint }}</p><button class="btn btn-yellow" type="button" @click="save">Save Layout</button></div></section>
  </main>
  <div v-if="pickerOpen" class="picker-modal" @click.self="pickerOpen = false"><div class="picker-dialog pixel"><div class="display-board-head"><div><h3 class="section-title yellow">Pick A Post</h3><p>选择一篇文章放入 Mission Board。</p></div></div><div class="picker-grid"><button v-for="post in posts" :key="String(post.id)" class="picker-item" type="button" :disabled="used.has(post.slug)" @click="add(post.slug)"><div class="article-card-head"><h3>{{ post.title }}</h3><span class="status-badge" :class="post.status">{{ post.status.toUpperCase() }}</span></div><p>{{ post.summary || "还没有摘要。" }}</p><div class="meta-line">{{ post.slug }} · {{ post.publishedAt || "--" }}</div></button></div><div class="picker-actions"><button class="btn btn-red" type="button" @click="pickerOpen = false">Cancel</button></div></div></div>
  <footer>Gellow Notes · Display arrangement console</footer>
</template>
