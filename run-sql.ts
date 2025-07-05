// run-sql.ts
import { PrismaClient } from "./src/generated/client/index.js";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$executeRawUnsafe(`
    DELETE FROM Meeting
  `);
  console.log(result);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
