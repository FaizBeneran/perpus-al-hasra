export function validate(data, rules) {
  const errors = {};
  for (const [field, checks] of Object.entries(rules)) {
    const value = String(data[field] ?? "").trim();
    if (checks.required && !value) errors[field] = `${checks.label} wajib diisi.`;
    else if (value && checks.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors[field] = "Format email tidak valid.";
    else if (value && checks.min && value.length < checks.min) errors[field] = `${checks.label} minimal ${checks.min} karakter.`;
    else if (value && checks.pattern && !checks.pattern.test(value)) errors[field] = checks.message || `${checks.label} tidak valid.`;
  }
  return errors;
}
