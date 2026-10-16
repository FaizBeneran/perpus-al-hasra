import { storage } from "./storage.js";
import { CONFIG } from "../config.js";
import { uid } from "../utils/helpers.js";

export const hashPassword = async password => {
  if (!globalThis.crypto?.subtle) throw new Error("Browser tidak mendukung SHA-256. Buka aplikasi melalui browser terbaru.");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
};
export const currentUser = () => storage.get("session", null);
export async function login(username, password) {
  const members = storage.get("members");
  const normalized = username.trim().toLowerCase();
  const member = members.find(item => [item.username, item.email, item.nis].some(value => value?.toLowerCase() === normalized));
  if (!member || !member.active || member.passwordHash !== await hashPassword(password)) throw new Error("Nama pengguna atau kata sandi salah, atau akun tidak aktif.");
  const session = { id: member.id, name: member.name, role: member.role, email: member.email, nis: member.nis || "" };
  storage.set("session", session);
  return session;
}
export function logout() { storage.set("session", null); location.href = location.pathname.toLowerCase().includes("/pages/") ? "../index.html" : "index.html"; }
export async function registerStudent(data) {
  const members = storage.get("members");
  if (members.some(member => member.nis === data.nis || member.email.toLowerCase() === data.email.toLowerCase())) throw new Error("NIS atau email sudah terdaftar.");
  const member = {
    id: uid("member"), name: data.name.trim(), nis: data.nis.trim(), className: data.className.trim(),
    major: data.major.trim(), email: data.email.trim(), username: data.nis.trim(),
    passwordHash: await hashPassword(data.password), role: CONFIG.roles.student, active: true, joinedAt: new Date().toISOString()
  };
  members.push(member);
  storage.set("members", members);
  return member;
}
export async function changePassword(memberId, oldPassword, newPassword) {
  const members = storage.get("members");
  const member = members.find(item => item.id === memberId);
  if (!member || member.passwordHash !== await hashPassword(oldPassword)) throw new Error("Kata sandi lama tidak sesuai.");
  member.passwordHash = await hashPassword(newPassword);
  storage.set("members", members);
}
export function guard(roles = []) {
  const session = currentUser();
  if (!session) { location.href = "login.html"; return null; }
  if (roles.length && !roles.includes(session.role)) { location.href = session.role === CONFIG.roles.student ? "dashboard-siswa.html" : "dashboard-admin.html"; return null; }
  return session;
}
