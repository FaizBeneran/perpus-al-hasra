import { route } from "./navbar.js";
import { CONFIG } from "../config.js";
import { escapeHtml } from "../utils/helpers.js";

const staffItems = [
  ["dashboard-admin", "▦", "Ringkasan"], ["kelola-buku", "▤", "Kelola buku"], ["kelola-anggota", "♙", "Kelola anggota"],
  ["peminjaman", "↗", "Peminjaman"], ["pengembalian", "↙", "Pengembalian"], ["riwayat", "◷", "Riwayat"], ["laporan", "▥", "Laporan"]
];
export function sidebar(active, role) {
  const items = role === CONFIG.roles.student ? [["dashboard-siswa", "▦", "Dashboard"], ["katalog", "▤", "Katalog buku"], ["riwayat", "◷", "Riwayat"], ["profil", "♙", "Profil saya"]] : staffItems;
  return `<aside class="sidebar" id="sidebar"><div class="sidebar-title">${escapeHtml(role === CONFIG.roles.admin ? "Administrator" : role)}</div><nav class="sidebar-nav">${items.map(([page, icon, title]) => `<a href="${route(page)}" class="${active === page ? "active" : ""}"><span class="sidebar-icon" aria-hidden="true">${icon}</span>${title}</a>`).join("")}<a href="${route("profil")}"><span class="sidebar-icon">⚙</span>Profil & pengaturan</a></nav></aside>`;
}
