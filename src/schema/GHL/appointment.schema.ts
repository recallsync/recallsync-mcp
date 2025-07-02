import { z } from "zod";

export const checkAvailabilitySchema = z.object({
  date: z.number().min(1, "Start time is required"),
  timezone: z.string().min(1, "Timezone is required"),
  primaryAgentId: z.string().min(1, "primaryAgentId is required"),
});
export const bookAppointmentSchema = z.object({
  startTime: z
    .string()
    .min(1, "Start date-time in ISO 8601 format is required"),
  timezone: z.string().min(1, "Timezone is required"),
  primaryAgentId: z.string().min(1, "primaryAgentId is required"),
});
export type CheckAvailabilityRequest = z.infer<typeof checkAvailabilitySchema>;
