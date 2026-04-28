const ui = {
  list: document.getElementById("article-list"),
  form: document.getElementById("article-form"),
  newButton: document.getElementById("new-article-btn"),
  resetButton: document.getElementById("reset-form-btn"),
  deleteButton: document.getElementById("delete-article-btn"),
  saveHint: document.getElementById("save-hint"),
  settingsSaveHint: document.getElementById("settings-save-hint"),
  commandForm: document.getElementById("command-settings-form"),
  title: document.getElementById("article-title"),
  slug: document.getElementById("article-slug"),
  status: document.getElementById("article-status"),
  date: document.getElementById("article-date"),
  summary: document.getElementById("article-summary"),
  content: document.getElementById("article-content"),
  missionNotesTitleInput: document.getElementById("mission-notes-title-input"),
  missionNotesItemsInput: document.getElementById("mission-notes-items-input"),
};

const state = {
  posts: [],
  selectedId: null,
  settings: {
    featured_latest: [],
    featured_home: [],
    mission_notes_title: "Command Cache",
    mission_notes_items: [],
  },
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

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function createEmptyPost() {
  return {
    id: null,
    title: "Untitled Draft",
    slug: "new-post-slug",
    status: "draft",
    summary: "",
    content: "",
    publishedAt: getTodayString(),
    updatedAt: "",
  };
}

function getSelectedPost() {
  return state.posts.find((post) => post.id === state.selectedId) || null;
}

function setSaveHint(text) {
  ui.saveHint.textContent = text;
}

function setSettingsHint(text) {
  ui.settingsSaveHint.textContent = text;
}

function renderList() {
  ui.list.innerHTML = "";

  if (!state.posts.length) {
    ui.list.innerHTML = `<div class="empty-state">当前还没有文章，可以先新建一篇作为归档入口。</div>`;
    return;
  }

  state.posts.forEach((post) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `article-card${post.id === state.selectedId ? " is-active" : ""}`;
    button.innerHTML = `
      <div class="article-card-head">
        <h3>${escapeHtml(post.title)}</h3>
        <span class="status-badge ${post.status}">${escapeHtml(statusToLabel(post.status))}</span>
      </div>
      <p>${escapeHtml(post.summary || "还没有摘要。")}</p>
      <div class="meta-line">${escapeHtml(post.slug)} · ${escapeHtml(post.publishedAt || "--")}</div>
    `;
    button.addEventListener("click", () => selectPost(post.id));
    ui.list.appendChild(button);
  });
}

function fillForm(post) {
  ui.title.value = post.title || "";
  ui.slug.value = post.slug || "";
  ui.status.value = post.status || "draft";
  ui.date.value = post.publishedAt || getTodayString();
  ui.summary.value = post.summary || "";
  ui.content.value = post.content || "";
}

function updateDeleteButton() {
  ui.deleteButton.disabled = !state.selectedId;
}

function selectPost(postId) {
  state.selectedId = postId;
  const post = getSelectedPost();

  if (!post) {
    return;
  }

  fillForm(post);
  renderList();
  updateDeleteButton();
  setSaveHint("已载入选中文章，可以继续修改。");
}

function resetToDraft() {
  state.selectedId = null;
  fillForm(createEmptyPost());
  renderList();
  updateDeleteButton();
  setSaveHint("新建模式已就绪，保存后会创建新的文章。");
}

function fillSettingsForm() {
  ui.missionNotesTitleInput.value = state.settings.mission_notes_title;
  ui.missionNotesItemsInput.value = state.settings.mission_notes_items.join("\n");
}

function removeSlugFromSettings(slug) {
  state.settings.featured_latest = state.settings.featured_latest.filter((item) => item !== slug);
  state.settings.featured_home = state.settings.featured_home.filter((item) => item !== slug);
}

function syncSelectionsAfterSlugChange(oldSlug, newSlug) {
  if (!oldSlug || oldSlug === newSlug) {
    return;
  }

  state.settings.featured_latest = state.settings.featured_latest.map((slug) =>
    slug === oldSlug ? newSlug : slug
  );
  state.settings.featured_home = state.settings.featured_home.map((slug) =>
    slug === oldSlug ? newSlug : slug
  );
}

function getPostPayload() {
  return {
    id: state.selectedId,
    title: ui.title.value.trim() || "未命名草稿",
    slug: ui.slug.value.trim() || "new-post-slug",
    status: ui.status.value,
    publishedAt: ui.date.value || getTodayString(),
    summary: ui.summary.value.trim(),
    content: ui.content.value.trim(),
  };
}

function syncPostState(savedPost) {
  const index = state.posts.findIndex((post) => post.id === savedPost.id);
  if (index >= 0) {
    state.posts.splice(index, 1, savedPost);
  } else {
    state.posts.unshift(savedPost);
  }

  state.posts = window.GellowContentApi.sortPosts(state.posts);
}

async function persistCurrentSettings() {
  const payload = {
    featured_latest: state.settings.featured_latest,
    featured_home: state.settings.featured_home,
    mission_notes_title: ui.missionNotesTitleInput.value.trim() || "Command Cache",
    mission_notes_items: ui.missionNotesItemsInput.value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean),
  };

  const response = await window.GellowContentApi.saveSettings(payload);
  state.settings = window.GellowContentApi.normalizeSettings(response.settings || {});
  fillSettingsForm();
}

async function handleArticleSave(event) {
  event.preventDefault();

  const previousPost = getSelectedPost();

  try {
    const response = await window.GellowContentApi.savePost(getPostPayload());
    const savedPost = response.post;

    if (previousPost) {
      syncSelectionsAfterSlugChange(previousPost.slug, savedPost.slug);
    }

    syncPostState(savedPost);
    state.selectedId = savedPost.id;
    fillForm(savedPost);
    renderList();
    updateDeleteButton();
    await persistCurrentSettings();
    setSaveHint("文章已保存，刷新前台页面后会读取新的内容。");
    setSettingsHint("展示控制台中的 slug 引用也已经同步更新。");
    showFeedback("Post Saved", "System Notice", "success");
  } catch (error) {
    setSaveHint(`保存失败：${error.message}`);
    showFeedback("Post Save Failed", "System Notice", "error");
    console.warn("Unable to save article.", error);
  }
}

async function handleDeletePost() {
  const post = getSelectedPost();
  if (!post) {
    return;
  }

  try {
    await window.GellowContentApi.deletePost(post.id);
    removeSlugFromSettings(post.slug);
    state.posts = state.posts.filter((item) => item.id !== post.id);
    await persistCurrentSettings();
    renderList();
    setSaveHint("文章已删除，相关展示引用也已一并移除。");
    setSettingsHint("展示配置已经同步更新。");
    showFeedback("Post Deleted", "System Notice", "success");

    if (state.posts.length) {
      selectPost(state.posts[0].id);
    } else {
      resetToDraft();
    }
  } catch (error) {
    setSaveHint(`删除失败：${error.message}`);
    showFeedback("Post Delete Failed", "System Notice", "error");
    console.warn("Unable to delete article.", error);
  }
}

async function handleCommandSave(event) {
  event.preventDefault();

  try {
    await persistCurrentSettings();
    setSettingsHint("命令缓存设置已保存。");
    showFeedback("Command Settings Saved", "System Notice", "success");
  } catch (error) {
    setSettingsHint(`保存失败：${error.message}`);
    showFeedback("Command Settings Save Failed", "System Notice", "error");
    console.warn("Unable to save command settings.", error);
  }
}

async function loadConsoleData() {
  const payload = await window.GellowContentApi.fetchAdminContent();
  state.posts = window.GellowContentApi.sortPosts(Array.isArray(payload.posts) ? payload.posts : []);
  state.settings = window.GellowContentApi.normalizeSettings(payload.settings || {});
  renderList();
  fillSettingsForm();

  if (state.posts.length) {
    selectPost(state.posts[0].id);
  } else {
    resetToDraft();
  }
}

async function initNotesConsole() {
  setSaveHint("正在读取文章列表...");
  setSettingsHint("正在读取命令缓存设置...");

  ui.form.addEventListener("submit", handleArticleSave);
  ui.commandForm.addEventListener("submit", handleCommandSave);
  ui.newButton.addEventListener("click", resetToDraft);
  ui.resetButton.addEventListener("click", () => {
    const post = getSelectedPost();
    if (post) {
      fillForm(post);
      setSaveHint("表单已重置到当前选中文章。");
      return;
    }

    resetToDraft();
  });
  ui.deleteButton.addEventListener("click", () => {
    void handleDeletePost();
  });

  try {
    await loadConsoleData();
    setSaveHint("内容接口已连接，可以开始编辑文章。");
    setSettingsHint("命令缓存设置已载入。");
  } catch (error) {
    resetToDraft();
    ui.list.innerHTML = `<div class="empty-state">控制台加载失败：${escapeHtml(error.message)}</div>`;
    setSaveHint(`加载失败：${error.message}`);
    setSettingsHint("命令缓存设置暂时无法读取。");
    console.warn("Unable to initialize notes console.", error);
  }
}

void initNotesConsole();
