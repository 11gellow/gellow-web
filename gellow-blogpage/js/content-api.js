(function initGellowContentApi() {
  const LOCAL_API_BASE = "http://127.0.0.1:5000";
  const PROD_API_BASE = "https://www.gellow.top";

  function getApiBase() {
    if (typeof window.GELLOW_CONTENT_API_BASE === "string" && window.GELLOW_CONTENT_API_BASE.trim()) {
      return window.GELLOW_CONTENT_API_BASE.trim().replace(/\/$/, "");
    }

    if (
      window.location.protocol === "file:" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "localhost"
    ) {
      return LOCAL_API_BASE;
    }

    return PROD_API_BASE;
  }

  async function requestJson(path, options) {
    const response = await fetch(`${getApiBase()}${path}`, {
      headers: {
        Accept: "application/json",
        ...(options && options.headers ? options.headers : {}),
      },
      ...options,
    });

    let payload = null;

    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok) {
      const message =
        payload && typeof payload.error === "string"
          ? payload.error
          : `Request failed: ${response.status}`;
      throw new Error(message);
    }

    return payload;
  }

  function sortPosts(posts) {
    return [...posts].sort((left, right) => {
      const leftTime = Date.parse(left.publishedAt || left.updatedAt || 0);
      const rightTime = Date.parse(right.publishedAt || right.updatedAt || 0);
      return rightTime - leftTime;
    });
  }

  function pickPostsBySlugs(posts, slugs, limit) {
    const postMap = new Map(posts.map((post) => [post.slug, post]));
    const picked = [];

    slugs.forEach((slug) => {
      const post = postMap.get(slug);
      if (post && !picked.some((item) => item.slug === post.slug)) {
        picked.push(post);
      }
    });

    return picked.slice(0, limit);
  }

  function normalizeSettings(settings) {
    return {
      featured_latest: Array.isArray(settings.featured_latest) ? settings.featured_latest : [],
      featured_home: Array.isArray(settings.featured_home) ? settings.featured_home : [],
      mission_notes_title:
        typeof settings.mission_notes_title === "string" && settings.mission_notes_title.trim()
          ? settings.mission_notes_title.trim()
          : "Mission Notes",
      mission_notes_items: Array.isArray(settings.mission_notes_items)
        ? settings.mission_notes_items
        : [],
    };
  }

  window.GellowContentApi = {
    getApiBase,
    sortPosts,
    pickPostsBySlugs,
    normalizeSettings,
    async fetchPublicContent() {
      return requestJson("/api/content/public");
    },
    async fetchAdminContent() {
      return requestJson("/api/content/admin");
    },
    async fetchPost(slug) {
      return requestJson(`/api/content/posts/${encodeURIComponent(slug)}`);
    },
    async savePost(post) {
      return requestJson("/api/content/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(post),
      });
    },
    async deletePost(postId) {
      return requestJson(`/api/content/posts/${postId}`, {
        method: "DELETE",
      });
    },
    async saveSettings(settings) {
      return requestJson("/api/content/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });
    },
  };
})();
