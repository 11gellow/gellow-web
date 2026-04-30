const ui = {
  list: document.getElementById("article-list"),
  status: document.getElementById("archive-status"),
};

const state = {
  posts: [],
};

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

function statusToLabel(status) {
  if (status === "published") {
    return "PUBLISHED";
  }
  if (status === "archived") {
    return "ARCHIVED";
  }
  return "DRAFT";
}

function setStatus(text) {
  ui.status.textContent = text;
}

function buildCard(post) {
  return `
    <article class="article-card">
      <div class="article-card-head">
        <h3>${escapeHtml(post.title)}</h3>
        <span class="status-badge ${escapeHtml(post.status)}">${escapeHtml(
          statusToLabel(post.status)
        )}</span>
      </div>
      <div class="article-card-body">
        <p>${escapeHtml(post.summary || "暂无摘要。")}</p>
      </div>
      <div class="article-card-footer">
        <div class="article-card-meta meta-line">
          ${escapeHtml(post.slug)}<br />
          ${escapeHtml(formatDate(post.publishedAt || post.updatedAt))}
        </div>
        <a
          class="btn btn-blue article-edit-link"
          href="./editor.html?id=${encodeURIComponent(post.id)}"
          data-toast-message="Post Editor 已打开"
        >
          Edit
        </a>
      </div>
    </article>
  `;
}

function renderList() {
  if (!state.posts.length) {
    ui.list.innerHTML = `
      <div class="empty-state">
        还没有文章。<br />
        点击右上角 <strong>New Post</strong> 创建第一篇文章。
      </div>
    `;
    return;
  }

  ui.list.innerHTML = state.posts.map(buildCard).join("");
}

async function loadArticleIndex() {
  const payload = await window.GellowContentApi.fetchAdminContent();
  state.posts = window.GellowContentApi.sortPosts(Array.isArray(payload.posts) ? payload.posts : []);
  renderList();
}

async function initNotesIndex() {
  setStatus("正在读取文章列表...");

  try {
    await loadArticleIndex();
    setStatus(`已载入 ${state.posts.length} 篇文章。`);
  } catch (error) {
    ui.list.innerHTML = `
      <div class="empty-state">
        文章列表读取失败：${escapeHtml(error.message)}
      </div>
    `;
    setStatus(`读取失败：${error.message}`);
    console.warn("Unable to initialize notes article index.", error);
  }
}

void initNotesIndex();
