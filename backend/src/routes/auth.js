const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { requireAuth, requireAdmin, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
}

function sanitizeUser(user) {
  const { password, ...rest } = user;
  return rest;
}

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken(user);
  res.json({ token, user: sanitizeUser(user) });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(sanitizeUser(user));
});

// GET /api/auth/users - list staff (admin only)
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  res.json(users.map(sanitizeUser));
});

// POST /api/auth/users - create a staff/admin account (admin only)
router.post("/users", requireAuth, requireAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email and password are required" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already in use" });

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: role === "admin" ? "admin" : "staff" },
  });

  res.status(201).json(sanitizeUser(user));
});

// PATCH /api/auth/users/:id - toggle active / role (admin only)
router.patch("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { role, active } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(role !== undefined ? { role } : {}),
      ...(active !== undefined ? { active } : {}),
    },
  });

  res.json(sanitizeUser(user));
});

module.exports = router;
