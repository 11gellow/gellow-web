const postDetailRoot = document.getElementById("post-detail");

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

function normalizeSlug(value) {
  return String(value || "").trim().normalize("NFC");
}

function renderDetail(post) {
  const paragraphs = String(post.content)
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`)
    .join("");

  postDetailRoot.innerHTML = `
    <div class="blog-entry-meta">
      <span class="tag">${escapeHtml(post.slug)}</span>
      <span class="date">${escapeHtml(formatDate(post.publishedAt))}</span>
    </div>
    <h2>${escapeHtml(post.title)}</h2>
    <p>${escapeHtml(post.summary)}</p>
    <div class="post-detail-content">${paragraphs}</div>
    <a class="btn btn-blue back-inline" href="../index.html">Back To Blog</a>
  `;

  document.title = `${post.title} | Gellow Blog`;
}

async function initPostDetail() {
  const params = new URLSearchParams(window.location.search);
  const slug = normalizeSlug(params.get("slug"));

  if (!slug) {
    postDetailRoot.innerHTML = `<div class="archive-empty">缺少 slug，无法打开文章。</div>`;
    return;
  }

  try {
    const payload = await window.GellowContentApi.fetchPublicContent();
    const posts = Array.isArray(payload.posts) ? payload.posts : [];
    const post = posts.find((entry) => normalizeSlug(entry.slug) === slug);

    if (!post) {
      throw new Error("post not found");
    }

    renderDetail(post);
  } catch (error) {
    postDetailRoot.innerHTML = `
      <div class="archive-empty">
        文章加载失败：${escapeHtml(error.message)}
      </div>
    `;
    console.warn("Unable to load post detail.", error);
  }
}

void initPostDetail();
