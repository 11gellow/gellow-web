<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
const canvas = ref<HTMLCanvasElement>();
let dispose = () => {};
onMounted(() => {
  const surface = canvas.value!;
  const ctx = surface.getContext('2d');
  if (!ctx) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(pointer: fine)');
  const colors = ['#ff8ad8', '#29adff', '#7cffcb', '#ffe66d'];
  let width = innerWidth, height = innerHeight, frame = 0, last = 0, clock = 0;
  let pointer = { x: width / 2, y: height / 2, active: false };
  let eased = { x: width / 2, y: height / 2 };
  let particles: { x: number; y: number; speed: number; size: number; phase: number; color: string }[] = [];
  let sparks: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
  let ripples: { x: number; y: number; life: number }[] = [];
  let lastSpark = 0;
  function resize() {
    width = innerWidth; height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    surface.width = Math.round(width * ratio); surface.height = Math.round(height * ratio);
    ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);
    particles = Array.from({ length: Math.min(70, Math.max(22, Math.floor(width * height / 18000))) }, (_, i) => ({ x: Math.random() * width, y: Math.random() * height, speed: 4 + Math.random() * 12, size: i % 5 === 0 ? 4 : 2, phase: Math.random() * 6.28, color: colors[i % colors.length] }));
    if (motion.matches) draw(0);
  }
  function glow(x: number, y: number, radius: number, color: string) {
    const fill = ctx!.createRadialGradient(x, y, 0, x, y, radius);
    fill.addColorStop(0, color); fill.addColorStop(1, 'transparent');
    ctx!.fillStyle = fill; ctx!.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  function draw(dt: number) {
    clock += dt;
    ctx!.clearRect(0, 0, width, height);
    eased.x += (pointer.x - eased.x) * .08; eased.y += (pointer.y - eased.y) * .08;
    const px = (eased.x / width - .5) * 28, py = (eased.y / height - .5) * 20;
    glow(width * .18 + Math.sin(clock * .13) * 100 + px, height * .25 + Math.cos(clock * .11) * 70 + py, Math.min(width, 650) * .65, '#e849a020');
    glow(width * .8 + Math.cos(clock * .12) * 90 - px, height * .65 + Math.sin(clock * .16) * 80 - py, Math.min(width, 600) * .65, '#29adff20');
    if (pointer.active && !motion.matches) {
      glow(eased.x, eased.y, 190, '#7cffcb15');
      ctx!.strokeStyle = '#7cffcb18'; ctx!.lineWidth = 1;
      const gx = Math.floor(eased.x / 24) * 24, gy = Math.floor(eased.y / 24) * 24;
      for (let i = -2; i <= 2; i++) { ctx!.strokeRect(gx + i * 24, gy, 24, 24); ctx!.strokeRect(gx, gy + i * 24, 24, 24); }
    }
    for (const p of particles) {
      p.y -= p.speed * dt;
      if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }
      const x = p.x + Math.sin(clock * .3 + p.phase) * 15 + px * .3;
      ctx!.globalAlpha = .2 + (Math.sin(clock * 1.3 + p.phase) + 1) * .2;
      ctx!.fillStyle = p.color; ctx!.fillRect(Math.round(x), Math.round(p.y), p.size, p.size);
      if (p.size === 4) { ctx!.fillRect(Math.round(x) - 3, Math.round(p.y) + 1, 10, 2); ctx!.fillRect(Math.round(x) + 1, Math.round(p.y) - 3, 2, 10); }
    }
    for (const s of sparks) {
      s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
      ctx!.globalAlpha = Math.max(0, s.life / .65) * .55;
      ctx!.fillStyle = s.color; ctx!.fillRect(Math.round(s.x), Math.round(s.y), 3, 3);
    }
    sparks = sparks.filter(s => s.life > 0);
    for (const ring of ripples) {
      ring.life -= dt; const radius = (1 - ring.life / .8) * 85;
      ctx!.globalAlpha = Math.max(0, ring.life / .8) * .35;
      ctx!.strokeStyle = '#ff8ad8'; ctx!.lineWidth = 2;
      ctx!.strokeRect(ring.x - radius, ring.y - radius, radius * 2, radius * 2);
    }
    ripples = ripples.filter(r => r.life > 0);
    ctx!.globalAlpha = 1;
  }
  function tick(now: number) {
    frame = 0;
    if (document.hidden || motion.matches) return;
    if (now - last >= 32) { const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now; draw(dt); }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    if (motion.matches) { sparks = []; ripples = []; draw(0); }
    else if (!document.hidden) frame = requestAnimationFrame(tick);
  }
  function move(event: PointerEvent) {
    if (!finePointer.matches || motion.matches || event.pointerType === 'touch') return;
    pointer = { x: event.clientX, y: event.clientY, active: true };
    if (event.timeStamp - lastSpark < 35) return;
    lastSpark = event.timeStamp;
    sparks.push({ x: event.clientX, y: event.clientY, vx: (Math.random() - .5) * 28, vy: 20 + Math.random() * 20, life: .65, color: colors[Math.floor(Math.random() * colors.length)] });
    if (sparks.length > 30) sparks.shift();
  }
  function leave() { pointer.active = false; }
  function click(event: MouseEvent) {
    if (motion.matches || !finePointer.matches || (event.target as Element)?.closest('button,a,input,select,.vinyl-player')) return;
    ripples.push({ x: event.clientX, y: event.clientY, life: .8 });
    if (ripples.length > 4) ripples.shift();
  }
  resize(); sync();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', move, { passive: true });
  document.documentElement.addEventListener('pointerleave', leave);
  document.addEventListener('click', click, { passive: true });
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
  dispose = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', resize); window.removeEventListener('pointermove', move);
    document.documentElement.removeEventListener('pointerleave', leave);
    document.removeEventListener('click', click); document.removeEventListener('visibilitychange', sync);
    motion.removeEventListener('change', sync);
  };
});
onBeforeUnmount(() => dispose());
</script>

<template><canvas ref="canvas" class="ambient-pixels" aria-hidden="true"></canvas></template>
<style>
/* The page is above the canvas; interactive floating widgets keep their own layers. */
#app { isolation: isolate; }
.ambient-pixels { position: fixed; inset: 0; width: 100%; height: 100dvh; z-index: -1; pointer-events: none; }
</style>
