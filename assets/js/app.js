import { CONFIG } from "./config.js";
import { seedIfEmpty } from "./services/seed.js";
import { storage } from "./services/storage.js";
import { currentUser, guard, login, logout, registerStudent, changePassword, hashPassword } from "./services/auth.js";
import { getBooks, getBook, saveBook, deleteBook } from "./services/buku.js";
import { getMembers, saveMember, deleteMember } from "./services/anggota.js";
import { getTransactions, borrowBook, returnBook, renewLoan, payFine, reserveBook, reviewBook } from "./services/transaksi.js";
import { navbar, route } from "./components/navbar.js";
import { sidebar } from "./components/sidebar.js";
import { toast } from "./components/toast.js";
import { confirmAction } from "./components/modal.js";
import { pagination } from "./components/pagination.js";
import { formatCurrency, formatDate, escapeHtml, initials, today, debounce } from "./utils/helpers.js";
import { validate } from "./utils/validator.js";
import { exportCsv, downloadJson } from "./utils/export.js";

const state = { page: 1, search: "", category: "", availability: "", sort: "newest", view: "grid", editing: null, reportStart: "", reportEnd: "" };
const page = document.body.dataset.page || "beranda";
const studentRole = CONFIG.roles.student;
const staffRoles = [CONFIG.roles.admin, CONFIG.roles.staff];
const categories = ["Teknologi", "TKJ", "RPL", "Agama", "Fiksi", "Pelajaran", "Bisnis", "Sains", "Biografi"];
const root = document.getElementById("app");
const bookById = id => getBooks().find(book => book.id === id);
const memberById = id => getMembers().find(member => member.id === id);
const coverUrl = book => {
  const cover = typeof book.cover === "string" ? book.cover : "assets/img/cover-placeholder.svg";
  const validDataImage = /^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(cover);
  if (validDataImage) return cover;
  if (/^https:\/\//i.test(cover)) return cover;
  if (/^(?:\.\.\/)?assets\/img\/[\w.-]+\.svg$/i.test(cover)) return cover.startsWith("../") || !location.pathname.toLowerCase().includes("/pages/") ? cover : `../${cover}`;
  return `${location.pathname.toLowerCase().includes("/pages/") ? "../" : ""}assets/img/cover-placeholder.svg`;
};
const loanInfo = loan => ({ loan, book: bookById(loan.bookId), member: memberById(loan.memberId) });

function footer() {
  return `<footer class="site-footer"><div class="container"><div class="footer-grid">
    <div><a class="brand" href="${route("beranda")}"><span class="brand-mark">▣</span><span style="color:white">SMK AL HASRA<small>Perpustakaan Digital</small></span></a><p style="margin-top:15px">Menumbuhkan budaya literasi, kreativitas, dan semangat belajar bagi seluruh warga SMK AL HASRA.</p></div>
    <div><h3>Jelajahi</h3><div class="footer-links"><a href="${route("katalog")}">Katalog buku</a><a href="${route("login")}">Masuk anggota</a><a href="${route("register")}">Daftar anggota</a></div></div>
    <div><h3>Jam operasional</h3><p>Senin–Jumat<br>07.00–16.00 WIB<br>SMK AL HASRA</p></div>
  </div><div class="copyright">© 2026 Perpustakaan Digital SMK AL HASRA · Literasi untuk masa depan.</div></div></footer>`;
}
function drawCharts() {
  if (!window.Chart) return;
  const { months, catCounts } = staffStats();
  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
  const loansCanvas = document.getElementById("loansChart");
  const categoryCanvas = document.getElementById("categoryChart");
  if (loansCanvas) {
    loansCanvas.style.height = "210px";
    new Chart(loansCanvas, { type: "bar", data: { labels: months.map(item => item.label), datasets: [{ data: months.map(item => item.count), backgroundColor: "#4b9a82", borderRadius: 6 }] }, options: { ...chartOptions, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
    loansCanvas.nextElementSibling.style.display = "none";
  }
  if (categoryCanvas) {
    categoryCanvas.style.height = "205px";
    new Chart(categoryCanvas, { type: "doughnut", data: { labels: catCounts.map(item => item.category), datasets: [{ data: catCounts.map(item => item.count), backgroundColor: ["#176b61","#d6a84f","#6795a2","#b66f5e","#8b79a5"], borderWidth: 0 }] }, options: { ...chartOptions, plugins: { legend: { display: true, position: "bottom" } } } });
    categoryCanvas.nextElementSibling.style.display = "none";
  }
}

function bookCard(book) {
  const user = currentUser();
  const favorite = user && storage.get("wishlist").some(item => item.memberId === user.id && item.bookId === book.id);
  const borrowing = user?.role === studentRole && getTransactions().some(item => item.memberId === user.id && item.bookId === book.id && item.status !== "Dikembalikan");
  return `<article class="card book-card">
    <a href="${route("detail-buku")}?id=${encodeURIComponent(book.id)}" aria-label="Lihat detail ${escapeHtml(book.title)}"><img class="book-cover" src="${escapeHtml(coverUrl(book))}" alt="Sampul buku ${escapeHtml(book.title)}" onerror="this.src='${route("beranda").replace("index.html","assets/img/cover-placeholder.svg")}'"></a>
    <div class="book-info"><span class="book-category">${escapeHtml(book.category)}</span><h3 class="book-title"><a href="${route("detail-buku")}?id=${encodeURIComponent(book.id)}">${escapeHtml(book.title)}</a></h3><p class="book-author">${escapeHtml(book.author)} · ${escapeHtml(book.year)}</p>
    <div class="book-foot"><span class="badge ${book.stock > 0 ? "success" : "warning"}">${book.stock > 0 ? "Tersedia" : "Dipinjam"}</span>
    ${user?.role === studentRole ? `<div class="action-group"><button class="btn btn-quiet btn-sm" data-action="wishlist" data-id="${escapeHtml(book.id)}" aria-label="${favorite ? "Hapus dari" : "Tambahkan ke"} favorit">${favorite ? "♥" : "♡"}</button>${borrowing ? `<span class="badge info">Dipinjam</span>` : `<button class="btn btn-primary btn-sm" data-action="${book.stock > 0 ? "borrow" : "reserve"}" data-id="${escapeHtml(book.id)}">${book.stock > 0 ? "Pinjam" : "Reservasi"}</button>`}</div>` : `<span style="color:var(--muted);font-size:11px">★ ${escapeHtml(book.rating || "0.0")}</span>`}
    </div></div></article>`;
}

function heading(title, description, actions = "") {
  return `<div class="page-heading"><div><h1>${title}</h1><p>${description}</p></div>${actions}</div>`;
}

function adminShell(content) {
  const user = currentUser();
  return `${navbar(page)}<div class="admin-shell">${sidebar(page, user.role)}<main class="admin-content">${content}</main></div>${footer()}<div class="toast-region" aria-live="polite"></div>`;
}

function renderHome() {
  const books = getBooks();
  const transactions = getTransactions();
  const members = getMembers().filter(item => item.role === studentRole);
  const latest = [...books].sort((a, b) => Number(b.year) - Number(a.year)).slice(0, 4);
  const popular = [...books].sort((a, b) => Number(b.popularity) - Number(a.popularity)).slice(0, 4);
  root.innerHTML = `${navbar("beranda")}<main class="page-main">
    <section class="hero"><div class="container hero-inner"><div><span class="eyebrow">Ruang tumbuh generasi hebat</span><h1>Temukan cerita,<br>bangun masa depan.</h1><p>Jelajahi koleksi pilihan Perpustakaan Digital SMK AL HASRA. Temukan bacaan baru, pinjam dengan mudah, dan jadikan belajar lebih menyenangkan.</p><div class="hero-actions"><a class="btn btn-primary" href="${route("katalog")}">Jelajahi katalog <span aria-hidden="true">→</span></a><a class="btn btn-outline" href="${route("register")}">Gabung sebagai anggota</a></div></div><div class="hero-art" aria-hidden="true"><div class="art-disc"></div><div class="art-book"><span>▣</span><strong>BUKA BUKU,<br>BUKA DUNIA</strong></div></div></div></section>
    <section class="section" style="padding-bottom:15px"><div class="container stats-band" style="background:#176b61;border-radius:16px"><div><strong>${books.length}+</strong><span>Judul buku</span></div><div><strong>${members.length}+</strong><span>Anggota siswa</span></div><div><strong>${transactions.filter(item => item.status !== "Dikembalikan").length}+</strong><span>Peminjaman aktif</span></div></div></section>
    <section class="section"><div class="container"><div class="section-head"><div><span class="eyebrow">Baru di perpustakaan</span><h2>Buku pilihan terbaru</h2><p>Koleksi segar untuk menambah wawasanmu.</p></div><a class="btn btn-outline btn-sm" href="${route("katalog")}">Lihat semua buku →</a></div><div class="book-grid">${latest.map(bookCard).join("")}</div></div></section>
    <section class="section section-muted"><div class="container"><div class="section-head"><div><span class="eyebrow">Paling diminati</span><h2>Bacaan favorit siswa</h2><p>Temukan buku yang paling sering dibaca.</p></div></div><div class="book-grid">${popular.map(bookCard).join("")}</div></div></section>
    <section class="section"><div class="container"><div class="section-head"><div><span class="eyebrow">Koleksi tematik</span><h2>Jelajahi berdasarkan kategori</h2></div><a class="btn btn-quiet btn-sm" href="${route("katalog")}">Lihat katalog →</a></div><div class="category-grid">${categories.slice(0, 8).map((name, index) => `<a class="category-card" href="${route("katalog")}?kategori=${encodeURIComponent(name)}"><span>${["⌘","⌁","▧","✧","✎","▤","◇","⌬"][index]}</span>${name}<small>${books.filter(book => book.category === name).length} koleksi</small></a>`).join("")}</div></div></section>
    <section class="section section-muted"><div class="container about-grid"><div><span class="eyebrow">Tentang kami</span><h2>Tempat belajar yang terbuka untuk semua.</h2><p style="color:var(--muted);line-height:1.8">Perpustakaan SMK AL HASRA hadir untuk mendukung pembelajaran dan pengembangan minat baca. Temukan buku pelajaran, teknologi, fiksi, sains, dan banyak lagi dalam satu ruang digital.</p><a class="btn btn-primary" href="${route("katalog")}">Mulai membaca</a></div><div class="card card-pad"><h3>Jam layanan</h3><p>Senin – Jumat <strong style="float:right">07.00 – 16.00</strong></p><p>Sabtu & Minggu <strong style="float:right">Tutup</strong></p><hr style="border:0;border-top:1px solid var(--line)"><p style="margin:0;color:var(--muted)">Butuh bantuan? Kunjungi petugas perpustakaan di sekolah.</p></div></div></section>
  </main>${footer()}<div class="toast-region" aria-live="polite"></div>`;
}

function renderCatalog() {
  const params = new URLSearchParams(location.search);
  if (!state.category && params.get("kategori")) state.category = params.get("kategori");
  let books = getBooks().filter(book => {
    const term = state.search.toLocaleLowerCase("id");
    const matches = !term || [book.title, book.author, book.isbn].some(value => String(value).toLocaleLowerCase("id").includes(term));
    return matches && (!state.category || book.category === state.category) &&
      (!state.availability || (state.availability === "available" ? book.stock > 0 : book.stock === 0));
  });
  if (state.sort === "newest") books.sort((a, b) => Number(b.year) - Number(a.year));
  if (state.sort === "az") books.sort((a, b) => a.title.localeCompare(b.title, "id"));
  if (state.sort === "popular") books.sort((a, b) => b.popularity - a.popularity);
  const pageCount = Math.max(1, Math.ceil(books.length / CONFIG.pageSize));
  state.page = Math.min(state.page, pageCount);
  const shown = books.slice((state.page - 1) * CONFIG.pageSize, state.page * CONFIG.pageSize);
  root.innerHTML = `${navbar("katalog")}<main class="page-main section"><div class="container">
    ${heading("Katalog buku", "Temukan bacaan yang mendukung pelajaran dan minatmu.")}
    <div class="catalog-controls"><input class="input" id="catalogSearch" type="search" placeholder="Cari judul, penulis, atau ISBN..." value="${escapeHtml(state.search)}" aria-label="Cari buku">
      <select class="select" id="categoryFilter" aria-label="Filter kategori"><option value="">Semua kategori</option>${categories.map(item => `<option ${state.category === item ? "selected" : ""}>${item}</option>`).join("")}</select>
      <select class="select" id="availabilityFilter" aria-label="Filter ketersediaan"><option value="">Semua status</option><option value="available" ${state.availability === "available" ? "selected" : ""}>Tersedia</option><option value="unavailable" ${state.availability === "unavailable" ? "selected" : ""}>Stok habis</option></select>
      <select class="select" id="sortFilter" aria-label="Urutkan"><option value="newest" ${state.sort === "newest" ? "selected" : ""}>Terbaru</option><option value="az" ${state.sort === "az" ? "selected" : ""}>Judul A–Z</option><option value="popular" ${state.sort === "popular" ? "selected" : ""}>Terpopuler</option></select>
      <div class="view-toggle"><button class="btn btn-outline btn-sm" data-action="view" data-view="grid" aria-pressed="${state.view === "grid"}">▦</button><button class="btn btn-outline btn-sm" data-action="view" data-view="list" aria-pressed="${state.view === "list"}">☷</button></div></div>
    <p style="color:var(--muted);font-size:13px;margin-bottom:17px">${books.length} buku ditemukan</p>
    ${shown.length ? `<div class="book-grid" style="${state.view === "list" ? "grid-template-columns:1fr" : ""}">${shown.map(bookCard).join("")}</div>${pagination(books.length, state.page, CONFIG.pageSize)}` : `<div class="card empty-state"><div class="empty-icon">⌕</div><h3>Buku tidak ditemukan</h3><p>Coba ubah kata kunci atau filter pencarian.</p><button class="btn btn-outline btn-sm" data-action="clear-filters">Hapus filter</button></div>`}
  </div></main>${footer()}<div class="toast-region" aria-live="polite"></div>`;
}

function renderDetail() {
  const book = getBook(new URLSearchParams(location.search).get("id")) || getBooks()[0];
  const related = getBooks().filter(item => item.category === book.category && item.id !== book.id).slice(0, 4);
  const user = currentUser();
  const existingReview = storage.get("reviews").find(review => review.bookId === book.id && review.memberId === user?.id);
  const activeLoan = user && getTransactions().some(loan => loan.memberId === user.id && loan.bookId === book.id && loan.status !== "Dikembalikan");
  root.innerHTML = `${navbar("katalog")}<main class="page-main section"><div class="container">
    <a class="btn btn-quiet btn-sm" href="${route("katalog")}">← Kembali ke katalog</a><div class="detail-grid" style="margin-top:26px">
      <img class="detail-cover" src="${escapeHtml(coverUrl(book))}" alt="Sampul ${escapeHtml(book.title)}">
      <div class="detail-copy"><span class="book-category">${escapeHtml(book.category)}</span><h1>${escapeHtml(book.title)}</h1><p style="color:var(--muted)">oleh ${escapeHtml(book.author)}</p>
        <div class="detail-meta"><span>★ ${escapeHtml(book.rating || "0.0")}</span><span>${escapeHtml(book.year)}</span><span>${escapeHtml(book.publisher || "-")}</span><span>ISBN ${escapeHtml(book.isbn)}</span></div>
        <p>${escapeHtml(book.synopsis || "Belum ada sinopsis untuk buku ini.")}</p><p><strong>Stok tersedia:</strong> ${escapeHtml(book.stock)} buku · <span class="badge ${book.stock ? "success" : "warning"}">${book.stock ? "Tersedia" : "Stok habis"}</span></p>
        <div class="action-group">${user?.role === studentRole ? (activeLoan ? `<span class="badge info">Sedang Anda pinjam</span>` : book.stock ? `<button class="btn btn-primary" data-action="borrow" data-id="${escapeHtml(book.id)}">Pinjam buku</button>` : `<button class="btn btn-primary" data-action="reserve" data-id="${escapeHtml(book.id)}">Reservasi buku</button>`) : `<a class="btn btn-primary" href="${route("login")}">Masuk untuk meminjam</a>`}
        </div>
        ${existingReview ? `<div class="card card-pad" style="margin-top:20px"><strong>Ulasan Anda</strong><p style="margin:8px 0 0">${"★".repeat(Math.min(5, Math.max(1, Number(existingReview.rating) || 1)))} · ${escapeHtml(existingReview.text)}</p></div>` : ""}
      </div></div>
      ${related.length ? `<section style="margin-top:60px"><div class="section-head"><div><h2>Buku terkait</h2><p>Koleksi lain dari kategori ${escapeHtml(book.category)}.</p></div></div><div class="book-grid">${related.map(bookCard).join("")}</div></section>` : ""}
      ${user?.role === studentRole && getTransactions().some(loan => loan.memberId === user.id && loan.bookId === book.id && loan.status === "Dikembalikan") && !existingReview ? `<form id="reviewForm" class="card card-pad" style="margin-top:24px"><h3>Beri rating dan ulasan</h3><input type="hidden" name="bookId" value="${escapeHtml(book.id)}"><div class="field"><label for="reviewRating">Rating</label><select class="select" id="reviewRating" name="rating"><option value="5">5 - Sangat baik</option><option value="4">4 - Baik</option><option value="3">3 - Cukup</option><option value="2">2 - Kurang</option><option value="1">1 - Buruk</option></select></div><div class="field"><label for="reviewText">Ulasan</label><textarea class="textarea" id="reviewText" name="text" required maxlength="500"></textarea></div><button class="btn btn-primary">Kirim ulasan</button></form>` : ""}
  </div></main>${footer()}<div class="toast-region" aria-live="polite"></div>`;
}

function renderLogin() {
  root.innerHTML = `${navbar()}<main class="auth-page"><form id="loginForm" class="card auth-card"><span class="eyebrow">Selamat datang kembali</span><h1>Masuk ke akunmu</h1><p>Gunakan akun perpustakaan SMK AL HASRA untuk melanjutkan.</p>
    <div class="field"><label for="username">NIS, nama pengguna, atau email</label><input class="input" id="username" name="username" autocomplete="username" required></div>
    <div class="field"><label for="password">Kata sandi</label><input class="input" id="password" name="password" type="password" autocomplete="current-password" required></div>
    <div id="formError" class="field-error" role="alert"></div><button class="btn btn-primary" style="width:100%">Masuk</button>
    <p style="margin:18px 0 0">Belum memiliki akun? <a href="${route("register")}" style="color:var(--brand);font-weight:700">Daftar siswa</a></p>
    <details style="margin-top:18px;color:var(--muted);font-size:12px"><summary>Akun demo</summary><p>Admin: admin / admin123<br>Petugas: petugas / petugas123<br>Siswa: 20250001 / siswa123</p></details>
  </form></main>${footer()}<div class="toast-region" aria-live="polite"></div>`;
}

function renderRegister() {
  root.innerHTML = `${navbar()}<main class="auth-page"><form id="registerForm" class="card auth-card"><span class="eyebrow">Anggota baru</span><h1>Daftar siswa</h1><p>Isi data diri untuk bergabung dengan perpustakaan digital.</p>
    <div class="field"><label for="name">Nama lengkap</label><input class="input" id="name" name="name" required autocomplete="name"></div>
    <div class="field"><label for="nis">NIS</label><input class="input" id="nis" name="nis" required inputmode="numeric" pattern="[0-9]{5,15}" title="NIS berisi 5 sampai 15 angka"></div>
    <div class="field"><label for="className">Kelas</label><input class="input" id="className" name="className" required placeholder="Contoh: XI RPL-1"></div>
    <div class="field"><label for="major">Jurusan</label><select class="select" id="major" name="major" required><option value="">Pilih jurusan</option><option>RPL</option><option>TKJ</option><option>AKL</option><option>OTKP</option></select></div>
    <div class="field"><label for="email">Email</label><input class="input" id="email" name="email" type="email" required autocomplete="email"></div>
    <div class="field"><label for="password">Kata sandi (min. 6 karakter)</label><input class="input" id="password" name="password" type="password" minlength="6" required autocomplete="new-password"></div>
    <div class="field"><label for="passwordConfirm">Ulangi kata sandi</label><input class="input" id="passwordConfirm" name="passwordConfirm" type="password" minlength="6" required autocomplete="new-password"></div>
    <div id="formError" class="field-error" role="alert"></div><button class="btn btn-primary" style="width:100%">Buat akun</button>
    <p style="margin:18px 0 0">Sudah punya akun? <a href="${route("login")}" style="color:var(--brand);font-weight:700">Masuk</a></p>
  </form></main>${footer()}<div class="toast-region" aria-live="polite"></div>`;
}

function renderStudentDashboard(user) {
  const loans = getTransactions().filter(item => item.memberId === user.id);
  const active = loans.filter(item => item.status !== "Dikembalikan");
  const late = active.filter(item => item.dueDate < today());
  const fine = loans.filter(item => !item.finePaid).reduce((sum, item) => sum + item.fine, 0);
  const dueSoon = active.filter(item => item.dueDate >= today() && (new Date(item.dueDate) - new Date(today())) / 86400000 <= 2);
  const reminders = [...late, ...dueSoon].map(item => `<li>${escapeHtml(bookById(item.bookId)?.title || "Buku")} — ${late.includes(item) ? "sudah melewati jatuh tempo" : `jatuh tempo ${formatDate(item.dueDate)}`}</li>`).join("");
  return adminShell(`${heading(`Halo, ${escapeHtml(user.name.split(" ")[0])} 👋`, "Pantau pinjaman dan temukan bacaan berikutnya.", `<a class="btn btn-primary" href="${route("katalog")}">Cari buku</a>`)}
    ${late.length ? `<div class="card card-pad" style="margin-bottom:18px;border-color:#e7b5b6"><strong>Pengingat jatuh tempo</strong><ul>${reminders}</ul></div>` : dueSoon.length ? `<div class="card card-pad" style="margin-bottom:18px"><strong>Pengingat jatuh tempo</strong><ul>${reminders}</ul></div>` : ""}
    <div class="stats-grid"><div class="card stat-card"><div class="stat-label">Pinjaman aktif</div><div class="stat-value">${active.length}</div><div class="stat-note">Maksimal ${CONFIG.maxActiveLoans} buku</div></div><div class="card stat-card"><div class="stat-label">Terlambat</div><div class="stat-value">${late.length}</div><div class="stat-note">Segera kembalikan buku</div></div><div class="card stat-card"><div class="stat-label">Total denda</div><div class="stat-value" style="font-size:21px">${formatCurrency(fine)}</div><div class="stat-note">${fine ? "Hubungi petugas untuk membayar" : "Tidak ada denda tertunggak"}</div></div><div class="card stat-card"><div class="stat-label">Total riwayat</div><div class="stat-value">${loans.length}</div><div class="stat-note">Terima kasih sudah membaca</div></div></div>
    <section class="card card-pad"><div class="section-head"><div><h2 style="font-size:19px">Pinjaman saya</h2><p>Perpanjang sebelum tanggal jatuh tempo.</p></div><a class="btn btn-outline btn-sm" href="${route("riwayat")}">Lihat riwayat</a></div>
    ${active.length ? `<div class="table-wrap"><table><thead><tr><th>Buku</th><th>Tanggal pinjam</th><th>Jatuh tempo</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${active.map(loan => `<tr><td>${escapeHtml(bookById(loan.bookId)?.title || "Buku")}</td><td>${formatDate(loan.borrowDate)}</td><td>${formatDate(loan.dueDate)}</td><td><span class="badge ${loan.dueDate < today() ? "danger" : "success"}">${loan.dueDate < today() ? "Terlambat" : "Aktif"}</span></td><td>${loan.renewals < CONFIG.maxRenewals && loan.dueDate >= today() ? `<button class="btn btn-outline btn-sm" data-action="renew" data-id="${escapeHtml(loan.id)}">Perpanjang</button>` : "—"}</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty-state"><p>Belum ada pinjaman aktif. Cari buku yang menarik untukmu!</p><a class="btn btn-primary btn-sm" href="${route("katalog")}">Jelajahi buku</a></div>`}
    </section><section class="card card-pad" style="margin-top:18px"><h2 style="font-size:19px">Favorit saya</h2><div class="book-grid">${storage.get("wishlist").filter(item => item.memberId === user.id).map(item => bookById(item.bookId)).filter(Boolean).slice(0,4).map(bookCard).join("") || `<p style="color:var(--muted)">Belum ada buku favorit.</p>`}</div></section>`);
}

function staffStats() {
  const loans = getTransactions();
  const books = getBooks();
  const active = loans.filter(item => item.status !== "Dikembalikan");
  const overdue = active.filter(item => item.dueDate < today());
  const catCounts = categories.map(category => ({
    category,
    count: loans.reduce((sum, loan) => sum + (books.find(book => book.id === loan.bookId)?.category === category ? 1 : 0), 0)
  })).sort((a, b) => b.count - a.count).slice(0, 5);
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(); date.setMonth(date.getMonth() - (5 - index));
    const label = date.toLocaleDateString("id-ID", { month: "short" });
    const count = loans.filter(loan => { const loanDate = new Date(loan.borrowDate); return loanDate.getMonth() === date.getMonth() && loanDate.getFullYear() === date.getFullYear(); }).length;
    return { label, count };
  });
  return { loans, books, active, overdue, catCounts, months };
}

function renderAdminDashboard() {
  const { loans, books, active, overdue, catCounts, months } = staffStats();
  const max = Math.max(1, ...months.map(item => item.count));
  const chart = `<div class="card chart-panel"><h3>Tren peminjaman</h3><canvas id="loansChart" aria-label="Grafik peminjaman per bulan"></canvas><div class="chart-bars">${months.map(item => `<div class="chart-column"><div class="chart-bar" style="height:${Math.max(5, item.count / max * 150)}px" title="${item.count} peminjaman"></div>${item.label}<small>${item.count}</small></div>`).join("")}</div></div>`;
  const categoriesChart = `<div class="card card-pad"><h3>Kategori terpopuler</h3><canvas id="categoryChart" aria-label="Grafik kategori terpopuler"></canvas>${catCounts.map(item => `<div style="margin:13px 0"><div style="display:flex;justify-content:space-between;font-size:12px"><span>${item.category}</span><strong>${item.count}</strong></div><div style="height:7px;border-radius:9px;background:var(--brand-soft);margin-top:5px"><div style="width:${Math.min(100, item.count / Math.max(1, catCounts[0].count) * 100)}%;height:100%;background:#4b9a82;border-radius:9px"></div></div></div>`).join("")}</div>`;
  return adminShell(`${heading(`Selamat datang, ${escapeHtml(currentUser().name)}`, "Ringkasan aktivitas perpustakaan hari ini.", `<button class="btn btn-outline" data-action="backup">⇩ Cadangkan data</button>`)}
    <div class="stats-grid"><div class="card stat-card"><div class="stat-label">Koleksi buku</div><div class="stat-value">${books.length}</div><div class="stat-note">Judul dalam katalog</div></div><div class="card stat-card"><div class="stat-label">Anggota siswa</div><div class="stat-value">${getMembers().filter(item => item.role === studentRole).length}</div><div class="stat-note">Anggota aktif</div></div><div class="card stat-card"><div class="stat-label">Sedang dipinjam</div><div class="stat-value">${active.length}</div><div class="stat-note">Belum dikembalikan</div></div><div class="card stat-card"><div class="stat-label">Terlambat</div><div class="stat-value">${overdue.length}</div><div class="stat-note">Perlu tindak lanjut</div></div></div>
    <div class="dashboard-charts">${chart}${categoriesChart}</div>
    <section class="card card-pad"><div class="section-head"><div><h2 style="font-size:19px">Aktivitas terbaru</h2><p>Transaksi peminjaman terbaru.</p></div><a class="btn btn-outline btn-sm" href="${route("riwayat")}">Semua transaksi</a></div>
    <div class="table-wrap"><table><thead><tr><th>Anggota</th><th>Buku</th><th>Tanggal pinjam</th><th>Status</th></tr></thead><tbody>${loans.slice(-5).reverse().map(loan => { const { book, member } = loanInfo(loan); return `<tr><td>${escapeHtml(member?.name || "—")}</td><td>${escapeHtml(book?.title || "—")}</td><td>${formatDate(loan.borrowDate)}</td><td><span class="badge ${loan.status === "Dikembalikan" ? "success" : loan.dueDate < today() ? "danger" : "info"}">${loan.status === "Dikembalikan" ? "Dikembalikan" : loan.dueDate < today() ? "Terlambat" : "Aktif"}</span></td></tr>`; }).join("")}</tbody></table></div></section>`);
}

function renderBooks() {
  const books = getBooks().filter(book => !state.search || `${book.title} ${book.author} ${book.isbn}`.toLowerCase().includes(state.search.toLowerCase()));
  const shown = books.slice((state.page - 1) * CONFIG.pageSize, state.page * CONFIG.pageSize);
  const book = state.editing ? bookById(state.editing) : null;
  return adminShell(`${heading("Kelola buku", "Tambah, perbarui, dan atur koleksi perpustakaan.", `<button class="btn btn-primary" data-action="new-book">＋ Tambah buku</button>`)}
    ${book || state.editing === "new" ? `<form id="bookForm" class="card card-pad" style="margin-bottom:22px"><h2 style="font-size:19px">${book ? "Edit buku" : "Tambah buku baru"}</h2><input type="hidden" name="id" value="${book ? escapeHtml(book.id) : ""}">
      <div class="form-grid"><div class="field"><label for="bookTitle">Judul buku</label><input class="input" id="bookTitle" name="title" required value="${escapeHtml(book?.title || "")}"></div><div class="field"><label for="author">Penulis</label><input class="input" id="author" name="author" required value="${escapeHtml(book?.author || "")}"></div>
      <div class="field"><label for="isbn">ISBN unik</label><input class="input" id="isbn" name="isbn" required value="${escapeHtml(book?.isbn || "")}"></div><div class="field"><label for="category">Kategori</label><select class="select" id="category" name="category" required><option value="">Pilih kategori</option>${categories.map(item => `<option ${book?.category === item ? "selected" : ""}>${item}</option>`).join("")}</select></div>
      <div class="field"><label for="year">Tahun terbit</label><input class="input" id="year" name="year" type="number" min="1900" max="2035" required value="${escapeHtml(book?.year || new Date().getFullYear())}"></div><div class="field"><label for="publisher">Penerbit</label><input class="input" id="publisher" name="publisher" required value="${escapeHtml(book?.publisher || "")}"></div>
      <div class="field"><label for="stock">Stok</label><input class="input" id="stock" name="stock" type="number" min="0" required value="${escapeHtml(book?.stock ?? 1)}"></div><div class="field"><label for="cover">Sampul (opsional, maks. 1 MB)</label><input class="input" id="cover" name="coverFile" type="file" accept="image/*"><input type="hidden" name="oldCover" value="${escapeHtml(book?.cover || "assets/img/cover-placeholder.svg")}"></div>
      <div class="field" style="grid-column:1/-1"><label for="synopsis">Sinopsis</label><textarea class="textarea" id="synopsis" name="synopsis">${escapeHtml(book?.synopsis || "")}</textarea></div></div><div id="formError" class="field-error"></div><div class="action-group"><button class="btn btn-primary">Simpan buku</button><button class="btn btn-outline" type="button" data-action="cancel-edit">Batal</button></div></form>` : ""}
    <div class="toolbar"><input class="input" id="tableSearch" type="search" aria-label="Cari buku" placeholder="Cari judul, penulis, atau ISBN..." value="${escapeHtml(state.search)}"><span style="font-size:12px;color:var(--muted)">${books.length} buku</span></div>
    ${shown.length ? `<div class="table-wrap"><table><thead><tr><th>Judul</th><th>Penulis</th><th>Kategori</th><th>ISBN</th><th>Stok</th><th>Aksi</th></tr></thead><tbody>${shown.map(item => `<tr><td><strong>${escapeHtml(item.title)}</strong><br><small>${escapeHtml(item.year)}</small></td><td>${escapeHtml(item.author)}</td><td>${escapeHtml(item.category)}</td><td>${escapeHtml(item.isbn)}</td><td>${escapeHtml(item.stock)}</td><td><div class="action-group"><button class="btn btn-outline btn-sm" data-action="edit-book" data-id="${escapeHtml(item.id)}">Edit</button><button class="btn btn-danger btn-sm" data-action="delete-book" data-id="${escapeHtml(item.id)}">Hapus</button></div></td></tr>`).join("")}</tbody></table></div>${pagination(books.length, state.page, CONFIG.pageSize)}` : `<div class="card empty-state">Belum ada data buku.</div>`}`);
}

function renderMembers() {
  const members = getMembers().filter(member => member.role === studentRole && (!state.search || `${member.name} ${member.nis} ${member.email}`.toLowerCase().includes(state.search.toLowerCase())));
  const shown = members.slice((state.page - 1) * CONFIG.pageSize, state.page * CONFIG.pageSize);
  const member = state.editing && state.editing !== "new" ? memberById(state.editing) : null;
  return adminShell(`${heading("Kelola anggota", "Kelola data dan status anggota siswa.", `<button class="btn btn-primary" data-action="new-member">＋ Tambah anggota</button>`)}
    ${state.editing ? `<form id="memberForm" class="card card-pad" style="margin-bottom:22px"><h2 style="font-size:19px">${member ? "Edit anggota" : "Tambah anggota"}</h2><input type="hidden" name="id" value="${escapeHtml(member?.id || "")}">
    <div class="form-grid"><div class="field"><label for="memberName">Nama lengkap</label><input class="input" id="memberName" name="name" required value="${escapeHtml(member?.name || "")}"></div><div class="field"><label for="memberNis">NIS</label><input class="input" id="memberNis" name="nis" required value="${escapeHtml(member?.nis || "")}"></div>
    <div class="field"><label for="memberClass">Kelas</label><input class="input" id="memberClass" name="className" required value="${escapeHtml(member?.className || "")}"></div><div class="field"><label for="memberMajor">Jurusan</label><input class="input" id="memberMajor" name="major" required value="${escapeHtml(member?.major || "")}"></div>
    <div class="field"><label for="memberEmail">Email</label><input class="input" id="memberEmail" name="email" type="email" required value="${escapeHtml(member?.email || "")}"></div></div><div id="formError" class="field-error"></div><div class="action-group"><button class="btn btn-primary">Simpan anggota</button><button class="btn btn-outline" type="button" data-action="cancel-edit">Batal</button></div></form>` : ""}
    <div class="toolbar"><input class="input" id="tableSearch" type="search" aria-label="Cari anggota" placeholder="Cari nama, NIS, atau email..." value="${escapeHtml(state.search)}"><span style="color:var(--muted);font-size:12px">${members.length} anggota</span></div>
    <div class="table-wrap"><table><thead><tr><th>Nama</th><th>NIS</th><th>Kelas</th><th>Email</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${shown.map(item => `<tr><td><strong>${escapeHtml(item.name)}</strong></td><td>${escapeHtml(item.nis)}</td><td>${escapeHtml(item.className || "-")}</td><td>${escapeHtml(item.email)}</td><td><span class="badge ${item.active ? "success" : "warning"}">${item.active ? "Aktif" : "Nonaktif"}</span></td><td><div class="action-group"><button class="btn btn-outline btn-sm" data-action="edit-member" data-id="${escapeHtml(item.id)}">Edit</button><button class="btn btn-outline btn-sm" data-action="toggle-member" data-id="${escapeHtml(item.id)}">${item.active ? "Nonaktifkan" : "Aktifkan"}</button><button class="btn btn-outline btn-sm" data-action="reset-password" data-id="${escapeHtml(item.id)}">Reset sandi</button><button class="btn btn-danger btn-sm" data-action="delete-member" data-id="${escapeHtml(item.id)}">Hapus</button></div></td></tr>`).join("")}</tbody></table></div>${pagination(members.length, state.page, CONFIG.pageSize)}`);
}

function renderLoans(mode) {
  const isReturn = mode === "pengembalian";
  const pendingReservations = storage.get("reservations").filter(item => item.status === "Menunggu");
  const unpaidFines = isReturn ? getTransactions().filter(item => item.fine > 0 && !item.finePaid) : [];
  const loans = getTransactions().filter(item => isReturn ? item.status !== "Dikembalikan" : true).slice().reverse();
  const form = isReturn ? "" : `<form id="loanForm" class="card card-pad" style="margin-bottom:22px"><h2 style="font-size:19px">Catat peminjaman</h2><div class="form-grid">
    <div class="field"><label for="loanMember">Anggota</label><select class="select" id="loanMember" name="memberId" required><option value="">Pilih anggota</option>${getMembers().filter(item => item.role === studentRole && item.active).map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)} — ${escapeHtml(item.nis)}</option>`).join("")}</select></div>
    <div class="field"><label for="loanBook">Buku tersedia</label><select class="select" id="loanBook" name="bookId" required><option value="">Pilih buku</option>${getBooks().filter(item => item.stock > 0).map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.title)} (stok ${item.stock})</option>`).join("")}</select></div></div><div id="formError" class="field-error"></div><button class="btn btn-primary">Simpan peminjaman</button></form>`;
  const reservationSection = !isReturn && pendingReservations.length ? `<section class="card card-pad" style="margin-bottom:22px"><h2 style="font-size:19px">Reservasi menunggu persetujuan</h2><div class="table-wrap"><table><thead><tr><th>Anggota</th><th>Buku</th><th>Tanggal</th><th>Aksi</th></tr></thead><tbody>${pendingReservations.map(reservation => `<tr><td>${escapeHtml(memberById(reservation.memberId)?.name || "-")}</td><td>${escapeHtml(bookById(reservation.bookId)?.title || "-")}</td><td>${formatDate(reservation.date)}</td><td><button class="btn btn-primary btn-sm" data-action="approve-reservation" data-id="${escapeHtml(reservation.id)}">Setujui & pinjam</button> <button class="btn btn-outline btn-sm" data-action="reject-reservation" data-id="${escapeHtml(reservation.id)}">Tolak</button></td></tr>`).join("")}</tbody></table></div></section>` : "";
  const fineSection = unpaidFines.length ? `<section class="card card-pad" style="margin-bottom:22px"><h2 style="font-size:19px">Denda belum lunas</h2><div class="table-wrap"><table><thead><tr><th>Anggota</th><th>Buku</th><th>Denda</th><th>Aksi</th></tr></thead><tbody>${unpaidFines.map(loan => `<tr><td>${escapeHtml(memberById(loan.memberId)?.name || "-")}</td><td>${escapeHtml(bookById(loan.bookId)?.title || "-")}</td><td>${formatCurrency(loan.fine)}</td><td><button class="btn btn-primary btn-sm" data-action="pay-fine" data-id="${escapeHtml(loan.id)}">Tandai lunas</button></td></tr>`).join("")}</tbody></table></div></section>` : "";
  return adminShell(`${heading(isReturn ? "Pengembalian buku" : "Peminjaman buku", isReturn ? "Catat pengembalian dan selesaikan denda." : "Catat peminjaman, atau setujui reservasi anggota.")}${form}${reservationSection}${fineSection}
    <section class="card card-pad"><h2 style="font-size:19px">${isReturn ? "Buku yang belum dikembalikan" : "Transaksi terbaru"}</h2><div class="table-wrap"><table><thead><tr><th>Anggota</th><th>Buku</th><th>Tanggal pinjam</th><th>Jatuh tempo</th><th>Status</th>${isReturn ? "<th>Aksi</th>" : ""}</tr></thead><tbody>${loans.length ? loans.map(loan => { const { book, member } = loanInfo(loan); const overdue = loan.status !== "Dikembalikan" && loan.dueDate < today(); return `<tr><td>${escapeHtml(member?.name || "—")}</td><td>${escapeHtml(book?.title || "—")}</td><td>${formatDate(loan.borrowDate)}</td><td>${formatDate(loan.dueDate)}</td><td><span class="badge ${loan.status === "Dikembalikan" ? "success" : overdue ? "danger" : "info"}">${loan.status === "Dikembalikan" ? "Dikembalikan" : overdue ? "Terlambat" : "Aktif"}</span></td>${isReturn ? `<td><button class="btn btn-primary btn-sm" data-action="return" data-id="${escapeHtml(loan.id)}">Proses kembali</button></td>` : ""}</tr>`; }).join("") : `<tr><td colspan="6">Tidak ada transaksi.</td></tr>`}</tbody></table></div></section>`);
}

function renderHistory(user) {
  const all = getTransactions().filter(item => user.role !== studentRole || item.memberId === user.id).slice().reverse();
  const loans = all.filter(item => !state.search || `${bookById(item.bookId)?.title} ${memberById(item.memberId)?.name} ${item.status}`.toLowerCase().includes(state.search.toLowerCase()));
  return adminShell(`${heading("Riwayat transaksi", user.role === studentRole ? "Semua aktivitas peminjaman bukumu." : "Telusuri transaksi peminjaman perpustakaan.")}<div class="toolbar"><input class="input" id="tableSearch" aria-label="Cari transaksi" placeholder="Cari judul buku, nama, atau status..." value="${escapeHtml(state.search)}"></div>
    ${loans.length ? `<div class="table-wrap"><table><thead><tr>${user.role === studentRole ? "" : "<th>Anggota</th>"}<th>Buku</th><th>Dipinjam</th><th>Jatuh tempo</th><th>Dikembalikan</th><th>Denda</th><th>Status</th></tr></thead><tbody>${loans.map(item => { const { book, member } = loanInfo(item); return `<tr>${user.role === studentRole ? "" : `<td>${escapeHtml(member?.name || "-")}</td>`}<td>${escapeHtml(book?.title || "-")}</td><td>${formatDate(item.borrowDate)}</td><td>${formatDate(item.dueDate)}</td><td>${formatDate(item.returnDate)}</td><td>${item.fine ? `${formatCurrency(item.fine)}${item.finePaid ? " (lunas)" : ""}` : "—"}</td><td><span class="badge ${item.status === "Dikembalikan" ? "success" : item.dueDate < today() ? "danger" : "info"}">${item.status === "Dikembalikan" ? "Dikembalikan" : item.dueDate < today() ? "Terlambat" : "Aktif"}</span></td></tr>`; }).join("")}</tbody></table></div>` : `<div class="card empty-state">Belum ada riwayat transaksi.</div>`}`);
}

function renderReports() {
  const rows = getTransactions().map(loan => ({ loan, book: bookById(loan.bookId), member: memberById(loan.memberId) }));
  const type = new URLSearchParams(location.search).get("jenis") || "peminjaman";
  const data = rows.filter(({ loan }) => (!state.reportStart || loan.borrowDate >= state.reportStart) && (!state.reportEnd || loan.borrowDate <= state.reportEnd));
  const reportRows = type === "denda" ? data.filter(item => item.loan.fine) : data;
  const popularBooks = getBooks().map(book => ({ book, count: data.filter(item => item.loan.bookId === book.id).length })).sort((a, b) => b.count - a.count);
  const activeMembers = getMembers().filter(item => item.role === studentRole).map(member => ({ member, count: data.filter(item => item.loan.memberId === member.id).length })).sort((a, b) => b.count - a.count);
  return adminShell(`${heading("Laporan perpustakaan", "Tinjau aktivitas, denda, buku terpopuler, dan anggota aktif.", `<div class="action-group"><button class="btn btn-outline" data-action="export-report">⇩ Ekspor CSV</button><button class="btn btn-outline" data-action="print">Cetak</button></div>`)}
    <div class="toolbar"><label for="reportType" style="font-size:12px">Jenis laporan</label><select class="select" id="reportType"><option value="peminjaman" ${type === "peminjaman" ? "selected" : ""}>Peminjaman</option><option value="denda" ${type === "denda" ? "selected" : ""}>Denda</option><option value="buku" ${type === "buku" ? "selected" : ""}>Buku terpopuler</option><option value="anggota" ${type === "anggota" ? "selected" : ""}>Anggota teraktif</option></select>
      <label for="reportStart" style="font-size:12px">Dari</label><input class="input" type="date" id="reportStart" value="${escapeHtml(state.reportStart || "")}"><label for="reportEnd" style="font-size:12px">Sampai</label><input class="input" type="date" id="reportEnd" value="${escapeHtml(state.reportEnd || "")}"></div>
    ${type === "buku" ? `<div class="table-wrap"><table><thead><tr><th>Judul buku</th><th>Kategori</th><th>Total peminjaman</th></tr></thead><tbody>${popularBooks.map(({book,count}) => `<tr><td>${escapeHtml(book.title)}</td><td>${escapeHtml(book.category)}</td><td>${count}</td></tr>`).join("")}</tbody></table></div>` : type === "anggota" ? `<div class="table-wrap"><table><thead><tr><th>Anggota</th><th>NIS</th><th>Total peminjaman</th></tr></thead><tbody>${activeMembers.map(({member,count})=>`<tr><td>${escapeHtml(member.name)}</td><td>${escapeHtml(member.nis)}</td><td>${count}</td></tr>`).join("")}</tbody></table></div>` :
    `<div class="stats-grid"><div class="card stat-card"><div class="stat-label">Jumlah transaksi</div><div class="stat-value">${reportRows.length}</div></div><div class="card stat-card"><div class="stat-label">Total denda</div><div class="stat-value" style="font-size:21px">${formatCurrency(reportRows.reduce((sum,item)=>sum+item.loan.fine,0))}</div></div><div class="card stat-card"><div class="stat-label">Denda belum lunas</div><div class="stat-value">${reportRows.filter(item=>item.loan.fine&&!item.loan.finePaid).length}</div></div><div class="card stat-card"><div class="stat-label">Tarif denda</div><div class="stat-value" style="font-size:19px">${formatCurrency(CONFIG.finePerDay)}/hari</div></div></div>
    <div class="table-wrap"><table><thead><tr><th>Anggota</th><th>Buku</th><th>Tanggal pinjam</th><th>Tanggal kembali</th><th>Denda</th><th>Status</th></tr></thead><tbody>${reportRows.map(({loan,book,member})=>`<tr><td>${escapeHtml(member?.name||"-")}</td><td>${escapeHtml(book?.title||"-")}</td><td>${formatDate(loan.borrowDate)}</td><td>${formatDate(loan.returnDate)}</td><td>${formatCurrency(loan.fine)}</td><td>${escapeHtml(loan.finePaid?"Lunas":loan.fine?"Belum lunas":loan.status)}</td></tr>`).join("")}</tbody></table></div>`}
    <section class="card card-pad no-print" style="margin-top:22px"><h2 style="font-size:18px">Cadangan data</h2><p style="color:var(--muted);font-size:13px">Simpan seluruh data perpustakaan atau pulihkan dari berkas JSON.</p><div class="action-group"><button class="btn btn-outline" data-action="backup">Unduh cadangan JSON</button><label class="btn btn-outline" for="restoreFile">Pulihkan JSON</label><input id="restoreFile" type="file" accept="application/json,.json" hidden></div></section>`);
}

function renderProfile(user) {
  const member = memberById(user.id);
  const myLoans = getTransactions().filter(item => item.memberId === user.id);
  const barcodeValue = String(member?.nis || "000000").replace(/\D/g, "").slice(0, 15) || "000000";
  const barcodePatterns = ["nnnwwnwnn","wnnwnnnnw","nnwwnnnnw","wnwwnnnnn","nnnwwnnnw","wnnwwnnnn","nnwwwnnnn","nnnwnnwnw","wnnwnnwnn","nnwwnnwnn"];
  const barcodeCodes = `*${barcodeValue}*`;
  let barcodeWidth = 0;
  const barcodeRects = [];
  for (const digit of barcodeCodes) {
    const pattern = digit === "*" ? "nwnnwnwnn" : barcodePatterns[Number(digit)];
    [...pattern].forEach((width, index) => {
      const scaled = width === "w" ? 3 : 1;
      if (index % 2 === 0) barcodeRects.push(`<rect x="${barcodeWidth}" y="0" width="${scaled}" height="38"/>`);
      barcodeWidth += scaled;
    });
    barcodeWidth += 1;
  }
  const barcodeSvg = `<svg role="img" aria-label="Kode batang NIS ${escapeHtml(barcodeValue)}" viewBox="0 0 ${barcodeWidth} 38" style="width:min(230px,100%);height:38px;fill:currentColor">${barcodeRects.join("")}</svg>`;
  return adminShell(`${heading("Profil saya", "Kelola informasi akun dan keamanan.")}<div class="profile-layout">
    <section class="card profile-card"><div class="avatar">${escapeHtml(initials(member?.name))}</div><h2>${escapeHtml(member?.name || user.name)}</h2><p style="color:var(--muted);font-size:13px">${escapeHtml(member?.role || user.role)} · ${escapeHtml(member?.className || "SMK AL HASRA")}</p>
      <div class="card-barcode">${barcodeSvg}<small style="display:block;letter-spacing:.12em">${escapeHtml(barcodeValue)}</small></div><small style="color:var(--muted)">KARTU ANGGOTA DIGITAL</small><p style="margin-top:12px">NIS: <strong>${escapeHtml(member?.nis || "-")}</strong></p><p>Pinjaman: <strong>${myLoans.length}</strong></p><button class="btn btn-outline btn-sm no-print" data-action="print">Cetak kartu</button></section>
    <section class="card card-pad"><h2 style="font-size:19px">Informasi akun</h2><form id="profileForm"><div class="field"><label for="profileName">Nama lengkap</label><input class="input" id="profileName" name="name" required value="${escapeHtml(member?.name || "")}"></div><div class="field"><label for="profileEmail">Email</label><input class="input" id="profileEmail" name="email" type="email" required value="${escapeHtml(member?.email || "")}"></div>
      ${member?.role === studentRole ? `<div class="field"><label for="profileClass">Kelas</label><input class="input" id="profileClass" name="className" value="${escapeHtml(member.className || "")}"></div><div class="field"><label for="profileMajor">Jurusan</label><input class="input" id="profileMajor" name="major" value="${escapeHtml(member.major || "")}"></div>` : ""}
      <div id="formError" class="field-error"></div><button class="btn btn-primary">Simpan profil</button></form><hr style="border:0;border-top:1px solid var(--line);margin:24px 0"><h2 style="font-size:19px">Ganti kata sandi</h2><form id="passwordForm"><div class="field"><label for="oldPassword">Kata sandi lama</label><input class="input" id="oldPassword" name="oldPassword" type="password" required></div><div class="field"><label for="newPassword">Kata sandi baru</label><input class="input" id="newPassword" name="newPassword" type="password" minlength="6" required></div><div id="passwordError" class="field-error"></div><button class="btn btn-outline">Perbarui kata sandi</button></form></section>
    </div>`);
}

export async function renderPage() {
  await seedIfEmpty();
  document.body.classList.toggle("dark", storage.get("theme", "light") === "dark");
  const protectedRoles = {
    "dashboard-admin": staffRoles, "kelola-buku": staffRoles, "kelola-anggota": staffRoles,
    peminjaman: staffRoles, pengembalian: staffRoles, laporan: staffRoles,
    "dashboard-siswa": [studentRole], riwayat: [studentRole, ...staffRoles], profil: [studentRole, ...staffRoles]
  };
  const session = protectedRoles[page] ? guard(protectedRoles[page]) : currentUser();
  if (protectedRoles[page] && !session) return;
  if (page === "beranda") return renderHome();
  if (page === "katalog") return renderCatalog();
  if (page === "detail-buku") return renderDetail();
  if (page === "login") return renderLogin();
  if (page === "register") return renderRegister();
  if (page === "dashboard-siswa") { root.innerHTML = renderStudentDashboard(session); return; }
  if (page === "dashboard-admin") {
    root.innerHTML = renderAdminDashboard();
    drawCharts();
    return;
  }
  if (page === "kelola-buku") { root.innerHTML = renderBooks(); return; }
  if (page === "kelola-anggota") { root.innerHTML = renderMembers(); return; }
  if (page === "peminjaman" || page === "pengembalian") { root.innerHTML = renderLoans(page); return; }
  if (page === "riwayat") { root.innerHTML = renderHistory(session || currentUser()); return; }
  if (page === "laporan") { root.innerHTML = renderReports(); return; }
  if (page === "profil") { root.innerHTML = renderProfile(session); return; }
  root.innerHTML = `${navbar()}<main class="content-narrow card card-pad"><span class="eyebrow">404</span><h1>Halaman tidak ditemukan</h1><p>Halaman yang kamu cari tidak tersedia.</p><a class="btn btn-primary" href="${route("beranda")}">Kembali ke beranda</a></main>${footer()}<div class="toast-region"></div>`;
}

function formData(form) { return Object.fromEntries(new FormData(form).entries()); }
function formError(form, message) { const target = form.querySelector("#formError"); if (target) target.textContent = message; else toast(message, "error"); }
function reportData() {
  const start = state.reportStart || document.getElementById("reportStart")?.value;
  const end = state.reportEnd || document.getElementById("reportEnd")?.value;
  return getTransactions().filter(loan => (!start || loan.borrowDate >= start) && (!end || loan.borrowDate <= end));
}
function doExportReport() {
  const type = new URLSearchParams(location.search).get("jenis") || "peminjaman";
  const loans = reportData();
  if (type === "buku") {
    const counts = new Map();
    loans.forEach(loan => counts.set(loan.bookId, (counts.get(loan.bookId) || 0) + 1));
    exportCsv("laporan-buku-terpopuler.csv", [["Judul buku", "Kategori", "Jumlah peminjaman"], ...getBooks().map(book => [book.title, book.category, counts.get(book.id) || 0]).sort((a, b) => b[2] - a[2])]);
    return;
  }
  if (type === "anggota") {
    const counts = new Map();
    loans.forEach(loan => counts.set(loan.memberId, (counts.get(loan.memberId) || 0) + 1));
    exportCsv("laporan-anggota-teraktif.csv", [["Nama anggota", "NIS", "Jumlah peminjaman"], ...getMembers().filter(member => member.role === studentRole).map(member => [member.name, member.nis, counts.get(member.id) || 0]).sort((a, b) => b[2] - a[2])]);
    return;
  }
  const filtered = type === "denda" ? loans.filter(loan => loan.fine > 0) : loans;
  exportCsv("laporan-perpustakaan.csv", [["Anggota", "Buku", "Tanggal pinjam", "Jatuh tempo", "Tanggal kembali", "Denda", "Status"], ...filtered.map(loan => [memberById(loan.memberId)?.name, bookById(loan.bookId)?.title, loan.borrowDate, loan.dueDate, loan.returnDate || "", loan.fine, loan.finePaid ? "Lunas" : loan.status])]);
}

document.addEventListener("click", async event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const id = button.dataset.id;
  try {
    if (action === "theme") { document.body.classList.toggle("dark"); storage.set("theme", document.body.classList.contains("dark") ? "dark" : "light"); }
    if (action === "menu") { document.getElementById("mainNav")?.classList.toggle("open"); document.getElementById("sidebar")?.classList.toggle("open"); }
    if (action === "logout") logout();
    if (action === "page") { state.page = Number(button.dataset.page); await renderPage(); window.scrollTo(0,0); }
    if (action === "view") { state.view = button.dataset.view; renderCatalog(); }
    if (action === "clear-filters") { state.search = ""; state.category = ""; state.availability = ""; state.page = 1; renderCatalog(); }
    if (action === "wishlist") {
      const user = currentUser();
      const list = storage.get("wishlist");
      const exists = list.some(item => item.memberId === user.id && item.bookId === id);
      storage.set("wishlist", exists ? list.filter(item => !(item.memberId === user.id && item.bookId === id)) : [...list, { memberId: user.id, bookId: id }]);
      toast(exists ? "Buku dihapus dari favorit." : "Buku ditambahkan ke favorit.");
      await renderPage();
    }
    if (action === "borrow") {
      const user = currentUser();
      borrowBook(user.id, id);
      toast("Buku berhasil dipinjam. Batas peminjaman 7 hari.");
      if (page === "detail-buku") renderDetail(); else location.href = route("dashboard-siswa");
    }
    if (action === "reserve") { reserveBook(currentUser().id, id); toast("Reservasi berhasil dicatat. Petugas akan menindaklanjuti."); }
    if (action === "renew") { renewLoan(id); toast("Peminjaman berhasil diperpanjang 7 hari."); await renderPage(); }
    if (action === "return") {
      const returned = returnBook(id);
      toast(returned.fine ? `Buku kembali. Denda ${formatCurrency(returned.fine)} belum lunas.` : "Buku berhasil dikembalikan.");
      await renderPage();
    }
    if (action === "pay-fine") { payFine(id); toast("Denda ditandai lunas."); await renderPage(); }
    if (action === "new-book" || action === "new-member") { state.editing = "new"; renderPage(); }
    if (action === "edit-book" || action === "edit-member") { state.editing = id; renderPage(); window.scrollTo(0,0); }
    if (action === "cancel-edit") { state.editing = null; renderPage(); }
    if (action === "delete-book" && await confirmAction("Buku yang dihapus tidak dapat dipulihkan.")) { deleteBook(id); toast("Buku berhasil dihapus."); renderPage(); }
    if (action === "delete-member" && await confirmAction("Data anggota akan dihapus permanen.")) { deleteMember(id); toast("Anggota berhasil dihapus."); renderPage(); }
    if (action === "toggle-member") {
      const member = memberById(id);
      saveMember({ ...member, active: !member.active }, id);
      toast(`Anggota ${member.active ? "dinonaktifkan" : "diaktifkan"}.`);
      renderPage();
    }
    if (action === "reset-password") {
      const member = memberById(id);
      const passwordHash = await hashPassword("siswa123");
      saveMember({ ...member, passwordHash }, id);
      toast(`Kata sandi ${member.name} direset ke siswa123.`);
    }
    if (action === "approve-reservation") {
      const reservations = storage.get("reservations");
      const reservation = reservations.find(item => item.id === id);
      borrowBook(reservation.memberId, reservation.bookId);
      reservation.status = "Disetujui";
      storage.set("reservations", reservations);
      toast("Reservasi disetujui dan peminjaman tercatat.");
      renderPage();
    }
    if (action === "reject-reservation") {
      const reservations = storage.get("reservations");
      const reservation = reservations.find(item => item.id === id);
      reservation.status = "Ditolak";
      storage.set("reservations", reservations);
      toast("Reservasi ditolak.");
      renderPage();
    }
    if (action === "backup") { downloadJson("cadangan-perpustakaan-alhasra.json", storage.export()); toast("Cadangan data berhasil diunduh."); }
    if (action === "export-report") doExportReport();
    if (action === "print") window.print();
  } catch (error) { toast(error.message || "Tindakan gagal dilakukan.", "error"); }
});

const searchInputHandler = debounce(event => {
  if (event.target.id === "catalogSearch" || event.target.id === "tableSearch") {
    state.search = event.target.value;
    state.page = 1;
    renderPage();
    const replacement = document.getElementById(event.target.id);
    replacement?.focus();
    replacement?.setSelectionRange?.(state.search.length, state.search.length);
  }
}, 220);
document.addEventListener("input", searchInputHandler);
document.addEventListener("change", async event => {
  if (event.target.id === "categoryFilter") { state.category = event.target.value; state.page = 1; renderCatalog(); }
  if (event.target.id === "availabilityFilter") { state.availability = event.target.value; state.page = 1; renderCatalog(); }
  if (event.target.id === "sortFilter") { state.sort = event.target.value; state.page = 1; renderCatalog(); }
  if (event.target.id === "reportType") { location.href = `${route("laporan")}?jenis=${encodeURIComponent(event.target.value)}`; }
  if (event.target.id === "reportStart") { state.reportStart = event.target.value; root.innerHTML = renderReports(); }
  if (event.target.id === "reportEnd") { state.reportEnd = event.target.value; root.innerHTML = renderReports(); }
  if (event.target.id === "restoreFile" && event.target.files[0]) {
    try {
      const text = await event.target.files[0].text();
      storage.import(JSON.parse(text));
      toast("Data berhasil dipulihkan.");
      renderPage();
    } catch (error) { toast(error.message || "Berkas cadangan tidak valid.", "error"); }
  }
});

document.addEventListener("submit", async event => {
  const form = event.target;
  const id = form.getAttribute("id");
  if (!["loginForm", "registerForm", "bookForm", "memberForm", "loanForm", "profileForm", "passwordForm", "reviewForm"].includes(id)) return;
  event.preventDefault();
  try {
    const data = formData(form);
    if (id === "loginForm") {
      const user = await login(data.username, data.password);
      location.href = route(user.role === studentRole ? "dashboard-siswa" : "dashboard-admin");
      return;
    }
    if (id === "registerForm") {
      const issues = validate(data, { name: { required: true, label: "Nama" }, nis: { required: true, label: "NIS", pattern: /^\d{5,15}$/ }, email: { required: true, label: "Email", email: true }, password: { required: true, label: "Kata sandi", min: 6 } });
      if (Object.keys(issues).length) throw new Error(Object.values(issues)[0]);
      if (data.password !== data.passwordConfirm) throw new Error("Konfirmasi kata sandi tidak sama.");
      await registerStudent(data);
      toast("Pendaftaran berhasil. Silakan masuk.");
      location.href = route("login");
      return;
    }
    if (id === "bookForm") {
        const file = form.elements.coverFile.files[0];
        if (file && (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type) || file.size > 1024 * 1024)) throw new Error("Sampul harus PNG, JPEG, WebP, atau GIF maksimal 1 MB.");
      let cover = data.oldCover;
      if (file) cover = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error("Gambar sampul gagal dibaca.")); reader.readAsDataURL(file); });
      saveBook({ title: data.title.trim(), author: data.author.trim(), isbn: data.isbn.trim(), category: data.category, year: Number(data.year), publisher: data.publisher.trim(), stock: Number(data.stock), synopsis: data.synopsis.trim(), cover }, data.id || null);
      state.editing = null; state.page = 1; toast("Data buku berhasil disimpan."); renderPage(); return;
    }
    if (id === "memberForm") {
      const member = { name: data.name.trim(), nis: data.nis.trim(), className: data.className.trim(), major: data.major.trim(), email: data.email.trim() };
      if (!data.id) { member.username = member.nis; member.passwordHash = await hashPassword("siswa123"); }
      saveMember(member, data.id || null);
      state.editing = null; toast(data.id ? "Data anggota berhasil disimpan." : "Anggota berhasil dibuat. Kata sandi awal: siswa123."); renderPage(); return;
    }
    if (id === "loanForm") { borrowBook(data.memberId, data.bookId); toast("Peminjaman berhasil dicatat."); renderPage(); return; }
    if (id === "profileForm") {
      const member = memberById(currentUser().id);
      saveMember({ ...member, name: data.name.trim(), email: data.email.trim(), className: data.className || member.className, major: data.major || member.major }, member.id);
      storage.set("session", { ...currentUser(), name: data.name.trim(), email: data.email.trim() });
      toast("Profil berhasil diperbarui."); renderPage(); return;
    }
    if (id === "passwordForm") {
      await changePassword(currentUser().id, data.oldPassword, data.newPassword);
      toast("Kata sandi berhasil diperbarui."); form.reset(); return;
    }
    if (id === "reviewForm") {
      reviewBook(currentUser().id, data.bookId, data.rating, data.text);
      toast("Terima kasih, ulasan berhasil dikirim."); renderDetail();
    }
  } catch (error) { formError(form, error.message || "Data gagal disimpan."); }
});
