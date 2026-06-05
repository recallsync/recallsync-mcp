import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  // Read directly from process.env (instead of the strict `env()` helper) so
  // that `prisma generate` doesn't fail at build time when DATABASE_URL is
  // unset. The URL is only needed at runtime / for migrate commands.
  datasource: {
    url: process.env.DATABASE_URL,
  },
});