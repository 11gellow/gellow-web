(function initGellowContentApi() {
  const LOCAL_API_BASE = "http://127.0.0.1:5000";
  const PROD_API_BASE = "https://www.gellow.top";
  const PUBLIC_CACHE_KEY = "__gellow_public_content_cache_v1";
  const ADMIN_CACHE_KEY = "__gellow_admin_content_cache_v1";
  const PUBLIC_CACHE_TTL = 1000 * 60 * 10;
  const ADMIN_CACHE_TTL = 1000 * 60 * 2;

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

  function getBlobUploadBase() {
    if (
      window.location.protocol === "file:" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "localhost"
    ) {
      return getApiBase();
    }

    return window.location.origin.replace(/\/$/, "");
  }

  function isLocalRuntime() {
    return (
      window.location.protocol === "file:" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "localhost"
    );
  }

  function normalizeUploadFilename(rawName) {
    const source = String(rawName || "").split(/[\\/]/).pop().trim();
    if (!source) {
      return "attachment";
    }

    return (
      source
        .split("")
        .map((char) => ('<>:"/\\|?*'.includes(char) ? "_" : char))
        .join("")
        .trim() || "attachment"
    );
  }

  function classifyAttachment(mimeType, filename) {
    const type = String(mimeType || "").toLowerCase();
    const lower = String(filename || "").toLowerCase();

    if (type.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(lower)) {
      return "image";
    }
    if (type.startsWith("video/") || /\.(mp4|webm|ogg|mov|m4v)$/i.test(lower)) {
      return "video";
    }
    if (type.startsWith("audio/") || /\.(mp3|wav|flac|aac|m4a|ogg)$/i.test(lower)) {
      return "audio";
    }
    if (type === "application/pdf" || /\.pdf$/i.test(lower)) {
      return "pdf";
    }
    if (/\.(docx?|pptx?|xlsx?)$/i.test(lower)) {
      return "office";
    }
    return "file";
  }

  function getCache(key, maxAgeMs, allowExpired = true) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !("data" in parsed)) {
        return null;
      }

      const age = Date.now() - Number(parsed.savedAt || 0);
      const expired = Number.isFinite(age) ? age > maxAgeMs : true;

      if (expired && !allowExpired) {
        return null;
      }

      return {
        data: parsed.data,
        expired,
      };
    } catch (error) {
      return null;
    }
  }

  function setCache(key, data) {
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          savedAt: Date.now(),
          data,
        })
      );
    } catch (error) {
      // Ignore localStorage failures.
    }
  }

  function clearCache(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      // Ignore localStorage failures.
    }
  }

  async function requestJson(path, options) {
    let response;

    try {
      response = await fetch(`${getApiBase()}${path}`, {
        headers: {
          Accept: "application/json",
          ...(options && options.headers ? options.headers : {}),
        },
        ...options,
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "network request failed";
      throw new Error(message);
    }

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

  function updatePostCollection(collection, post) {
    const posts = Array.isArray(collection?.posts) ? [...collection.posts] : [];
    const index = posts.findIndex((item) => item.id === post.id);
    if (index >= 0) {
      posts.splice(index, 1, post);
    } else {
      posts.unshift(post);
    }

    return {
      ...(collection || {}),
      posts: sortPosts(posts),
    };
  }

  function removePostFromCollection(collection, postId) {
    if (!Array.isArray(collection?.posts)) {
      return collection || { posts: [] };
    }

    return {
      ...(collection || {}),
      posts: collection.posts.filter((item) => item.id !== postId),
    };
  }

  async function refreshPublicContent() {
    const payload = await requestJson("/api/content/public");
    setCache(PUBLIC_CACHE_KEY, payload);
    return payload;
  }

  async function refreshAdminContent() {
    const payload = await requestJson("/api/content/admin");
    setCache(ADMIN_CACHE_KEY, payload);
    return payload;
  }

  window.GellowContentApi = {
    getApiBase,
    getBlobUploadBase,
    sortPosts,
    pickPostsBySlugs,
    normalizeSettings,
    getCachedPublicContent(options = {}) {
      const cached = getCache(PUBLIC_CACHE_KEY, PUBLIC_CACHE_TTL, options.allowExpired !== false);
      return cached ? cached.data : null;
    },
    getCachedAdminContent(options = {}) {
      const cached = getCache(ADMIN_CACHE_KEY, ADMIN_CACHE_TTL, options.allowExpired !== false);
      return cached ? cached.data : null;
    },
    async refreshPublicContent() {
      return refreshPublicContent();
    },
    async refreshAdminContent() {
      return refreshAdminContent();
    },
    async fetchPublicContent(options = {}) {
      const useCache = options.useCache !== false;
      if (useCache) {
        const cached = getCache(PUBLIC_CACHE_KEY, PUBLIC_CACHE_TTL, true);
        if (cached) {
          if (!cached.expired) {
            return cached.data;
          }
          return cached.data;
        }
      }

      return refreshPublicContent();
    },
    async fetchAdminContent(options = {}) {
      const useCache = options.useCache !== false;
      if (useCache) {
        const cached = getCache(ADMIN_CACHE_KEY, ADMIN_CACHE_TTL, true);
        if (cached) {
          if (!cached.expired) {
            return cached.data;
          }
          return cached.data;
        }
      }

      return refreshAdminContent();
    },
    async fetchPost(slug) {
      return requestJson(`/api/content/posts/${encodeURIComponent(slug)}`);
    },
    async savePost(post) {
      const payload = await requestJson("/api/content/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(post),
      });

      if (payload?.post) {
        const publicCached = getCache(PUBLIC_CACHE_KEY, PUBLIC_CACHE_TTL, true);
        const adminCached = getCache(ADMIN_CACHE_KEY, ADMIN_CACHE_TTL, true);

        if (publicCached) {
          setCache(PUBLIC_CACHE_KEY, updatePostCollection(publicCached.data, payload.post));
        }
        if (adminCached) {
          setCache(ADMIN_CACHE_KEY, updatePostCollection(adminCached.data, payload.post));
        }
      }

      return payload;
    },
    async deletePost(postId) {
      const payload = await requestJson(`/api/content/posts/${postId}`, {
        method: "DELETE",
      });

      const publicCached = getCache(PUBLIC_CACHE_KEY, PUBLIC_CACHE_TTL, true);
      const adminCached = getCache(ADMIN_CACHE_KEY, ADMIN_CACHE_TTL, true);

      if (publicCached) {
        setCache(PUBLIC_CACHE_KEY, removePostFromCollection(publicCached.data, postId));
      }
      if (adminCached) {
        setCache(ADMIN_CACHE_KEY, removePostFromCollection(adminCached.data, postId));
      }

      return payload;
    },
    async saveSettings(settings) {
      const payload = await requestJson("/api/content/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (payload?.settings) {
        const publicCached = getCache(PUBLIC_CACHE_KEY, PUBLIC_CACHE_TTL, true);
        const adminCached = getCache(ADMIN_CACHE_KEY, ADMIN_CACHE_TTL, true);

        if (publicCached) {
          setCache(PUBLIC_CACHE_KEY, {
            ...publicCached.data,
            settings: payload.settings,
          });
        }
        if (adminCached) {
          setCache(ADMIN_CACHE_KEY, {
            ...adminCached.data,
            settings: payload.settings,
          });
        }
      }

      return payload;
    },
    async uploadAttachment(file) {
      if (!isLocalRuntime()) {
        const { upload } = await import("https://esm.sh/@vercel/blob@1.1.1/client");
        const filename = normalizeUploadFilename(file.name);
        const mimeType = file.type || "application/octet-stream";
        const pathname = `attachments/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}-${filename}`;
        const blob = await upload(pathname, file, {
          access: "public",
          handleUploadUrl: `${getBlobUploadBase()}/api/blob-upload`,
          multipart: file.size > 4 * 1024 * 1024,
          clientPayload: JSON.stringify({
            filename,
            mimeType,
            size: file.size,
          }),
        });

        return {
          attachment: {
            id: blob.pathname || pathname,
            filename,
            mimeType,
            size: file.size,
            kind: classifyAttachment(mimeType, filename),
            url: blob.url,
            downloadUrl: blob.downloadUrl || blob.url,
            createdAt: new Date().toISOString(),
          },
        };
      }

      const formData = new FormData();
      formData.append("file", file);

      const uploadPath = `${getApiBase()}/api/attachments`;

      let response;
      try {
        response = await fetch(uploadPath, {
          method: "POST",
          body: formData,
          headers: {
            Accept: "application/json",
          },
        });
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "network request failed";
        throw new Error(message);
      }

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
    },
    clearCachedPublicContent() {
      clearCache(PUBLIC_CACHE_KEY);
    },
    clearCachedAdminContent() {
      clearCache(ADMIN_CACHE_KEY);
    },
  };
})();
