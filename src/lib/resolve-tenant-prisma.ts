import { PrismaClient } from "../generated/client/index.js";
import { getPrimaryPrisma, getPrismaClientForUrl } from "./prisma.js";

export class TenantAuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = "TenantAuthError";
    this.statusCode = statusCode;
  }
}

function getPrimaryAgencyId(): string | undefined {
  return process.env.PRIMARY_AGENCY_ID ?? process.env.NEXT_PUBLIC_AGENCY_ID;
}

function normalizeHostDomain(hostDomain: string): string {
  return hostDomain.trim().split(":")[0] ?? hostDomain.trim();
}

function isPrimaryHost(hostDomain: string): boolean {
  const host = hostDomain.toLowerCase();
  return (
    !host ||
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.includes(".vercel.app")
  );
}

/**
 * Resolve tenant Prisma from host + api_key.
 *
 * 1. Look up agency Config by host in the primary (registry) DB.
 * 2. Pick DB: primary agency / no tenant migration → primary; else tenant databaseUrl.
 * 3. Validate api_key exists in the chosen DB; error if not found.
 */
export async function resolveTenantPrisma(
  apiKey: string,
  hostDomain: string
): Promise<PrismaClient> {
  if (!apiKey?.trim()) {
    throw new TenantAuthError("Unauthorized: Missing API key");
  }
  if (!hostDomain?.trim()) {
    throw new TenantAuthError("Unauthorized: Missing host domain");
  }

  const primaryPrisma = getPrimaryPrisma();
  const primaryAgencyId = getPrimaryAgencyId();
  const normalizedHost = normalizeHostDomain(hostDomain);

  let databaseUrl = process.env.DATABASE_URL!;

  if (!isPrimaryHost(normalizedHost)) {
    const config = await primaryPrisma.config.findFirst({
      where: {
        customRootDomain: normalizedHost,
        customRootDomainVerified: true,
      },
      select: {
        agencyId: true,
        databaseUrl: true,
        migrationStatus: true,
      },
    });

    const isPrimaryAgency =
      !config ||
      (primaryAgencyId != null && config.agencyId === primaryAgencyId);

    const hasTenantDb =
      !isPrimaryAgency &&
      Boolean(config?.databaseUrl) &&
      config?.migrationStatus === "COMPLETED";

    if (hasTenantDb && config?.databaseUrl) {
      databaseUrl = config.databaseUrl;
    }
  }

  const tenantPrisma =
    databaseUrl === process.env.DATABASE_URL
      ? primaryPrisma
      : getPrismaClientForUrl(databaseUrl);

  const keyRecord = await tenantPrisma.apiKey.findUnique({
    where: { id: apiKey },
    select: { id: true },
  });

  if (!keyRecord) {
    throw new TenantAuthError("Unauthorized: Invalid API key");
  }

  return tenantPrisma;
}
