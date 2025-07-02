import { z } from "zod";

export const checkAvailabilitySchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  timezone: z.string().min(1, "Timezone is required"),
  primaryAgentId: z.string().min(1, "primaryAgentId is required"),
});
export type CheckAvailabilityRequest = z.infer<typeof checkAvailabilitySchema>;

export const bookAppointmentSchema = z.object({
  startTime: z
    .string()
    .min(1, "Start date-time in ISO 8601 format is required"),
  email: z.string().min(1, "Email is required"),
  name: z.string().min(1, "Name is required"),
  timezone: z.string().min(1, "Timezone is required"),
  primaryAgentId: z.string().min(1, "primaryAgentId is required"),
});
export type BookAppointmentRequest = z.infer<typeof bookAppointmentSchema>;

export const rescheduleAppointmentSchema = z.object({
  updatedStartTime: z
    .string()
    .min(1, "updatedStartTime in ISO 8601 format is required"),
  rescheduleOrCancelUid: z
    .string()
    .min(1, "appointment 'rescheduleOrCancelUid' is required"),
  primaryAgentId: z.string().min(1, "primaryAgentId is required"),
});
export type RescheduleAppointmentRequest = z.infer<
  typeof rescheduleAppointmentSchema
>;

export const cancelAppointmentSchema = z.object({
  rescheduleOrCancelUid: z
    .string()
    .min(1, "appointment 'rescheduleOrCancelUid' is required"),
  primaryAgentId: z.string().min(1, "primaryAgentId is required"),
});
export type CancelAppointmentRequest = z.infer<typeof cancelAppointmentSchema>;

export const getCalBookingsSchema = z.object({
  email: z.string().min(1, "Email is required"),
  primaryAgentId: z.string().min(1, "primaryAgentId is required"),
});
export type GetCalBookingsRequest = z.infer<typeof getCalBookingsSchema>;
