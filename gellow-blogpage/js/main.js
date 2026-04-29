const ui = {
  streamList: document.getElementById("stream-list"),
  pacmanButton: document.getElementById("pacman-launch-button"),
  gameWindow: document.getElementById("game-window"),
  gameFrame: document.getElementById("game-window-frame"),
  gameClose: document.getElementById("game-window-close"),
  gameHandle: document.getElementById("game-window-handle"),
  passwordModal: document.getElementById("notes-password-modal"),
  passwordForm: document.getElementById("notes-password-form"),
  passwordInput: document.getElementById("notes-password-input"),
  passwordError: document.getElementById("notes-password-error"),
  passwordClose: document.getElementById("notes-password-close"),
  passwordCancel: document.getElementById("notes-password-cancel"),
};

const NOTES_PASSWORD = "aaa8524493";

const interactionState = {
  clickTimer: 0,
  dragPointerId: null,
  dragOffsetX: 0,
  dragOffsetY: 0,
  positioned: false,
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
  return "./arcade.html";
}

function applyGameWindowPosition(left, top) {
  const maxLeft = Math.max(12, window.innerWidth - ui.gameWindow.offsetWidth - 12);
  const maxTop = Math.max(12, window.innerHeight - ui.gameWindow.offsetHeight - 12);
  const clampedLeft = Math.min(Math.max(12, left), maxLeft);
  const clampedTop = Math.min(Math.max(12, top), maxTop);

  ui.gameWindow.style.left = `${clampedLeft}px`;
  ui.gameWindow.style.top = `${clampedTop}px`;
  ui.gameWindow.style.right = "auto";
  interactionState.positioned = true;
}

function openArcadeWindow() {
  if (!ui.gameFrame.src) {
    ui.gameFrame.src = getArcadeUrl();
  }

  ui.gameWindow.hidden = false;
  ui.gameWindow.classList.add("is-open");

  if (!interactionState.positioned) {
    ui.gameWindow.style.top = "96px";
    ui.gameWindow.style.right = "18px";
    ui.gameWindow.style.left = "auto";
  }
}

function closeArcadeWindow() {
  ui.gameWindow.classList.remove("is-open");
  window.setTimeout(() => {
    if (!ui.gameWindow.classList.contains("is-open")) {
      ui.gameWindow.hidden = true;
    }
  }, 180);
}

function openPasswordModal() {
  ui.passwordError.hidden = true;
  ui.passwordError.textContent = "密码错误";
  ui.passwordForm.reset();
  ui.passwordModal.hidden = false;
  window.setTimeout(() => ui.passwordInput.focus(), 20);
}

function closePasswordModal() {
  ui.passwordModal.hidden = true;
}

function handleNotesPasswordSubmit(event) {
  event.preventDefault();

  if (ui.passwordInput.value === NOTES_PASSWORD) {
    closePasswordModal();
    showFeedback("Notes Console 已打开", "Access Granted", "success");
    window.setTimeout(() => {
      window.location.href = "./notes/";
    }, 220);
    return;
  }

  ui.passwordError.hidden = false;
  ui.passwordError.textContent = "密码错误";
  showFeedback("Notes Password Error", "Access Denied", "error");
  ui.passwordInput.select();
}

function startDrag(event) {
  if (!ui.gameWindow || event.target.closest(".game-window-close")) {
    return;
  }

  const rect = ui.gameWindow.getBoundingClientRect();
  interactionState.dragPointerId = event.pointerId;
  interactionState.dragOffsetX = event.clientX - rect.left;
  interactionState.dragOffsetY = event.clientY - rect.top;

  applyGameWindowPosition(rect.left, rect.top);
  ui.gameHandle.setPointerCapture(event.pointerId);
  ui.gameWindow.classList.add("is-dragging");
}

function moveDrag(event) {
  if (interactionState.dragPointerId !== event.pointerId) {
    return;
  }

  const left = event.clientX - interactionState.dragOffsetX;
  const top = event.clientY - interactionState.dragOffsetY;
  applyGameWindowPosition(left, top);
}

function endDrag(event) {
  if (interactionState.dragPointerId !== event.pointerId) {
    return;
  }

  interactionState.dragPointerId = null;
  ui.gameWindow.classList.remove("is-dragging");
  if (ui.gameHandle.hasPointerCapture(event.pointerId)) {
    ui.gameHandle.releasePointerCapture(event.pointerId);
  }
}

function queueArcadeOpen() {
  window.clearTimeout(interactionState.clickTimer);
  interactionState.clickTimer = window.setTimeout(() => {
    openArcadeWindow();
    interactionState.clickTimer = 0;
  }, 220);
}

async function initBlogHome() {
  try {
    const payload = await window.GellowContentApi.fetchPublicContent();
    const posts = window.GellowContentApi.sortPosts(Array.isArray(payload.posts) ? payload.posts : []);
    renderPostStream(posts);
  } catch (error) {
    ui.streamList.innerHTML = `
      <article class="archive-empty pixel">
        文章流加载失败：${escapeHtml(error.message)}
      </article>
    `;
    console.warn("Unable to initialize merged blog homepage.", error);
  }
}

ui.pacmanButton?.addEventListener("click", queueArcadeOpen);
ui.pacmanButton?.addEventListener("dblclick", () => {
  window.clearTimeout(interactionState.clickTimer);
  interactionState.clickTimer = 0;
  openPasswordModal();
});
ui.gameClose?.addEventListener("click", closeArcadeWindow);
ui.gameWindow?.addEventListener("click", (event) => {
  if (event.target === ui.gameWindow) {
    closeArcadeWindow();
  }
});
ui.gameHandle?.addEventListener("pointerdown", startDrag);
ui.gameHandle?.addEventListener("pointermove", moveDrag);
ui.gameHandle?.addEventListener("pointerup", endDrag);
ui.gameHandle?.addEventListener("pointercancel", endDrag);
ui.passwordForm?.addEventListener("submit", handleNotesPasswordSubmit);
ui.passwordClose?.addEventListener("click", closePasswordModal);
ui.passwordCancel?.addEventListener("click", closePasswordModal);
ui.passwordModal?.addEventListener("click", (event) => {
  if (event.target === ui.passwordModal) {
    closePasswordModal();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !ui.passwordModal?.hidden) {
    closePasswordModal();
  }
});
window.addEventListener("resize", () => {
  if (!ui.gameWindow.hidden && interactionState.positioned) {
    const rect = ui.gameWindow.getBoundingClientRect();
    applyGameWindowPosition(rect.left, rect.top);
  }
});

void initBlogHome();
