export function toast(message, type = "success") {
  const region = document.querySelector(".toast-region");
  if (!region) return;
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.setAttribute("role", "status");
  item.textContent = message;
  region.append(item);
  window.setTimeout(() => item.remove(), 3600);
}
