const allPostsRoot = document.getElementById("all-posts");

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

function renderPostCard(post) {
  return `
    <article class="post-card pixel">
      <div class="post-meta">
        <span class="tag">${escapeHtml(post.slug)}</span>
        <span class="date">${escapeHtml(formatDate(post.publishedAt))}</span>
      </div>
      <h3>${escapeHtml(post.title)}</h3>
      <p>${escapeHtml(post.summary)}</p>
      <a class="btn btn-green" href="./post.html?slug=${encodeURIComponent(post.slug)}">Read More</a>
    </article>
  `;
}

async function initArchivePage() {
  allPostsRoot.innerHTML = `<article class="loading-card pixel">正在加载全部 blog...</article>`;

  try {
    const payload = await window.GellowContentApi.fetchPublicContent();
    const posts = window.GellowContentApi.sortPosts(Array.isArray(payload.posts) ? payload.posts : []);

    if (!posts.length) {
      allPostsRoot.innerHTML = `<article class="archive-empty pixel">还没有已发布的文章。</article>`;
      return;
    }

    allPostsRoot.innerHTML = posts.map(renderPostCard).join("");
  } catch (error) {
    allPostsRoot.innerHTML = `
      <article class="archive-empty pixel">
        全部 blog 加载失败：${escapeHtml(error.message)}
      </article>
    `;
    console.warn("Unable to load archive page.", error);
  }
}

void initArchivePage();
