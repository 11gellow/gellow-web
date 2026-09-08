<script setup lang="ts">
import { computed, ref } from 'vue';
import { identityEntries, type IdentityEntry } from '../identity-navigation';
const emit = defineEmits<{ navigate: [action: 'home' | 'blog'] }>();
const hovered = ref(false);
const focused = ref(false);
const pinned = ref(false);
const dismissed = ref(false);
const trigger = ref<HTMLButtonElement>();
const open = computed(() => !dismissed.value && (hovered.value || focused.value || pinned.value));
function close() { pinned.value = false; dismissed.value = true; }
function focusOut(event: FocusEvent) { focused.value = (event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null); }
function toggle() { if (open.value && pinned.value) close(); else { dismissed.value = false; pinned.value = true; } }
function choose(entry: IdentityEntry) { close(); if (entry.action) emit('navigate', entry.action); }
function escape() { close(); trigger.value?.focus(); }
</script>

<template>
  <div class="identity-navigation" :class="{ 'is-open': open }" @pointerenter="hovered = true; dismissed = false" @pointerleave="hovered = false; pinned = false; dismissed = false" @focusin="focused = true" @focusout="focusOut" @keydown.esc.stop="escape">
    <button ref="trigger" class="identity-card pixel" aria-label="展开首页导航" :aria-expanded="open" aria-controls="identity-links" @click.stop="toggle" @keydown.down.prevent="pinned = true; dismissed = false">
      <img class="avatar" :src="'/assets/KindGellow.png'" alt="Profile avatar" />
      <span class="identity-meta"><span class="presence-line"><span class="online-dot" aria-hidden="true"></span> online</span><span class="username">KindGellow</span></span>
    </button>
    <nav id="identity-links" class="identity-links" :inert="!open" aria-label="首页导航" @click.stop>
      <template v-for="entry in identityEntries" :key="entry.id">
        <a v-if="entry.href" :href="entry.href" class="identity-link" @click="choose(entry)"><strong>{{ entry.label }}</strong><span>{{ entry.description }}</span></a>
        <button v-else class="identity-link" :aria-current="entry.action === 'blog' ? 'page' : undefined" @click="choose(entry)"><strong>{{ entry.label }}</strong><span>{{ entry.description }}</span></button>
      </template>
    </nav>
  </div>
</template>

<style scoped>
.identity-navigation { position: relative; flex-shrink: 0; z-index: 2; }
.identity-card { font: inherit; color: inherit; text-align: left; cursor: pointer; }
.identity-card:focus-visible, .identity-link:focus-visible { outline: 2px solid var(--mint); outline-offset: 5px; }
.identity-links { position: absolute; left: 100%; top: 0; height: 100%; display: flex; gap: 10px; align-items: stretch; padding: 10px 14px 10px 20px; width: max-content; max-width: max(240px,calc(100vw - 420px)); overflow-x: auto; scrollbar-width: none; background: #211632fa; border: 3px solid #000; box-shadow: 6px 6px #000; opacity: 0; visibility: hidden; pointer-events: none; transform: translateX(-18px) scaleX(.88); transform-origin: left center; transition: opacity .22s ease, transform .32s cubic-bezier(.22,1,.36,1),visibility .22s; }
.identity-links::-webkit-scrollbar { display: none; }
.is-open .identity-links { opacity: 1; visibility: visible; pointer-events: auto; transform: translateX(0) scaleX(1); }
.identity-link { display: flex; flex-direction: column; justify-content: center; gap: 8px; padding: 10px 18px; flex-shrink: 0; min-width: 115px; border: 2px solid #6c557e; background: #322244; color: var(--cream); text-align: left; cursor: pointer; font: inherit; text-decoration: none; transition: background .18s,border-color .18s; }
.identity-link strong { color: var(--yellow); font: bold 17px/1.2 Consolas,monospace; letter-spacing: .1em; }.identity-link span { font: 12px/1.4 var(--font-body-cn); color: #cfbfdf; }.identity-link:hover { background: #49305c; border-color: var(--mint); }.identity-link[aria-current] { border-bottom: 3px solid var(--pink); }
@media(max-width:700px) { .identity-links { top: 100%; left: 0; height: auto; padding: 14px 10px 10px; max-width: calc(100vw - 32px); gap: 8px; }.identity-link { padding: 10px 14px; } }
@media(prefers-reduced-motion:reduce) { .identity-links { transition: none; } }
</style>
