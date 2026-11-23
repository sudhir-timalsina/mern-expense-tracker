// Controllers hold the logic for each API route (CRUD + summary).
const mongoose = require("mongoose");
const Expense = require("../models/Expense");
const { CATEGORIES } = require("../models/Expense");

// Builds a MongoDB filter from query params: ?category=Food&month=2026-11
function buildFilter(query) {
  const filter = {};

  if (query.category && query.category !== "All") {
    filter.category = query.category;
  }

  if (query.month && /^\d{4}-\d{2}$/.test(query.month)) {
    const [year, month] = query.month.split("-").map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    filter.date = { $gte: start, $lt: end };
  }

  return filter;
}

function handleError(res, err) {
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(", ") });
  }
  console.error(err);
  return res.status(500).json({ message: "Server error" });
}

// GET /api/expenses  -> READ all (with optional filters)
exports.getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find(buildFilter(req.query)).sort({ date: -1, createdAt: -1 });
    res.json(expenses);
  } catch (err) {
    handleError(res, err);
  }
};

// GET /api/expenses/summary  -> totals per category using MongoDB aggregation
exports.getSummary = async (req, res) => {
  try {
    const byCategory = await Expense.aggregate([
      { $match: buildFilter(req.query) },
      { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    const total = byCategory.reduce((sum, c) => sum + c.total, 0);
    const count = byCategory.reduce((sum, c) => sum + c.count, 0);

    res.json({
      total,
      count,
      byCategory: byCategory.map((c) => ({ category: c._id, total: c.total, count: c.count })),
    });
  } catch (err) {
    handleError(res, err);
  }
};

// GET /api/expenses/categories
exports.getCategories = (req, res) => {
  res.json(CATEGORIES);
};

// POST /api/expenses  -> CREATE
exports.createExpense = async (req, res) => {
  try {
    const { title, amount, category, date, note } = req.body;
    const expense = await Expense.create({ title, amount, category, date, note });
    res.status(201).json(expense);
  } catch (err) {
    handleError(res, err);
  }
};

// PUT /api/expenses/:id  -> UPDATE
exports.updateExpense = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid expense id" });
    }
    const { title, amount, category, date, note } = req.body;
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { title, amount, category, date, note },
      { new: true, runValidators: true }
    );
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    res.json(expense);
  } catch (err) {
    handleError(res, err);
  }
};

// DELETE /api/expenses/:id  -> DELETE
exports.deleteExpense = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid expense id" });
    }
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    res.json({ message: "Expense deleted", id: expense._id });
  } catch (err) {
    handleError(res, err);
  }
};
