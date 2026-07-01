require('dotenv').config();
const bcrypt           = require('bcryptjs');

require('dotenv').config();
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const adapter = new PrismaPg({ 
  connectionString: process.env.DATABASE_URL 
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...');

  // ── 1. Admin user ─────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where:  { email: 'admin@javacafe.com' },
    update: {},
    create: {
      name:     'Super Admin',
      email:    'admin@javacafe.com',
      password: adminPassword,
      role:     'ADMIN',
      active:   true,
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  // ── 2. Sample cashier ─────────────────────────────────────
  const cashierPassword = await bcrypt.hash('Cashier@123', 12);
  const cashier = await prisma.user.upsert({
    where:  { email: 'cashier@javacafe.com' },
    update: {},
    create: {
      name:     'Ahmed Cashier',
      email:    'cashier@javacafe.com',
      password: cashierPassword,
      role:     'CASHIER',
      active:   true,
    },
  });
  console.log(`✅ Cashier: ${cashier.email}`);

  // ── 3. Categories ─────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({
      where:  { name: 'Hot Drinks' },
      update: {},
      create: { name: 'Hot Drinks', active: true },
    }),
    prisma.category.upsert({
      where:  { name: 'Cold Drinks' },
      update: {},
      create: { name: 'Cold Drinks', active: true },
    }),
    prisma.category.upsert({
      where:  { name: 'Food' },
      update: {},
      create: { name: 'Food', active: true },
    }),
    prisma.category.upsert({
      where:  { name: 'Desserts' },
      update: {},
      create: { name: 'Desserts', active: true },
    }),
  ]);
  console.log(`✅ Categories: ${categories.map((c) => c.name).join(', ')}`);

  const [hotDrinks, coldDrinks, food, desserts] = categories;

  // ── 4. Flavors ────────────────────────────────────────────
  const flavors = await Promise.all([
    prisma.flavor.upsert({ where: { name: 'Regular' },        update: {}, create: { name: 'Regular',        additionalPrice: 0 } }),
    prisma.flavor.upsert({ where: { name: 'Sugar Free' },     update: {}, create: { name: 'Sugar Free',     additionalPrice: 5 } }),
    prisma.flavor.upsert({ where: { name: 'Extra Shot' },     update: {}, create: { name: 'Extra Shot',     additionalPrice: 10 } }),
    prisma.flavor.upsert({ where: { name: 'Oat Milk' },       update: {}, create: { name: 'Oat Milk',       additionalPrice: 15 } }),
    prisma.flavor.upsert({ where: { name: 'Almond Milk' },    update: {}, create: { name: 'Almond Milk',    additionalPrice: 15 } }),
    prisma.flavor.upsert({ where: { name: 'Whipped Cream' },  update: {}, create: { name: 'Whipped Cream',  additionalPrice: 8 } }),
    prisma.flavor.upsert({ where: { name: 'Caramel Sauce' },  update: {}, create: { name: 'Caramel Sauce',  additionalPrice: 8 } }),
    prisma.flavor.upsert({ where: { name: 'Chocolate Sauce' },update: {}, create: { name: 'Chocolate Sauce',additionalPrice: 8 } }),
  ]);
  console.log(`✅ Flavors: ${flavors.map((f) => f.name).join(', ')}`);

  const [regular, sugarFree, extraShot, oatMilk, almondMilk, whippedCream, caramel, chocolate] = flavors;

  // ── 5. Products ───────────────────────────────────────────
  const products = [
    // Hot Drinks
    { categoryId: hotDrinks.id, name: 'Espresso',       basePrice: 35,  flavorIds: [regular.id, extraShot.id, sugarFree.id] },
    { categoryId: hotDrinks.id, name: 'Cappuccino',     basePrice: 55,  flavorIds: [regular.id, oatMilk.id, almondMilk.id, extraShot.id, sugarFree.id] },
    { categoryId: hotDrinks.id, name: 'Latte',          basePrice: 60,  flavorIds: [regular.id, oatMilk.id, almondMilk.id, extraShot.id, caramel.id, whippedCream.id] },
    { categoryId: hotDrinks.id, name: 'Americano',      basePrice: 45,  flavorIds: [regular.id, extraShot.id, sugarFree.id] },
    { categoryId: hotDrinks.id, name: 'Flat White',     basePrice: 60,  flavorIds: [regular.id, oatMilk.id, extraShot.id] },
    // Cold Drinks
    { categoryId: coldDrinks.id, name: 'Iced Latte',    basePrice: 70,  flavorIds: [regular.id, oatMilk.id, almondMilk.id, caramel.id, chocolate.id] },
    { categoryId: coldDrinks.id, name: 'Frappuccino',   basePrice: 80,  flavorIds: [caramel.id, chocolate.id, whippedCream.id] },
    { categoryId: coldDrinks.id, name: 'Cold Brew',     basePrice: 65,  flavorIds: [regular.id, oatMilk.id, sugarFree.id] },
    { categoryId: coldDrinks.id, name: 'Iced Matcha',   basePrice: 75,  flavorIds: [regular.id, oatMilk.id, almondMilk.id, sugarFree.id] },
    // Food
    { categoryId: food.id, name: 'Croissant',           basePrice: 45,  flavorIds: [] },
    { categoryId: food.id, name: 'Avocado Toast',       basePrice: 85,  flavorIds: [] },
    { categoryId: food.id, name: 'Club Sandwich',       basePrice: 95,  flavorIds: [] },
    // Desserts
    { categoryId: desserts.id, name: 'Chocolate Cake',  basePrice: 65,  flavorIds: [whippedCream.id] },
    { categoryId: desserts.id, name: 'Cheesecake',      basePrice: 70,  flavorIds: [caramel.id, chocolate.id] },
    { categoryId: desserts.id, name: 'Tiramisu',        basePrice: 75,  flavorIds: [] },
  ];

  for (const p of products) {
    const { flavorIds, ...productData } = p;

    const existing = await prisma.product.findFirst({ where: { name: productData.name } });
    if (existing) continue;

    const product = await prisma.product.create({ data: productData });

    // Attach flavors
    if (flavorIds.length) {
      await prisma.productFlavor.createMany({
        data: flavorIds.map((flavorId) => ({ productId: product.id, flavorId })),
      });
    }

    // Create inventory (50 units each)
    await prisma.inventory.create({
      data: { productId: product.id, quantity: 50, lowStock: 10 },
    });
  }
  console.log(`✅ Products: ${products.length} products seeded`);

  console.log('\n🎉 Seed complete!');
  console.log('─────────────────────────────');
  console.log('Admin login:');
  console.log('  Email:    admin@javacafe.com');
  console.log('  Password: Admin@123456');
  console.log('Cashier login:');
  console.log('  Email:    cashier@javacafe.com');
  console.log('  Password: Cashier@123');
  console.log('─────────────────────────────');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
