const ui = {
  latestPosts: document.getElementById("latest-posts"),
  missionTitle: document.getElementById("mission-notes-title"),
  missionList: document.getElementById("mission-notes-list"),
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

function renderPostCard(post) {
  return `
    <article class="post-card pixel">
      <div class="post-meta">
        <span class="tag">${escapeHtml(post.slug)}</span>
        <span class="date">${escapeHtml(formatDate(post.publishedAt))}</span>
      </div>
      <h3>${escapeHtml(post.title)}</h3>
      <p>${escapeHtml(post.summary)}</p>
      <a class="btn btn-green" href="./blogs/post.html?slug=${encodeURIComponent(post.slug)}" data-toast-message="文章 ${escapeHtml(post.title)} 已打开">Read More</a>
    </article>
  `;
}

function renderLatestPosts(posts) {
  if (!posts.length) {
    ui.latestPosts.innerHTML = `
      <article class="archive-empty pixel">
        暂时还没有可展示的 blog，去 notes 控制台里挑选三篇文章后这里就会更新。
      </article>
    `;
    return;
  }

  ui.latestPosts.innerHTML = posts.map(renderPostCard).join("");
}

function renderMissionNotes(settings) {
  ui.missionTitle.textContent = settings.mission_notes_title;

  if (!settings.mission_notes_items.length) {
    ui.missionList.innerHTML = `
      <div class="note">这里还没有内容，之后可以在 notes 控制台里补常用命令和速查片段。</div>
    `;
    return;
  }

  ui.missionList.innerHTML = settings.mission_notes_items
    .map((item) => `<div class="note">${escapeHtml(item)}</div>`)
    .join("");
}

async function initBlogHome() {
  ui.latestPosts.innerHTML = `
    <article class="loading-card pixel">正在加载 Latest Entries...</article>
  `;

  try {
    const payload = await window.GellowContentApi.fetchPublicContent();
    const settings = window.GellowContentApi.normalizeSettings(payload.settings || {});
    const posts = Array.isArray(payload.posts) ? payload.posts : [];
    const featuredPosts = window.GellowContentApi.pickPostsBySlugs(
      posts,
      settings.featured_latest,
      3
    );

    renderLatestPosts(featuredPosts);
    renderMissionNotes(settings);
  } catch (error) {
    ui.latestPosts.innerHTML = `
      <article class="archive-empty pixel">
        Latest Entries 加载失败：${escapeHtml(error.message)}
      </article>
    `;
    renderMissionNotes({
      mission_notes_title: "Mission Notes",
      mission_notes_items: ["内容接口暂时不可用，稍后再试。"],
    });
    console.warn("Unable to initialize blog homepage content.", error);
  }
}

void initBlogHome();
