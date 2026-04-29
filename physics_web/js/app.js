(function () {
  "use strict";

  const items = [
    {
      id: "home",
      label: "HOME",
      title: "Home",
      mode: "panel",
      url: "pages/home.html",
      shape: "rectangle",
      color: "#ffcf33",
    },
    {
      id: "blog",
      label: "BLOG",
      title: "Blog",
      mode: "panel",
      url: "pages/blog.html",
      shape: "circle",
      color: "#46a7ff",
    },
    {
      id: "notes",
      label: "NOTES",
      title: "Notes",
      mode: "panel",
      url: "pages/notes.html",
      shape: "polygon",
      sides: 5,
      color: "#33d17a",
    },
    {
      id: "about",
      label: "ABOUT",
      title: "About",
      mode: "panel",
      url: "pages/about.html",
      shape: "rectangle",
      color: "#ff8a65",
    },
    {
      id: "soout",
      label: "SOOUT",
      title: "Soout",
      mode: "external",
      url: "https://soout.top/",
      shape: "polygon",
      sides: 6,
      color: "#a88cff",
    },
  ];

  const canvas = document.getElementById("physics-canvas");
  const statusEl = document.getElementById("status");
  const layer = document.getElementById("window-layer");
  let menu = null;
  let topZ = 40;

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function showLoadError() {
    const box = document.createElement("div");
    box.className = "load-error";
    box.textContent =
      "Matter.js did not load. Check the network, or vendor matter.min.js locally and update index.html.";
    document.body.append(box);
  }

  function boot() {
    if (!window.Matter || !window.GellowPhysics) {
      showLoadError();
      return;
    }

    menu = window.GellowPhysics.createMenu({
      canvas,
      items,
      onOpen: handleOpen,
    });

    document.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.action === "reset") {
          menu.reset();
          setStatus("PHYSICS NAV / RESET");
        }
        if (button.dataset.action === "shake") {
          menu.shake();
          setStatus("PHYSICS NAV / SHAKE");
        }
      });
    });

    layer.addEventListener("pointerdown", focusWindow);
    installDrag();
    openInitialPanel();
  }

  function handleOpen(event) {
    const item = event.item;
    setStatus(`${item.label} / OPEN`);

    if (item.mode === "external") {
      const opened = window.open(item.url, "_blank", "noopener,noreferrer");
      if (!opened) setStatus(`${item.label} / POPUP BLOCKED`);
      return;
    }

    openPanel(item);
  }

  function openPanel(item) {
    const existing = document.querySelector(`[data-window-id="${item.id}"]`);
    if (existing) {
      activateWindow(existing);
      return;
    }

    const win = document.createElement("article");
    win.className = "floating-window";
    win.dataset.windowId = item.id;
    win.style.left = `${Math.min(130 + layer.children.length * 34, window.innerWidth - 310)}px`;
    win.style.top = `${Math.min(86 + layer.children.length * 30, window.innerHeight - 260)}px`;
    win.innerHTML = `
      <header class="window-titlebar">
        <strong class="window-title">${escapeHtml(item.title)}</strong>
        <button class="window-control" type="button" data-window-action="open" title="Open tab">+</button>
        <button class="window-control" type="button" data-window-action="close" title="Close">x</button>
      </header>
      <iframe src="${escapeAttr(item.url)}" title="${escapeAttr(item.title)}"></iframe>
    `;

    win.querySelector('[data-window-action="close"]').addEventListener("click", () => win.remove());
    win.querySelector('[data-window-action="open"]').addEventListener("click", () => {
      window.open(item.url, "_blank", "noopener,noreferrer");
    });

    layer.append(win);
    activateWindow(win);
  }

  function openInitialPanel() {
    const openId = new URLSearchParams(window.location.search).get("open");
    if (!openId) return;

    const item = items.find((entry) => entry.id === openId && entry.mode === "panel");
    if (item) openPanel(item);
  }

  function focusWindow(event) {
    const win = event.target.closest(".floating-window");
    if (win) activateWindow(win);
  }

  function activateWindow(win) {
    document.querySelectorAll(".floating-window").forEach((node) => {
      node.dataset.active = "false";
    });
    win.dataset.active = "true";
    win.style.zIndex = String(++topZ);
  }

  function installDrag() {
    let dragging = null;

    layer.addEventListener("pointerdown", (event) => {
      const titlebar = event.target.closest(".window-titlebar");
      if (!titlebar || event.target.closest("button")) return;

      const win = titlebar.closest(".floating-window");
      const rect = win.getBoundingClientRect();
      dragging = {
        win,
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
      };
      activateWindow(win);
      titlebar.setPointerCapture(event.pointerId);
    });

    layer.addEventListener("pointermove", (event) => {
      if (!dragging || dragging.pointerId !== event.pointerId) return;

      const width = dragging.win.offsetWidth;
      const height = dragging.win.offsetHeight;
      const left = clamp(event.clientX - dragging.offsetX, 8, window.innerWidth - width - 8);
      const top = clamp(event.clientY - dragging.offsetY, 64, window.innerHeight - height - 8);
      dragging.win.style.left = `${left}px`;
      dragging.win.style.top = `${top}px`;
    });

    layer.addEventListener("pointerup", () => {
      dragging = null;
    });
    layer.addEventListener("pointercancel", () => {
      dragging = null;
    });
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[char];
    });
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  boot();
})();
