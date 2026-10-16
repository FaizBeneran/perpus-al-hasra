# Perpustakaan Digital SMK AL HASRA

Aplikasi web perpustakaan sekolah berbasis HTML, CSS, dan JavaScript ES Modules. Data demo dan seluruh perubahan disimpan di `localStorage` browser, sehingga aplikasi dapat digunakan tanpa server backend atau instalasi dependensi.

## Fitur

- Landing page dengan statistik, koleksi terbaru/terpopuler, kategori, jam layanan, dan informasi perpustakaan.
- Katalog dengan pencarian judul/penulis/ISBN, filter kategori dan stok, pengurutan, paginasi, serta tampilan kisi/daftar.
- Autentikasi Admin, Petugas, dan Siswa. Kata sandi disimpan sebagai hash SHA-256 menggunakan Web Crypto API.
- Dashboard siswa, peminjaman maksimal 3 buku selama 7 hari, perpanjangan satu kali, reservasi, favorit, ulasan, pengingat jatuh tempo, dan kartu anggota yang dapat dicetak.
- Dashboard petugas/admin, grafik Chart.js, pengelolaan buku dan anggota, persetujuan reservasi, peminjaman, pengembalian, denda Rp1.000/hari, riwayat, dan laporan.
- Ekspor CSV, cetak laporan, cadangan dan pemulihan data JSON.
- Tema gelap, layout responsif, toast, modal konfirmasi, validasi formulir, dan placeholder ketika sampul tidak tersedia.

## Menjalankan aplikasi

1. Buka folder proyek di editor.
2. Jalankan `index.html` memakai Live Server atau server statis lokal. Tidak ada proses build dan paket yang perlu dipasang. Jika browser membatasi ES Modules saat dibuka sebagai `file://`, gunakan Live Server (atau server statis apa pun).
3. Data contoh otomatis dibuat saat pertama kali aplikasi dibuka. Untuk mengulang demo, hapus data situs/localStorage dengan awalan `alhasra-library:`.

Google Fonts dan Chart.js diambil dari CDN. Aplikasi tetap menyediakan fallback visual untuk grafik, dan memakai font sistem bila CDN tidak tersedia.

## Akun demo

| Peran | Nama pengguna / NIS | Kata sandi |
|---|---|---|
| Admin | `admin` | `admin123` |
| Petugas | `petugas` | `petugas123` |
| Siswa | `20250001` atau `siswa` | `siswa123` |

Anggota siswa demo lainnya menggunakan NIS `20250002` sampai `20250010` dan kata sandi `siswa123`.

## Struktur folder

```text
index.html
pages/                 Halaman login, katalog, dashboard, transaksi, laporan, profil, dan 404
assets/
  css/                 Gaya dasar, layout, komponen, halaman, dan tema gelap
  data/                Data buku seed JSON
  img/                 Sampul placeholder
  js/
    components/        Navbar, sidebar, modal, toast, pagination
    pages/             Entry point modul tiap halaman
    services/          Abstraksi localStorage, auth, buku, anggota, transaksi, seed
    utils/             Helper, validasi, dan ekspor
README.md
```

## Catatan dan pengembangan berikutnya

- `assets/js/services/storage.js` adalah satu-satunya lapisan akses data lokal dan menjadi titik penggantian saat aplikasi dipindahkan ke API/database.
- Data di `localStorage` hanya tersedia pada browser/perangkat yang sama; autentikasi sisi klien ini untuk demo sekolah, bukan pengamanan produksi.
- Pengembangan lanjutan dapat mencakup sinkronisasi backend dan banyak perangkat, notifikasi email/WhatsApp, pemindaian barcode, serta pencatatan audit petugas.
