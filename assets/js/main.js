const appRoot = document.getElementById("app");
const loading = document.createElement("main");
loading.className = "container";
loading.setAttribute("role", "status");
loading.setAttribute("aria-label", "Memuat aplikasi");
loading.style.cssText = "padding-block:48px";
for (const [width, height] of [["42%", "32px"], ["72%", "17px"], ["100%", "190px"]]) {
  const block = document.createElement("div");
  block.className = "skeleton";
  block.style.width = width;
  block.style.height = height;
  block.style.marginBottom = "14px";
  loading.append(block);
}
appRoot.replaceChildren(loading);

try {
  const page = document.body.dataset.page || "404";
  const availablePages = ["beranda", "login", "register", "katalog", "detail-buku", "dashboard-admin", "dashboard-siswa", "kelola-buku", "kelola-anggota", "peminjaman", "pengembalian", "riwayat", "laporan", "profil", "404"];
  const module = availablePages.includes(page) ? await import(`./pages/${page}.js`) : await import("./app.js");
  await module.default();
} catch (error) {
  const main = document.createElement("main");
  main.className = "content-narrow card card-pad";
  const title = document.createElement("h1");
  title.textContent = "Aplikasi gagal dimuat";
  const message = document.createElement("p");
  message.textContent = error.message || "Periksa penyimpanan browser lalu muat ulang halaman.";
  main.append(title, message);
  appRoot.replaceChildren(main);
}
