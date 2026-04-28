(function initButtonFeedback() {
  const stack = document.getElementById("toast-stack");
  const TOAST_PARAM = "__gellow_toast";
  const TOAST_TITLE_PARAM = "__gellow_toast_title";
  const TOAST_VARIANT_PARAM = "__gellow_toast_variant";
  const HASH_MESSAGES = {
    "#start": "Home 已定位",
    "#projects": "Projects 已定位",
    "#log": "Log 已定位",
    "#portal": "Portal 已定位",
  };

  if (!stack) {
    return;
  }

  function showPendingToastFromUrl() {
    const currentUrl = new URL(window.location.href);
    const message = currentUrl.searchParams.get(TOAST_PARAM);
    const title = currentUrl.searchParams.get(TOAST_TITLE_PARAM) || "System Notice";
    const variant = currentUrl.searchParams.get(TOAST_VARIANT_PARAM) || "info";

    if (!message) {
      return;
    }

    currentUrl.searchParams.delete(TOAST_PARAM);
    currentUrl.searchParams.delete(TOAST_TITLE_PARAM);
    currentUrl.searchParams.delete(TOAST_VARIANT_PARAM);
    window.history.replaceState({}, "", currentUrl.toString());
    createToast(message, title, variant);
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
    const toast = document.createElement("div");
    toast.className = `toast-card toast-${variant} pixel`;
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
    });

    const closeToast = () => {
      toast.classList.add("is-closing");
      toast.classList.remove("is-visible");
      window.setTimeout(() => {
        toast.remove();
      }, 620);
    };

    window.setTimeout(closeToast, 2000);
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
    nextUrl.searchParams.set(TOAST_PARAM, message);
    nextUrl.searchParams.set(TOAST_TITLE_PARAM, "System Notice");
    nextUrl.searchParams.set(TOAST_VARIANT_PARAM, variant);
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

    const finalUrl = buildToastUrl(target, getMessage(target), getVariant(target));
    const targetName = target.getAttribute("target");

    if (targetName === "_blank") {
      window.open(finalUrl, "_blank", "noopener");
    } else {
      window.location.href = finalUrl;
    }

    return true;
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
      if (handleNavigationToast(target)) {
        event.preventDefault();
        return;
      }
    }

    createToast(getMessage(target), "System Notice", getVariant(target));
  });

  showPendingToastFromUrl();
})();
