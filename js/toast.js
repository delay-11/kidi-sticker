/* moved from js/common/toast.js */
/* =========================================================
 * 토스트
========================================================= */
let activeToastTimer = null;

function showToast(message = "", type = "info", duration = 2200) {
  if (!message) return;

  const stack = document.getElementById("toastStack");
  if (!stack) return;

  const normalizedType = ["ok", "warn", "error", "info"].includes(type)
    ? type
    : "info";

  const currentToasts = Array.from(stack.querySelectorAll(".toast"));
  currentToasts.forEach((node) => {
    node.classList.remove("show");
    node.classList.add("hide");
    setTimeout(() => node.remove(), 220);
  });

  if (activeToastTimer) {
    clearTimeout(activeToastTimer);
    activeToastTimer = null;
  }

  const toast = document.createElement("div");
  toast.className = `toast ${normalizedType}`;

  const icon = document.createElement("div");
  icon.className = "toastIcon";
  icon.textContent =
    normalizedType === "error"
      ? "!"
      : normalizedType === "warn"
      ? "!"
      : normalizedType === "ok"
      ? "✓"
      : "i";

  const text = document.createElement("div");
  text.className = "toastText";
  text.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(text);
  stack.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  const remove = () => {
    toast.classList.remove("show");
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 220);
    activeToastTimer = null;
  };

  activeToastTimer = setTimeout(remove, Math.max(1200, duration));
}
