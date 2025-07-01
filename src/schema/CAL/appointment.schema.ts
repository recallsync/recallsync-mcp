import { z } from "zod";

export const checkAvailabilitySchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  timezone: z.string().min(1, "Timezone is required"),
  primaryAgentId: z.string().min(1, "primaryAgentId is required"),
});

export type CheckAvailabilityRequest = z.infer<typeof checkAvailabilitySchema>;
