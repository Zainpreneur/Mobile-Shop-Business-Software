const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

async function nextInvoiceNumber() {
  const count = await prisma.sale.count();
  const year = new Date().getFullYear();
  return `INV-${year}-${String(count + 1).padStart(5, "0")}`;
}

// GET /api/sales?from=&to=&customerId=
router.get("/", requireAuth, async (req, res) => {
  const { from, to, customerId } = req.query;

  const where = {
    AND: [
      customerId ? { customerId: Number(customerId) } : {},
      from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {},
    ],
  };

  const sales = await prisma.sale.findMany({
    where,
    include: { customer: true, user: { select: { id: true, name: true, email: true, role: true } }, items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(sales);
});

// GET /api/sales/:id
router.get("/:id", requireAuth, async (req, res) => {
  const sale = await prisma.sale.findUnique({
    where: { id: Number(req.params.id) },
    include: { customer: true, user: { select: { id: true, name: true, email: true, role: true } }, items: { include: { product: true } } },
  });
  if (!sale) return res.status(404).json({ error: "Sale not found" });
  res.json(sale);
});

// POST /api/sales - create a POS sale (decrements stock atomically)
router.post("/", requireAuth, async (req, res) => {
  const { customerId, items, discount = 0, tax = 0, paymentMethod = "cash" } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "At least one item is required" });
  }

  try {
    const sale = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const saleItemsData = [];

      for (const item of items) {
        const qty = Number(item.quantity);
        if (!item.productId || qty <= 0) throw new Error("Invalid sale item");

        const product = await tx.product.findUnique({ where: { id: Number(item.productId) } });
        if (!product) throw new Error(`Product ${item.productId} not found`);
        if (product.quantity < qty) {
          throw new Error(`Insufficient stock for ${product.name} (available: ${product.quantity})`);
        }

        const unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : product.sellingPrice;
        const lineTotal = unitPrice * qty;
        subtotal += lineTotal;

        saleItemsData.push({
          productId: product.id,
          quantity: qty,
          unitPrice,
          total: lineTotal,
        });

        await tx.product.update({
          where: { id: product.id },
          data: { quantity: { decrement: qty } },
        });
      }

      const total = Math.max(0, subtotal - Number(discount) + Number(tax));
      const invoiceNumber = await nextInvoiceNumber();

      return tx.sale.create({
        data: {
          invoiceNumber,
          customerId: customerId ? Number(customerId) : null,
          userId: req.user.id,
          subtotal,
          discount: Number(discount),
          tax: Number(tax),
          total,
          paymentMethod,
          items: { create: saleItemsData },
        },
        include: { customer: true, user: { select: { id: true, name: true, email: true, role: true } }, items: { include: { product: true } } },
      });
    });

    res.status(201).json(sale);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to create sale" });
  }
});

// POST /api/sales/:id/refund - restock items and mark sale refunded (admin only)
router.post("/:id/refund", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const existing = await tx.sale.findUnique({ where: { id }, include: { items: true } });
      if (!existing) throw new Error("Sale not found");
      if (existing.status === "refunded") throw new Error("Sale already refunded");

      for (const item of existing.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        });
      }

      return tx.sale.update({
        where: { id },
        data: { status: "refunded" },
        include: { customer: true, user: { select: { id: true, name: true, email: true, role: true } }, items: { include: { product: true } } },
      });
    });

    res.json(sale);
  } catch (err) {
    const status = err.message === "Sale not found" ? 404 : 400;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
