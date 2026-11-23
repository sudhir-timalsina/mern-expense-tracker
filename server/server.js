// E + N of MERN: an Express server running on Node.js.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const expenseRoutes = require("./routes/expenseRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());          // allow the React dev server (another port) to call the API
app.use(express.json());  // parse JSON request bodies

// API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});
app.use("/api/expenses", expenseRoutes);

// Unknown API routes -> JSON 404
app.use("/api", (req, res) => {
  res.status(404).json({ message: "API route not found" });
});

// In production, Express also serves the built React app (client/dist).
// This means only ONE Node process is needed on the AWS server.
if (process.env.NODE_ENV === "production") {
  const clientBuild = path.join(__dirname, "..", "client", "dist");
  app.use(express.static(clientBuild));
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientBuild, "index.html"));
  });
}

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} (${process.env.NODE_ENV || "development"})`);
  });
});
