// Small helpers for showing money and dates. Change the currency here if you like.
const CURRENCY = "NPR";

export function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: 2,
  }).format(value || 0);
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// "2026-11-23" for <input type="date">
export function toInputDate(value) {
  const d = value ? new Date(value) : new Date();
  return d.toISOString().slice(0, 10);
}
