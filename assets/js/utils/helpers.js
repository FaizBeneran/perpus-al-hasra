export const formatDate = value => value ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "-";
export const formatCurrency = value => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);
export const addDays = (value, days) => { const date = new Date(value); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); };
export const today = () => new Date().toISOString().slice(0, 10);
export const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
export const debounce = (fn, delay = 250) => { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); }; };
export const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
export const initials = value => String(value || "?").trim().split(/\s+/).slice(0, 2).map(word => word[0]?.toUpperCase()).join("");
