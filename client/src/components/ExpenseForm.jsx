import { useEffect, useState } from "react";
import { toInputDate } from "../format";

const empty = () => ({
  title: "",
  amount: "",
  category: "Food",
  date: toInputDate(),
  note: "",
});

export default function ExpenseForm({ categories, editing, onSave, onCancel }) {
  const [form, setForm] = useState(empty());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // When "Edit" is clicked, fill the form with that expense
  useEffect(() => {
    if (editing) {
      setForm({
        title: editing.title,
        amount: String(editing.amount),
        category: editing.category,
        date: toInputDate(editing.date),
        note: editing.note || "",
      });
    } else {
      setForm(empty());
    }
    setError("");
  }, [editing]);

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return setError("Please enter a title");
    if (!(Number(form.amount) > 0)) return setError("Amount must be greater than 0");

    setSaving(true);
    setError("");
    try {
      await onSave({ ...form, amount: Number(form.amount) });
      if (!editing) setForm(empty());
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>{editing ? "Edit expense" : "Add expense"}</h2>

      <label>
        Title
        <input name="title" value={form.title} onChange={update} placeholder="e.g. Lunch at canteen" maxLength={100} />
      </label>

      <div className="row">
        <label>
          Amount
          <input name="amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={update} placeholder="0.00" />
        </label>
        <label>
          Date
          <input name="date" type="date" value={form.date} onChange={update} />
        </label>
      </div>

      <label>
        Category
        <select name="category" value={form.category} onChange={update}>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>

      <label>
        Note (optional)
        <textarea name="note" value={form.note} onChange={update} rows={2} maxLength={300} />
      </label>

      {error && <p className="form-error">{error}</p>}

      <div className="actions">
        <button type="submit" className="primary" disabled={saving}>
          {saving ? "Saving…" : editing ? "Update" : "Add expense"}
        </button>
        {editing && (
          <button type="button" onClick={onCancel}>Cancel</button>
        )}
      </div>
    </form>
  );
}
