const HOME_SLOT_COUNT = 4;

const ui = {
  homeGrid: document.getElementById("home-display-grid"),
  addHomeButton: document.getElementById("add-home-card-btn"),
  saveButton: document.getElementById("save-display-btn"),
  saveHint: document.getElementById("display-save-hint"),
  pickerModal: document.getElementById("picker-modal"),
  pickerGrid: document.getElementById("picker-grid"),
  pickerCloseButton: document.getElementById("picker-close-btn"),
};

const state = {
  posts: [],
  settings: {
    featured_latest: [],
    featured_home: [],
    mission_notes_title: "Command Cache",
    mission_notes_items: [],
  },
  homeBoard: [],
};

function showFeedback(message, title = "System Notice", variant = "info") {
  if (window.GellowFeedback?.showToast) {
    window.GellowFeedback.showToast(message, title, variant);
  }
}

function showPendingFeedback(message, title = "System Notice") {
  if (window.GellowFeedback?.showPendingToast) {
    return window.GellowFeedback.showPendingToast(message, title);
  }
  return null;
}

function resolvePendingFeedback(toast, message, title = "System Notice", variant = "success") {
  if (window.GellowFeedback?.resolvePendingToast) {
    window.GellowFeedback.resolvePendingToast(toast, message, title, variant);
    return;
  }
  showFeedback(message, title, variant);
}

function failPendingFeedback(toast, message, title = "System Notice") {
  if (window.GellowFeedback?.failPendingToast) {
    window.GellowFeedback.failPendingToast(toast, message, title);
    return;
  }
  showFeedback(message, title, "error");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setSaveHint(text) {
  ui.saveHint.textContent = text;
}

function toSlotArray(slugs, size) {
  const result = Array.from({ length: size }, () => null);
  slugs.slice(0, size).forEach((slug, index) => {
    result[index] = slug;
  });
  return result;
}

function getPostBySlug(slug) {
  return state.posts.find((post) => post.slug === slug) || null;
}

function createTrashIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 3h6l1 2h4v3H4V5h4l1-2Zm-1 8h2v7H8v-7Zm6 0h2v7h-2v-7ZM6 8h12l-1 12H7L6 8Z"></path>
    </svg>
  `;
}

function buildHomeCard(post) {
  return `
    <article class="display-card-home display-card" draggable="true" data-slug="${escapeHtml(post.slug)}">
      <button class="trash-button" type="button" data-trash-slug="${escapeHtml(post.slug)}" aria-label="Remove display">
        ${createTrashIcon()}
      </button>
      <h4>${escapeHtml(post.title)}</h4>
      <p>${escapeHtml(post.summary || "完整内容会在文章详情页中展示。")}</p>
    </article>
  `;
}

function renderBoard() {
  ui.homeGrid.innerHTML = "";

  for (let index = 0; index < HOME_SLOT_COUNT; index += 1) {
    const slot = document.createElement("div");
    slot.className = "display-slot";
    slot.dataset.index = String(index);

    const slug = state.homeBoard[index];
    const post = slug ? getPostBySlug(slug) : null;

    if (post) {
      slot.innerHTML = buildHomeCard(post);
    } else {
      slot.innerHTML = `<div class="slot-empty">空位<br />可把文章拖到这里，或从右上角新增展示窗口。</div>`;
    }

    ui.homeGrid.appendChild(slot);
  }
}

function moveCardWithinBoard(fromIndex, toIndex) {
  if (fromIndex === toIndex) {
    return;
  }

  const next = [...state.homeBoard];
  const temp = next[fromIndex];
  next[fromIndex] = next[toIndex];
  next[toIndex] = temp;
  state.homeBoard = next;
  renderBoard();
}

function removeCard(slug) {
  state.homeBoard = state.homeBoard.map((item) => (item === slug ? null : item));
  renderBoard();
}

function openPicker() {
  const used = new Set(state.homeBoard.filter(Boolean));

  ui.pickerGrid.innerHTML = state.posts
    .map((post) => {
      const disabled = used.has(post.slug);
      return `
        <button class="picker-item" type="button" data-pick-slug="${escapeHtml(post.slug)}"${disabled ? " disabled" : ""}>
          <div class="article-card-head">
            <h3>${escapeHtml(post.title)}</h3>
            <span class="status-badge ${post.status}">${escapeHtml(post.status.toUpperCase())}</span>
          </div>
          <p>${escapeHtml(post.summary || "还没有摘要。")}</p>
          <div class="meta-line">${escapeHtml(post.slug)} · ${escapeHtml(post.publishedAt || "--")}</div>
        </button>
      `;
    })
    .join("");

  ui.pickerModal.hidden = false;
}

function closePicker() {
  ui.pickerModal.hidden = true;
}

function addCardToBoard(slug) {
  const next = [...state.homeBoard];
  const emptyIndex = next.findIndex((item) => item === null);

  if (emptyIndex < 0) {
    setSaveHint("Mission Board 已满，需要先移除一个窗口。");
    return;
  }

  next[emptyIndex] = slug;
  state.homeBoard = next;
  renderBoard();
  setSaveHint("展示窗口已加入，调整顺序后记得保存布局。");
}

function bindBoardInteractions() {
  ui.homeGrid.addEventListener("dragstart", (event) => {
    const card = event.target.closest("[data-slug]");
    const slot = event.target.closest(".display-slot");

    if (!card || !slot || !event.dataTransfer) {
      return;
    }

    event.dataTransfer.setData("text/plain", String(slot.dataset.index));
    event.dataTransfer.effectAllowed = "move";
  });

  ui.homeGrid.addEventListener("dragover", (event) => {
    const slot = event.target.closest(".display-slot");
    if (!slot) {
      return;
    }

    event.preventDefault();
    slot.classList.add("is-over");
  });

  ui.homeGrid.addEventListener("dragleave", (event) => {
    const slot = event.target.closest(".display-slot");
    if (slot) {
      slot.classList.remove("is-over");
    }
  });

  ui.homeGrid.addEventListener("drop", (event) => {
    const slot = event.target.closest(".display-slot");
    if (!slot || !event.dataTransfer) {
      return;
    }

    event.preventDefault();
    slot.classList.remove("is-over");
    const fromIndex = Number(event.dataTransfer.getData("text/plain"));
    const toIndex = Number(slot.dataset.index);

    moveCardWithinBoard(fromIndex, toIndex);
    setSaveHint("展示顺序已调整，保存后会同步到前台。");
  });

  ui.homeGrid.addEventListener("click", (event) => {
    const trashButton = event.target.closest("[data-trash-slug]");
    if (!trashButton) {
      return;
    }

    removeCard(trashButton.dataset.trashSlug);
    setSaveHint("展示窗口已移除，保存后会同步这次变更。");
  });
}

async function saveBoard() {
  const payload = {
    featured_latest: state.settings.featured_latest,
    featured_home: state.homeBoard.filter(Boolean),
    mission_notes_title: state.settings.mission_notes_title,
    mission_notes_items: state.settings.mission_notes_items,
  };

  const response = await window.GellowContentApi.saveSettings(payload);
  state.settings = window.GellowContentApi.normalizeSettings(response.settings || {});
  state.homeBoard = toSlotArray(state.settings.featured_home, HOME_SLOT_COUNT);
  renderBoard();
}

async function loadDisplayData() {
  const payload = await window.GellowContentApi.fetchAdminContent();
  state.posts = window.GellowContentApi.sortPosts(Array.isArray(payload.posts) ? payload.posts : []);
  state.settings = window.GellowContentApi.normalizeSettings(payload.settings || {});
  state.homeBoard = toSlotArray(state.settings.featured_home, HOME_SLOT_COUNT);
  renderBoard();
}

async function initDisplayConsole() {
  setSaveHint("正在读取 Mission Board 布局...");

  bindBoardInteractions();

  ui.addHomeButton.addEventListener("click", openPicker);
  ui.saveButton.addEventListener("click", async () => {
    const pendingToast = showPendingFeedback("Saving display layout...", "System Notice");
    try {
      await saveBoard();
      setSaveHint("Mission Board 布局已保存。");
      resolvePendingFeedback(pendingToast, "Display Layout Saved", "System Notice", "success");
    } catch (error) {
      setSaveHint(`保存失败：${error.message}`);
      failPendingFeedback(pendingToast, "Display Layout Save Failed", "System Notice");
      console.warn("Unable to save mission board display layout.", error);
    }
  });

  ui.pickerCloseButton.addEventListener("click", closePicker);
  ui.pickerModal.addEventListener("click", (event) => {
    if (event.target === ui.pickerModal) {
      closePicker();
    }
  });

  ui.pickerGrid.addEventListener("click", (event) => {
    const item = event.target.closest("[data-pick-slug]");
    if (!item || item.hasAttribute("disabled")) {
      return;
    }

    addCardToBoard(item.dataset.pickSlug);
    closePicker();
  });

  try {
    await loadDisplayData();
    setSaveHint("Mission Board 布局已载入。");
  } catch (error) {
    setSaveHint(`读取失败：${error.message}`);
    console.warn("Unable to initialize mission board display console.", error);
  }
}

void initDisplayConsole();
