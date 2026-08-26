const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /api/products?search=&category=&lowStock=true
router.get("/", requireAuth, async (req, res) => {
  const { search, category, lowStock } = req.query;

  const where = {
    AND: [
      category ? { category } : {},
      search
        ? {
            OR: [
              { name: { contains: search } },
              { brand: { contains: search } },
              { sku: { contains: search } },
              { imei: { contains: search } },
            ],
          }
        : {},
    ],
  };

  let products = await prisma.product.findMany({
    where,
    include: { supplier: true },
    orderBy: { createdAt: "desc" },
  });

  if (lowStock === "true") {
    products = products.filter((p) => p.quantity <= p.lowStockThreshold);
  }

  res.json(products);
});

// GET /api/products/:id
router.get("/:id", requireAuth, async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: Number(req.params.id) },
    include: { supplier: true },
  });
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

// POST /api/products
router.post("/", requireAuth, async (req, res) => {
  const { name, brand, category, sku, imei, costPrice, sellingPrice, quantity, lowStockThreshold, supplierId } = req.body;

  if (!name || !sku) {
    return res.status(400).json({ error: "Name and SKU are required" });
  }

  try {
    const product = await prisma.product.create({
      data: {
        name,
        brand,
        category: category || "phone",
        sku,
        imei: imei || null,
        costPrice: Number(costPrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        quantity: Number(quantity) || 0,
        lowStockThreshold: Number(lowStockThreshold) || 3,
        supplierId: supplierId ? Number(supplierId) : null,
      },
    });
    res.status(201).json(product);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "SKU or IMEI already exists" });
    }
    throw err;
  }
});

// PUT /api/products/:id
router.put("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { name, brand, category, sku, imei, costPrice, sellingPrice, quantity, lowStockThreshold, supplierId } = req.body;

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(brand !== undefined ? { brand } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(sku !== undefined ? { sku } : {}),
        ...(imei !== undefined ? { imei: imei || null } : {}),
        ...(costPrice !== undefined ? { costPrice: Number(costPrice) } : {}),
        ...(sellingPrice !== undefined ? { sellingPrice: Number(sellingPrice) } : {}),
        ...(quantity !== undefined ? { quantity: Number(quantity) } : {}),
        ...(lowStockThreshold !== undefined ? { lowStockThreshold: Number(lowStockThreshold) } : {}),
        ...(supplierId !== undefined ? { supplierId: supplierId ? Number(supplierId) : null } : {}),
      },
    });
    res.json(product);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Product not found" });
    if (err.code === "P2002") return res.status(409).json({ error: "SKU or IMEI already exists" });
    throw err;
  }
});

// DELETE /api/products/:id (admin only)
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.product.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Product not found" });
    throw err;
  }
});

module.exports = router;
