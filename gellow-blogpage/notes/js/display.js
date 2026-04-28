const LATEST_SLOT_COUNT = 3;
const HOME_SLOT_COUNT = 4;

const ui = {
  latestGrid: document.getElementById("latest-display-grid"),
  homeGrid: document.getElementById("home-display-grid"),
  addLatestButton: document.getElementById("add-latest-card-btn"),
  addHomeButton: document.getElementById("add-home-card-btn"),
  saveButton: document.getElementById("save-display-btn"),
  saveHint: document.getElementById("display-save-hint"),
  pickerModal: document.getElementById("picker-modal"),
  pickerGrid: document.getElementById("picker-grid"),
  pickerCopy: document.getElementById("picker-copy"),
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
  boards: {
    latest: [],
    home: [],
  },
  pickerTarget: null,
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function statusToLabel(status) {
  if (status === "published") {
    return "PUBLISHED";
  }
  if (status === "archived") {
    return "ARCHIVED";
  }
  return "DRAFT";
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

function buildLatestCard(post) {
  return `
    <article class="post-card display-card" draggable="true" data-slug="${escapeHtml(post.slug)}">
      <button class="trash-button" type="button" data-trash-slug="${escapeHtml(post.slug)}" aria-label="Remove display">
        ${createTrashIcon()}
      </button>
      <div class="post-meta">
        <span class="tag">${escapeHtml(post.slug)}</span>
        <span class="date">${escapeHtml(post.publishedAt || "--")}</span>
      </div>
      <h4>${escapeHtml(post.title)}</h4>
      <p>${escapeHtml(post.summary || "还没有摘要。")}</p>
    </article>
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

function renderBoard(boardName) {
  const grid = boardName === "latest" ? ui.latestGrid : ui.homeGrid;
  const slotCount = boardName === "latest" ? LATEST_SLOT_COUNT : HOME_SLOT_COUNT;
  const slots = state.boards[boardName];

  grid.innerHTML = "";

  for (let index = 0; index < slotCount; index += 1) {
    const slot = document.createElement("div");
    slot.className = "display-slot";
    slot.dataset.board = boardName;
    slot.dataset.index = String(index);

    const slug = slots[index];
    const post = slug ? getPostBySlug(slug) : null;

    if (post) {
      slot.innerHTML = boardName === "latest" ? buildLatestCard(post) : buildHomeCard(post);
    } else {
      slot.innerHTML = `<div class="slot-empty">空位<br />可把文章拖到这里，或从右上角新增展示窗口。</div>`;
    }

    grid.appendChild(slot);
  }
}

function renderBoards() {
  renderBoard("latest");
  renderBoard("home");
}

function moveCardWithinBoard(boardName, fromIndex, toIndex) {
  if (fromIndex === toIndex) {
    return;
  }

  const next = [...state.boards[boardName]];
  const temp = next[fromIndex];
  next[fromIndex] = next[toIndex];
  next[toIndex] = temp;
  state.boards[boardName] = next;
  renderBoards();
}

function removeCard(boardName, slug) {
  state.boards[boardName] = state.boards[boardName].map((item) => (item === slug ? null : item));
  renderBoards();
}

function openPicker(boardName) {
  state.pickerTarget = boardName;
  ui.pickerCopy.textContent =
    boardName === "latest"
      ? "选择一篇文章放入 blog 首页的 Latest Entries 展示区。"
      : "选择一篇文章放入 home 页的 Mission Board 展示区。";

  const used = new Set(state.boards[boardName].filter(Boolean));

  ui.pickerGrid.innerHTML = state.posts
    .map((post) => {
      const disabled = used.has(post.slug);
      return `
        <button class="picker-item" type="button" data-pick-slug="${escapeHtml(post.slug)}"${disabled ? " disabled" : ""}>
          <div class="article-card-head">
            <h3>${escapeHtml(post.title)}</h3>
            <span class="status-badge ${post.status}">${escapeHtml(statusToLabel(post.status))}</span>
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
  state.pickerTarget = null;
  ui.pickerModal.hidden = true;
}

function addCardToBoard(boardName, slug) {
  const next = [...state.boards[boardName]];
  const emptyIndex = next.findIndex((item) => item === null);

  if (emptyIndex < 0) {
    setSaveHint(boardName === "latest" ? "Blog 展示区已满，需要先移除一个窗口。" : "Home 展示区已满，需要先移除一个窗口。");
    return;
  }

  next[emptyIndex] = slug;
  state.boards[boardName] = next;
  renderBoards();
  setSaveHint("展示窗口已加入，调整顺序后记得保存布局。");
}

function bindBoardInteractions() {
  [ui.latestGrid, ui.homeGrid].forEach((grid) => {
    grid.addEventListener("dragstart", (event) => {
      const card = event.target.closest("[data-slug]");
      const slot = event.target.closest(".display-slot");

      if (!card || !slot || !event.dataTransfer) {
        return;
      }

      event.dataTransfer.setData(
        "text/plain",
        JSON.stringify({
          board: slot.dataset.board,
          index: Number(slot.dataset.index),
        })
      );
      event.dataTransfer.effectAllowed = "move";
    });

    grid.addEventListener("dragover", (event) => {
      const slot = event.target.closest(".display-slot");
      if (!slot) {
        return;
      }

      event.preventDefault();
      slot.classList.add("is-over");
    });

    grid.addEventListener("dragleave", (event) => {
      const slot = event.target.closest(".display-slot");
      if (slot) {
        slot.classList.remove("is-over");
      }
    });

    grid.addEventListener("drop", (event) => {
      const slot = event.target.closest(".display-slot");
      if (!slot || !event.dataTransfer) {
        return;
      }

      event.preventDefault();
      slot.classList.remove("is-over");

      const raw = event.dataTransfer.getData("text/plain");
      if (!raw) {
        return;
      }

      try {
        const payload = JSON.parse(raw);
        const targetBoard = slot.dataset.board;
        const targetIndex = Number(slot.dataset.index);

        if (payload.board !== targetBoard) {
          setSaveHint("目前只支持在同一个展示区内部拖动排序。");
          return;
        }

        moveCardWithinBoard(targetBoard, payload.index, targetIndex);
        setSaveHint("展示顺序已调整，保存后会同步到前台。");
      } catch (error) {
        console.warn("Unable to parse drag payload.", error);
      }
    });

    grid.addEventListener("click", (event) => {
      const trashButton = event.target.closest("[data-trash-slug]");
      if (!trashButton) {
        return;
      }

      const slot = trashButton.closest(".display-slot");
      if (!slot) {
        return;
      }

      removeCard(slot.dataset.board, trashButton.dataset.trashSlug);
      setSaveHint("展示窗口已移除，保存后会同步这次变更。");
    });
  });
}

async function saveBoards() {
  const payload = {
    featured_latest: state.boards.latest.filter(Boolean),
    featured_home: state.boards.home.filter(Boolean),
    mission_notes_title: state.settings.mission_notes_title,
    mission_notes_items: state.settings.mission_notes_items,
  };

  const response = await window.GellowContentApi.saveSettings(payload);
  state.settings = window.GellowContentApi.normalizeSettings(response.settings || {});
  state.boards.latest = toSlotArray(state.settings.featured_latest, LATEST_SLOT_COUNT);
  state.boards.home = toSlotArray(state.settings.featured_home, HOME_SLOT_COUNT);
  renderBoards();
}

async function loadDisplayData() {
  const payload = await window.GellowContentApi.fetchAdminContent();
  state.posts = window.GellowContentApi.sortPosts(Array.isArray(payload.posts) ? payload.posts : []);
  state.settings = window.GellowContentApi.normalizeSettings(payload.settings || {});
  state.boards.latest = toSlotArray(state.settings.featured_latest, LATEST_SLOT_COUNT);
  state.boards.home = toSlotArray(state.settings.featured_home, HOME_SLOT_COUNT);
  renderBoards();
}

async function initDisplayConsole() {
  setSaveHint("正在读取当前展示布局...");

  bindBoardInteractions();

  ui.addLatestButton.addEventListener("click", () => openPicker("latest"));
  ui.addHomeButton.addEventListener("click", () => openPicker("home"));
  ui.pickerCloseButton.addEventListener("click", closePicker);
  ui.pickerModal.addEventListener("click", (event) => {
    if (event.target === ui.pickerModal) {
      closePicker();
    }
  });
  ui.pickerGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-pick-slug]");
    if (!button || !state.pickerTarget) {
      return;
    }

    addCardToBoard(state.pickerTarget, button.dataset.pickSlug);
    closePicker();
  });
  ui.saveButton.addEventListener("click", async () => {
    try {
      await saveBoards();
      setSaveHint("展示布局已保存，blog 和 home 页面会读取新的顺序。");
    } catch (error) {
      setSaveHint(`保存失败：${error.message}`);
      console.warn("Unable to save display boards.", error);
    }
  });

  try {
    await loadDisplayData();
    setSaveHint("展示布局已载入，可以继续拖动和保存。");
  } catch (error) {
    renderBoards();
    setSaveHint(`加载失败：${error.message}`);
    console.warn("Unable to initialize display console.", error);
  }
}

void initDisplayConsole();
