import { storage } from "./storage.js";
import { uid } from "../utils/helpers.js";

export const getMembers = () => storage.get("members");
export function saveMember(data, id = null) {
  const members = getMembers();
  if (members.some(member => (member.email.toLowerCase() === data.email.toLowerCase() || (data.nis && member.nis === data.nis)) && member.id !== id)) throw new Error("Email atau NIS sudah terdaftar.");
  if (id) {
    const index = members.findIndex(member => member.id === id);
    if (index < 0) throw new Error("Anggota tidak ditemukan.");
    members[index] = { ...members[index], ...data, id };
  } else members.push({ ...data, id: uid("member"), active: true, role: "Siswa" });
  storage.set("members", members);
}
export function deleteMember(id) {
  if (storage.get("transactions").some(item => item.memberId === id && item.status !== "Dikembalikan")) throw new Error("Anggota masih memiliki peminjaman aktif.");
  storage.set("members", getMembers().filter(member => member.id !== id));
}
