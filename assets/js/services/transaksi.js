import { storage } from "./storage.js";
import { CONFIG } from "../config.js";
import { addDays, today, uid } from "../utils/helpers.js";

export const getTransactions = () => storage.get("transactions");
export function borrowBook(memberId, bookId) {
  const books = storage.get("books");
  const book = books.find(item => item.id === bookId);
  if (!book) throw new Error("Buku tidak ditemukan.");
  if (book.stock < 1) throw new Error("Stok buku habis. Silakan reservasi.");
  const active = getTransactions().filter(item => item.memberId === memberId && item.status !== "Dikembalikan");
  if (active.length >= CONFIG.maxActiveLoans) throw new Error(`Maksimal ${CONFIG.maxActiveLoans} buku aktif.`);
  if (active.some(item => item.bookId === bookId)) throw new Error("Buku ini masih Anda pinjam.");
  const date = today();
  const loan = { id: uid("loan"), memberId, bookId, borrowDate: date, dueDate: addDays(date, CONFIG.borrowingDays), returnDate: null, status: "Aktif", renewals: 0, fine: 0, finePaid: false };
  book.stock -= 1;
  book.popularity = (book.popularity || 0) + 1;
  storage.set("books", books);
  storage.set("transactions", [...getTransactions(), loan]);
  return loan;
}
export function returnBook(id) {
  const loans = getTransactions();
  const loan = loans.find(item => item.id === id && item.status !== "Dikembalikan");
  if (!loan) throw new Error("Peminjaman aktif tidak ditemukan.");
  const lateDays = Math.max(0, Math.ceil((new Date(today()) - new Date(loan.dueDate)) / 86400000));
  loan.returnDate = today();
  loan.status = "Dikembalikan";
  loan.fine = lateDays * CONFIG.finePerDay;
  const books = storage.get("books");
  const book = books.find(item => item.id === loan.bookId);
  if (book) book.stock += 1;
  storage.set("books", books);
  storage.set("transactions", loans);
  return loan;
}
export function renewLoan(id) {
  const loans = getTransactions();
  const loan = loans.find(item => item.id === id && item.status !== "Dikembalikan");
  if (!loan) throw new Error("Peminjaman aktif tidak ditemukan.");
  if (loan.renewals >= CONFIG.maxRenewals) throw new Error("Peminjaman hanya dapat diperpanjang satu kali.");
  if (loan.dueDate < today()) throw new Error("Peminjaman yang terlambat tidak dapat diperpanjang.");
  loan.dueDate = addDays(loan.dueDate, CONFIG.borrowingDays);
  loan.renewals += 1;
  storage.set("transactions", loans);
  return loan;
}
export function payFine(id) {
  const loans = getTransactions();
  const loan = loans.find(item => item.id === id);
  if (!loan || !loan.fine) throw new Error("Denda tidak ditemukan.");
  loan.finePaid = true;
  storage.set("transactions", loans);
}
export function reserveBook(memberId, bookId) {
  const reservations = storage.get("reservations");
  if (reservations.some(item => item.memberId === memberId && item.bookId === bookId && item.status === "Menunggu")) throw new Error("Reservasi buku ini sudah tercatat.");
  reservations.push({ id: uid("reserve"), memberId, bookId, date: today(), status: "Menunggu" });
  storage.set("reservations", reservations);
}
export function reviewBook(memberId, bookId, rating, text) {
  const borrowed = getTransactions().some(item => item.memberId === memberId && item.bookId === bookId && item.status === "Dikembalikan");
  if (!borrowed) throw new Error("Ulasan hanya bisa diberikan setelah buku dikembalikan.");
  const reviews = storage.get("reviews").filter(item => !(item.memberId === memberId && item.bookId === bookId));
  reviews.push({ id: uid("review"), memberId, bookId, rating: Number(rating), text: String(text).trim(), date: today() });
  storage.set("reviews", reviews);
  const book = storage.get("books").find(item => item.id === bookId);
  if (book) {
    const bookReviews = reviews.filter(item => item.bookId === bookId);
    book.rating = (bookReviews.reduce((sum, item) => sum + item.rating, 0) / bookReviews.length).toFixed(1);
    storage.set("books", storage.get("books").map(item => item.id === bookId ? book : item));
  }
}
