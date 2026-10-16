export function pagination(total, page, size, action = "page") {
  const pages = Math.ceil(total / size);
  if (pages < 2) return "";
  return `<nav class="pagination" aria-label="Paginasi">${Array.from({ length: pages }, (_, index) => `<button class="page-number ${page === index + 1 ? "active" : ""}" data-action="${action}" data-page="${index + 1}" aria-label="Halaman ${index + 1}">${index + 1}</button>`).join("")}</nav>`;
}
