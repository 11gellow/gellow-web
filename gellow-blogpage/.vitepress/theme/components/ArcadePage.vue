<script setup lang="ts">
import { nextTick, onMounted, onUnmounted } from "vue";
onMounted(async () => { document.title = "Gellow Arcade"; await nextTick(); await import("../../../js/arcade.js"); });
onUnmounted(() => window.dispatchEvent(new Event("gellow:arcade-unmount")));
</script>

<template>
  <main class="arcade-app"><div class="arcade-shell pixel">
    <section id="arcade-intro-view" class="arcade-view arcade-view-intro"><div class="badge">Player 1 Online</div><h2>Pac-Man<br />Run</h2><div class="arcade-actions"><button class="btn btn-yellow" type="button" data-arcade-action="start">Start Game</button><button class="btn btn-green" type="button" data-arcade-action="log">Read Log</button></div></section>
    <section id="arcade-game-view" class="arcade-view arcade-view-game" hidden><div class="arcade-screen-wrap"><div class="arcade-canvas-shell"><canvas id="arcade-canvas" width="420" height="420" aria-label="Pac-Man game board"></canvas></div><div class="arcade-side-hud"><div class="arcade-stat-box"><span class="arcade-stat-label">Score</span><strong id="arcade-score">0</strong></div><div class="arcade-stat-box"><span class="arcade-stat-label">Lives</span><strong id="arcade-lives">3</strong></div><div class="arcade-stat-box"><span class="arcade-stat-label">Pellets</span><strong id="arcade-pellets">0</strong></div></div></div>
      <div class="arcade-actions arcade-actions-game"><button class="btn btn-yellow" type="button" data-arcade-action="restart">Restart Run</button><button class="btn btn-green" type="button" data-arcade-action="log">View Log</button><button class="btn btn-red" type="button" data-arcade-action="home">Exit</button><div id="arcade-state-label" class="arcade-chip arcade-chip-dark arcade-chip-status">Ready</div></div>
      <form id="score-entry-form" class="score-entry pixel" hidden><h3>Game Over</h3><p id="score-entry-message">Enter your username to save this score.</p><label class="score-entry-label" for="score-username">Username</label><input id="score-username" name="username" type="text" maxlength="16" placeholder="Player1" required /><div class="score-entry-actions"><button class="btn btn-yellow" type="submit">Save Score</button><button class="btn btn-green" type="button" data-arcade-action="dismiss-score">Skip</button></div></form>
    </section>
    <section id="arcade-log-view" class="arcade-view arcade-view-log" hidden><div class="badge">Score Archive</div><h2>PAC-MAN Rankings</h2><div class="score-log-shell pixel"><div class="score-log-head"><span>Rank</span><span>Player</span><span>Score</span><span>Time</span></div><ol id="score-log-list" class="score-log-list"></ol><p id="score-log-empty" class="score-log-empty">No score saved yet. Start a run first.</p></div><div class="arcade-actions"><button class="btn btn-yellow" type="button" data-arcade-action="restart">New Run</button><button class="btn btn-green" type="button" data-arcade-action="resume">Resume Run</button><button class="btn btn-red" type="button" data-arcade-action="home">Back</button></div></section>
    <div class="arcade-status-strip"><span>Arrow Keys / WASD</span><span>Eat all pellets · avoid ghosts</span></div>
  </div></main>
</template>
