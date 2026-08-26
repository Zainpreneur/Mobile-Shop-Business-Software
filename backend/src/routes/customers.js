const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /api/customers?search=
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

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  res.json(customers);
});

// GET /api/customers/:id (with sales + repair history)
router.get("/:id", requireAuth, async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      sales: { orderBy: { createdAt: "desc" } },
      repairs: { orderBy: { receivedAt: "desc" } },
    },
  });
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  res.json(customer);
});

// POST /api/customers
router.post("/", requireAuth, async (req, res) => {
  const { name, phone, email, address, notes } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });

  const customer = await prisma.customer.create({
    data: { name, phone, email, address, notes },
  });
  res.status(201).json(customer);
});

// PUT /api/customers/:id
router.put("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { name, phone, email, address, notes } = req.body;

  try {
    const customer = await prisma.customer.update({
      where: { id },
      data: { name, phone, email, address, notes },
    });
    res.json(customer);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Customer not found" });
    throw err;
  }
});

// DELETE /api/customers/:id (admin only)
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.customer.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Customer not found" });
    throw err;
  }
});

module.exports = router;
