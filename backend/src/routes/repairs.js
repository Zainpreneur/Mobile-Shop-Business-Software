const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

const VALID_STATUSES = ["pending", "in_progress", "completed", "delivered", "cancelled"];

async function nextTicketNumber() {
  const count = await prisma.repairTicket.count();
  const year = new Date().getFullYear();
  return `RPR-${year}-${String(count + 1).padStart(5, "0")}`;
}

// GET /api/repairs?status=&search=
router.get("/", requireAuth, async (req, res) => {
  const { status, search } = req.query;

  const where = {
    AND: [
      status ? { status } : {},
      search
        ? {
            OR: [
              { ticketNumber: { contains: search } },
              { deviceBrand: { contains: search } },
              { deviceModel: { contains: search } },
              { issueDescription: { contains: search } },
            ],
          }
        : {},
    ],
  };

  const repairs = await prisma.repairTicket.findMany({
    where,
    include: { customer: true },
    orderBy: { receivedAt: "desc" },
  });
  res.json(repairs);
});

// GET /api/repairs/:id
router.get("/:id", requireAuth, async (req, res) => {
  const repair = await prisma.repairTicket.findUnique({
    where: { id: Number(req.params.id) },
    include: { customer: true },
  });
  if (!repair) return res.status(404).json({ error: "Repair ticket not found" });
  res.json(repair);
});

// POST /api/repairs
router.post("/", requireAuth, async (req, res) => {
  const { customerId, deviceBrand, deviceModel, issueDescription, estimatedCost, technician, notes } = req.body;

  if (!issueDescription) {
    return res.status(400).json({ error: "Issue description is required" });
  }

  const ticketNumber = await nextTicketNumber();

  const repair = await prisma.repairTicket.create({
    data: {
      ticketNumber,
      customerId: customerId ? Number(customerId) : null,
      deviceBrand,
      deviceModel,
      issueDescription,
      estimatedCost: estimatedCost !== undefined ? Number(estimatedCost) : null,
      technician,
      notes,
    },
    include: { customer: true },
  });

  res.status(201).json(repair);
});

// PATCH /api/repairs/:id - update status/cost/notes/technician
router.patch("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { status, actualCost, technician, notes, estimatedCost, deviceBrand, deviceModel, issueDescription } = req.body;

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  try {
    const repair = await prisma.repairTicket.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(status === "completed" || status === "delivered" ? { completedAt: new Date() } : {}),
        ...(actualCost !== undefined ? { actualCost: Number(actualCost) } : {}),
        ...(estimatedCost !== undefined ? { estimatedCost: Number(estimatedCost) } : {}),
        ...(technician !== undefined ? { technician } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(deviceBrand !== undefined ? { deviceBrand } : {}),
        ...(deviceModel !== undefined ? { deviceModel } : {}),
        ...(issueDescription !== undefined ? { issueDescription } : {}),
      },
      include: { customer: true },
    });
    res.json(repair);
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Repair ticket not found" });
    throw err;
  }
});

// DELETE /api/repairs/:id (admin only)
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.repairTicket.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (err) {
    if (err.code === "P2025") return res.status(404).json({ error: "Repair ticket not found" });
    throw err;
  }
});

module.exports = router;
