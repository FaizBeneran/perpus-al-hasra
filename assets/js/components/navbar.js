import { currentUser } from "../services/auth.js";
import { escapeHtml } from "../utils/helpers.js";

const inPages = () => location.pathname.toLowerCase().includes("/pages/");
export const route = page => page === "beranda" ? (inPages() ? "../index.html" : "index.html") : `${inPages() ? "" : "pages/"}${page}.html`;

export function navbar(active = "") {
  const user = currentUser();
  const dashboard = !user ? "login" : user.role === "Siswa" ? "dashboard-siswa" : "dashboard-admin";
  const links = [["beranda", "Beranda"], ["katalog", "Katalog"], [dashboard, "Dashboard"]];
  const nav = links.map(([key, label]) => `<a class="${active === key ? "active" : ""}" href="${route(key)}">${label}</a>`).join("");
  return `<header class="site-header"><div class="container nav-wrap">
    <a class="brand" href="${route("beranda")}"><span class="brand-mark" aria-hidden="true">▣</span><span>SMK AL HASRA<small>Perpustakaan Digital</small></span></a>
    <nav class="nav-links" id="mainNav" aria-label="Navigasi utama">${nav}</nav>
    <div class="nav-actions"><button class="btn btn-quiet btn-sm" data-action="theme" aria-label="Ganti tema">◐</button>
    ${user ? `<a class="btn btn-outline btn-sm" href="${route(dashboard)}">${escapeHtml(user.name.split(" ")[0])}</a><button class="btn btn-primary btn-sm" data-action="logout">Keluar</button>` : `<a class="btn btn-quiet btn-sm" href="${route("login")}">Masuk</a><a class="btn btn-primary btn-sm" href="${route("register")}">Daftar</a>`}
    <button class="btn btn-quiet btn-sm mobile-toggle" data-action="menu" aria-label="Buka menu">☰</button></div>
  </div></header>`;
}
