import { z } from "zod";

export const checkAvailabilitySchema = z.object({
  startDate: z.string().min(1, "key 'startDate' is required in arguments"),
  timezone: z.string().min(1, "key 'timezone' is required in arguments"),
  leadId: z.string().min(1, "key 'leadId' is required in the arguments"),
});

export const bookAppointmentSchema = z.object({
  dateTime: z
    .string()
    .min(1, "key 'dateTime' of the booking is required in arguments"),
  timezone: z.string().min(1, "key 'timezone' is required in arguments"),
  leadId: z.string().min(1, "key 'leadId' is required in the arguments"),
});

export const rescheduleAppointmentSchema = z.object({
  newStartTime: z
    .string()
    .min(1, "key 'newStartTime' is required in arguments"),
  rescheduleOrCancelId: z
    .string()
    .min(1, "key 'rescheduleOrCancelId' is required in arguments"),
  leadId: z.string().min(1, "key 'leadId' is required in arguments"),
});

export const cancelAppointmentSchema = z.object({
  rescheduleOrCancelId: z
    .string()
    .min(1, "key 'rescheduleOrCancelId' is required in arguments"),
  leadId: z.string().min(1, "key 'leadId' is required in arguments"),
});

export const getAppointmentsSchema = z.object({
  leadId: z.string().min(1, "key 'leadId' is required in arguments"),
});

export type BookAppointmentRequest = z.infer<typeof bookAppointmentSchema>;
export type RescheduleAppointmentRequest = z.infer<
  typeof rescheduleAppointmentSchema
>;
export type CancelAppointmentRequest = z.infer<typeof cancelAppointmentSchema>;
export type GetAppointmentsRequest = z.infer<typeof getAppointmentsSchema>;

export type CheckAvailabilityRequest = z.infer<typeof checkAvailabilitySchema>;
