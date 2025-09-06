import { z } from "zod";

export const checkAvailabilitySchema = z.object({
  startDate: z.string().optional(),
  date: z.string().optional(),
  timezone: z.string().min(1, "key 'timezone' is required in arguments"),
  leadId: z.string().min(1, "key 'leadId' is required in the arguments"),
});
export type CheckAvailabilityRequest = z.infer<typeof checkAvailabilitySchema>;

export const bookAppointmentSchema = z.object({
  dateTime: z
    .string()
    .min(1, "key 'dateTime' of the booking is required in arguments"),
  email: z.string().min(1, "Email is required"),
  name: z.string().min(1, "Name is required"),
  timezone: z.string().min(1, "Timezone is required"),
  leadId: z.string().min(1, "key 'leadId' is required in the arguments"),
});
export type BookAppointmentRequest = z.infer<typeof bookAppointmentSchema>;

export const rescheduleAppointmentSchema = z.object({
  newStartTime: z
    .string()
    .min(1, "key 'newStartTime' is required in arguments"),
  rescheduleOrCancelId: z
    .string()
    .min(1, "key 'rescheduleOrCancelId' is required in arguments"),
  leadId: z.string().min(1, "key 'leadId' is required in arguments"),
});
export type RescheduleAppointmentRequest = z.infer<
  typeof rescheduleAppointmentSchema
>;

export const cancelAppointmentSchema = z.object({
  rescheduleOrCancelId: z
    .string()
    .min(1, "key 'rescheduleOrCancelId' is required in arguments"),
  leadId: z.string().min(1, "key 'leadId' is required in arguments"),
});
export type CancelAppointmentRequest = z.infer<typeof cancelAppointmentSchema>;

export const getCalBookingsSchema = z.object({
  leadId: z.string().min(1, "key 'leadId' is required in arguments"),
});
export type GetCalBookingsRequest = z.infer<typeof getCalBookingsSchema>;
