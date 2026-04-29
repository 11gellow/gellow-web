const ui = {
  streamList: document.getElementById("stream-list"),
  missionTitle: document.getElementById("mission-notes-title"),
  missionList: document.getElementById("mission-notes-list"),
  pacmanButton: document.getElementById("pacman-launch-button"),
  gameWindow: document.getElementById("game-window"),
  gameFrame: document.getElementById("game-window-frame"),
  gameClose: document.getElementById("game-window-close"),
  controllerGate: document.getElementById("controller-gate"),
};

const GATE_SEQUENCE = [
  "up",
  "up",
  "down",
  "down",
  "left",
  "right",
  "left",
  "right",
  "green",
  "red",
  "green",
  "red",
];

const gateState = {
  progress: 0,
};

function showFeedback(message, title = "System Notice", variant = "info") {
  if (window.GellowFeedback?.showToast) {
    window.GellowFeedback.showToast(message, title, variant);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function renderCommandLines(settings) {
  ui.missionTitle.textContent = settings.mission_notes_title || "Mission Notes";

  if (!Array.isArray(settings.mission_notes_items) || !settings.mission_notes_items.length) {
    ui.missionList.innerHTML = `<div class="command-line">命令缓存暂时为空。</div>`;
    return;
  }

  ui.missionList.innerHTML = settings.mission_notes_items
    .map((item) => `<div class="command-line">${escapeHtml(item)}</div>`)
    .join("");
}

function renderPostStream(posts) {
  if (!posts.length) {
    ui.streamList.innerHTML = `<article class="archive-empty pixel">还没有已发布的文章。</article>`;
    return;
  }

  ui.streamList.innerHTML = posts
    .map(
      (post) => `
        <article class="blog-entry pixel">
          <div class="blog-entry-meta">
            <span class="tag">${escapeHtml(post.slug)}</span>
            <span class="date">${escapeHtml(formatDate(post.publishedAt))}</span>
          </div>
          <h3>
            <a href="./blogs/post.html?slug=${encodeURIComponent(post.slug)}" data-toast-message="文章 ${escapeHtml(post.title)} 已打开">
              ${escapeHtml(post.title)}
            </a>
          </h3>
          <p>${escapeHtml(post.summary)}</p>
          <a class="entry-readmore" href="./blogs/post.html?slug=${encodeURIComponent(post.slug)}" data-toast-message="文章 ${escapeHtml(post.title)} 已打开">
            Read More
          </a>
        </article>
      `,
    )
    .join("");
}

function getArcadeUrl() {
  if (window.location.protocol === "file:") {
    return "../gellow-homepage/frontend/index.html";
  }

  return "https://www.gellow.top";
}

function openArcadeWindow() {
  if (!ui.gameFrame.src) {
    ui.gameFrame.src = getArcadeUrl();
  }

  ui.gameWindow.hidden = false;
  ui.gameWindow.classList.add("is-open");
  showFeedback("Pac-Man Arcade 已打开", "Arcade", "navigation");
}

function closeArcadeWindow() {
  ui.gameWindow.classList.remove("is-open");
  window.setTimeout(() => {
    if (!ui.gameWindow.classList.contains("is-open")) {
      ui.gameWindow.hidden = true;
    }
  }, 180);
}

function pulseGateButton(button) {
  button.classList.remove("is-hit");
  void button.offsetWidth;
  button.classList.add("is-hit");
}

function handleGateInput(input, button) {
  pulseGateButton(button);

  const expected = GATE_SEQUENCE[gateState.progress];
  if (input === expected) {
    gateState.progress += 1;

    if (gateState.progress === GATE_SEQUENCE.length) {
      gateState.progress = 0;
      showFeedback("Notes Console 已解锁", "Hidden Gate", "success");
      window.setTimeout(() => {
        window.location.href = "./notes/";
      }, 320);
    }

    return;
  }

  gateState.progress = input === GATE_SEQUENCE[0] ? 1 : 0;
  showFeedback("Sequence Reset", "Hidden Gate", "warning");
}

function initControllerGate() {
  if (!ui.controllerGate) {
    return;
  }

  ui.controllerGate.addEventListener("click", (event) => {
    const button = event.target.closest("[data-gate-input]");
    if (!button) {
      return;
    }

    handleGateInput(button.dataset.gateInput, button);
  });
}

async function initBlogHome() {
  try {
    const payload = await window.GellowContentApi.fetchPublicContent();
    const settings = window.GellowContentApi.normalizeSettings(payload.settings || {});
    const posts = window.GellowContentApi.sortPosts(Array.isArray(payload.posts) ? payload.posts : []);
    renderCommandLines(settings);
    renderPostStream(posts);
  } catch (error) {
    ui.streamList.innerHTML = `
      <article class="archive-empty pixel">
        文章流加载失败：${escapeHtml(error.message)}
      </article>
    `;
    renderCommandLines({
      mission_notes_title: "Mission Notes",
      mission_notes_items: ["内容接口暂时不可用。"],
    });
    console.warn("Unable to initialize merged blog homepage.", error);
  }
}

ui.pacmanButton?.addEventListener("click", openArcadeWindow);
ui.gameClose?.addEventListener("click", closeArcadeWindow);
ui.gameWindow?.addEventListener("click", (event) => {
  if (event.target === ui.gameWindow) {
    closeArcadeWindow();
  }
});

initControllerGate();
void initBlogHome();
