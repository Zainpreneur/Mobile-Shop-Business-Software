const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /api/suppliers?search=
router.get("/", requireAuth, async (req, res) => {
  const { search } = req.query;
  const where = search
    ? {
        OR: [
          { name: { contains: search } },
          { phone: { contains: search } },
          { email: { contains: search } },
        ],
      }
    : {};

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: true } } },
  });
  res.json(suppliers);
});

// GET /api/suppliers/:id
router.get("/:id", requireAuth, async (req, res) => {
  const supplier = await prisma.supplier.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      products: true,
      purchases: { include: { items: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!supplier) return res.status(404).json({ error: "Supplier not found" });
  res.json(supplier);
});

// POST /api/suppliers
router.post("/", requireAuth, async (req, res) => {
  const { name, phone, email, address, notes } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });

  const supplier = await prisma.supplier.create({
    data: { name, phone, email, address, notes },
  });
  res.status(201).json(supplier);
});

// PUT /api/suppliers/:id
router.put("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { name, phone, email, address, notes } = req.body;

  try {
    const supplier = await prisma.supplier.update({
      where: { id },
      data: { name, phone, email, address, notes },
    });
    res.json(supplier);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Supplier not found" });
    throw err;
  }
});

// DELETE /api/suppliers/:id (admin only)
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.supplier.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Supplier not found" });
    throw err;
  }
});

// POST /api/suppliers/:id/purchases - record a stock purchase (restock) from this supplier
router.post("/:id/purchases", requireAuth, async (req, res) => {
  const supplierId = Number(req.params.id);
  const { items, notes } = req.body; // items: [{ productId, quantity, unitCost }]

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "At least one item is required" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let totalCost = 0;
      const purchaseItemsData = [];

      for (const item of items) {
        const qty = Number(item.quantity);
        const unitCost = Number(item.unitCost);
        if (!item.productId || qty <= 0) {
          throw new Error("Invalid purchase item");
        }
        const lineTotal = qty * unitCost;
        totalCost += lineTotal;
        purchaseItemsData.push({
          productId: Number(item.productId),
          quantity: qty,
          unitCost,
          total: lineTotal,
        });

        await tx.product.update({
          where: { id: Number(item.productId) },
          data: { quantity: { increment: qty }, costPrice: unitCost },
        });
      }

      const purchase = await tx.purchase.create({
        data: {
          supplierId,
          totalCost,
          notes,
          items: { create: purchaseItemsData },
        },
        include: { items: { include: { product: true } } },
      });

      return purchase;
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to record purchase" });
  }
});

module.exports = router;
