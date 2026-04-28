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
    ui.list.innerHTML = `<div class="empty-state">No posts yet. Create a new post to start the archive.</div>`;
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
      <p>${escapeHtml(post.summary || "No summary yet.")}</p>
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
  setSaveHint("Selected post loaded for editing.");
}

function resetToDraft() {
  state.selectedId = null;
  fillForm(createEmptyPost());
  renderList();
  updateDeleteButton();
  setSaveHint("Draft mode ready. Save to create a new post.");
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
    setSaveHint("Post saved. Front-end pages will read the updated content after refresh.");
    setSettingsHint("Slug references in the display console have been synced.");
  } catch (error) {
    setSaveHint(`Save failed: ${error.message}`);
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
    setSaveHint("Post deleted. Related display references were removed too.");
    setSettingsHint("Display settings were updated after the delete action.");

    if (state.posts.length) {
      selectPost(state.posts[0].id);
    } else {
      resetToDraft();
    }
  } catch (error) {
    setSaveHint(`Delete failed: ${error.message}`);
    console.warn("Unable to delete article.", error);
  }
}

async function handleCommandSave(event) {
  event.preventDefault();

  try {
    await persistCurrentSettings();
    setSettingsHint("Command cache settings saved.");
  } catch (error) {
    setSettingsHint(`Save failed: ${error.message}`);
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
  setSaveHint("Loading posts...");
  setSettingsHint("Loading command settings...");

  ui.form.addEventListener("submit", handleArticleSave);
  ui.commandForm.addEventListener("submit", handleCommandSave);
  ui.newButton.addEventListener("click", resetToDraft);
  ui.resetButton.addEventListener("click", () => {
    const post = getSelectedPost();
    if (post) {
      fillForm(post);
      setSaveHint("Form reset to the selected post.");
      return;
    }

    resetToDraft();
  });
  ui.deleteButton.addEventListener("click", () => {
    void handleDeletePost();
  });

  try {
    await loadConsoleData();
    setSaveHint("Content api connected. Post editing is ready.");
    setSettingsHint("Command settings loaded.");
  } catch (error) {
    resetToDraft();
    ui.list.innerHTML = `<div class="empty-state">Console load failed: ${escapeHtml(error.message)}</div>`;
    setSaveHint(`Load failed: ${error.message}`);
    setSettingsHint("Command settings are unavailable right now.");
    console.warn("Unable to initialize notes console.", error);
  }
}

void initNotesConsole();
