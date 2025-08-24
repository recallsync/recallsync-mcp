import { z } from "zod";

export const ghlProviderSchema = z.object({
  ghlAccessToken: z.string(),
  ghlRefreshToken: z.string(),
  ghlTokenExpiry: z.date(),
  ghlLocationId: z.string(),
  ghlCompanyId: z.string(),
  ghlLocationName: z.string(),
  ghlUserId: z.string(),
  ghlUserType: z.string(),
  ghlConfigured: z.boolean(),
});
export type GHLProviderConfig = z.infer<typeof ghlProviderSchema>;
