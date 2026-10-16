import { CONFIG } from "../config.js";

const key = name => `${CONFIG.storagePrefix}:${name}`;
export const storage = {
  get(name, fallback = []) {
    try {
      const raw = localStorage.getItem(key(name));
      return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
      throw new Error(`Data ${name} tidak dapat dibaca dari penyimpanan lokal.`, { cause: error });
    }
  },
  set(name, value) {
    try { localStorage.setItem(key(name), JSON.stringify(value)); }
    catch (error) { throw new Error(`Data ${name} tidak dapat disimpan. Ruang penyimpanan mungkin penuh.`, { cause: error }); }
  },
  has(name) { return localStorage.getItem(key(name)) !== null; },
  clear() { Object.keys(localStorage).filter(item => item.startsWith(`${CONFIG.storagePrefix}:`)).forEach(item => localStorage.removeItem(item)); },
  export() {
    return Object.fromEntries(Object.keys(localStorage).filter(item => item.startsWith(`${CONFIG.storagePrefix}:`) && item !== key("session"))
      .map(item => [item.slice(CONFIG.storagePrefix.length + 1), JSON.parse(localStorage.getItem(item))]));
  },
  import(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Berkas cadangan tidak memiliki format yang benar.");
    const arrayNames = ["books", "members", "transactions", "reservations", "reviews", "wishlist", "notifications"];
    for (const name of arrayNames) {
      if (Object.hasOwn(data, name) && !Array.isArray(data[name])) throw new Error(`Data ${name} pada cadangan tidak valid.`);
    }
    if (Object.hasOwn(data, "theme") && !["light", "dark"].includes(data.theme)) throw new Error("Pengaturan tema pada cadangan tidak valid.");
    const allowed = [...arrayNames, "theme"];
    for (const [name, value] of Object.entries(data)) {
      if (!allowed.includes(name)) continue;
      this.set(name, value);
    }
  }
};
