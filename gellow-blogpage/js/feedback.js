(function initButtonFeedback() {
  const stack = document.getElementById("toast-stack");
  const TOAST_PARAM = "__gellow_toast";
  const TOAST_TITLE_PARAM = "__gellow_toast_title";
  const TOAST_VARIANT_PARAM = "__gellow_toast_variant";
  const HASH_MESSAGES = {
    "#latest": "Latest Entries 已定位",
    "#categories": "Categories 已定位",
    "#notes": "Mission Notes 已定位",
    "#links": "Quick Links 已定位",
    "#articles": "Article List 已定位",
    "#commands": "Command Settings 已定位",
    "#entries": "Console Entries 已定位",
    "#blog-stage": "Blog Stage 已定位",
    "#home-stage": "Home Stage 已定位",
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

  function getClosestHeadingText(target) {
    const card = target.closest("article, .article-card, .picker-item, .display-slot");
    if (!card) {
      return "";
    }

    const heading = card.querySelector("h2, h3, h4");
    return heading ? heading.textContent.replace(/\s+/g, " ").trim() : "";
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

    if (pathname.endsWith("/notes/display.html")) {
      return "Display Console 已打开";
    }

    if (pathname.endsWith("/notes") || pathname.endsWith("/notes/index.html")) {
      return "Notes Console 已打开";
    }

    if (pathname.endsWith("/blogs") || pathname.endsWith("/blogs/index.html")) {
      return "Blog Archive 已打开";
    }

    if (pathname.endsWith("/blogs/post.html")) {
      const title = getClosestHeadingText(target);
      return title ? `文章 ${title} 已打开` : "Blog Post 已打开";
    }

    if (/www\.gellow\.top$/i.test(url.hostname)) {
      return "Home Portal 已打开";
    }

    if (/blog\.gellow\.top$/i.test(url.hostname)) {
      return "Blog Portal 已打开";
    }

    if (/notes\.gellow\.top$/i.test(url.hostname)) {
      return "Notes Portal 已打开";
    }

    if (/rs\.gellow\.top$/i.test(url.hostname)) {
      return "Rust Portal 已打开";
    }

    return "";
  }

  function buildMessageFromButton(target) {
    const id = target.id || "";

    if (id === "new-article-btn") {
      return "New Post editor 已打开";
    }

    if (id === "reset-form-btn") {
      return "Post Editor 已重置";
    }

    if (id === "delete-article-btn") {
      return "Delete Post 已提交";
    }

    if (id === "save-settings-btn") {
      return "Command Settings 已提交";
    }

    if (id === "add-latest-card-btn") {
      return "Blog Stage picker 已打开";
    }

    if (id === "add-home-card-btn") {
      return "Home Stage picker 已打开";
    }

    if (id === "save-display-btn") {
      return "Display Layout 已提交";
    }

    if (id === "picker-close-btn") {
      return "Post picker 已关闭";
    }

    if (target.matches("[data-pick-slug]")) {
      const title = getClosestHeadingText(target);
      return title ? `${title} 已加入展示区` : "展示窗口已加入";
    }

    if (target.matches("[data-trash-slug]")) {
      const title = getClosestHeadingText(target);
      return title ? `${title} 已移出展示区` : "展示窗口已移除";
    }

    if (target.matches(".article-card")) {
      const title = getClosestHeadingText(target);
      return title ? `${title} 已载入编辑器` : "文章已载入编辑器";
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
      'a.btn, button.btn, .side-link, .link-card, .article-card, .picker-item'
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
