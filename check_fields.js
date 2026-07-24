require('dotenv').config();
const prisma = require('./config/prisma');

async function main() {
  console.log("Product fields list from prisma client runtime:");
  console.log(JSON.stringify(prisma._runtimeDataModel.models.Product, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
