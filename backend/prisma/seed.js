require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const staffPassword = await bcrypt.hash("staff123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@mobileshop.com" },
    update: {},
    create: {
      name: "Shop Admin",
      email: "admin@mobileshop.com",
      password: adminPassword,
      role: "admin",
    },
  });

  await prisma.user.upsert({
    where: { email: "staff@mobileshop.com" },
    update: {},
    create: {
      name: "Sales Staff",
      email: "staff@mobileshop.com",
      password: staffPassword,
      role: "staff",
    },
  });

  const supplier = await prisma.supplier.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "TechDistro Wholesale",
      phone: "+1-555-0101",
      email: "sales@techdistro.example",
      address: "12 Industrial Ave",
    },
  });

  const products = [
    { name: "iPhone 15", brand: "Apple", category: "phone", sku: "IP15-128-BLK", imei: "352099001761481", costPrice: 650, sellingPrice: 799, quantity: 8, lowStockThreshold: 3 },
    { name: "iPhone 14", brand: "Apple", category: "phone", sku: "IP14-128-BLU", imei: "352099001761482", costPrice: 550, sellingPrice: 699, quantity: 2, lowStockThreshold: 3 },
    { name: "Galaxy S24", brand: "Samsung", category: "phone", sku: "GS24-256-GRY", imei: "352099001761483", costPrice: 600, sellingPrice: 749, quantity: 6, lowStockThreshold: 3 },
    { name: "Redmi Note 13", brand: "Xiaomi", category: "phone", sku: "RN13-128-BLK", imei: "352099001761484", costPrice: 180, sellingPrice: 239, quantity: 15, lowStockThreshold: 5 },
    { name: "USB-C Fast Charger 20W", brand: "Anker", category: "accessory", sku: "ACC-CHG-20W", costPrice: 8, sellingPrice: 19.99, quantity: 40, lowStockThreshold: 10 },
    { name: "Tempered Glass Screen Protector", brand: "Generic", category: "accessory", sku: "ACC-SCR-GEN", costPrice: 0.8, sellingPrice: 4.99, quantity: 100, lowStockThreshold: 20 },
    { name: "Silicone Case - iPhone 15", brand: "Generic", category: "accessory", sku: "ACC-CASE-IP15", costPrice: 2.5, sellingPrice: 12.99, quantity: 3, lowStockThreshold: 10 },
    { name: "Wireless Earbuds Pro", brand: "JBL", category: "accessory", sku: "ACC-EAR-JBLPRO", costPrice: 25, sellingPrice: 59.99, quantity: 12, lowStockThreshold: 5 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: { ...p, supplierId: supplier.id },
    });
  }

  const customers = [
    { name: "John Carter", phone: "+1-555-0111", email: "john.carter@example.com", address: "45 Maple St" },
    { name: "Amina Yusuf", phone: "+1-555-0122", email: "amina.yusuf@example.com", address: "9 Baker Rd" },
    { name: "Liam Chen", phone: "+1-555-0133", email: "liam.chen@example.com", address: "200 Fifth Ave" },
  ];

  const createdCustomers = [];
  for (const c of customers) {
    const existing = await prisma.customer.findFirst({ where: { phone: c.phone } });
    if (existing) {
      createdCustomers.push(existing);
    } else {
      createdCustomers.push(await prisma.customer.create({ data: c }));
    }
  }

  const existingSalesCount = await prisma.sale.count();
  if (existingSalesCount === 0) {
    const chargerProduct = await prisma.product.findUnique({ where: { sku: "ACC-CHG-20W" } });
    const caseProduct = await prisma.product.findUnique({ where: { sku: "ACC-CASE-IP15" } });

    await prisma.sale.create({
      data: {
        invoiceNumber: "INV-2026-00001",
        customerId: createdCustomers[0].id,
        userId: admin.id,
        subtotal: chargerProduct.sellingPrice * 2,
        discount: 0,
        tax: 0,
        total: chargerProduct.sellingPrice * 2,
        paymentMethod: "cash",
        items: {
          create: [
            {
              productId: chargerProduct.id,
              quantity: 2,
              unitPrice: chargerProduct.sellingPrice,
              total: chargerProduct.sellingPrice * 2,
            },
          ],
        },
      },
    });

    await prisma.sale.create({
      data: {
        invoiceNumber: "INV-2026-00002",
        customerId: createdCustomers[1].id,
        userId: admin.id,
        subtotal: caseProduct.sellingPrice,
        discount: 1,
        tax: 0,
        total: caseProduct.sellingPrice - 1,
        paymentMethod: "card",
        items: {
          create: [
            {
              productId: caseProduct.id,
              quantity: 1,
              unitPrice: caseProduct.sellingPrice,
              total: caseProduct.sellingPrice,
            },
          ],
        },
      },
    });
  }

  const existingRepairsCount = await prisma.repairTicket.count();
  if (existingRepairsCount === 0) {
    await prisma.repairTicket.create({
      data: {
        ticketNumber: "RPR-2026-00001",
        customerId: createdCustomers[2].id,
        deviceBrand: "Apple",
        deviceModel: "iPhone 12",
        issueDescription: "Cracked screen, touch not responding in top corner",
        status: "in_progress",
        estimatedCost: 120,
        technician: "Marcus Reed",
      },
    });
    await prisma.repairTicket.create({
      data: {
        ticketNumber: "RPR-2026-00002",
        customerId: createdCustomers[0].id,
        deviceBrand: "Samsung",
        deviceModel: "Galaxy S22",
        issueDescription: "Battery drains within 2 hours, needs replacement",
        status: "pending",
        estimatedCost: 60,
      },
    });
  }

  console.log("Seed complete.");
  console.log("Login with: admin@mobileshop.com / admin123 (admin)");
  console.log("       or: staff@mobileshop.com / staff123 (staff)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
