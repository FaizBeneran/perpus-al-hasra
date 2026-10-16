import { storage } from "./storage.js";
import { uid } from "../utils/helpers.js";

export const getBooks = () => storage.get("books");
export const getBook = id => getBooks().find(book => book.id === id);
export function saveBook(data, id = null) {
  const books = getBooks();
  if (books.some(book => book.isbn === data.isbn && book.id !== id)) throw new Error("ISBN sudah digunakan buku lain.");
  if (id) {
    const index = books.findIndex(book => book.id === id);
    if (index < 0) throw new Error("Buku tidak ditemukan.");
    books[index] = { ...books[index], ...data, id };
  } else books.unshift({ ...data, id: uid("book"), rating: "0.0", popularity: 0 });
  storage.set("books", books);
}
export function deleteBook(id) {
  if (storage.get("transactions").some(item => item.bookId === id && item.status !== "Dikembalikan")) throw new Error("Buku masih memiliki peminjaman aktif.");
  storage.set("books", getBooks().filter(book => book.id !== id));
}
