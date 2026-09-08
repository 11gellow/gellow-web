<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

interface Track { title: string; url: string; artist?: string }
const tracks = ref<Track[]>([
  { title: "One Summer's Day", artist: '钢琴 · 轻音乐', url: '/assets/music/one-summers-day.mp3' },
  { title: 'River Flows in You', artist: '钢琴 · 轻音乐', url: '/assets/music/river-flows-in-you.mp3' },
  { title: 'Through the Arbor', artist: '钢琴 · 轻音乐', url: '/assets/music/through-the-arbor.mp3' },
]);
const selected = ref(0);
const current = computed(() => tracks.value[selected.value]);
const audio = ref<HTMLAudioElement>();
const fileInput = ref<HTMLInputElement>();
const playing = ref(false);
const pinned = ref(false);
const hovered = ref(false);
const focusWithin = ref(false);
const dismissed = ref(false);
const expanded = computed(() => !dismissed.value && (pinned.value || hovered.value || focusWithin.value));
const showPlaylist = ref(false);
const showVolume = ref(false);
const repeatOne = ref(false);
const progressPercent = computed(() => duration.value ? elapsed.value / duration.value * 100 : 0);
function closePanel() {
  pinned.value = false; dismissed.value = true; focusWithin.value = false;
  if (document.activeElement instanceof HTMLElement && document.activeElement.closest('.vinyl-player')) document.activeElement.blur();
}
function togglePanel() { dismissed.value = false; pinned.value = !pinned.value; }
function leavePlayer() { hovered.value = false; dismissed.value = false; }
function handleFocusOut(event: FocusEvent) {
  focusWithin.value = (event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null);
}
function ended() { choose(repeatOne.value ? selected.value : selected.value + 1); }
const elapsed = ref(0);
const duration = ref(0);
const volume = ref(0.65);
const error = ref('');
let request = 0;
let waitingForGesture = false;
function clearAutoplayRetry() {
  waitingForGesture = false;
  document.removeEventListener('click', retryAutoplay, true);
  document.removeEventListener('keydown', retryAutoplay, true);
}
function retryAutoplay(event: Event) {
  if (!waitingForGesture || !event.isTrusted) return;
  if (event.target instanceof Element && event.target.closest('.vinyl-transport, .vinyl-playlist')) return;
  void play();
}
function waitForGesture() {
  waitingForGesture = true;
  document.addEventListener('click', retryAutoplay, true);
  document.addEventListener('keydown', retryAutoplay, true);
}
const time = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;

async function play() {
  if (!audio.value || !current.value) return;
  const id = ++request;
  error.value = '';
  try { await audio.value.play(); if (id === request) clearAutoplayRetry(); }
  catch (cause) {
    if (id !== request) return;
    if ((cause as Error).name === 'NotAllowedError') { waitForGesture(); return; }
    if ((cause as Error).name !== 'AbortError') { clearAutoplayRetry(); error.value = '无法播放，请换一首音频或再次点击播放。'; }
  }
}
function toggle() {
  clearAutoplayRetry();
  if (!current.value) { fileInput.value?.click(); return; }
  if (playing.value) { ++request; audio.value?.pause(); }
  else void play();
}
function choose(index: number) {
  if (!tracks.value.length || !audio.value) return;
  ++request;
  selected.value = (index + tracks.value.length) % tracks.value.length;
  elapsed.value = duration.value = 0;
  audio.value.src = current.value!.url;
  audio.value.volume = volume.value;
  void play();
}
function importMusic(event: Event) {
  const files = [...((event.target as HTMLInputElement).files || [])];
  const additions = files.filter(file => file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(file.name))
    .map(file => ({ title: file.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(file) }));
  const empty = !tracks.value.length;
  tracks.value.push(...additions);
  if (empty && additions.length) choose(0);
  if (!additions.length) error.value = '请选择音频文件。';
  (event.target as HTMLInputElement).value = '';
}
function syncTime() {
  elapsed.value = audio.value?.currentTime || 0;
  duration.value = Number.isFinite(audio.value?.duration) ? audio.value!.duration : 0;
}
function seek(event: Event) {
  if (audio.value && duration.value) audio.value.currentTime = Number((event.target as HTMLInputElement).value);
}
function setVolume(event: Event) {
  volume.value = Number((event.target as HTMLInputElement).value);
  if (audio.value) audio.value.volume = volume.value;
}
onBeforeUnmount(() => {
  clearAutoplayRetry();
  ++request;
  audio.value?.pause();
  tracks.value.filter(track => track.url.startsWith('blob:')).forEach(track => URL.revokeObjectURL(track.url));
});
onMounted(() => {
  if (audio.value) { audio.value.src = current.value!.url; audio.value.volume = volume.value; void play(); }
});
</script>

<template>
  <Teleport to="body">
    <section class="vinyl-player" :class="{ 'is-expanded': expanded, 'is-playing': playing }" aria-label="黑胶音乐播放器" @click.stop @pointerenter="hovered = true" @pointerleave="leavePlayer" @focusin="focusWithin = true" @focusout="handleFocusOut" @keydown.esc="closePanel">
      <audio ref="audio" preload="metadata" @play="playing = true" @pause="playing = false" @timeupdate="syncTime" @loadedmetadata="syncTime" @ended="ended" @error="error = '音频无法读取，请选择其他文件。'" />
      <input ref="fileInput" class="vinyl-file" type="file" accept="audio/*,.flac,.m4a" multiple @change="importMusic" />
      <button class="vinyl-disc" :aria-expanded="expanded" aria-controls="vinyl-controls" aria-label="展开或收起音乐播放器" @click="togglePanel">
        <span class="vinyl-record"><img :src="'/assets/music/gellow-cover.png'" alt="Gellow 唱片封面" draggable="false" /></span>
      </button>
      <div id="vinyl-controls" class="vinyl-controls" :inert="!expanded">
        <button class="vinyl-collapse" aria-label="收起播放器" @click="closePanel"><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg></button>
        <img class="vinyl-avatar" :src="'/assets/music/gellow-cover.png'" alt="Gellow 旋转头像" draggable="false" />
        <div class="vinyl-track" :title="current?.title">{{ current?.title || '选择喜欢的音乐' }}</div>
        <div class="vinyl-artist">{{ current?.artist || '本地音乐' }}</div>
        <div class="vinyl-timeline"><span>{{ time(elapsed) }}</span><input aria-label="播放进度" type="range" min="0" :max="duration || 1" step="0.1" :value="elapsed" :disabled="!duration" :style="{ '--fill': progressPercent + '%' }" @input="seek" /><span>{{ time(duration) }}</span></div>
        <div class="vinyl-transport">
          <button :aria-label="repeatOne ? '切换为列表循环' : '切换为单曲循环'" :aria-pressed="repeatOne" :class="{ selected: repeatOne }" @click="repeatOne = !repeatOne"><svg viewBox="0 0 24 24"><path d="M4 10V8a3 3 0 0 1 3-3h12m-3-3 3 3-3 3M20 14v2a3 3 0 0 1-3 3H5m3-3-3 3 3 3" /></svg><small v-if="repeatOne">1</small></button>
          <button aria-label="上一首" :disabled="!current" @click="choose(selected - 1)"><svg viewBox="0 0 24 24"><path d="M6 5v14"/><path class="solid" d="m18 5-10 7 10 7Z"/></svg></button>
          <button class="vinyl-play" :aria-label="playing ? '暂停' : '播放'" @click="toggle"><svg viewBox="0 0 24 24"><path v-if="!playing" class="solid" d="m8 4 13 8-13 8Z"/><path v-else d="M8 5v14M16 5v14" stroke-width="4"/></svg></button>
          <button aria-label="下一首" :disabled="!current" @click="choose(selected + 1)"><svg viewBox="0 0 24 24"><path d="M18 5v14"/><path class="solid" d="m6 5 10 7-10 7Z"/></svg></button>
          <button aria-label="调节音量" :aria-expanded="showVolume" @click="showVolume = !showVolume"><svg viewBox="0 0 24 24"><path class="solid" d="M3 9h4l5-4v14l-5-4H3Z"/><path d="M16 8a7 7 0 0 1 0 8m3-11a11 11 0 0 1 0 14"/></svg></button>
          <button aria-label="显示歌单" :aria-expanded="showPlaylist" @click="showPlaylist = !showPlaylist"><svg viewBox="0 0 24 24"><path d="M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1"/></svg></button>
        </div>
        <label v-if="showVolume" class="vinyl-volume">音量 <input aria-label="音量" type="range" min="0" max="1" step="0.01" :value="volume" :style="{ '--fill': volume * 100 + '%' }" @input="setVolume" /></label>
        <div v-if="showPlaylist" class="vinyl-playlist"><button v-for="(track, index) in tracks" :key="track.url" :class="{ selected: selected === index }" @click="choose(index)">{{ index + 1 }}. {{ track.title }}</button><button @click="fileInput?.click()">＋ 添加本地音乐</button></div>
        <p v-if="error" class="vinyl-error" role="status">{{ error }}</p>
      </div>
    </section>
  </Teleport>
</template>

<style scoped>
.vinyl-player { position: fixed; left: -120px; top: 66.667dvh; transform: translateY(-50%); width: 180px; height: 180px; z-index: 2000; isolation: isolate; color: #eceef2; font-family: Arial, 'Microsoft YaHei', sans-serif; transition: left .45s cubic-bezier(.22,1,.36,1); }
.vinyl-player.is-expanded { left: -36px; }
.vinyl-file { display: none; }
.vinyl-disc { display: block; width: 180px; height: 180px; padding: 0; border: 0; border-radius: 50%; background: transparent; cursor: pointer; transition: transform .45s cubic-bezier(.22,1,.36,1); }
.is-expanded .vinyl-disc { transform: translateY(-16px); }
.vinyl-record { display: grid; place-items: center; width: 100%; height: 100%; border-radius: 50%; border: 2px solid #36343b; background: repeating-radial-gradient(circle, #111116 0 2px, #302d35 3px, #131217 4px 6px); box-shadow: 0 8px 24px #0008; animation: vinyl-spin 18s linear infinite; }
.vinyl-record img { width: 72%; height: 72%; object-fit: cover; border: 3px solid #eee9f0; border-radius: 50%; }
.vinyl-controls { position: absolute; left: calc(100% - 6px); top: 50%; width: min(400px, calc(100vw - 152px)); max-height: min(520px, 64dvh); overflow-y: auto; scrollbar-width: thin; padding: 25px 22px 24px; border: 1px solid #343640; border-radius: 28px; background: #191b23; box-shadow: 0 16px 40px #0005; opacity: 0; visibility: hidden; transform: translate(-18px,-50%) scale(.96); transform-origin: left center; transition: opacity .25s, transform .4s, visibility .25s; pointer-events: none; text-align: center; }
.is-expanded .vinyl-controls { opacity: 1; visibility: visible; transform: translate(0,-50%) scale(1); pointer-events: auto; }
.vinyl-controls button { display: inline-flex; align-items: center; justify-content: center; position: relative; background: none; border: 0; padding: 5px; color: #898b93; cursor: pointer; }
.vinyl-controls button:hover, .vinyl-controls button.selected { color: #f5a32c; }
.vinyl-controls button:focus-visible, .vinyl-disc:focus-visible { outline: 2px solid #f5a32c; outline-offset: 3px; }
.vinyl-controls svg { width: 23px; height: 23px; fill: none; stroke: currentColor; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
.vinyl-controls svg .solid { fill: currentColor; stroke: none; }
.vinyl-controls .vinyl-collapse { position: absolute; top: 13px; right: 14px; }
.vinyl-avatar { display: block; width: 94px; height: 94px; object-fit: cover; border-radius: 50%; margin: 0 auto 16px; background: #fff; animation: vinyl-spin 18s linear infinite; }
.vinyl-track { font-size: 20px; font-weight: 600; margin: 0 0 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vinyl-artist { font-size: 14px; color: #a0a8b9; }
.vinyl-timeline { display: flex; align-items: center; gap: 12px; margin: 20px 0 18px; }
.vinyl-timeline span { flex-shrink: 0; font-size: 12px; color: #909197; font-variant-numeric: tabular-nums; }
.vinyl-controls input[type=range] { appearance: none; min-width: 0; height: 6px; border-radius: 9px; background: linear-gradient(to right, #f8b94d, #f39b25 var(--fill, 0%), #15171e var(--fill, 0%)); flex: 1; width: 100%; margin: 10px 0; cursor: pointer; }
.vinyl-controls input[type=range]::-webkit-slider-thumb { appearance: none; width: 10px; height: 10px; border-radius: 50%; background: #f5a32c; }
.vinyl-controls input[type=range]::-moz-range-thumb { border: 0; width: 10px; height: 10px; border-radius: 50%; background: #f5a32c; }
.vinyl-transport { display: flex; align-items: center; justify-content: space-between; gap: 7px; }
.vinyl-transport .vinyl-play { border-radius: 50%; width: 52px; height: 52px; flex-shrink: 0; background: #f5a12a; color: #fff; box-shadow: 0 6px 20px #f5a12a33; }
.vinyl-controls .vinyl-play:hover { color: #fff; background: #ffaf38; }
.vinyl-transport small { position: absolute; font-size: 9px; }
.vinyl-volume { display: flex; align-items: center; gap: 14px; margin-top: 15px; font-size: 12px; color: #a0a8b9; }
.vinyl-playlist { margin-top: 15px; display: grid; max-height: 140px; overflow: auto; border-top: 1px solid #343640; padding-top: 8px; }
.vinyl-playlist button { justify-content: flex-start; padding: 9px 5px; text-align: left; font-size: 13px; }
.vinyl-error { font-size: 12px; line-height: 1.5; color: #ffafbd; }
@keyframes vinyl-spin { to { transform: rotate(360deg); } }
@media (max-width: 540px) { .vinyl-controls { padding: 20px 12px; border-radius: 20px; } .vinyl-avatar { width: 72px; height: 72px; } .vinyl-track { font-size: 17px; } .vinyl-transport { gap: 2px; } .vinyl-controls svg { width: 18px; height: 18px; } .vinyl-transport .vinyl-play { width: 38px; height: 38px; } .vinyl-timeline { gap: 6px; } .vinyl-timeline span { font-size: 10px; } }
@media (prefers-reduced-motion: reduce) { .vinyl-player, .vinyl-disc, .vinyl-controls { transition: none; } .vinyl-record, .vinyl-avatar { animation: none; } }
</style>
