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
