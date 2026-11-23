import { formatDate, formatMoney } from "../format";

export default function ExpenseList({ expenses, loading, onEdit, onDelete }) {
  if (loading) return <div className="card muted">Loading expenses…</div>;

  if (expenses.length === 0) {
    return <div className="card muted">No expenses yet. Add your first one on the left.</div>;
  }

  return (
    <div className="card">
      <h2>Expenses</h2>
      <ul className="list">
        {expenses.map((e) => (
          <li key={e._id} className="item">
            <div className="item-main">
              <span className={`badge badge-${e.category.toLowerCase()}`}>{e.category}</span>
              <div>
                <strong>{e.title}</strong>
                <div className="sub">
                  {formatDate(e.date)}
                  {e.note ? ` · ${e.note}` : ""}
                </div>
              </div>
            </div>
            <div className="item-side">
              <span className="amount">{formatMoney(e.amount)}</span>
              <div className="item-actions">
                <button className="link" onClick={() => onEdit(e)}>Edit</button>
                <button className="link danger" onClick={() => onDelete(e._id)}>Delete</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
