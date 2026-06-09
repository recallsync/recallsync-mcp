import { AsyncLocalStorage } from "node:async_hooks";
import { PrismaPlanetScale } from "@prisma/adapter-planetscale";
import { PrismaClient } from "../generated/client/index.js";

const globalForPrisma = globalThis as unknown as {
  primaryPrisma?: PrismaClient;
};

const tenantPrismaStore = new AsyncLocalStorage<PrismaClient>();
const tenantClients: Record<string, PrismaClient> = {};

const defaultTransactionOptions = {
  maxWait: 15000,
  timeout: 10000,
};

/** Primary (registry) DB — Config / domain lookups. */
export function getPrimaryPrisma(): PrismaClient {
  if (!globalForPrisma.primaryPrisma) {
    const adapter = new PrismaPlanetScale({ url: process.env.DATABASE_URL });
    globalForPrisma.primaryPrisma = new PrismaClient({
      adapter,
      transactionOptions: defaultTransactionOptions,
    });
  }
  return globalForPrisma.primaryPrisma;
}

/** Cached tenant Prisma client for a specific database URL. */
export function getPrismaClientForUrl(databaseUrl: string): PrismaClient {
  if (!tenantClients[databaseUrl]) {
    const adapter = new PrismaPlanetScale({ url: databaseUrl });
    tenantClients[databaseUrl] = new PrismaClient({
      adapter,
      transactionOptions: defaultTransactionOptions,
    });
  }
  return tenantClients[databaseUrl];
}

/** Run GHL/CAL handlers against the resolved tenant Prisma client. */
export function runWithTenantPrisma<T>(
  client: PrismaClient,
  fn: () => T | Promise<T>
): T | Promise<T> {
  return tenantPrismaStore.run(client, fn);
}

function getActivePrisma(): PrismaClient {
  return tenantPrismaStore.getStore() ?? getPrimaryPrisma();
}

/**
 * Request-scoped Prisma for GHL/CAL.
 * Defaults to primary DB outside a tenant context (e.g. startup).
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getActivePrisma();
    const value = client[prop as keyof PrismaClient];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});

setTimeout(() => {
  getPrimaryPrisma()
    .$connect()
    .then(() => {
      console.log("✅ Prisma connected to primary database");
    })
    .catch((error) => {
      console.error("❌ Prisma connection failed:", error);
      console.log("⚠️  Server will continue without database connection");
    });
}, 1000);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.primaryPrisma = getPrimaryPrisma();
}
