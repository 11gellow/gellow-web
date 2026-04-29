(() => {
const TILE_SIZE = 28;
const HISTORY_LIMIT = 12;
const LOCAL_BACKEND_BASE = "http://127.0.0.1:5000";
const PROD_BACKEND_BASE = "https://www.gellow.top";
const BASE_MAP = [
  "###############",
  "#.............#",
  "#.###.###.###.#",
  "#o...#...#...o#",
  "###.#.#.#.#.###",
  "#.....#.#.....#",
  "#.###.....###.#",
  "#.....#.#.....#",
  "###.#.#.#.#.###",
  "#o...#...#...o#",
  "#.###.###.###.#",
  "#.............#",
  "###############",
];

function getBackendBaseUrl() {
  if (typeof window.GELLOW_CONTENT_API_BASE === "string" && window.GELLOW_CONTENT_API_BASE.trim()) {
    return window.GELLOW_CONTENT_API_BASE.trim().replace(/\/$/, "");
  }

  if (
    window.location.protocol === "file:" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost"
  ) {
    return LOCAL_BACKEND_BASE;
  }

  if (
    window.location.hostname.endsWith("vercel.app") ||
    (window.location.hostname.endsWith("gellow.top") && window.location.hostname !== "www.gellow.top")
  ) {
    return PROD_BACKEND_BASE;
  }

  return window.location.origin;
}

const SCORE_API_URL = `${getBackendBaseUrl()}/api/scores`;

const DIRECTIONS = {
  up: { x: 0, y: -1, angle: -Math.PI / 2 },
  down: { x: 0, y: 1, angle: Math.PI / 2 },
  left: { x: -1, y: 0, angle: Math.PI },
  right: { x: 1, y: 0, angle: 0 },
};

const KEY_TO_DIRECTION = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  a: "left",
  s: "down",
  d: "right",
  W: "up",
  A: "left",
  S: "down",
  D: "right",
};

const OPPOSITE_DIRECTION = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const GHOST_STARTS = [
  { x: 7, y: 6, color: "#ff4f64", strategy: "chase" },
  { x: 5, y: 6, color: "#29adff", strategy: "ambush" },
];

const ui = {
  introView: document.getElementById("arcade-intro-view"),
  gameView: document.getElementById("arcade-game-view"),
  logView: document.getElementById("arcade-log-view"),
  canvas: document.getElementById("arcade-canvas"),
  scoreText: document.getElementById("arcade-score"),
  livesText: document.getElementById("arcade-lives"),
  pelletsText: document.getElementById("arcade-pellets"),
  stateLabel: document.getElementById("arcade-state-label"),
  scoreLogList: document.getElementById("score-log-list"),
  scoreLogEmpty: document.getElementById("score-log-empty"),
  scoreEntryForm: document.getElementById("score-entry-form"),
  scoreEntryMessage: document.getElementById("score-entry-message"),
  scoreUsername: document.getElementById("score-username"),
  resumeButton: document.querySelector('[data-arcade-action="resume"]'),
};

const ctx = ui.canvas.getContext("2d");

const state = {
  map: [],
  pacman: null,
  ghosts: [],
  scoreHistory: [],
  scoreLoadFailed: false,
  pelletsRemaining: 0,
  score: 0,
  lives: 3,
  runStarted: false,
  running: false,
  over: false,
  scoreSaved: false,
  frameId: null,
  lastFrameTime: 0,
  pacmanCooldown: 0,
  ghostCooldown: 0,
  statusText: "[IDLE] press start to begin",
  endReason: "",
};

function showFeedback(message, title = "System Notice", variant = "info") {
  if (window.GellowFeedback?.showToast) {
    window.GellowFeedback.showToast(message, title, variant);
  }
}

function cloneMap() {
  return BASE_MAP.map((row) => row.split(""));
}

function countPellets(map) {
  return map.reduce((count, row) => {
    return count + row.filter((cell) => cell === "." || cell === "o").length;
  }, 0);
}

function createPacman() {
  return {
    x: 1,
    y: 1,
    direction: "right",
    nextDirection: "right",
    mouthOpen: true,
  };
}

function createGhosts() {
  return GHOST_STARTS.map((ghost) => ({
    x: ghost.x,
    y: ghost.y,
    direction: ghost.strategy === "chase" ? "left" : "right",
    color: ghost.color,
    strategy: ghost.strategy,
  }));
}

function normalizeScoreEntry(entry) {
  return {
    id: Number(entry.id || 0),
    name: typeof entry.name === "string" ? entry.name : "Player1",
    score: Number(entry.score || 0),
    createdAt: typeof entry.createdAt === "string" ? entry.createdAt : "",
  };
}

async function fetchScoresFromApi(limit = HISTORY_LIMIT) {
  const response = await fetch(`${SCORE_API_URL}?limit=${limit}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to load scores: ${response.status}`);
  }

  const payload = await response.json();
  const scores = Array.isArray(payload.scores) ? payload.scores : [];
  return scores.map(normalizeScoreEntry);
}

async function saveScoreToApi(name, score) {
  const response = await fetch(SCORE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ name, score }),
  });

  if (!response.ok) {
    let message = `Unable to save score: ${response.status}`;

    try {
      const payload = await response.json();
      if (payload.error) {
        message = payload.error;
      }
    } catch (error) {
      // Ignore JSON parse issues and use the default message above.
    }

    throw new Error(message);
  }

  const payload = await response.json();
  return normalizeScoreEntry(payload.score || {});
}

function formatDate(value) {
  if (!value) {
    return "--";
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

async function refreshScores() {
  try {
    state.scoreHistory = await fetchScoresFromApi();
    state.scoreLoadFailed = false;
  } catch (error) {
    state.scoreHistory = [];
    state.scoreLoadFailed = true;
    console.warn("Unable to fetch scores from backend.", error);
  }

  renderScoreLog();
}

function renderScoreLog() {
  ui.scoreLogList.innerHTML = "";

  if (state.scoreLoadFailed) {
    ui.scoreLogEmpty.hidden = false;
    ui.scoreLogEmpty.textContent = "Backend unavailable. Start Flask first, then refresh this page.";
    return;
  }

  if (!state.scoreHistory.length) {
    ui.scoreLogEmpty.hidden = false;
    ui.scoreLogEmpty.textContent = "No score saved yet. Start a run first.";
    return;
  }

  ui.scoreLogEmpty.hidden = true;

  state.scoreHistory.forEach((entry, index) => {
    const item = document.createElement("li");
    item.className = "score-log-item";

    const rank = document.createElement("span");
    rank.className = "score-log-rank";
    rank.textContent = `#${String(index + 1).padStart(2, "0")}`;

    const player = document.createElement("span");
    player.textContent = entry.name;

    const score = document.createElement("span");
    score.className = "score-log-score";
    score.textContent = `${entry.score}`;

    const time = document.createElement("span");
    time.className = "score-log-time";
    time.textContent = formatDate(entry.createdAt);

    item.append(rank, player, score, time);
    ui.scoreLogList.appendChild(item);
  });
}

function setView(viewName) {
  const views = {
    intro: ui.introView,
    game: ui.gameView,
    log: ui.logView,
  };

  Object.entries(views).forEach(([name, element]) => {
    element.hidden = name !== viewName;
  });

  ui.resumeButton.hidden = !state.runStarted || state.over;
}

function setStatus(text, label) {
  state.statusText = text;
  if (label) {
    ui.stateLabel.textContent = label;
  }
}

function updateHud() {
  ui.scoreText.textContent = String(state.score);
  ui.livesText.textContent = String(state.lives);
  ui.pelletsText.textContent = String(state.pelletsRemaining);
}

function resetRoundPositions() {
  state.pacman = createPacman();
  state.ghosts = createGhosts();
}

function resetGameState() {
  state.map = cloneMap();
  state.pelletsRemaining = countPellets(state.map);
  state.score = 0;
  state.lives = 3;
  state.over = false;
  state.scoreSaved = false;
  state.endReason = "";
  state.runStarted = true;
  state.lastFrameTime = 0;
  state.pacmanCooldown = 0;
  state.ghostCooldown = 0;
  resetRoundPositions();
  hideScoreEntry();
  updateHud();
}

function startRun() {
  resetGameState();
  setView("game");
  setStatus("[RUN] pacman session started", "Running");
  drawGame();
  resumeRun();
}

function resumeRun() {
  if (!state.runStarted || state.over || state.running) {
    return;
  }

  state.running = true;
  state.lastFrameTime = 0;
  setView("game");
  setStatus("[RUN] pacman session active", "Running");
  state.frameId = window.requestAnimationFrame(gameLoop);
}

function pauseRun(reasonText = "[PAUSE] run on hold") {
  if (state.frameId) {
    window.cancelAnimationFrame(state.frameId);
    state.frameId = null;
  }

  state.running = false;

  if (state.runStarted && !state.over) {
    setStatus(reasonText, "Paused");
  }
}

function hideScoreEntry() {
  ui.scoreEntryForm.hidden = true;
  ui.scoreEntryForm.reset();
}

function showScoreEntry(message) {
  ui.scoreEntryMessage.textContent = message;
  ui.scoreEntryForm.hidden = false;
  window.setTimeout(() => ui.scoreUsername.focus(), 20);
}

function insideMap(x, y) {
  return y >= 0 && y < state.map.length && x >= 0 && x < state.map[0].length;
}

function canMoveTo(x, y) {
  return insideMap(x, y) && state.map[y][x] !== "#";
}

function nextPosition(entity, directionName) {
  const direction = DIRECTIONS[directionName];
  return {
    x: entity.x + direction.x,
    y: entity.y + direction.y,
  };
}

function movePacmanOneStep() {
  const pacman = state.pacman;

  if (pacman.nextDirection) {
    const preferred = nextPosition(pacman, pacman.nextDirection);
    if (canMoveTo(preferred.x, preferred.y)) {
      pacman.direction = pacman.nextDirection;
    }
  }

  const target = nextPosition(pacman, pacman.direction);
  if (!canMoveTo(target.x, target.y)) {
    return;
  }

  pacman.x = target.x;
  pacman.y = target.y;
  pacman.mouthOpen = !pacman.mouthOpen;

  const cell = state.map[pacman.y][pacman.x];
  if (cell === "." || cell === "o") {
    state.map[pacman.y][pacman.x] = " ";
    state.score += cell === "o" ? 50 : 10;
    state.pelletsRemaining -= 1;
    updateHud();
  }

  if (state.pelletsRemaining <= 0) {
    finishRun("Stage clear! Enter your username to save the win.");
  }
}

function getAvailableDirections(entity) {
  return Object.keys(DIRECTIONS).filter((directionName) => {
    const target = nextPosition(entity, directionName);
    return canMoveTo(target.x, target.y);
  });
}

function chooseGhostDirection(ghost) {
  const options = getAvailableDirections(ghost);
  if (!options.length) {
    return ghost.direction;
  }

  const filtered = options.filter((directionName) => {
    return directionName !== OPPOSITE_DIRECTION[ghost.direction];
  });
  const candidates = filtered.length ? filtered : options;

  if (ghost.strategy === "chase") {
    return candidates.reduce((bestDirection, directionName) => {
      const candidate = nextPosition(ghost, directionName);
      const best = nextPosition(ghost, bestDirection);
      const candidateDistance =
        Math.abs(candidate.x - state.pacman.x) + Math.abs(candidate.y - state.pacman.y);
      const bestDistance = Math.abs(best.x - state.pacman.x) + Math.abs(best.y - state.pacman.y);
      return candidateDistance < bestDistance ? directionName : bestDirection;
    }, candidates[0]);
  }

  const mixedOptions = [...candidates].sort(() => Math.random() - 0.5);
  return mixedOptions[0];
}

function moveGhostsOneStep() {
  state.ghosts.forEach((ghost) => {
    ghost.direction = chooseGhostDirection(ghost);
    const target = nextPosition(ghost, ghost.direction);
    if (canMoveTo(target.x, target.y)) {
      ghost.x = target.x;
      ghost.y = target.y;
    }
  });
}

function detectCollision() {
  return state.ghosts.some((ghost) => ghost.x === state.pacman.x && ghost.y === state.pacman.y);
}

function loseLife() {
  state.lives -= 1;
  updateHud();

  if (state.lives <= 0) {
    finishRun("Caught by a ghost. Enter your username to save this score.");
    return;
  }

  resetRoundPositions();
  setStatus(`[HIT] ghost contact, ${state.lives} lives left`, "Running");
}

function finishRun(message) {
  state.over = true;
  pauseRun(`[END] ${message}`);
  state.endReason = message;
  setStatus(`[END] ${message}`, "Game Over");
  drawGame();

  if (!state.scoreSaved) {
    showScoreEntry(message);
  }
}

async function saveCurrentScore(name) {
  await saveScoreToApi(name, state.score);
  state.scoreSaved = true;
  hideScoreEntry();
  await refreshScores();
  setView("log");
  setStatus("[SAVE] score stored in database", "Saved");
  showFeedback("Score Saved", "System Notice", "success");
}

function handleArcadeAction(action) {
  if (action === "start") {
    if (!state.runStarted || state.over) {
      startRun();
      return;
    }

    resumeRun();
    return;
  }

  if (action === "restart") {
    startRun();
    return;
  }

  if (action === "log") {
    if (state.running) {
      pauseRun("[PAUSE] checking score log");
    }

    setView("log");
    void refreshScores();
    return;
  }

  if (action === "resume") {
    if (!state.runStarted || state.over) {
      startRun();
      return;
    }

    resumeRun();
    return;
  }

  if (action === "home") {
    if (state.running) {
      pauseRun("[PAUSE] back to intro");
    }

    hideScoreEntry();
    setView("intro");
    if (!state.runStarted) {
      setStatus("[IDLE] press start to begin", "Ready");
    }
    return;
  }

  if (action === "dismiss-score") {
    state.scoreSaved = true;
    hideScoreEntry();
    setView("log");
    void refreshScores();
    setStatus("[SKIP] score discarded", "Skipped");
  }
}

function drawBoard() {
  ctx.clearRect(0, 0, ui.canvas.width, ui.canvas.height);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height);

  state.map.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const x = colIndex * TILE_SIZE;
      const y = rowIndex * TILE_SIZE;

      if (cell === "#") {
        ctx.fillStyle = "#1b38ff";
        ctx.fillRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        ctx.strokeStyle = "#5fc6ff";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);
        return;
      }

      if (cell === "." || cell === "o") {
        ctx.fillStyle = cell === "o" ? "#ff8ad8" : "#ffe66d";
        ctx.beginPath();
        ctx.arc(
          x + TILE_SIZE / 2,
          y + TILE_SIZE / 2,
          cell === "o" ? 5 : 3,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    });
  });
}

function drawPacman() {
  if (!state.pacman) {
    return;
  }

  const pacman = state.pacman;
  const centerX = pacman.x * TILE_SIZE + TILE_SIZE / 2;
  const centerY = pacman.y * TILE_SIZE + TILE_SIZE / 2;
  const radius = TILE_SIZE * 0.38;
  const baseAngle = DIRECTIONS[pacman.direction].angle;
  const mouthOffset = pacman.mouthOpen ? 0.24 * Math.PI : 0.08 * Math.PI;

  ctx.fillStyle = "#ffe66d";
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(
    centerX,
    centerY,
    radius,
    baseAngle + mouthOffset,
    baseAngle - mouthOffset + Math.PI * 2
  );
  ctx.closePath();
  ctx.fill();
}

function drawGhost(ghost) {
  const left = ghost.x * TILE_SIZE + 4;
  const top = ghost.y * TILE_SIZE + 5;
  const width = TILE_SIZE - 8;
  const height = TILE_SIZE - 10;
  const bottom = top + height;

  ctx.fillStyle = ghost.color;
  ctx.beginPath();
  ctx.moveTo(left, bottom);
  ctx.lineTo(left, top + height * 0.45);
  ctx.quadraticCurveTo(left + width * 0.1, top, left + width * 0.35, top);
  ctx.lineTo(left + width * 0.65, top);
  ctx.quadraticCurveTo(left + width * 0.9, top, left + width, top + height * 0.45);
  ctx.lineTo(left + width, bottom);
  ctx.lineTo(left + width * 0.8, bottom - 6);
  ctx.lineTo(left + width * 0.6, bottom);
  ctx.lineTo(left + width * 0.4, bottom - 6);
  ctx.lineTo(left + width * 0.2, bottom);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(left + width * 0.35, top + height * 0.42, 4, 0, Math.PI * 2);
  ctx.arc(left + width * 0.68, top + height * 0.42, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(left + width * 0.35, top + height * 0.45, 2, 0, Math.PI * 2);
  ctx.arc(left + width * 0.68, top + height * 0.45, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawOverlay(text, detail) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height);

  ctx.fillStyle = "#ffe66d";
  ctx.font = 'bold 30px "Courier New", monospace';
  ctx.textAlign = "center";
  ctx.fillText(text, ui.canvas.width / 2, ui.canvas.height / 2 - 6);

  if (detail) {
    ctx.fillStyle = "#fff5cc";
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText(detail, ui.canvas.width / 2, ui.canvas.height / 2 + 24);
  }
}

function drawGame() {
  drawBoard();
  state.ghosts.forEach(drawGhost);
  drawPacman();

  if (!state.runStarted) {
    drawOverlay("READY", "");
  } else if (state.over) {
    drawOverlay("GAME OVER", "");
  } else if (!state.running) {
    drawOverlay("PAUSED", "");
  }
}

function gameLoop(timestamp) {
  if (!state.running) {
    return;
  }

  if (!state.lastFrameTime) {
    state.lastFrameTime = timestamp;
  }

  const delta = timestamp - state.lastFrameTime;
  state.lastFrameTime = timestamp;
  state.pacmanCooldown += delta;
  state.ghostCooldown += delta;

  if (state.pacmanCooldown >= 290) {
    movePacmanOneStep();
    state.pacmanCooldown = 0;
  }

  if (!state.over && detectCollision()) {
    loseLife();
  }

  if (!state.over && state.ghostCooldown >= 380) {
    moveGhostsOneStep();
    state.ghostCooldown = 0;
  }

  if (!state.over && detectCollision()) {
    loseLife();
  }

  drawGame();

  if (state.running) {
    state.frameId = window.requestAnimationFrame(gameLoop);
  }
}

function handleKeyboardInput(event) {
  if (document.activeElement === ui.scoreUsername) {
    return;
  }

  const direction = KEY_TO_DIRECTION[event.key];
  if (!direction) {
    return;
  }

  event.preventDefault();

  if (!state.runStarted || state.over) {
    return;
  }

  state.pacman.nextDirection = direction;
}

document.querySelectorAll("[data-arcade-action]").forEach((button) => {
  button.addEventListener("click", () => {
    handleArcadeAction(button.dataset.arcadeAction);
  });
});

ui.scoreEntryForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = ui.scoreUsername.value.trim() || "Player1";

  try {
    await saveCurrentScore(username);
  } catch (error) {
    ui.scoreEntryMessage.textContent = `Save failed: ${error.message}`;
    showFeedback("Score Save Failed", "System Notice", "error");
    console.warn("Unable to save score to backend.", error);
  }
});

document.addEventListener("keydown", handleKeyboardInput);

window.addEventListener("blur", () => {
  if (state.running) {
    pauseRun("[PAUSE] browser focus lost");
    drawGame();
  }
});

setView("intro");
updateHud();
drawGame();
void refreshScores();
})();
