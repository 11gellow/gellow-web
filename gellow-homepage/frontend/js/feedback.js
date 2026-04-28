(function initButtonFeedback() {
  const stack = document.getElementById("toast-stack");

  if (!stack) {
    return;
  }

  function getLabel(target) {
    const explicit = target.getAttribute("data-toast-label");
    if (explicit) {
      return explicit.trim();
    }

    const text = (target.textContent || "").replace(/\s+/g, " ").trim();
    return text || "Action";
  }

  function getMessage(target) {
    const explicit = target.getAttribute("data-toast-message");
    if (explicit) {
      return explicit;
    }

    const label = getLabel(target);

    if (target.matches("a")) {
      const href = target.getAttribute("href") || "";
      if (href.startsWith("#")) {
        return `${label} 已跳转`;
      }

      return `${label} 已打开`;
    }

    return `${label} 已执行`;
  }

  function createToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast-card pixel";
    toast.innerHTML = `
      <h3 class="toast-title">System Notice</h3>
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

  document.addEventListener("click", (event) => {
    const target = event.target.closest(
      'a.btn, button.btn, .side-link, .link-card'
    );

    if (!target || target.closest(".toast-stack")) {
      return;
    }

    createToast(getMessage(target));
  });
})();
