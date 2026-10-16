import { storage } from "./storage.js";
import { CONFIG } from "../config.js";
import { addDays } from "../utils/helpers.js";
import bookSeed from "../../data/buku-seed.json" with { type: "json" };

const studentNames = ["Alya Putri", "Fikri Ramadhan", "Nabila Zahra", "Rafi Hidayat", "Salsabila Azzahra", "Davin Pratama", "Intan Permata", "Rizal Maulana", "Putri Amelia", "Farhan Akbar"];
const hash = async value => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
};

export async function seedIfEmpty() {
  if (storage.has("books")) return;
  const books = bookSeed.map((book, index) => ({
    ...book, publisher: ["Pustaka Pelajar", "Erlangga", "Andi Publisher"][index % 3],
    isbn: `978602${String(1000000 + index).padStart(7, "0")}`, stock: index % 7 === 0 ? 0 : 2 + index % 5,
    synopsis: `${book.title} menyajikan materi dan wawasan yang relevan untuk mendukung kegiatan belajar, keterampilan, dan literasi siswa SMK.`,
    cover: "assets/img/cover-placeholder.svg", rating: (4 + (index % 10) / 10).toFixed(1), popularity: 30 - index
  }));
  const [adminHash, staffHash, studentHash] = await Promise.all([hash("admin123"), hash("petugas123"), hash("siswa123")]);
  const members = [
    { id: "member-admin", name: "Administrator Perpustakaan", email: "admin@alhasra.sch.id", username: "admin", passwordHash: adminHash, role: CONFIG.roles.admin, active: true },
    { id: "member-staff", name: "Petugas Perpustakaan", email: "petugas@alhasra.sch.id", username: "petugas", passwordHash: staffHash, role: CONFIG.roles.staff, active: true },
    ...studentNames.map((name, index) => ({
      id: `member-${String(index + 1).padStart(3, "0")}`, name, nis: `2025${String(index + 1).padStart(4, "0")}`,
      email: `siswa${index + 1}@alhasra.sch.id`, username: index === 0 ? "siswa" : `siswa${index + 1}`, passwordHash: studentHash,
      role: CONFIG.roles.student, className: `XI ${["RPL", "TKJ", "AKL"][index % 3]}-${index % 2 + 1}`, major: ["RPL", "TKJ", "AKL"][index % 3], active: true
    }))
  ];
  const transactions = Array.from({ length: 15 }, (_, index) => {
    const created = new Date(); created.setDate(created.getDate() - (index * 3 + 2));
    const date = created.toISOString().slice(0, 10);
    const status = index < 5 ? "Aktif" : index < 9 ? "Terlambat" : "Dikembalikan";
    const due = status === "Terlambat" ? addDays(date, -3 - index) : addDays(date, CONFIG.borrowingDays);
    return {
      id: `loan-${String(index + 1).padStart(3, "0")}`, memberId: members[index % 10 + 2].id,
      bookId: books[(index * 2) % books.length].id, borrowDate: date, dueDate: due,
      returnDate: status === "Dikembalikan" ? addDays(due, index % 3) : null, status,
      renewals: 0, fine: status === "Terlambat" ? (3 + index) * CONFIG.finePerDay : 0, finePaid: false
    };
  });
  transactions.filter(item => item.status !== "Dikembalikan").forEach(loan => {
    const book = books.find(item => item.id === loan.bookId);
    if (book) book.stock = Math.max(0, book.stock - 1);
  });
  storage.set("books", books);
  storage.set("members", members);
  storage.set("transactions", transactions);
  storage.set("reservations", []);
  storage.set("reviews", []);
  storage.set("wishlist", []);
  storage.set("notifications", []);
  storage.set("session", null);
}
