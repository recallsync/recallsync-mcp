import { z } from "zod";

export const checkAvailabilitySchema = z.object({
  startTime: z.string().min(1, "Start time is required"),
  timezone: z.string().min(1, "Timezone is required"),
});

export type CheckAvailabilityRequest = z.infer<typeof checkAvailabilitySchema>;
