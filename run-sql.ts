// run-sql.ts
import { PrismaPlanetScale } from "@prisma/adapter-planetscale";
import { PrismaClient } from "./src/generated/client/index.js";

const adapter = new PrismaPlanetScale({ url: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.$executeRawUnsafe(`
    DELETE FROM Meeting
  `);
  console.log(result);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
