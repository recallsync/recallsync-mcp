import { z } from "zod";

// Lead related schemas
export const CreateLeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone number is required"),
});

export type CreateLeadRequest = z.infer<typeof CreateLeadSchema>;

export const FindLeadSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
  })
  .refine((data) => data.email || data.phone, {
    message: "Either email or phone must be provided",
    path: ["email", "phone"],
  });

export type FindLeadRequest = z.infer<typeof FindLeadSchema>;

export const CreateTagSchema = z.object({
  name: z.string().min(1, "Tag name is required"),
});

export type CreateTagRequest = z.infer<typeof CreateTagSchema>;

export const UpdateTagSchema = z.object({
  id: z.string().min(1, "Tag ID is required"),
  name: z.string().min(1, "Tag name is required"),
});

export type UpdateTagRequest = z.infer<typeof UpdateTagSchema>;

export const UpdateLeadSchema = z.object({
  id: z.string().min(1, "Lead ID is required"),
  status: z.string().min(1, "Status is required"),
});

export type UpdateLeadRequest = z.infer<typeof UpdateLeadSchema>;
