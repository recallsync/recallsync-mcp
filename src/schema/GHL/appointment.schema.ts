import { z } from "zod";

export const checkAvailabilitySchema = z.object({
  date: z.number().min(1, "Start time is required"),
  timezone: z.string().min(1, "Timezone is required"),
  primaryAgentId: z.string().min(1, "primaryAgentId is required"),
});
export const bookAppointmentSchema = z.object({
  dateTime: z.string().min(1, "Start date-time in ISO 8601 format is required"),
  timezone: z.string().min(1, "Timezone is required"),
  primaryAgentId: z.string().min(1, "primaryAgentId is required"),
  contactId: z.string().min(1, "contactId is required"),
  date: z.string().optional(),
  time: z.string().optional(),
});
export const rescheduleAppointmentSchema = z.object({
  newStartTime: z.string().min(1, "newTime in ISO 8601 format is required"),
  appointementId: z.string().min(1, "appointment 'appointementId' is required"),
  contactId: z.string().min(1, "contactId is required"),
});

export const cancelAppointmentSchema = z.object({
  appointmentId: z.string().min(1, "appointment 'appointementId' is required"),
  contactId: z.string().min(1, "contactId is required"),
});
export const getAppointmentsSchema = z.object({
  contactId: z.string().min(1, "contactId is required"),
});

export type BookAppointmentRequest = z.infer<typeof bookAppointmentSchema>;
export type RescheduleAppointmentRequest = z.infer<
  typeof rescheduleAppointmentSchema
>;
export type CancelAppointmentRequest = z.infer<typeof cancelAppointmentSchema>;
export type GetAppointmentsRequest = z.infer<typeof getAppointmentsSchema>;

export type CheckAvailabilityRequest = z.infer<typeof checkAvailabilitySchema>;
