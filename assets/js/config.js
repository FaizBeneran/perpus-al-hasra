export const CONFIG = Object.freeze({
  storagePrefix: "alhasra-library",
  borrowingDays: 7,
  maxActiveLoans: 3,
  maxRenewals: 1,
  finePerDay: 1000,
  pageSize: 8,
  roles: Object.freeze({ admin: "Admin", staff: "Petugas", student: "Siswa" })
});
