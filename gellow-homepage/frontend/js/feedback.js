(function initButtonFeedback() {
  const stack = document.getElementById("toast-stack");
  const TOAST_PARAM = "__gellow_toast";
  const TOAST_TITLE_PARAM = "__gellow_toast_title";
  const TOAST_VARIANT_PARAM = "__gellow_toast_variant";
  const TOAST_STORAGE_KEY = "__gellow_pending_toast";
  const HASH_MESSAGES = {
    "#start": "Home 已定位",
    "#projects": "Projects 已定位",
    "#log": "Log 已定位",
    "#portal": "Portal 已定位",
  };

  if (!stack) {
    return;
  }

  function readPendingToastFromStorage() {
    try {
      const raw = window.localStorage.getItem(TOAST_STORAGE_KEY);
      if (!raw) {
        return null;
      }

      window.localStorage.removeItem(TOAST_STORAGE_KEY);
      const payload = JSON.parse(raw);
      if (!payload || typeof payload.message !== "string") {
        return null;
      }

      return payload;
    } catch (error) {
      return null;
    }
  }

  function writePendingToastToStorage(payload) {
    try {
      window.localStorage.setItem(TOAST_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      // Ignore storage failures and fall back to direct navigation.
    }
  }

  function readPendingToastFromHash(currentUrl) {
    const rawHash = currentUrl.hash.startsWith("#") ? currentUrl.hash.slice(1) : "";
    if (!rawHash || !rawHash.includes(TOAST_PARAM)) {
      return null;
    }

    const hashParams = new URLSearchParams(rawHash);
    const message = hashParams.get(TOAST_PARAM);
    if (!message) {
      return null;
    }

    const title = hashParams.get(TOAST_TITLE_PARAM) || "System Notice";
    const variant = hashParams.get(TOAST_VARIANT_PARAM) || "info";

    hashParams.delete(TOAST_PARAM);
    hashParams.delete(TOAST_TITLE_PARAM);
    hashParams.delete(TOAST_VARIANT_PARAM);
    currentUrl.hash = hashParams.toString() ? `#${hashParams.toString()}` : "";

    return { message, title, variant };
  }

  function readPendingToastFromSearch(currentUrl) {
    const message = currentUrl.searchParams.get(TOAST_PARAM);
    if (!message) {
      return null;
    }

    const title = currentUrl.searchParams.get(TOAST_TITLE_PARAM) || "System Notice";
    const variant = currentUrl.searchParams.get(TOAST_VARIANT_PARAM) || "info";

    currentUrl.searchParams.delete(TOAST_PARAM);
    currentUrl.searchParams.delete(TOAST_TITLE_PARAM);
    currentUrl.searchParams.delete(TOAST_VARIANT_PARAM);

    return { message, title, variant };
  }

  function showPendingToastFromUrl() {
    const currentUrl = new URL(window.location.href);
    const locationToast =
      readPendingToastFromSearch(currentUrl) ||
      readPendingToastFromHash(currentUrl) ||
      readPendingToastFromStorage();

    if (!locationToast) {
      return;
    }

    window.history.replaceState({}, "", currentUrl.toString());
    createToast(locationToast.message, locationToast.title, locationToast.variant);
  }

  function getLabel(target) {
    const explicit = target.getAttribute("data-toast-label");
    if (explicit) {
      return explicit.trim();
    }

    const text = (target.textContent || "").replace(/\s+/g, " ").trim();
    return text || "Action";
  }

  function normalizePathname(pathname) {
    return pathname.replace(/\/+$/, "") || "/";
  }

  function buildMessageFromHref(target, href) {
    const url = new URL(href, window.location.href);
    const pathname = normalizePathname(url.pathname);
    const hashMessage = HASH_MESSAGES[url.hash];

    if (hashMessage) {
      return hashMessage;
    }

    if (pathname.endsWith("/blogs/post.html")) {
      const note = target.closest(".note");
      const title = note?.querySelector(".note-title")?.textContent?.trim();
      return title ? `文章 ${title} 已打开` : "Blog Post 已打开";
    }

    if (/blog\.gellow\.top$/i.test(url.hostname)) {
      return "Blog Portal 已打开";
    }

    if (/rs\.gellow\.top$/i.test(url.hostname)) {
      return "Rust Portal 已打开";
    }

    if (/notes\.gellow\.top$/i.test(url.hostname)) {
      return "Notes Portal 已打开";
    }

    if (/github\.com$/i.test(url.hostname)) {
      return "GitHub 已打开";
    }

    if (/steamcommunity\.com$/i.test(url.hostname)) {
      return "Steam 已打开";
    }

    if (/bilibili\.com$/i.test(url.hostname)) {
      return "Bilibili 已打开";
    }

    return "";
  }

  function buildMessageFromButton(target) {
    const action = target.dataset.arcadeAction || "";

    if (action === "start") {
      return "Pac-Man Run 已启动";
    }

    if (action === "log") {
      return "PAC-MAN Rankings 已打开";
    }

    if (action === "restart") {
      return "Pac-Man Run 已重启";
    }

    if (action === "resume") {
      return "Pac-Man Run 已恢复";
    }

    if (action === "home") {
      return "Arcade Home 已打开";
    }

    if (action === "dismiss-score") {
      return "Score Save 已跳过";
    }

    if (target.getAttribute("type") === "submit" && target.closest("#score-entry-form")) {
      return "Score Save 已提交";
    }

    return "";
  }

  function getMessage(target) {
    const explicit = target.getAttribute("data-toast-message");
    if (explicit) {
      return explicit;
    }

    const href = target.matches("a") ? target.getAttribute("href") || "" : "";
    const hrefMessage = href ? buildMessageFromHref(target, href) : "";
    if (hrefMessage) {
      return hrefMessage;
    }

    const buttonMessage = buildMessageFromButton(target);
    if (buttonMessage) {
      return buttonMessage;
    }

    const label = getLabel(target);

    if (target.matches("a")) {
      if (href.startsWith("#")) {
        return `${label} 已跳转`;
      }

      return `${label} 已打开`;
    }

    return `${label} 已执行`;
  }

  function isSiteNavigation(url) {
    return (
      url.origin === window.location.origin ||
      /(^|\.)gellow\.top$/i.test(url.hostname) ||
      /vercel\.app$/i.test(url.hostname)
    );
  }

  function getVariant(target) {
    const explicit = target.getAttribute("data-toast-variant");
    if (explicit) {
      return explicit;
    }

    if (!target.matches("a")) {
      return "info";
    }

    const href = target.getAttribute("href") || "";
    if (!href) {
      return "info";
    }

    if (href.startsWith("#")) {
      return "nav";
    }

    const url = new URL(href, window.location.href);
    return isSiteNavigation(url) ? "nav" : "open";
  }

  function createToast(message, title = "System Notice", variant = "info") {
    const toastKey = `${variant}::${title}::${message}`;
    const existingToast = stack.querySelector(`[data-toast-key="${encodeURIComponent(toastKey)}"]`);

    if (existingToast) {
      existingToast.classList.remove("is-closing");
      existingToast.classList.add("is-visible");
      resetToastLifetime(existingToast);
      return;
    }

    const toast = document.createElement("div");
    toast.className = `toast-card toast-${variant} pixel`;
    toast.dataset.toastKey = encodeURIComponent(toastKey);
    toast.innerHTML = `
      <h3 class="toast-title">${title}</h3>
      <p class="toast-message">${message}</p>
      <div class="toast-progress">
        <div class="toast-progress-bar"></div>
      </div>
    `;

    stack.prepend(toast);

    window.requestAnimationFrame(() => {
      toast.classList.add("is-visible");
      resetToastLifetime(toast);
    });
  }

  function resetToastProgress(toast) {
    const progressBar = toast.querySelector(".toast-progress-bar");
    if (!progressBar) {
      return;
    }

    progressBar.style.animation = "none";
    void progressBar.offsetWidth;
    progressBar.style.animation = "";
  }

  function resetToastLifetime(toast) {
    resetToastProgress(toast);

    if (toast.closeTimerId) {
      window.clearTimeout(toast.closeTimerId);
    }

    if (toast.removeTimerId) {
      window.clearTimeout(toast.removeTimerId);
    }

    toast.closeTimerId = window.setTimeout(() => {
      toast.classList.add("is-closing");
      toast.classList.remove("is-visible");
      toast.removeTimerId = window.setTimeout(() => {
        toast.remove();
      }, 620);
    }, 2000);
  }

  window.GellowFeedback = {
    showToast: createToast,
  };

  function shouldCarryToastToNextPage(url) {
    return isSiteNavigation(url);
  }

  function buildToastUrl(target, message, variant) {
    const href = target.getAttribute("href");
    const nextUrl = new URL(href, window.location.href);
    const hashParams = new URLSearchParams(
      nextUrl.hash.startsWith("#") ? nextUrl.hash.slice(1) : ""
    );
    hashParams.set(TOAST_PARAM, message);
    hashParams.set(TOAST_TITLE_PARAM, "System Notice");
    hashParams.set(TOAST_VARIANT_PARAM, variant);
    nextUrl.hash = `#${hashParams.toString()}`;
    return nextUrl.toString();
  }

  function handleNavigationToast(target) {
    const href = target.getAttribute("href");
    if (!href || href.startsWith("#")) {
      return false;
    }

    if (
      href.startsWith("javascript:") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:")
    ) {
      return false;
    }

    const nextUrl = new URL(href, window.location.href);
    if (!shouldCarryToastToNextPage(nextUrl)) {
      return false;
    }

    const payload = {
      message: getMessage(target),
      title: "System Notice",
      variant: getVariant(target),
    };
    const targetName = target.getAttribute("target");

    if (nextUrl.origin === window.location.origin) {
      writePendingToastToStorage(payload);

      if (targetName === "_blank") {
        return "suppressed";
      }

      window.location.href = nextUrl.toString();
      return "handled";
    }

    const finalUrl = buildToastUrl(target, payload.message, payload.variant);

    if (targetName === "_blank") {
      target.setAttribute("href", finalUrl);
      return "suppressed";
    }

    window.location.href = finalUrl;
    return "handled";
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest(
      'a.btn, button.btn, .side-link, .link-card'
    );

    if (!target || target.closest(".toast-stack")) {
      return;
    }

    if (target.hasAttribute("data-toast-defer")) {
      return;
    }

    if (target.matches("a")) {
      const handled = handleNavigationToast(target);
      if (handled === "handled") {
        event.preventDefault();
        return;
      }
      if (handled === "suppressed") {
        return;
      }
    }

    createToast(getMessage(target), "System Notice", getVariant(target));
  });

  showPendingToastFromUrl();
})();
