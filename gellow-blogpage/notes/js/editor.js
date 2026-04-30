const ui = {
  form: document.getElementById("article-form"),
  deleteButton: document.getElementById("delete-article-btn"),
  saveHint: document.getElementById("save-hint"),
  title: document.getElementById("article-title"),
  slug: document.getElementById("article-slug"),
  status: document.getElementById("article-status"),
  date: document.getElementById("article-date"),
  summary: document.getElementById("article-summary"),
  content: document.getElementById("article-content"),
  toolbar: document.getElementById("editor-toolbar"),
};

const state = {
  posts: [],
  currentId: null,
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

function setSaveHint(text) {
  ui.saveHint.textContent = text;
}

function getQueryId() {
  const params = new URLSearchParams(window.location.search);
  const rawId = params.get("id");
  const mode = params.get("mode");

  if (mode === "new" || !rawId) {
    return null;
  }

  const id = Number(rawId);
  return Number.isFinite(id) ? id : null;
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
  return state.posts.find((post) => post.id === state.currentId) || null;
}

function looksLikeHtml(content) {
  return /<\/?[a-z][\s\S]*>/i.test(String(content || ""));
}

function plainTextToHtml(content) {
  if (!content) {
    return "";
  }

  return String(content)
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`)
    .join("");
}

function contentToEditorHtml(content) {
  const source = String(content || "");
  if (!source.trim()) {
    return "";
  }
  if (looksLikeHtml(source)) {
    return source;
  }
  return plainTextToHtml(source);
}

function fillForm(post) {
  ui.title.value = post.title || "";
  ui.slug.value = post.slug || "";
  ui.status.value = post.status || "draft";
  ui.date.value = post.publishedAt || getTodayString();
  ui.summary.value = post.summary || "";
  ui.content.innerHTML = contentToEditorHtml(post.content);
}

function focusEditorToEnd() {
  ui.content.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(ui.content);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function insertHtmlAtCaret(html) {
  ui.content.focus();
  const selection = window.getSelection();

  if (!selection || !selection.rangeCount || !ui.content.contains(selection.anchorNode)) {
    focusEditorToEnd();
  }

  const activeSelection = window.getSelection();
  const range = activeSelection.getRangeAt(0);
  range.deleteContents();

  const temp = document.createElement("template");
  temp.innerHTML = html;
  const fragment = temp.content;
  const lastNode = fragment.lastChild;

  range.insertNode(fragment);

  if (lastNode) {
    const nextRange = document.createRange();
    nextRange.setStartAfter(lastNode);
    nextRange.collapse(true);
    activeSelection.removeAllRanges();
    activeSelection.addRange(nextRange);
  }
}

function normalizeEmbedUrl(url) {
  const value = String(url || "").trim();
  if (!value) {
    return "";
  }

  try {
    const parsed = new URL(value);
    if (parsed.hostname.includes("youtube.com") && parsed.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${parsed.searchParams.get("v")}`;
    }
    if (parsed.hostname === "youtu.be") {
      return `https://www.youtube.com/embed/${parsed.pathname.replaceAll("/", "")}`;
    }
    return parsed.toString();
  } catch (error) {
    return value;
  }
}

function handleToolbarAction(action) {
  if (action === "paragraph") {
    insertHtmlAtCaret("<p>New paragraph</p>");
    return;
  }

  if (action === "heading") {
    insertHtmlAtCaret("<h2>Section Title</h2>");
    return;
  }

  if (action === "quote") {
    insertHtmlAtCaret("<blockquote>Quote</blockquote>");
    return;
  }

  if (action === "list") {
    insertHtmlAtCaret("<ul><li>List item</li><li>List item</li></ul>");
    return;
  }

  if (action === "divider") {
    insertHtmlAtCaret("<hr />");
    return;
  }

  if (action === "link") {
    const href = window.prompt("Link URL");
    if (!href) {
      return;
    }
    const text = window.prompt("Link Text", href) || href;
    insertHtmlAtCaret(
      `<p><a href="${escapeHtml(normalizeEmbedUrl(href))}" target="_blank" rel="noopener noreferrer">${escapeHtml(
        text
      )}</a></p>`
    );
    return;
  }

  if (action === "image") {
    const src = window.prompt("Image URL");
    if (!src) {
      return;
    }
    const caption = window.prompt("Caption (optional)", "") || "";
    insertHtmlAtCaret(`
      <figure>
        <img src="${escapeHtml(src)}" alt="${escapeHtml(caption || "Image")}" />
        ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}
      </figure>
    `);
    return;
  }

  if (action === "video") {
    const src = window.prompt("Video URL");
    if (!src) {
      return;
    }

    const normalized = normalizeEmbedUrl(src);
    const isDirectVideo = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(normalized);

    if (isDirectVideo) {
      insertHtmlAtCaret(`
        <figure>
          <video controls preload="metadata" src="${escapeHtml(normalized)}"></video>
        </figure>
      `);
      return;
    }

    insertHtmlAtCaret(`
      <figure>
        <iframe
          src="${escapeHtml(normalized)}"
          loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen
        ></iframe>
      </figure>
    `);
    return;
  }

  if (action === "html") {
    const snippet = window.prompt("HTML Snippet");
    if (!snippet) {
      return;
    }
    insertHtmlAtCaret(snippet);
  }
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

async function persistCurrentSettings() {
  const response = await window.GellowContentApi.saveSettings({
    featured_latest: state.settings.featured_latest,
    featured_home: state.settings.featured_home,
    mission_notes_title: state.settings.mission_notes_title,
    mission_notes_items: state.settings.mission_notes_items,
  });

  state.settings = window.GellowContentApi.normalizeSettings(response.settings || {});
}

function getPostPayload() {
  return {
    id: state.currentId,
    title: ui.title.value.trim() || "未命名草稿",
    slug: ui.slug.value.trim() || "new-post-slug",
    status: ui.status.value,
    publishedAt: ui.date.value || getTodayString(),
    summary: ui.summary.value,
    content: ui.content.innerHTML,
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

async function handleSave(event) {
  event.preventDefault();
  const previousPost = getSelectedPost();

  try {
    const response = await window.GellowContentApi.savePost(getPostPayload());
    const savedPost = response.post;

    if (previousPost) {
      syncSelectionsAfterSlugChange(previousPost.slug, savedPost.slug);
    }

    syncPostState(savedPost);
    state.currentId = savedPost.id;
    fillForm(savedPost);
    await persistCurrentSettings();
    window.history.replaceState({}, "", `./editor.html?id=${encodeURIComponent(savedPost.id)}`);
    document.title = `${savedPost.title} | Gellow Post Editor`;
    setSaveHint("文章已保存。");
    showFeedback("Post Saved", "System Notice", "success");
  } catch (error) {
    setSaveHint(`保存失败：${error.message}`);
    showFeedback("Post Save Failed", "System Notice", "error");
    console.warn("Unable to save post.", error);
  }
}

async function handleDelete() {
  const post = getSelectedPost();

  if (!post) {
    setSaveHint("当前是新文章草稿，无需删除。");
    showFeedback("No Saved Post", "System Notice", "error");
    return;
  }

  try {
    await window.GellowContentApi.deletePost(post.id);
    removeSlugFromSettings(post.slug);
    await persistCurrentSettings();
    showFeedback("Post Deleted", "System Notice", "success");
    window.location.href = "./index.html";
  } catch (error) {
    setSaveHint(`删除失败：${error.message}`);
    showFeedback("Post Delete Failed", "System Notice", "error");
    console.warn("Unable to delete post.", error);
  }
}

async function loadEditorData() {
  const payload = await window.GellowContentApi.fetchAdminContent();
  state.posts = window.GellowContentApi.sortPosts(Array.isArray(payload.posts) ? payload.posts : []);
  state.settings = window.GellowContentApi.normalizeSettings(payload.settings || {});

  const queryId = getQueryId();
  const selectedPost = state.posts.find((post) => post.id === queryId) || createEmptyPost();
  state.currentId = selectedPost.id;
  fillForm(selectedPost);
  document.title = `${selectedPost.title || "New Post"} | Gellow Post Editor`;
}

function bindEditorEvents() {
  ui.form.addEventListener("submit", handleSave);
  ui.deleteButton.addEventListener("click", () => {
    void handleDelete();
  });
  ui.toolbar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) {
      return;
    }
    handleToolbarAction(button.dataset.action);
  });
}

async function initEditor() {
  setSaveHint("正在读取文章...");
  bindEditorEvents();

  try {
    await loadEditorData();
    setSaveHint(state.currentId ? "文章已载入。" : "新文章草稿已就绪。");
  } catch (error) {
    fillForm(createEmptyPost());
    state.currentId = null;
    setSaveHint(`加载失败：${error.message}`);
    console.warn("Unable to initialize post editor.", error);
  }
}

void initEditor();
