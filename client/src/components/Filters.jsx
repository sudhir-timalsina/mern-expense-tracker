export default function Filters({ categories, filters, onChange }) {
  return (
    <div className="card filters">
      <label>
        Category
        <select
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
        >
          <option value="All">All</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
      <label>
        Month
        <input
          type="month"
          value={filters.month}
          onChange={(e) => onChange({ ...filters, month: e.target.value })}
        />
      </label>
      {(filters.category !== "All" || filters.month) && (
        <button onClick={() => onChange({ category: "All", month: "" })}>Clear</button>
      )}
    </div>
  );
}
