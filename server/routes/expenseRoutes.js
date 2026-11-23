// Routes map URLs + HTTP methods to controller functions.
const express = require("express");
const {
  getExpenses,
  getSummary,
  getCategories,
  createExpense,
  updateExpense,
  deleteExpense,
} = require("../controllers/expenseController");

const router = express.Router();

// Specific paths must come before "/:id"
router.get("/summary", getSummary);
router.get("/categories", getCategories);

router.route("/").get(getExpenses).post(createExpense);
router.route("/:id").put(updateExpense).delete(deleteExpense);

module.exports = router;
