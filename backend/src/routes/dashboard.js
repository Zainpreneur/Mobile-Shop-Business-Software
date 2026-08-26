const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// GET /api/dashboard/summary
router.get("/summary", requireAuth, async (req, res) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);

  const [salesToday, salesMonth, allSales, products, pendingRepairs, totalCustomers, totalSuppliers] =
    await Promise.all([
      prisma.sale.findMany({ where: { createdAt: { gte: todayStart }, status: "completed" } }),
      prisma.sale.findMany({ where: { createdAt: { gte: monthStart }, status: "completed" } }),
      prisma.sale.findMany({ where: { status: "completed" }, include: { items: true } }),
      prisma.product.findMany(),
      prisma.repairTicket.count({ where: { status: { in: ["pending", "in_progress"] } } }),
      prisma.customer.count(),
      prisma.supplier.count(),
    ]);

  const revenueToday = salesToday.reduce((sum, s) => sum + s.total, 0);
  const revenueMonth = salesMonth.reduce((sum, s) => sum + s.total, 0);

  const lowStockProducts = products.filter((p) => p.quantity <= p.lowStockThreshold);
  const inventoryValue = products.reduce((sum, p) => sum + p.costPrice * p.quantity, 0);

  // top selling products by quantity across all completed sales
  const productSales = {};
  for (const sale of allSales) {
    for (const item of sale.items) {
      productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
    }
  }
  const topProductIds = Object.entries(productSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => Number(id));

  const topProducts = await prisma.product.findMany({ where: { id: { in: topProductIds } } });
  const topProductsWithQty = topProductIds.map((id) => ({
    product: topProducts.find((p) => p.id === id),
    quantitySold: productSales[id],
  }));

  res.json({
    revenueToday,
    revenueMonth,
    salesCountToday: salesToday.length,
    salesCountMonth: salesMonth.length,
    lowStockCount: lowStockProducts.length,
    lowStockProducts: lowStockProducts.slice(0, 10),
    pendingRepairs,
    totalCustomers,
    totalSuppliers,
    totalProducts: products.length,
    inventoryValue,
    topProducts: topProductsWithQty,
  });
});

// GET /api/dashboard/sales-by-day?days=14
router.get("/sales-by-day", requireAuth, async (req, res) => {
  const days = Number(req.query.days) || 14;
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: since }, status: "completed" },
  });

  const byDay = {};
  for (const sale of sales) {
    const key = sale.createdAt.toISOString().slice(0, 10);
    byDay[key] = (byDay[key] || 0) + sale.total;
  }

  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, revenue: byDay[key] || 0 });
  }

  res.json(result);
});

module.exports = router;
