require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const customerRoutes = require("./routes/customers");
const supplierRoutes = require("./routes/suppliers");
const saleRoutes = require("./routes/sales");
const repairRoutes = require("./routes/repairs");
const dashboardRoutes = require("./routes/dashboard");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/repairs", repairRoutes);
app.use("/api/dashboard", dashboardRoutes);

// 404 handler
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

// error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Mobile Shop API listening on http://localhost:${PORT}`);
});
