import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import ExpenseForm from "./components/ExpenseForm.jsx";
import ExpenseList from "./components/ExpenseList.jsx";
import Summary from "./components/Summary.jsx";
import Filters from "./components/Filters.jsx";

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ total: 0, count: 0, byCategory: [] });
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ category: "All", month: "" });
  const [editing, setEditing] = useState(null); // expense being edited, or null
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load list + summary from the API whenever filters change
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [list, sum] = await Promise.all([api.getExpenses(filters), api.getSummary(filters)]);
      setExpenses(list);
      setSummary(sum);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    api.getCategories().then(setCategories).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSave(expense) {
    if (editing) {
      await api.updateExpense(editing._id, expense);
      setEditing(null);
    } else {
      await api.createExpense(expense);
    }
    await loadData();
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await api.deleteExpense(id);
      if (editing && editing._id === id) setEditing(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>💰 Expense Tracker</h1>
        <p>MongoDB · Express · React · Node.js</p>
      </header>

      {error && (
        <div className="alert" role="alert">
          {error}
          <button className="link" onClick={() => setError("")}>dismiss</button>
        </div>
      )}

      <main className="layout">
        <section className="column">
          <ExpenseForm
            categories={categories}
            editing={editing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
          <Summary summary={summary} />
        </section>

        <section className="column">
          <Filters categories={categories} filters={filters} onChange={setFilters} />
          <ExpenseList
            expenses={expenses}
            loading={loading}
            onEdit={setEditing}
            onDelete={handleDelete}
          />
        </section>
      </main>

      <footer className="footer">MERN class project · deployed on AWS</footer>
    </div>
  );
}
