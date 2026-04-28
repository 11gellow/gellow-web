(function initPixelLoader() {
  const loader = document.getElementById("page-loader");

  if (!loader) {
    return;
  }

  const MIN_VISIBLE_MS = 720;
  const startTime = Date.now();
  let finished = false;

  document.documentElement.classList.add("is-page-loading");

  function hideLoader() {
    if (finished) {
      return;
    }

    finished = true;
    const elapsed = Date.now() - startTime;
    const waitMs = Math.max(0, MIN_VISIBLE_MS - elapsed);

    window.setTimeout(() => {
      loader.classList.add("is-hidden");
      document.documentElement.classList.remove("is-page-loading");
      window.setTimeout(() => {
        loader.remove();
      }, 520);
    }, waitMs);
  }

  if (document.readyState === "complete") {
    hideLoader();
  } else {
    window.addEventListener("load", hideLoader, { once: true });
    window.setTimeout(hideLoader, 3200);
  }
})();
