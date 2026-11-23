import { formatMoney } from "../format";

// Shows the result of the MongoDB aggregation endpoint (/api/expenses/summary)
export default function Summary({ summary }) {
  const { total, count, byCategory } = summary;
  const max = byCategory.length ? byCategory[0].total : 0;

  return (
    <div className="card">
      <h2>Summary</h2>
      <div className="stats">
        <div>
          <span className="stat-label">Total spent</span>
          <span className="stat-value">{formatMoney(total)}</span>
        </div>
        <div>
          <span className="stat-label">Expenses</span>
          <span className="stat-value">{count}</span>
        </div>
      </div>

      {byCategory.length > 0 && (
        <ul className="bars">
          {byCategory.map((c) => (
            <li key={c.category}>
              <div className="bar-label">
                <span>{c.category}</span>
                <span>{formatMoney(c.total)}</span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(c.total / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
