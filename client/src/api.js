// All calls from React to the Express API live here.
// Relative URLs ("/api/...") work both in dev (Vite proxy) and on AWS (same server).
const BASE = "/api/expenses";

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

function toQuery(filters = {}) {
  const params = new URLSearchParams();
  if (filters.category && filters.category !== "All") params.set("category", filters.category);
  if (filters.month) params.set("month", filters.month);
  const q = params.toString();
  return q ? `?${q}` : "";
}

export const api = {
  getExpenses: (filters) => request(`${BASE}${toQuery(filters)}`),
  getSummary: (filters) => request(`${BASE}/summary${toQuery(filters)}`),
  getCategories: () => request(`${BASE}/categories`),
  createExpense: (expense) => request(BASE, { method: "POST", body: JSON.stringify(expense) }),
  updateExpense: (id, expense) =>
    request(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(expense) }),
  deleteExpense: (id) => request(`${BASE}/${id}`, { method: "DELETE" }),
};
