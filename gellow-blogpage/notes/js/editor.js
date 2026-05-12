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
  attachmentInput: document.getElementById("attachment-input"),
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

const BLOCK_SELECTOR = "p, h1, h2, h3, ul, ol, blockquote, figure, hr";
const MAX_ATTACHMENT_SIZE = 3 * 1024 * 1024;

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

function formatFileSize(bytes) {
  const value = Number(bytes || 0);

  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getAttachmentBadgeLabel(attachment) {
  const filename = String(attachment.filename || "");
  const ext = filename.includes(".") ? filename.split(".").pop().toUpperCase() : "";
  if (ext) {
    return ext.slice(0, 4);
  }

  if (attachment.kind === "audio") {
    return "MP3";
  }
  if (attachment.kind === "pdf") {
    return "PDF";
  }
  if (attachment.kind === "video") {
    return "VID";
  }
  if (attachment.kind === "image") {
    return "IMG";
  }

  return "FILE";
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

function getSelectionRange() {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || !ui.content.contains(selection.anchorNode)) {
    return null;
  }
  return selection.getRangeAt(0);
}

function getCurrentBlock(node) {
  if (!node) {
    return null;
  }

  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  return element ? element.closest(BLOCK_SELECTOR) : null;
}

function placeCaretInside(node) {
  if (!node) {
    focusEditorToEnd();
    return;
  }

  ui.content.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  const firstTextNode = walker.nextNode();

  if (firstTextNode) {
    range.setStart(firstTextNode, firstTextNode.textContent.length);
  } else {
    range.selectNodeContents(node);
    range.collapse(false);
  }

  selection.removeAllRanges();
  selection.addRange(range);
}

function insertBlockHtml(html, options = {}) {
  const { placeInside = true } = options;
  ui.content.focus();

  const temp = document.createElement("template");
  temp.innerHTML = html.trim();
  const fragment = temp.content;
  const insertedNodes = Array.from(fragment.childNodes);
  const firstInsertedNode = insertedNodes.find((node) => node.nodeType === Node.ELEMENT_NODE) || insertedNodes[0];

  const range = getSelectionRange();
  const currentBlock = range ? getCurrentBlock(range.startContainer) : null;

  if (currentBlock && currentBlock.parentNode === ui.content) {
    currentBlock.after(fragment);
  } else {
    ui.content.appendChild(fragment);
  }

  if (placeInside) {
    placeCaretInside(firstInsertedNode);
  } else {
    focusEditorToEnd();
  }
}

function insertTextAsParagraphs(text) {
  const normalized = String(text || "").replace(/\r\n/g, "\n");
  const chunks = normalized.split(/\n{2,}/).filter((chunk) => chunk.length > 0);

  if (!chunks.length) {
    return;
  }

  const html = chunks
    .map((chunk) => `<p>${escapeHtml(chunk).replaceAll("\n", "<br />")}</p>`)
    .join("");

  insertBlockHtml(html);
}

function buildAttachmentCardHtml(attachment) {
  return `
    <figure class="attachment-block attachment-block-file" contenteditable="false">
      <a
        class="attachment-card"
        href="${escapeHtml(attachment.url)}"
        target="_blank"
        rel="noopener noreferrer"
        data-file-kind="${escapeHtml(attachment.kind)}"
      >
        <span class="attachment-icon">${escapeHtml(getAttachmentBadgeLabel(attachment))}</span>
        <span class="attachment-body">
          <span class="attachment-name">${escapeHtml(attachment.filename)}</span>
          <span class="attachment-meta">${escapeHtml(formatFileSize(attachment.size))}</span>
        </span>
      </a>
    </figure>
  `;
}

function buildImageAttachmentHtml(attachment) {
  return `
    <figure class="attachment-block attachment-block-media" data-attachment-id="${attachment.id}">
      <img src="${escapeHtml(attachment.url)}" alt="${escapeHtml(attachment.filename)}" />
      <figcaption>${escapeHtml(attachment.filename)}</figcaption>
    </figure>
  `;
}

function buildVideoAttachmentHtml(attachment) {
  return `
    <figure class="attachment-block attachment-block-media" data-attachment-id="${attachment.id}">
      <video controls preload="metadata" src="${escapeHtml(attachment.url)}"></video>
      <figcaption>${escapeHtml(attachment.filename)}</figcaption>
    </figure>
  `;
}

function insertUploadedAttachment(attachment) {
  if (attachment.kind === "image") {
    insertBlockHtml(buildImageAttachmentHtml(attachment), { placeInside: false });
    return;
  }

  if (attachment.kind === "video") {
    insertBlockHtml(buildVideoAttachmentHtml(attachment), { placeInside: false });
    return;
  }

  insertBlockHtml(buildAttachmentCardHtml(attachment), { placeInside: false });
}

function insertMediaByUrl(url) {
  const normalized = normalizeEmbedUrl(url);

  if (!normalized) {
    return;
  }

  if (/\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(normalized)) {
    insertBlockHtml(`
      <figure>
        <img src="${escapeHtml(normalized)}" alt="Image" />
      </figure>
    `, { placeInside: false });
    return;
  }

  if (/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(normalized)) {
    insertBlockHtml(`
      <figure>
        <video controls preload="metadata" src="${escapeHtml(normalized)}"></video>
      </figure>
    `, { placeInside: false });
    return;
  }

  if (/youtube\.com|youtu\.be|bilibili\.com/i.test(normalized)) {
    insertBlockHtml(`
      <figure>
        <iframe
          src="${escapeHtml(normalized)}"
          loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen
        ></iframe>
      </figure>
    `, { placeInside: false });
    return;
  }

  insertBlockHtml(`
    <p>
      <a href="${escapeHtml(normalized)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
        normalized
      )}</a>
    </p>
  `);
}

async function uploadAttachment(file) {
  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error(`文件 ${file.name} 过大，当前单文件上限为 ${formatFileSize(MAX_ATTACHMENT_SIZE)}`);
  }

  const response = await window.GellowContentApi.uploadAttachment(file);
  if (!response || !response.attachment) {
    throw new Error(`文件 ${file.name} 上传失败`);
  }
  return response.attachment;
}

async function insertDroppedFiles(files) {
  const pendingToast = showPendingFeedback(`Uploading ${files.length} file(s)...`, "System Notice");

  try {
    for (const file of files) {
      const attachment = await uploadAttachment(file);
      insertUploadedAttachment(attachment);
    }
  } catch (error) {
    failPendingFeedback(pendingToast, "File Upload Failed", "System Notice");
    throw error;
  }

  resolvePendingFeedback(pendingToast, "Files Uploaded", "System Notice", "success");
}

function insertExitParagraphAfter(node) {
  const paragraph = document.createElement("p");
  paragraph.innerHTML = "<br />";
  node.after(paragraph);
  placeCaretInside(paragraph);
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
    insertBlockHtml("<p>New paragraph</p>");
    return;
  }

  if (action === "heading") {
    insertBlockHtml("<h2>Section Title</h2>");
    return;
  }

  if (action === "quote") {
    insertBlockHtml("<blockquote>Quote</blockquote>");
    return;
  }

  if (action === "list") {
    insertBlockHtml("<ul><li>List item</li><li>List item</li></ul>");
    return;
  }

  if (action === "divider") {
    insertBlockHtml("<hr />", { placeInside: false });
    return;
  }

  if (action === "link") {
    const href = window.prompt("Link URL");
    if (!href) {
      return;
    }
    const text = window.prompt("Link Text", href) || href;
    insertBlockHtml(
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
    insertBlockHtml(`
      <figure>
        <img src="${escapeHtml(src)}" alt="${escapeHtml(caption || "Image")}" />
        ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}
      </figure>
    `, { placeInside: false });
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
      insertBlockHtml(`
        <figure>
          <video controls preload="metadata" src="${escapeHtml(normalized)}"></video>
        </figure>
      `, { placeInside: false });
      return;
    }

    insertBlockHtml(`
      <figure>
        <iframe
          src="${escapeHtml(normalized)}"
          loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen
        ></iframe>
      </figure>
    `, { placeInside: false });
    return;
  }

  if (action === "file") {
    ui.attachmentInput?.click();
    return;
  }

  if (action === "html") {
    const snippet = window.prompt("HTML Snippet");
    if (!snippet) {
      return;
    }
    insertBlockHtml(snippet, { placeInside: false });
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
  const pendingToast = showPendingFeedback("Saving post to database...", "System Notice");

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
    resolvePendingFeedback(pendingToast, "Post Saved", "System Notice", "success");
  } catch (error) {
    setSaveHint(`保存失败：${error.message}`);
    failPendingFeedback(pendingToast, "Post Save Failed", "System Notice");
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

  const pendingToast = showPendingFeedback("Deleting post from database...", "System Notice");

  try {
    await window.GellowContentApi.deletePost(post.id);
    removeSlugFromSettings(post.slug);
    await persistCurrentSettings();
    resolvePendingFeedback(pendingToast, "Post Deleted", "System Notice", "success");
    window.location.href = "./index.html";
  } catch (error) {
    setSaveHint(`删除失败：${error.message}`);
    failPendingFeedback(pendingToast, "Post Delete Failed", "System Notice");
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
  ui.attachmentInput?.addEventListener("change", async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    try {
      await insertDroppedFiles(files);
      setSaveHint("附件已插入正文。");
    } catch (error) {
      setSaveHint(`插入失败：${error.message}`);
      console.warn("Unable to insert attachment files.", error);
    } finally {
      event.target.value = "";
    }
  });
  ui.content.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    const range = getSelectionRange();
    const block = range ? getCurrentBlock(range.startContainer) : null;
    if (!block) {
      return;
    }

    if (block.matches("figure, hr, h1, h2, h3, blockquote")) {
      event.preventDefault();
      insertExitParagraphAfter(block);
    }
  });
  ui.content.addEventListener("dragenter", (event) => {
    event.preventDefault();
    ui.content.classList.add("is-dragover");
  });
  ui.content.addEventListener("dragover", (event) => {
    event.preventDefault();
    ui.content.classList.add("is-dragover");
  });
  ui.content.addEventListener("dragleave", (event) => {
    if (event.relatedTarget && ui.content.contains(event.relatedTarget)) {
      return;
    }
    ui.content.classList.remove("is-dragover");
  });
  ui.content.addEventListener("drop", async (event) => {
    event.preventDefault();
    ui.content.classList.remove("is-dragover");

    try {
      const files = Array.from(event.dataTransfer?.files || []);
      if (files.length) {
        await insertDroppedFiles(files);
        setSaveHint("附件已插入正文。");
        return;
      }

      const uriList = event.dataTransfer?.getData("text/uri-list")?.trim();
      const plainText = event.dataTransfer?.getData("text/plain") || "";

      if (uriList) {
        insertMediaByUrl(uriList.split("\n")[0]);
        setSaveHint("链接内容已插入正文。");
        return;
      }

      if (plainText.trim()) {
        if (/^https?:\/\//i.test(plainText.trim())) {
          insertMediaByUrl(plainText.trim());
          setSaveHint("链接内容已插入正文。");
          return;
        }

        insertTextAsParagraphs(plainText);
        setSaveHint("拖入内容已插入正文。");
      }
    } catch (error) {
      setSaveHint(`插入失败：${error.message}`);
      console.warn("Unable to drop content into editor.", error);
    }
  });
  ui.content.addEventListener("paste", async (event) => {
    const files = Array.from(event.clipboardData?.files || []);
    if (!files.length) {
      return;
    }

    event.preventDefault();

    try {
      await insertDroppedFiles(files);
      setSaveHint("剪贴板附件已插入正文。");
    } catch (error) {
      setSaveHint(`插入失败：${error.message}`);
      console.warn("Unable to paste media into editor.", error);
    }
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
