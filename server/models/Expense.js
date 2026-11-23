// Mongoose schema = the shape of one document in the "expenses" collection.
const mongoose = require("mongoose");

const CATEGORIES = [
  "Food",
  "Transport",
  "Rent",
  "Utilities",
  "Education",
  "Health",
  "Entertainment",
  "Shopping",
  "Other",
];

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title can be at most 100 characters"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    category: {
      type: String,
      enum: { values: CATEGORIES, message: "Invalid category" },
      default: "Other",
    },
    date: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [300, "Note can be at most 300 characters"],
    },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

module.exports = mongoose.model("Expense", expenseSchema);
module.exports.CATEGORIES = CATEGORIES;
