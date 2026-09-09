<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { welcomeQuotes, welcomeSession } from '../welcome';

const props = defineProps<{ expandFromCard?: boolean }>();
const emit = defineEmits<{ enter: [] }>();
const stage = ref<HTMLElement>();
const mask = ref<HTMLElement>();
const portrait = ref<HTMLElement>();
const nameplate = ref<HTMLElement>();
const quoteHost = ref<HTMLElement>();
const entering = ref(false);
const expanding = ref(!!props.expandFromCard);
const sentence = ref(welcomeQuotes[0] || '欢迎来到 Gellow 的博客。');
const visibleCount = ref(0);
const quoteIndex = ref(0);
let frame = 0;
let lastTime = 0;
let phase: 'typing' | 'holding' | 'falling' | 'waiting' = 'typing';
let phaseTime = 0;
let disposed = false;
let observer: MutationObserver | undefined;
let motion: MediaQueryList;
let particles: { element: HTMLElement; x: number; y: number; vx: number; vy: number; angle: number; spin: number; delay: number; gone: number }[] = [];
let animations: Animation[] = [];
let touchStart = 0;
let wheelDistance = 0;

function isLoading() { return document.documentElement.classList.contains('gellow-loading'); }
function unlock() { document.documentElement.classList.remove('gellow-welcome-lock'); }
function startFall() {
  phase = 'falling'; phaseTime = 0;
  particles = [...quoteHost.value!.querySelectorAll<HTMLElement>('.quote-letter')].map(element => ({
    element, x: 0, y: 0, vx: (Math.random()-.5)*180, vy: -Math.random()*100,
    angle: 0, spin: (Math.random()-.5)*220, delay: Math.random()*.45, gone: 0,
  }));
}
function nextQuote() {
  particles.forEach(p => { p.element.style.transform = ''; p.element.style.opacity = ''; });
  particles = []; quoteIndex.value = (quoteIndex.value+1)%Math.max(1,welcomeQuotes.length);
  sentence.value = welcomeQuotes[quoteIndex.value] || '欢迎来到 Gellow 的博客。';
  visibleCount.value = 0; phase = 'typing'; phaseTime = 0;
}
function tick(now: number) {
  frame = 0;
  if (disposed || entering.value || document.hidden || isLoading()) { lastTime = 0; return; }
  const dt = lastTime ? Math.min((now-lastTime)/1000,.04) : 0;
  lastTime = now; phaseTime += dt;
  if (motion.matches) {
    visibleCount.value = Array.from(sentence.value).length;
    if (phaseTime > 5) nextQuote();
  } else if (phase === 'typing') {
    visibleCount.value = Math.min(Array.from(sentence.value).length,Math.floor(phaseTime/.085));
    if (visibleCount.value === Array.from(sentence.value).length) { phase = 'holding'; phaseTime = 0; }
  } else if (phase === 'holding' && phaseTime > 2.2) startFall();
  else if (phase === 'falling') {
    const top = quoteHost.value!.getBoundingClientRect().top;
    for (const p of particles) {
      if (phaseTime < p.delay) continue;
      p.vy += 1100*dt; p.x += p.vx*dt; p.y += p.vy*dt; p.angle += p.spin*dt;
      p.element.style.transform = `translate3d(${p.x}px,${p.y}px,0) rotate(${p.angle}deg)`;
      if (top+p.y > innerHeight+50) { p.gone += dt; if (p.gone >= 1) p.element.style.opacity = '0'; }
    }
    if (particles.every(p => p.gone >= 1)) { phase = 'waiting'; phaseTime = 0; }
  } else if (phase === 'waiting' && phaseTime > .3) nextQuote();
  frame = requestAnimationFrame(tick);
}
function resume() { if (!frame && !entering.value && !disposed && !document.hidden && !isLoading()) frame = requestAnimationFrame(tick); }
function finish() {
  if (disposed) return;
  welcomeSession.entered = true;
  unlock(); emit('enter');
}
function finishExpansion() {
  animations.forEach(animation => animation.cancel());
  animations = [];
  expanding.value = false;
  entering.value = false;
  lastTime = 0;
  resume();
}
async function expandFromCard() {
  entering.value = true;
  const card = document.querySelector<HTMLElement>('.home-content .identity-card');
  if (!card || motion.matches) { finishExpansion(); return; }
  const start = card.getBoundingClientRect();
  const end = mask.value!.getBoundingClientRect();
  const options: KeyframeAnimationOptions = { duration: 1150, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'both' };
  animations.push(mask.value!.animate([
    { left: `${start.left}px`, top: `${start.top}px`, width: `${start.width}px`, height: `${start.height}px`, borderWidth: '4px' },
    { left: `${end.left}px`, top: `${end.top}px`, width: `${end.width}px`, height: `${end.height}px`, borderWidth: '8px' },
  ], options));
  for (const [element, selector] of [[portrait.value!, '.avatar'], [nameplate.value!, '.identity-meta']] as const) {
    const from = card.querySelector(selector)!.getBoundingClientRect();
    const to = element.getBoundingClientRect();
    animations.push(element.animate([
      { transform: `translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width},${from.height/to.height})` },
      { transform: 'translate(0,0) scale(1,1)' },
    ], options));
  }
  try { await Promise.all(animations.map(animation => animation.finished)); } catch { /* resize or unmount */ }
  if (!disposed) finishExpansion();
}
async function enter() {
  if (entering.value || isLoading()) return;
  entering.value = true; cancelAnimationFrame(frame); frame = 0;
  await nextTick();
  const target = document.querySelector<HTMLElement>('.home-content .identity-card');
  if (!target || motion.matches) { finish(); return; }
  const duration = 1150;
  const options: KeyframeAnimationOptions = { duration, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' };
  const rect = target.getBoundingClientRect();
  const start = mask.value!.getBoundingClientRect();
  animations.push(mask.value!.animate([
    { left: `${start.left}px`, top: `${start.top}px`, width: `${start.width}px`, height: `${start.height}px`, borderWidth: '8px' },
    { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, borderWidth: '4px' },
  ], options));
  for (const [source, selector] of [[portrait.value!, '.avatar'],[nameplate.value!, '.identity-meta']] as const) {
    const a = source.getBoundingClientRect(); const b = target.querySelector(selector)!.getBoundingClientRect();
    animations.push(source.animate([
      { transform: 'translate(0,0) scale(1,1)' },
      { transform: `translate(${b.left-a.left}px,${b.top-a.top}px) scale(${b.width/a.width},${b.height/a.height})` },
    ],options));
  }
  try { await Promise.all(animations.map(animation => animation.finished)); } catch { /* unmount or viewport resize */ }
  finish();
}
function playerEvent(event: Event) { return event.target instanceof Element && !!event.target.closest('.vinyl-player'); }
function wheel(event: WheelEvent) {
  if (playerEvent(event) || event.ctrlKey) return;
  event.preventDefault();
  if (isLoading() || entering.value) return;
  wheelDistance = event.deltaY > 0 ? wheelDistance+event.deltaY : 0;
  if (wheelDistance > 24) void enter();
}
function key(event: KeyboardEvent) {
  if (playerEvent(event) || event.altKey || event.ctrlKey || event.metaKey) return;
  if (['ArrowDown','PageDown',' ','End'].includes(event.key)) { event.preventDefault(); void enter(); }
}
function touchBegin(event: TouchEvent) { if (!playerEvent(event)) touchStart = event.touches[0]?.clientY ?? 0; }
function touchMove(event: TouchEvent) {
  if (playerEvent(event) || event.touches.length !== 1) return;
  event.preventDefault(); if (touchStart-(event.touches[0]?.clientY ?? touchStart)>30) void enter();
}
function resize() { if (expanding.value) finishExpansion(); else if (entering.value) { animations.forEach(a=>a.cancel()); finish(); } }
onMounted(() => {
  motion = matchMedia('(prefers-reduced-motion: reduce)');
  document.documentElement.classList.add('gellow-welcome-lock');
  window.scrollTo({ top: 0, behavior: 'instant' });
  observer = new MutationObserver(resume); observer.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  window.addEventListener('wheel',wheel,{passive:false});
  window.addEventListener('keydown',key);
  window.addEventListener('touchstart',touchBegin,{passive:true});
  window.addEventListener('touchmove',touchMove,{passive:false});
  window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',resume);
  if (props.expandFromCard) void expandFromCard();
  else resume();
});
onBeforeUnmount(() => {
  disposed = true; cancelAnimationFrame(frame); animations.forEach(a=>a.cancel()); observer?.disconnect(); unlock();
  window.removeEventListener('wheel',wheel); window.removeEventListener('keydown',key);
  window.removeEventListener('touchstart',touchBegin); window.removeEventListener('touchmove',touchMove);
  window.removeEventListener('resize',resize); document.removeEventListener('visibilitychange',resume);
});
</script>

<template>
  <section ref="stage" class="welcome-stage" :class="{ 'is-entering': entering || expanding }" aria-label="Gellow 博客欢迎页">
    <div ref="mask" class="welcome-mask"></div>
    <div class="welcome-decoration">
      <div class="construction-banner" :aria-label="'欢迎来的Gellow的blog，这里有各种折腾出来的小玩具，到处看看吧！'"><span class="construction-label">⚠ UNDER CONSTRUCTION</span><div class="marquee-window"><div class="marquee-track" aria-hidden="true"><span v-for="n in 2" :key="n">欢迎来的Gellow的blog，这里有各种折腾出来的小玩具，到处看看吧！&nbsp; ✦ &nbsp;</span></div></div></div>
      <p class="welcome-coordinate">PERSONAL PLAYGROUND / 001</p>
      <div class="welcome-title" aria-hidden="true">HELLO,<br /><span>EXPLORER.</span></div>
      <div class="welcome-caption">一些代码，一点笔记。<br />欢迎光临我的blog。</div>
      <div class="quote-stage"><span class="quote-label">THOUGHTS IN FREE FALL / {{ String(quoteIndex+1).padStart(2,'0') }}</span><p ref="quoteHost" class="quote-line" :aria-label="sentence"><span v-for="(letter,index) in Array.from(sentence)" :key="`${quoteIndex}-${index}`" class="quote-letter" :style="{ visibility: index < visibleCount ? 'visible' : 'hidden' }" aria-hidden="true">{{ letter === ' ' ? '\u00a0' : letter }}</span><span class="typing-cursor" aria-hidden="true"></span></p></div>
      <button class="welcome-scroll" aria-label="进入文章列表" @click.stop="enter"><span>SCROLL TO EXPLORE</span><span class="scroll-circle"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14m-6-6 6 6 6-6"/></svg></span></button>
      <span class="welcome-edition">GELLOW BLOG · ALWAYS IN PROGRESS</span>
    </div>
    <img ref="portrait" class="welcome-avatar" :src="'/assets/KindGellow.png'" alt="KindGellow 的头像" />
    <div ref="nameplate" class="welcome-nameplate"><div class="presence-line"><span class="online-dot"></span> online</div><div class="username">KindGellow</div></div>
  </section>
</template>

<style>
html { scrollbar-gutter: stable; }
html.gellow-welcome-lock, html.gellow-welcome-lock body { overflow: hidden !important; overscroll-behavior: none; }
.welcome-stage { position: fixed; inset: 0; z-index: 80; overflow: hidden; color: #fff5cc; }
.welcome-mask { position: fixed; inset: 0; width: 100%; height: 100%; border: 8px solid #0a0710; box-sizing: border-box; background: radial-gradient(ellipse at 28% 30%,#49305e 0,transparent 48%),radial-gradient(ellipse at 85% 85%,#1f3f514d,transparent 45%),linear-gradient(#ffffff05 1px,transparent 1px),linear-gradient(90deg,#ffffff05 1px,transparent 1px),#171021; background-size: auto,auto,40px 40px,40px 40px,auto; box-shadow: inset 0 0 0 1px #fff5cc35; }
.welcome-decoration { position: absolute; inset: 0; transition: opacity .3s ease; }
.is-entering .welcome-decoration { opacity: 0; pointer-events: none; }
.construction-banner { position: absolute; top: 8vh; left: 6%; width: 88%; display: flex; align-items: center; padding: 9px 0; border-block: 6px solid transparent; border-image: repeating-linear-gradient(135deg,#efcd58 0 12px,#16121e 12px 24px) 6; background: #efcd58; color: #171021; transform: rotate(-1.5deg); box-shadow: 0 8px 0 #0006; overflow: hidden; }
.construction-label { padding: 8px 18px; white-space: nowrap; font: bold 12px/1.5 Consolas,monospace; border-right: 2px solid #171021; }
.marquee-window { overflow: hidden; flex: 1; }.marquee-track { display: flex; width: max-content; animation: welcome-marquee 24s linear infinite; }.marquee-track span { white-space: nowrap; padding-inline: 22px; font: 700 17px/1.5 var(--font-body-cn); }
.welcome-coordinate { position: absolute; left: 16%; top: 22%; font: 11px/1.5 Consolas,monospace; letter-spacing: .22em; color: #c2abc9; }
.welcome-avatar { position: absolute; left: 17%; top: 29%; width: clamp(110px,13vw,178px); height: clamp(110px,13vw,178px); border: 6px solid #fff5cc; border-radius: 50%; object-fit: cover; background: #10201b; box-shadow: 12px 12px 0 #08071166; transform-origin: top left; }
.welcome-nameplate { position: absolute; left: 31%; top: 46%; display: flex; flex-direction: column; gap: 12px; transform-origin: top left; }
.welcome-nameplate .username { font-size: clamp(19px,2vw,28px); padding: 13px 22px; box-shadow: 7px 7px 0 #050308; }.welcome-nameplate .presence-line { font-size: 13px; letter-spacing: .16em; }
.welcome-title { position: absolute; left: 53%; top: 27%; font: 900 clamp(38px,6.3vw,96px)/.98 Consolas,monospace; letter-spacing: -.07em; color: #fff5cc; }.welcome-title span { color: #e6c956; }
.welcome-caption { position: absolute; left: 54%; top: 50%; color: #baa6ca; font: 15px/1.9 var(--font-body-cn); }
.quote-stage { position: absolute; top: 68%; left: 18%; width: 70%; }.quote-label { color: #7cffcb; font: 10px/1.5 Consolas,monospace; letter-spacing: .18em; }.quote-line { margin: 16px 0; min-height: 2.8em; font: clamp(17px,2vw,27px)/1.8 var(--font-body-cn); }.quote-letter { display: inline-block; white-space: pre; will-change: transform; }.typing-cursor { display: inline-block; height: 1em; width: 2px; background: #efcd58; margin-left: 5px; animation: welcome-blink 1s steps(2) infinite; }
.welcome-scroll { position: absolute; bottom: 3vh; left: 50%; transform: translateX(-50%); display: grid; justify-items: center; gap: 10px; padding: 10px 25px; border: 0; color: #fff5cc; background: transparent; cursor: pointer; }.welcome-scroll>span:first-child { font: 10px/1 Consolas,monospace; letter-spacing: .2em; }.scroll-circle { width: 44px; height: 44px; display: grid; place-items: center; border: 1px solid #fff5cc70; border-radius: 50%; background: #fff5cc0a; animation: welcome-bob 2s ease-in-out infinite; }.scroll-circle svg { width: 23px; height: 23px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }.welcome-scroll:hover .scroll-circle { background: #efcd5830; }.welcome-scroll:focus-visible { outline: 2px solid #7cffcb; border-radius: 16px; }.welcome-edition { position: absolute; bottom: 28px; left: 32px; color: #8f7b9f; font: 9px/1.5 Consolas,monospace; letter-spacing: .1em; }
@keyframes welcome-marquee { to { transform: translateX(-50%); } }@keyframes welcome-bob { 50% { transform: translateY(7px); } }@keyframes welcome-blink { 50% { opacity: 0; } }
@media(max-width:700px) { .construction-label { display: none; }.construction-banner { top: 7%; }.welcome-coordinate { left: 10%; top: 20%; }.welcome-avatar { left: 12%; top: 28%; width: 115px; height: 115px; }.welcome-nameplate { left: 35%; top: 43%; }.welcome-title { left: 48%; top: 27%; font-size: 9vw; }.welcome-caption { left: 12%; top: 55%; font-size: 13px; }.quote-stage { left: 12%; top: 69%; width: 78%; }.quote-line { font-size: 17px; }.welcome-edition { display:none; }.welcome-scroll { bottom: 2%; } }
@media(max-height:540px) and (min-width:701px) { .construction-banner { top:4%; }.welcome-coordinate { top:19%; }.welcome-avatar { top:27%; width:100px;height:100px; }.welcome-nameplate { top:39%; }.welcome-title { font-size:48px; }.quote-stage { top:65%; }.quote-line { font-size:17px; }.welcome-scroll { left:90%;bottom:4%; } }
@media(prefers-reduced-motion:reduce) { .marquee-track,.scroll-circle,.typing-cursor { animation:none; }.welcome-decoration { transition:none; } }
</style>
