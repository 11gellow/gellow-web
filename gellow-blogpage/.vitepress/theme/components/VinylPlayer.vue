<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';

interface Track { title: string; url: string }
const tracks = ref<Track[]>([]);
const selected = ref(0);
const current = computed(() => tracks.value[selected.value]);
const audio = ref<HTMLAudioElement>();
const fileInput = ref<HTMLInputElement>();
const playing = ref(false);
const pinned = ref(false);
const elapsed = ref(0);
const duration = ref(0);
const volume = ref(0.65);
const error = ref('');
let request = 0;
const time = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;

async function play() {
  if (!audio.value || !current.value) return;
  const id = ++request;
  error.value = '';
  try { await audio.value.play(); }
  catch (cause) {
    if (id === request && (cause as Error).name !== 'AbortError') error.value = '无法播放，请换一首音频或再次点击播放。';
  }
}
function toggle() {
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
  ++request;
  audio.value?.pause();
  tracks.value.forEach(track => URL.revokeObjectURL(track.url));
});
</script>

<template>
  <Teleport to="body">
    <section class="vinyl-player" :class="{ 'is-pinned': pinned, 'is-playing': playing }" aria-label="黑胶音乐播放器" @click.stop>
      <audio ref="audio" preload="metadata" @play="playing = true" @pause="playing = false" @timeupdate="syncTime" @loadedmetadata="syncTime" @ended="choose(selected + 1)" @error="error = '音频无法读取，请选择其他文件。'" />
      <input ref="fileInput" class="vinyl-file" type="file" accept="audio/*,.flac,.m4a" multiple @change="importMusic" />
      <button class="vinyl-deck" :aria-expanded="pinned" aria-controls="vinyl-controls" aria-label="展开或收起音乐播放器" @click="pinned = !pinned">
        <span class="vinyl-record-lift"><span class="vinyl-record"><span class="vinyl-label"><span>GELLOW</span><i></i><small>SIDE A · 33 RPM</small></span></span></span>
        <span class="vinyl-arm"></span><span class="vinyl-led"></span>
      </button>
      <div id="vinyl-controls" class="vinyl-controls">
        <div class="vinyl-eyebrow">GELLOW RECORDS <span>{{ playing ? '● ON AIR' : 'SIDE A' }}</span></div>
        <div class="vinyl-track" :title="current?.title">{{ current?.title || '放一张喜欢的唱片' }}</div>
        <p v-if="!current" class="vinyl-hint">选择本地音乐开始播放 · 文件不会上传</p>
        <div class="vinyl-timeline"><input aria-label="播放进度" type="range" min="0" :max="duration || 1" step="0.1" :value="elapsed" :disabled="!duration" @input="seek" /><div><span>{{ time(elapsed) }}</span><span>{{ time(duration) }}</span></div></div>
        <div class="vinyl-transport"><button aria-label="上一首" :disabled="!current" @click="choose(selected - 1)">⏮</button><button class="vinyl-play" :aria-label="playing ? '暂停' : '播放'" @click="toggle">{{ playing ? 'Ⅱ' : '▶' }}</button><button aria-label="下一首" :disabled="!current" @click="choose(selected + 1)">⏭</button><button class="vinyl-add" @click="fileInput?.click()">＋ 选曲</button></div>
        <label class="vinyl-volume">音量 <input aria-label="音量" type="range" min="0" max="1" step="0.01" :value="volume" @input="setVolume" /></label>
        <select v-if="tracks.length" aria-label="歌单" :value="selected" @change="choose(Number(($event.target as HTMLSelectElement).value))"><option v-for="(track, index) in tracks" :key="track.url" :value="index">{{ index + 1 }}. {{ track.title }}</option></select>
        <p v-if="error" class="vinyl-error" role="status">{{ error }}</p>
      </div>
    </section>
  </Teleport>
</template>

<style scoped>
.vinyl-player { --disc-size: 180px; position: fixed; left: -120px; top: 66.667dvh; transform: translateY(-50%); width: var(--disc-size); height: var(--disc-size); z-index: 2000; isolation: isolate; color: #fff5cc; font-family: Consolas, 'Microsoft YaHei', sans-serif; transition: left .45s cubic-bezier(.22,1,.36,1); }
.vinyl-player:hover, .vinyl-player:focus-within, .vinyl-player.is-pinned { left: -36px; }
.vinyl-file { display: none; }
.vinyl-deck { position: relative; width: 100%; height: 100%; border: 3px solid #120d1f; border-radius: 50%; background: radial-gradient(circle, #493d50, #231b2d 70%); box-shadow: 5px 6px 0 #08060c, inset 0 0 0 6px #615269; cursor: pointer; padding: 12px; }
.vinyl-record-lift { display: block; width: 100%; height: 100%; transition: transform .55s cubic-bezier(.22,1,.36,1); }
.vinyl-player:hover .vinyl-record-lift, .vinyl-player:focus-within .vinyl-record-lift, .is-pinned .vinyl-record-lift { transform: translate(13px,-20px); }
.vinyl-record { display: grid; place-items: center; width: 100%; height: 100%; border-radius: 50%; background: repeating-radial-gradient(circle, #121116 0 2px, #28252e 3px, #111015 4px 6px); box-shadow: 4px 7px 14px #0009; animation: vinyl-spin 8s linear infinite; animation-play-state: paused; }
.is-playing .vinyl-record { animation-play-state: running; }
.vinyl-label { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; width: 65px; height: 65px; border-radius: 50%; background: #dba0ab; border: 3px solid #f0c2a1; color: #352335; font-size: 9px; font-weight: bold; }
.vinyl-label i { width: 7px; height: 7px; background: #171225; border-radius: 50%; }
.vinyl-label small { font-size: 6px; }
.vinyl-arm { position: absolute; right: 17px; top: 20px; width: 8px; height: 86px; border: 2px solid #26212a; border-radius: 6px; background: #d9cfb3; transform-origin: top; transform: rotate(-18deg); transition: transform .5s; box-shadow: 2px 2px 2px #0008; }
.is-playing .vinyl-arm { transform: rotate(23deg); }
.vinyl-led { position: absolute; right: 24px; bottom: 25px; width: 6px; height: 6px; border-radius: 50%; background: #776c6a; }
.is-playing .vinyl-led { background: #9be564; box-shadow: 0 0 9px #9be564; }
.vinyl-controls { position: absolute; left: calc(100% - 5px); top: 50%; width: min(290px, calc(100vw - 155px)); max-height: 62dvh; overflow-y: auto; scrollbar-width: thin; padding: 18px; border: 2px solid #80627e; border-radius: 12px; background: #21182ef5; box-shadow: 5px 6px 0 #08060cb3; opacity: 0; visibility: hidden; transform: translate(-16px,-50%) scale(.96); transform-origin: left center; transition: opacity .25s, transform .4s, visibility .25s; pointer-events: none; }
.vinyl-player:hover .vinyl-controls, .vinyl-player:focus-within .vinyl-controls, .is-pinned .vinyl-controls { opacity: 1; visibility: visible; transform: translate(0,-50%) scale(1); pointer-events: auto; }
.vinyl-eyebrow { display: flex; justify-content: space-between; gap: 8px; font-size: 9px; letter-spacing: .08em; color: #dba0ab; }
.vinyl-eyebrow span { color: #9be564; white-space: nowrap; }
.vinyl-track { font-size: 16px; margin: 14px 0 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vinyl-hint, .vinyl-error { font-size: 11px; line-height: 1.6; color: #c4b2ce; margin: 8px 0; }
.vinyl-error { color: #ffafbd; }
.vinyl-timeline > div { display: flex; justify-content: space-between; font-size: 10px; color: #b6a6bf; }
.vinyl-controls input[type=range] { width: 100%; accent-color: #dba0ab; cursor: pointer; height: 16px; margin: 8px 0; }
.vinyl-transport { display: flex; align-items: center; gap: 8px; margin: 12px 0; }
.vinyl-transport button { border: 1px solid #68516c; background: #35283f; color: #fff5cc; border-radius: 6px; min-height: 32px; min-width: 32px; cursor: pointer; }
.vinyl-transport .vinyl-play { border-radius: 50%; width: 40px; height: 40px; background: #dba0ab; color: #21182e; }
.vinyl-transport .vinyl-add { margin-left: auto; font-size: 11px; padding: 4px 8px; }
.vinyl-controls button:disabled { opacity: .4; cursor: default; }
.vinyl-volume { display: flex; align-items: center; gap: 10px; font-size: 11px; white-space: nowrap; }
.vinyl-controls select { width: 100%; margin-top: 8px; padding: 6px; background: #30233c; color: #fff5cc; border: 1px solid #68516c; border-radius: 4px; }
@keyframes vinyl-spin { to { transform: rotate(360deg); } }
@media (max-width: 480px) { .vinyl-controls { padding: 10px; } .vinyl-transport { gap: 4px; } .vinyl-eyebrow { font-size: 8px; } }
@media (prefers-reduced-motion: reduce) { .vinyl-player, .vinyl-record-lift, .vinyl-controls, .vinyl-arm { transition: none; } .vinyl-record { animation: none; } }
</style>
