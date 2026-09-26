require("dotenv").config();

const bcrypt = require("bcryptjs");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting seed...");

  // ── 1. Admin ──────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("Admin@123456", 12);
  const admin = await prisma.user.upsert({
    where: { email: "adminn@javacafe.com" },
    update: { password: adminPassword },
    create: {
      name: "Super Admin",
      email: "adminn@javacafe.com",
      password: adminPassword,
      role: "ADMIN",
      active: true,
    },
  });
  console.log(`Admin ready: ${admin.email}`);

  // ── 2. Cashier ────────────────────────────────────────────
  const cashierPassword = await bcrypt.hash("Cashier@123", 12);
  const cashier = await prisma.user.upsert({
    where: { email: "cashier@javacafe.com" },
    update: { password: cashierPassword },
    create: {
      name: "Ahmed Cashier",
      email: "cashier@javacafe.com",
      password: cashierPassword,
      role: "CASHIER",
      active: true,
    },
  });
  console.log(`Cashier ready: ${cashier.email}`);

  // ── 3. Customer ───────────────────────────────────────────
  const customerPassword = await bcrypt.hash("Customer@123", 12);
  const customer = await prisma.user.upsert({
    where: { email: "customer@javacafe.com" },
    update: { password: customerPassword },
    create: {
      name: "Ahmed Customer",
      email: "customer@javacafe.com",
      password: customerPassword,
      role: "CUSTOMER",
      active: true,
    },
  });
  console.log(`Customer ready: ${customer.email}`);

  // ── 4. Flavors ────────────────────────────────────────────
  const flavorsList = [
    // Basic Add-ons & Extras
    { name: "Regular", additionalPrice: 0 },
    { name: "Sugar Free", additionalPrice: 5 },
    { name: "Extra Shot", additionalPrice: 10 },
    { name: "Single Shot", additionalPrice: 15 },
    { name: "Oat Milk", additionalPrice: 15 },
    { name: "Almond Milk", additionalPrice: 15 },
    { name: "Whipped Cream", additionalPrice: 30 },
    { name: "Oreo", additionalPrice: 30 },
    { name: "Marshmallow", additionalPrice: 30 },
    { name: "Boba", additionalPrice: 30 },
    { name: "Flavor", additionalPrice: 15 },

    // Coffee Roast Levels (0 EGP)
    { name: "Light Roast", additionalPrice: 0 },
    { name: "Medium Roast", additionalPrice: 0 },
    { name: "Dark Roast", additionalPrice: 0 },

    // Sugar Levels (0 EGP)
    { name: "No Sugar", additionalPrice: 0 },
    { name: "Balanced", additionalPrice: 0 },
    { name: "Manno", additionalPrice: 0 },
    { name: "Extra Sugar", additionalPrice: 0 },

    // Free Drink Flavors (0 EGP)
    { name: "Vanilla", additionalPrice: 0 },
    { name: "Caramel", additionalPrice: 0 },
    { name: "Hazelnut", additionalPrice: 0 },
    { name: "1 Pump", additionalPrice: 0 },
    { name: "2 Pumps", additionalPrice: 0 },
    { name: "3 Pumps", additionalPrice: 0 },
    { name: "White Mocha", additionalPrice: 0 },
    { name: "Dark Mocha", additionalPrice: 0 },
    { name: "Salted Caramel", additionalPrice: 0 },
    { name: "Spanish Coffee Nut", additionalPrice: 0 },
    { name: "White Chocolate", additionalPrice: 0 },
    { name: "Dark Chocolate", additionalPrice: 0 },
    { name: "Mango", additionalPrice: 0 },
    { name: "Blueberry", additionalPrice: 0 },
    { name: "Passion Fruit", additionalPrice: 0 },
    { name: "Pineapple", additionalPrice: 0 },
    { name: "Strawberry", additionalPrice: 0 },
    { name: "Peach", additionalPrice: 0 },
    { name: "Kiwi", additionalPrice: 0 },
    { name: "Tangerine", additionalPrice: 0 },
    { name: "Apple", additionalPrice: 0 },
    { name: "Green Apple", additionalPrice: 0 },
    { name: "Spanish", additionalPrice: 0 },

    // Cheesecake Flavors (+20 EGP)
    { name: "Blueberry Cheesecake", additionalPrice: 20 },
    { name: "Strawberry Cheesecake", additionalPrice: 20 },
    { name: "Caramel Cheesecake", additionalPrice: 20 },
    { name: "Nutella Cheesecake", additionalPrice: 20 },
    { name: "Lotus Cheesecake", additionalPrice: 20 },
    { name: "Pistachio Cheesecake", additionalPrice: 20 },
  ];

  const flavorMap = {};
  for (const f of flavorsList) {
    const flavor = await prisma.flavor.upsert({
      where: { name: f.name },
      update: { additionalPrice: f.additionalPrice, active: true },
      create: f,
    });
    flavorMap[f.name] = flavor.id;
  }
  console.log(`Flavors ready: ${Object.keys(flavorMap).length} flavors processed`);

  // ── 5. Categories ─────────────────────────────────────────
  const categoryNames = [
    "Ice Coffee",
    "Hot Coffee",
    "Specialty Coffee",
    "Turkish Coffee",
    "Non-Coffee",
    "Blended",
    "Soft Drinks",
    "Matcha",
    "Exclusive Items",
    "Dessert",
    "Bakery",
  ];

  const categoryMap = {};
  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: { active: true },
      create: { name, active: true },
    });
    categoryMap[name] = cat.id;
  }
  console.log(`Categories ready: ${Object.keys(categoryMap).join(", ")}`);

  // ── 5.1 Rename/Remove Obsolete Products ────────────────────
  const sunshineProduct = await prisma.product.findFirst({
    where: { name: "Sunshine" },
  });
  if (sunshineProduct) {
    await prisma.product.update({
      where: { id: sunshineProduct.id },
      data: { name: "Mix Soda" },
    });
    console.log("Renamed product 'Sunshine' to 'Mix Soda'");
  }

  const oldFlavoredCheesecake = await prisma.product.findFirst({
    where: { name: "Flavored Cheesecake" },
  });
  if (oldFlavoredCheesecake) {
    try {
      await prisma.productFlavor.deleteMany({
        where: { productId: oldFlavoredCheesecake.id },
      });
      await prisma.product.delete({ where: { id: oldFlavoredCheesecake.id } });
      console.log("Removed obsolete product 'Flavored Cheesecake'");
    } catch (e) {
      await prisma.product.update({
        where: { id: oldFlavoredCheesecake.id },
        data: { active: false },
      });
      console.log("Deactivated obsolete product 'Flavored Cheesecake'");
    }
  }

  // ── 6. Flavor Groups Mapping ──────────────────────────────
  const iceCoffeeStandardFlavors = [
    flavorMap["Vanilla"],
    flavorMap["Caramel"],
    flavorMap["Hazelnut"],
    flavorMap["1 Pump"],
    flavorMap["2 Pumps"],
    flavorMap["3 Pumps"],
  ].filter(Boolean);

  const iceShakenFlavors = [
    flavorMap["White Mocha"],
    flavorMap["Salted Caramel"],
    flavorMap["Spanish Coffee Nut"],
  ].filter(Boolean);

  const iceMochaFlavors = [
    flavorMap["White Mocha"],
    flavorMap["Dark Mocha"],
    flavorMap["Caramel"],
    flavorMap["Salted Caramel"],
  ].filter(Boolean);

  const hotMochaFlavors = [
    flavorMap["White Mocha"],
    flavorMap["Dark Mocha"],
    flavorMap["Caramel"],
    flavorMap["Salted Caramel"],
  ].filter(Boolean);

  const hotCoffeeStandardFlavors = [
    flavorMap["Vanilla"],
    flavorMap["Caramel"],
    flavorMap["Hazelnut"],
    flavorMap["Salted Caramel"],
  ].filter(Boolean);

  const frappieFlavors = [
    flavorMap["Caramel"],
    flavorMap["White Chocolate"],
    flavorMap["Dark Chocolate"],
  ].filter(Boolean);

  const fruitFlavors = [
    flavorMap["Mango"],
    flavorMap["Blueberry"],
    flavorMap["Passion Fruit"],
    flavorMap["Pineapple"],
    flavorMap["Strawberry"],
    flavorMap["Peach"],
  ].filter(Boolean);

  const milkshakeFlavors = [
    flavorMap["Kiwi"],
    ...fruitFlavors,
  ].filter(Boolean);

  const mixSodaFlavors = [
    flavorMap["Tangerine"],
    flavorMap["Apple"],
    flavorMap["Kiwi"],
    ...fruitFlavors,
  ].filter(Boolean);

  const lemonMintBreezeFlavors = [
    flavorMap["Passion Fruit"],
    flavorMap["Tangerine"],
    flavorMap["Green Apple"],
    flavorMap["Strawberry"],
  ].filter(Boolean);

  const cheesecakeFlavors = [
    flavorMap["Regular"],
    flavorMap["Blueberry Cheesecake"],
    flavorMap["Strawberry Cheesecake"],
    flavorMap["Caramel Cheesecake"],
    flavorMap["Nutella Cheesecake"],
    flavorMap["Lotus Cheesecake"],
    flavorMap["Pistachio Cheesecake"],
  ].filter(Boolean);

  const turkishCoffeeRoastFlavors = [
    flavorMap["Light Roast"],
    flavorMap["Medium Roast"],
    flavorMap["Dark Roast"],
  ].filter(Boolean);

  const coffeeSugarFlavors = [
    flavorMap["No Sugar"],
    flavorMap["Balanced"],
    flavorMap["Manno"],
    flavorMap["Extra Sugar"],
  ].filter(Boolean);

  const turkishCoffeeAllOptions = [
    ...turkishCoffeeRoastFlavors,
    ...coffeeSugarFlavors,
  ];

  // ── 7. Products Data ──────────────────────────────────────
  const products = [
    // ── Ice Coffee
    {
      category: "Ice Coffee",
      name: "Ice Americano",
      basePrice: 70,
      description: "Rich espresso shots topped with cold water and ice for a crisp, bold taste.",
      flavorIds: iceCoffeeStandardFlavors,
    },
    {
      category: "Ice Coffee",
      name: "Ice Cappuccino",
      basePrice: 70,
      description: "Chilled espresso combined with cold milk and crowned with dense milk foam.",
      flavorIds: iceCoffeeStandardFlavors,
    },
    {
      category: "Ice Coffee",
      name: "Ice Latte",
      basePrice: 75,
      description: "Smooth espresso blended with chilled milk and served over ice.",
      flavorIds: iceCoffeeStandardFlavors,
    },
    {
      category: "Ice Coffee",
      name: "Ice Caramel Macchiato",
      basePrice: 85,
      description: "Layered chilled milk, vanilla essence, and rich espresso with a luscious caramel drizzle.",
      flavorIds: [...iceCoffeeStandardFlavors, flavorMap["Salted Caramel"]].filter(Boolean),
    },
    {
      category: "Ice Coffee",
      name: "Ice Spanish Latte",
      basePrice: 90,
      description: "Sweet and creamy iced latte crafted with sweetened condensed milk and rich espresso.",
      flavorIds: [...iceCoffeeStandardFlavors, flavorMap["Spanish"]].filter(Boolean),
    },
    {
      category: "Ice Coffee",
      name: "Ice Mocha",
      basePrice: 90,
      description: "Espresso combined with rich chocolate sauce, cold milk, and ice.",
      flavorIds: iceMochaFlavors,
    },
    {
      category: "Ice Coffee",
      name: "Ice Shaken",
      basePrice: 105,
      description: "Freshly brewed espresso hand-shaken with ice and creamy milk for a frothy, velvety texture.",
      flavorIds: iceShakenFlavors,
    },

    // ── Hot Coffee
    {
      category: "Hot Coffee",
      name: "Single Espresso",
      basePrice: 40,
      description: "A concentrated single shot of freshly extracted espresso with a rich crema.",
      flavorIds: [flavorMap["Regular"], flavorMap["Sugar Free"]].filter(Boolean),
    },
    {
      category: "Hot Coffee",
      name: "Double Espresso",
      basePrice: 50,
      description: "A bold double shot of rich and intense espresso.",
      flavorIds: [flavorMap["Regular"], flavorMap["Sugar Free"]].filter(Boolean),
    },
    {
      category: "Hot Coffee",
      name: "Macchiato",
      basePrice: 60,
      description: "Freshly brewed espresso marked with a dollop of warm frothy milk.",
      flavorIds: hotCoffeeStandardFlavors,
    },
    {
      category: "Hot Coffee",
      name: "Americano",
      basePrice: 65,
      description: "Rich espresso diluted with hot water for a classic smooth cup.",
      flavorIds: hotCoffeeStandardFlavors,
    },
    {
      category: "Hot Coffee",
      name: "Latte",
      basePrice: 70,
      description: "A harmonious blend of espresso and steamed milk topped with light silky foam.",
      flavorIds: hotCoffeeStandardFlavors,
    },
    {
      category: "Hot Coffee",
      name: "Cortado",
      basePrice: 70,
      description: "Equal parts rich espresso and silky steamed milk for a balanced flavor.",
      flavorIds: hotCoffeeStandardFlavors,
    },
    {
      category: "Hot Coffee",
      name: "Cappuccino",
      basePrice: 75,
      description: "Equal layers of bold espresso, steamed milk, and thick velvety foam.",
      flavorIds: hotCoffeeStandardFlavors,
    },
    {
      category: "Hot Coffee",
      name: "Flat White",
      basePrice: 75,
      description: "Double espresso poured over silky micro-foam milk with a delicate finish.",
      flavorIds: hotCoffeeStandardFlavors,
    },
    {
      category: "Hot Coffee",
      name: "Caramel Macchiato",
      basePrice: 75,
      description: "Steamed milk infused with vanilla, marked with espresso and drizzled with caramel.",
      flavorIds: hotCoffeeStandardFlavors,
    },
    {
      category: "Hot Coffee",
      name: "Mocha",
      basePrice: 80,
      description: "Warm espresso infused with premium chocolate sauce and steamed milk.",
      flavorIds: hotMochaFlavors,
    },

    // ── Specialty Coffee
    {
      category: "Specialty Coffee",
      name: "V60",
      basePrice: 85,
      description: "Hand-poured specialty drip coffee.",
      flavorIds: [],
    },

    // ── Turkish Coffee
    {
      category: "Turkish Coffee",
      name: "Turkish Coffee",
      basePrice: 50,
      description: "Traditional Turkish coffee brewed with custom roast and sugar levels.",
      flavorIds: turkishCoffeeAllOptions,
    },
    {
      category: "Turkish Coffee",
      name: "French Coffee",
      basePrice: 60,
      description: "Smooth French coffee with milk and custom sugar level.",
      flavorIds: coffeeSugarFlavors,
    },
    {
      category: "Turkish Coffee",
      name: "Hazelnut Coffee",
      basePrice: 65,
      description: "Aromatic hazelnut flavored coffee with custom sugar level.",
      flavorIds: coffeeSugarFlavors,
    },

    // ── Exclusive Items
    {
      category: "Exclusive Items",
      name: "Dirty Espresso",
      basePrice: 125,
      description: "A double shot of hot, rich espresso poured directly over ultra-cold, sweetened creamy milk.",
      flavorIds: [],
    },

    // ── Blended
    {
      category: "Blended",
      name: "Ice Chocolate",
      basePrice: 85,
      description: "Rich iced chocolate blended with milk and topped with decadent chocolate drizzle.",
      flavorIds: [flavorMap["White Chocolate"], flavorMap["Dark Chocolate"], flavorMap["Caramel"]].filter(Boolean),
    },
    {
      category: "Blended",
      name: "Classic Frappie",
      basePrice: 85,
      description: "Refreshing blended iced coffee with milk and a smooth creamy finish.",
      flavorIds: frappieFlavors,
    },
    {
      category: "Blended",
      name: "Frappie",
      basePrice: 95,
      description: "Indulgent blended coffee frappe topped with whipped cream and rich syrup.",
      flavorIds: frappieFlavors,
    },
    {
      category: "Blended",
      name: "Smoothie",
      basePrice: 70,
      description: "Freshly blended natural seasonal fruit smoothie.",
      flavorIds: fruitFlavors,
    },
    {
      category: "Blended",
      name: "Bina Colada Smoothie",
      basePrice: 90,
      description: "Tropical blend of fresh pineapple, coconut cream, and crushed ice.",
      flavorIds: [],
    },
    {
      category: "Blended",
      name: "Tang Lungo",
      basePrice: 90,
      description: "Refreshing and tangy citrus fruit smoothie blend.",
      flavorIds: [],
    },
    {
      category: "Blended",
      name: "Milkshake",
      basePrice: 90,
      description: "Creamy classic ice cream milkshake blended with chilled milk to perfection.",
      flavorIds: milkshakeFlavors,
    },
    {
      category: "Blended",
      name: "Biscuits Milkshake",
      basePrice: 90,
      description: null,
      flavorIds: [],
    },
    {
      category: "Blended",
      name: "Pistachio Milkshake",
      basePrice: 105,
      description: null,
      flavorIds: [],
    },
    {
      category: "Blended",
      name: "Lotus Milkshake",
      basePrice: 105,
      description: null,
      flavorIds: [],
    },
    {
      category: "Blended",
      name: "Nutella Milkshake",
      basePrice: 105,
      description: null,
      flavorIds: [],
    },
    {
      category: "Blended",
      name: "Oreo Milkshake",
      basePrice: 105,
      description: null,
      flavorIds: [],
    },
    {
      category: "Blended",
      name: "Strawberry Milkshake",
      basePrice: 110,
      description: null,
      flavorIds: [],
    },
    {
      category: "Blended",
      name: "Blueberry Milkshake",
      basePrice: 110,
      description: null,
      flavorIds: [],
    },

    // ── Non-Coffee
    {
      category: "Non-Coffee",
      name: "Tea",
      basePrice: 20,
      description: "Traditional hot brewed premium red tea.",
      flavorIds: [],
    },
    {
      category: "Non-Coffee",
      name: "Flavored Tea",
      basePrice: 35,
      description: "Aromatic herbal and fruit flavored hot tea selection.",
      flavorIds: fruitFlavors,
    },
    {
      category: "Non-Coffee",
      name: "Orange Lemon",
      basePrice: 45,
      description: "Soothing warm citrus fusion of fresh orange and lemon.",
      flavorIds: [],
    },
    {
      category: "Non-Coffee",
      name: "Hot Cider",
      basePrice: 60,
      description: "Spiced warm apple cider with cinnamon notes.",
      flavorIds: [],
    },
    {
      category: "Non-Coffee",
      name: "Ice Tea",
      basePrice: 65,
      description: "Chilled brewed iced tea served fresh with ice and lemon slices.",
      flavorIds: fruitFlavors,
    },
    {
      category: "Non-Coffee",
      name: "Hot Chocolate",
      basePrice: 75,
      description: "Velvety steamed milk melted with rich Dutch cocoa.",
      flavorIds: [flavorMap["White Chocolate"], flavorMap["Dark Chocolate"], flavorMap["Caramel"]].filter(Boolean),
    },

    // ── Soft Drinks
    {
      category: "Soft Drinks",
      name: "Water",
      basePrice: 15,
      description: "Small bottled mineral water.",
      flavorIds: [],
    },
    {
      category: "Soft Drinks",
      name: "Mix Soda",
      basePrice: 75,
      description: "Vibrant sparkling soda mixed with your choice of refreshing fruit flavors.",
      flavorIds: mixSodaFlavors,
    },
    {
      category: "Soft Drinks",
      name: "Red Bull",
      basePrice: 80,
      description: "Original energy drink served chilled.",
      flavorIds: [],
    },
    {
      category: "Soft Drinks",
      name: "Brazilian Lemon",
      basePrice: 80,
      description: "Refreshing creamy limeade made with whole limes and condensed milk.",
      flavorIds: [],
    },
    {
      category: "Soft Drinks",
      name: "Red Bull Mix",
      basePrice: 90,
      description: "Energizing Red Bull mixed with special fruit syrups and fresh mint.",
      flavorIds: mixSodaFlavors,
    },
    {
      category: "Soft Drinks",
      name: "Pink Lemonade",
      basePrice: 100,
      description: "Sweet and tart fresh lemonade infused with red berry flavor.",
      flavorIds: lemonMintBreezeFlavors,
    },
    {
      category: "Soft Drinks",
      name: "Lemon Mint Breeze",
      basePrice: 100,
      description: "Freshly squeezed lemon juice blended with fresh mint leaves and ice.",
      flavorIds: lemonMintBreezeFlavors,
    },
    {
      category: "Soft Drinks",
      name: "Red Bull Espresso",
      basePrice: 100,
      description: "An electrifying fusion of cold Red Bull topped with a fresh espresso shot.",
      flavorIds: [],
    },

    // ── Matcha
    {
      category: "Matcha",
      name: "Ice Matcha",
      basePrice: 90,
      description: "Authentic Japanese ceremonial green tea matcha whisked with chilled milk and ice.",
      flavorIds: [],
    },
    {
      category: "Matcha",
      name: "Strawberry Matcha",
      basePrice: 110,
      description: "Layered iced matcha with fresh strawberry puree and creamy milk.",
      flavorIds: [],
    },
    {
      category: "Matcha",
      name: "Mango Matcha",
      basePrice: 110,
      description: "Layered iced matcha with sweet mango puree and milk.",
      flavorIds: [],
    },
    {
      category: "Matcha",
      name: "Blueberry Matcha",
      basePrice: 110,
      description: "Layered iced matcha with wild blueberry compote and milk.",
      flavorIds: [],
    },
    {
      category: "Matcha",
      name: "White Mocha Matcha",
      basePrice: 110,
      description: "Ceremonial iced matcha infused with sweet white mocha and creamy milk.",
      flavorIds: [],
    },
    {
      category: "Matcha",
      name: "Spanish Matcha",
      basePrice: 110,
      description: "Rich iced matcha blended with sweetened condensed milk.",
      flavorIds: [],
    },

    // ── Dessert
    {
      category: "Dessert",
      name: "Cheesecake",
      basePrice: 75,
      description: "Classic New York style creamy cheesecake on a buttery biscuit base.",
      flavorIds: cheesecakeFlavors,
    },
    {
      category: "Dessert",
      name: "Cookies Cake",
      basePrice: 80,
      description: "Layers of soft baked cookies with rich cream filling.",
      flavorIds: [],
    },
    {
      category: "Dessert",
      name: "Tiramisu",
      basePrice: 80,
      description: "Traditional Italian dessert with espresso-soaked ladyfingers and mascarpone cream.",
      flavorIds: [],
    },
    {
      category: "Dessert",
      name: "Red Velvet",
      basePrice: 90,
      description: "Moist red velvet sponge cake layered with smooth cream cheese frosting.",
      flavorIds: [],
    },
    {
      category: "Dessert",
      name: "Fudge Chocolate",
      basePrice: 100,
      description: "Decadent, dense chocolate fudge cake served warm.",
      flavorIds: [],
    },

    // ── Bakery
    {
      category: "Bakery",
      name: "Plain Croissant",
      basePrice: 60,
      description: "Freshly baked golden, flaky, and buttery French croissant.",
      flavorIds: [],
    },
    {
      category: "Bakery",
      name: "Pain Suisse",
      basePrice: 80,
      description: "Crispy puff pastry filled with vanilla pastry cream and chocolate chips.",
      flavorIds: [],
    },
    {
      category: "Bakery",
      name: "Almond Croissant",
      basePrice: 85,
      description: "Flaky croissant filled and topped with almond frangipane cream and sliced almonds.",
      flavorIds: [],
    },
  ];

  // ── 8. Seed / Upsert Products First ───────────────────────
  for (const p of products) {
    const categoryId = categoryMap[p.category];
    const existing = await prisma.product.findFirst({
      where: { name: p.name },
    });

    let product;
    if (existing) {
      product = await prisma.product.update({
        where: { id: existing.id },
        data: {
          categoryId,
          basePrice: p.basePrice,
          description: p.description,
          active: true,
        },
      });
    } else {
      product = await prisma.product.create({
        data: {
          categoryId,
          name: p.name,
          basePrice: p.basePrice,
          description: p.description,
          active: true,
        },
      });
    }

    // Replace product flavors with updated mappings
    await prisma.productFlavor.deleteMany({
      where: { productId: product.id },
    });

    if (p.flavorIds && p.flavorIds.length) {
      await prisma.productFlavor.createMany({
        data: p.flavorIds.map((flavorId) => ({
          productId: product.id,
          flavorId,
        })),
        skipDuplicates: true,
      });
    }
  }

  // ── 9. Clean up obsolete Categories ────────────────────────
  const obsoleteCategories = await prisma.category.findMany({
    where: { name: { notIn: categoryNames } },
    include: { products: true },
  });

  for (const cat of obsoleteCategories) {
    if (cat.products.length === 0) {
      try {
        await prisma.category.delete({ where: { id: cat.id } });
        console.log(`Removed obsolete category: ${cat.name}`);
      } catch (e) {
        // ignore
      }
    } else {
      await prisma.category.update({
        where: { id: cat.id },
        data: { active: false },
      });
    }
  }

  console.log(`Products ready: ${products.length} products processed under ${categoryNames.length} categories`);

  console.log("\nSeed complete!");
  console.log("-------------------------------------");
  console.log("Admin:    adminn@javacafe.com  / Admin@123456");
  console.log("Cashier:  cashier@javacafe.com / Cashier@123");
  console.log("Customer: customer@javacafe.com / Customer@123");
  console.log("-------------------------------------");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
