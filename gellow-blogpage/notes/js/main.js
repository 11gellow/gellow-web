const MAX_FEATURED_LATEST = 3;
const MAX_FEATURED_HOME = 4;

const ui = {
  list: document.getElementById("article-list"),
  form: document.getElementById("article-form"),
  newButton: document.getElementById("new-article-btn"),
  resetButton: document.getElementById("reset-form-btn"),
  deleteButton: document.getElementById("delete-article-btn"),
  saveHint: document.getElementById("save-hint"),
  settingsSaveHint: document.getElementById("settings-save-hint"),
  saveSettingsButton: document.getElementById("save-settings-btn"),
  title: document.getElementById("article-title"),
  slug: document.getElementById("article-slug"),
  status: document.getElementById("article-status"),
  date: document.getElementById("article-date"),
  summary: document.getElementById("article-summary"),
  content: document.getElementById("article-content"),
  previewStatus: document.getElementById("preview-status"),
  previewSlug: document.getElementById("preview-slug"),
  previewDate: document.getElementById("preview-date"),
  previewTitle: document.getElementById("preview-title"),
  previewSummary: document.getElementById("preview-summary"),
  previewContent: document.getElementById("preview-content"),
  previewReadMore: document.getElementById("preview-read-more"),
  latestSelectorList: document.getElementById("latest-selector-list"),
  homeSelectorList: document.getElementById("home-selector-list"),
  missionNotesTitleInput: document.getElementById("mission-notes-title-input"),
  missionNotesItemsInput: document.getElementById("mission-notes-items-input"),
};

const state = {
  posts: [],
  selectedId: null,
  settings: {
    featured_latest: [],
    featured_home: [],
    mission_notes_title: "常用命令速查",
    mission_notes_items: [],
  },
  draftPost: null,
};

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
    return "已发布";
  }
  if (status === "archived") {
    return "归档";
  }
  return "草稿";
}

function createEmptyPost() {
  return {
    id: null,
    slug: "new-post-slug",
    title: "未命名草稿",
    summary: "",
    content: "",
    status: "draft",
    publishedAt: getTodayString(),
    updatedAt: "",
  };
}

function getSelectedPost() {
  return state.posts.find((post) => post.id === state.selectedId) || null;
}

function getFormSnapshot() {
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

function setSaveHint(text) {
  ui.saveHint.textContent = text;
}

function setSettingsHint(text) {
  ui.settingsSaveHint.textContent = text;
}

function renderList() {
  ui.list.innerHTML = "";

  if (!state.posts.length) {
    ui.list.innerHTML = `<div class="empty-state">当前还没有文章，先从右侧新建一篇吧。</div>`;
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

function renderPreview(post) {
  ui.previewStatus.textContent = statusToLabel(post.status);
  ui.previewStatus.className = `preview-badge ${post.status}`;
  ui.previewSlug.textContent = post.slug || "demo-slug";
  ui.previewDate.textContent = post.publishedAt || getTodayString();
  ui.previewTitle.textContent = post.title || "示例标题";
  ui.previewSummary.textContent =
    post.summary || "这里会按照 blog 首页 Latest Entries 的格式展示摘要内容。";
  ui.previewContent.textContent = post.content || "正文预览会显示在这里。";
  ui.previewReadMore.href = `../blogs/post.html?slug=${encodeURIComponent(post.slug || "demo-slug")}`;
}

function updateDeleteButton() {
  ui.deleteButton.disabled = !state.selectedId;
}

function selectPost(postId) {
  state.selectedId = postId;
  state.draftPost = null;
  const post = getSelectedPost();

  if (!post) {
    return;
  }

  fillForm(post);
  renderPreview(post);
  renderList();
  updateDeleteButton();
  setSaveHint("已载入选中文章，可以直接修改并保存。");
}

function resetToDraft() {
  state.selectedId = null;
  state.draftPost = createEmptyPost();
  fillForm(state.draftPost);
  renderPreview(state.draftPost);
  renderList();
  updateDeleteButton();
  setSaveHint("新建草稿模式：填写内容后点击保存文章。");
}

function collectCheckedSlugs(container) {
  return [...container.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
}

function buildSelectorItem(post, groupName, checked) {
  return `
    <label class="selector-item">
      <input type="checkbox" name="${groupName}" value="${escapeHtml(post.slug)}"${checked ? " checked" : ""} />
      <span class="selector-copy">
        <span class="selector-title">${escapeHtml(post.title)}</span>
        <span class="selector-meta">${escapeHtml(post.slug)} · ${escapeHtml(post.publishedAt || "--")} · ${escapeHtml(statusToLabel(post.status))}</span>
      </span>
    </label>
  `;
}

function renderSelectors() {
  if (!state.posts.length) {
    ui.latestSelectorList.innerHTML = `<div class="empty-state">先创建文章，才能配置 Latest Entries。</div>`;
    ui.homeSelectorList.innerHTML = `<div class="empty-state">先创建文章，才能配置 Home 展示位。</div>`;
    return;
  }

  ui.latestSelectorList.innerHTML = state.posts
    .map((post) =>
      buildSelectorItem(
        post,
        "featured-latest",
        state.settings.featured_latest.includes(post.slug)
      )
    )
    .join("");

  ui.homeSelectorList.innerHTML = state.posts
    .map((post) =>
      buildSelectorItem(
        post,
        "featured-home",
        state.settings.featured_home.includes(post.slug)
      )
    )
    .join("");
}

function fillSettingsForm() {
  ui.missionNotesTitleInput.value = state.settings.mission_notes_title;
  ui.missionNotesItemsInput.value = state.settings.mission_notes_items.join("\n");
  renderSelectors();
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

function removeSlugFromSettings(slug) {
  state.settings.featured_latest = state.settings.featured_latest.filter((item) => item !== slug);
  state.settings.featured_home = state.settings.featured_home.filter((item) => item !== slug);
}

function syncPostState(savedPost) {
  const index = state.posts.findIndex((post) => post.id === savedPost.id);
  if (index >= 0) {
    state.posts.splice(index, 1, savedPost);
  } else {
    state.posts.unshift(savedPost);
  }

  state.posts.sort((left, right) => {
    const leftTime = Date.parse(left.updatedAt || left.publishedAt || 0);
    const rightTime = Date.parse(right.updatedAt || right.publishedAt || 0);
    return rightTime - leftTime;
  });
}

function handleSelectorLimit(container, maxCount, message) {
  const checked = collectCheckedSlugs(container);
  if (checked.length <= maxCount) {
    setSettingsHint(message);
    return;
  }

  const lastChecked = container.querySelector('input[type="checkbox"]:checked:last-of-type');
  if (lastChecked) {
    lastChecked.checked = false;
  }
}

function bindSelectorGuards() {
  ui.latestSelectorList.addEventListener("change", (event) => {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }

    const checked = collectCheckedSlugs(ui.latestSelectorList);
    if (checked.length > MAX_FEATURED_LATEST) {
      event.target.checked = false;
      setSettingsHint("Latest Entries 最多只能选择 3 篇。");
      return;
    }

    setSettingsHint("Latest Entries 的展示项已更新，记得点击“保存设置”。");
  });

  ui.homeSelectorList.addEventListener("change", (event) => {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }

    const checked = collectCheckedSlugs(ui.homeSelectorList);
    if (checked.length > MAX_FEATURED_HOME) {
      event.target.checked = false;
      setSettingsHint("Home 的 Mission Board 最多只能选择 4 篇。");
      return;
    }

    setSettingsHint("Home 展示位已更新，记得点击“保存设置”。");
  });
}

async function persistSettings() {
  const featuredLatest = collectCheckedSlugs(ui.latestSelectorList);
  const featuredHome = collectCheckedSlugs(ui.homeSelectorList);
  const missionNotesTitle = ui.missionNotesTitleInput.value.trim() || "常用命令速查";
  const missionNotesItems = ui.missionNotesItemsInput.value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (featuredLatest.length > MAX_FEATURED_LATEST) {
    throw new Error("Latest Entries 最多只能保存 3 篇。");
  }

  if (featuredHome.length > MAX_FEATURED_HOME) {
    throw new Error("Home 的 Mission Board 最多只能保存 4 篇。");
  }

  const payload = {
    featured_latest: featuredLatest,
    featured_home: featuredHome,
    mission_notes_title: missionNotesTitle,
    mission_notes_items: missionNotesItems,
  };

  const response = await window.GellowContentApi.saveSettings(payload);
  state.settings = window.GellowContentApi.normalizeSettings(response.settings || {});
  fillSettingsForm();
}

async function loadAdminContent(selectPostId) {
  const payload = await window.GellowContentApi.fetchAdminContent();
  state.posts = window.GellowContentApi.sortPosts(Array.isArray(payload.posts) ? payload.posts : []);
  state.settings = window.GellowContentApi.normalizeSettings(payload.settings || {});
  renderList();
  fillSettingsForm();

  if (selectPostId) {
    selectPost(selectPostId);
    return;
  }

  if (state.selectedId) {
    const selected = getSelectedPost();
    if (selected) {
      selectPost(selected.id);
      return;
    }
  }

  if (state.posts.length) {
    selectPost(state.posts[0].id);
    return;
  }

  resetToDraft();
}

async function handleArticleSave(event) {
  event.preventDefault();

  const currentPost = getSelectedPost();
  const snapshot = getFormSnapshot();

  try {
    const response = await window.GellowContentApi.savePost(snapshot);
    const savedPost = response.post;

    if (currentPost) {
      syncSelectionsAfterSlugChange(currentPost.slug, savedPost.slug);
      await window.GellowContentApi.saveSettings(state.settings);
    }

    syncPostState(savedPost);
    state.selectedId = savedPost.id;
    state.draftPost = null;
    renderList();
    fillSettingsForm();
    fillForm(savedPost);
    renderPreview(savedPost);
    updateDeleteButton();
    setSaveHint("文章已保存，前台读取到新数据后就会同步更新。");
    setSettingsHint("如果你改了 slug，展示位配置也已经同步更新。");
  } catch (error) {
    setSaveHint(`保存失败：${error.message}`);
    console.warn("Unable to save post.", error);
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
    await window.GellowContentApi.saveSettings(state.settings);
    state.posts = state.posts.filter((item) => item.id !== post.id);
    renderList();
    fillSettingsForm();
    setSaveHint("文章已删除，对应展示位里的引用也一并清掉了。");
    setSettingsHint("文章删除完成，相关展示配置已同步。");

    if (state.posts.length) {
      selectPost(state.posts[0].id);
    } else {
      resetToDraft();
    }
  } catch (error) {
    setSaveHint(`删除失败：${error.message}`);
    console.warn("Unable to delete post.", error);
  }
}

function handleLivePreview() {
  renderPreview(getFormSnapshot());
}

async function initNotesConsole() {
  setSaveHint("正在加载文章和配置...");
  setSettingsHint("正在读取展示配置...");

  ui.form.addEventListener("submit", handleArticleSave);
  ui.newButton.addEventListener("click", resetToDraft);
  ui.resetButton.addEventListener("click", () => {
    const selected = getSelectedPost();
    if (selected) {
      fillForm(selected);
      renderPreview(selected);
      setSaveHint("表单已重置为当前选中文章。");
      return;
    }

    resetToDraft();
  });
  ui.deleteButton.addEventListener("click", () => {
    void handleDeletePost();
  });
  ui.saveSettingsButton.addEventListener("click", async () => {
    try {
      await persistSettings();
      setSettingsHint("展示配置已保存，blog 首页和 home 页面会读取新的展示结果。");
    } catch (error) {
      setSettingsHint(`设置保存失败：${error.message}`);
      console.warn("Unable to save settings.", error);
    }
  });

  [ui.title, ui.slug, ui.status, ui.date, ui.summary, ui.content].forEach((field) => {
    field.addEventListener("input", handleLivePreview);
  });

  bindSelectorGuards();

  try {
    await loadAdminContent();
    setSaveHint("内容接口已连接，可以开始编辑文章。");
    setSettingsHint("配置已载入，修改后点击“保存设置”即可。");
  } catch (error) {
    resetToDraft();
    ui.list.innerHTML = `<div class="empty-state">控制台加载失败：${escapeHtml(error.message)}</div>`;
    setSaveHint(`加载失败：${error.message}`);
    setSettingsHint("当前无法读取展示配置，请先确认后端已启动。");
    console.warn("Unable to initialize notes console.", error);
  }
}

void initNotesConsole();
