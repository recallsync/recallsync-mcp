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

// Meeting related schemas
export const CreateMeetingSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  calMeetingID: z.number(),
  calMeetingUID: z.string().min(1, "Calendar Meeting UID is required"),
  startTime: z.string().min(1, "Start time is required"),
  messageOfLead: z.string().optional(),
  meetingUrl: z.string().optional(),
});

export type CreateMeetingRequest = z.infer<typeof CreateMeetingSchema>;

export const UpdateMeetingSchema = z.object({
  meetingUID: z.string().min(1, "Meeting UID is required"),
  startTime: z.string().optional(),
  status: z.string().optional(),
});

export type UpdateMeetingRequest = z.infer<typeof UpdateMeetingSchema>;

export const UpdateMeetingByLeadSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  status: z.string().min(1, "Status is required"),
});

export type UpdateMeetingByLeadRequest = z.infer<
  typeof UpdateMeetingByLeadSchema
>;

export const UpdateMeetingStatusSchema = z.object({
  meetingId: z.string().min(1, "Meeting ID is required"),
  status: z.string().min(1, "Status is required"),
});

export type UpdateMeetingStatusRequest = z.infer<
  typeof UpdateMeetingStatusSchema
>;

export const UpdateOverdueNoShowSchema = z.object({
  unit: z.enum(["HOUR", "DAY", "WEEK"]).optional(),
  amount: z.number().optional(),
  markLeadAsCold: z.boolean().optional(),
});

export type UpdateOverdueNoShowRequest = z.infer<
  typeof UpdateOverdueNoShowSchema
>;

// Note related schemas
export const CreateNoteSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  note: z.string().min(1, "Note content is required"),
});

export type CreateNoteRequest = z.infer<typeof CreateNoteSchema>;

export const GetNoteSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  noteId: z.string().min(1, "Note ID is required"),
});

export type GetNoteRequest = z.infer<typeof GetNoteSchema>;

export const GetAllNotesSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  all: z.boolean().optional().default(true),
});

export type GetAllNotesRequest = z.infer<typeof GetAllNotesSchema>;

export const UpdateNoteSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  noteId: z.string().min(1, "Note ID is required"),
  note: z.string().min(1, "Note content is required"),
});

export type UpdateNoteRequest = z.infer<typeof UpdateNoteSchema>;

export const DeleteNoteSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  noteId: z.string().min(1, "Note ID is required"),
});

export type DeleteNoteRequest = z.infer<typeof DeleteNoteSchema>;

// Follow-up related schemas
export const baseFollowUpSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  followUpAt: z.string().min(1, "Follow-up date and time is required"),
  reason: z.string().min(1, "Reason for follow-up is required"),
  notes: z.string().optional(),
  summary: z.string().optional(),
  status: z
    .enum([
      "PENDING",
      "COMPLETED",
      "RESCHEDULED",
      "NO_SHOW",
      "NOT_INTERESTED",
      "DROPPED",
    ])
    .default("PENDING"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("LOW"),
  type: z.enum(["HUMAN_AGENT", "AI_AGENT"]).default("HUMAN_AGENT"),
});
export const CreateFollowUpSchema = baseFollowUpSchema;

export type CreateFollowUpRequest = z.infer<typeof CreateFollowUpSchema>;

export const UpdateFollowUpSchema = baseFollowUpSchema.extend({
  id: z.string().min(1, "Follow-up ID is required"),
  attempts: z.number().optional(),
});

export type UpdateFollowUpRequest = z.infer<typeof UpdateFollowUpSchema>;

export const GetFollowUpSchema = z.object({
  id: z.string().min(1, "Follow-up ID is required"),
});

export type GetFollowUpRequest = z.infer<typeof GetFollowUpSchema>;

export const GetAllFollowUpsSchema = z.object({
  type: z.enum(["HUMAN_AGENT", "AI_AGENT"]).optional(),
  status: z
    .enum([
      "PENDING",
      "COMPLETED",
      "RESCHEDULED",
      "NO_SHOW",
      "NOT_INTERESTED",
      "DROPPED",
    ])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});

export type GetAllFollowUpsRequest = z.infer<typeof GetAllFollowUpsSchema>;

// Voice Campaign related schemas
export const FindVoiceLeadSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
  })
  .refine((data) => data.email || data.phone, {
    message: "Either email or phone must be provided",
    path: ["email", "phone"],
  });

export type FindVoiceLeadRequest = z.infer<typeof FindVoiceLeadSchema>;

export const AddLeadToCampaignSchema = z.object({
  campaignId: z.string().min(1, "Campaign ID is required"),
  leadId: z.string().min(1, "Lead ID is required"),
});

export type AddLeadToCampaignRequest = z.infer<typeof AddLeadToCampaignSchema>;

export const GetVoiceLeadSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
});

export type GetVoiceLeadRequest = z.infer<typeof GetVoiceLeadSchema>;

export const UpdateCampaignStatusSchema = z.object({
  campaignId: z.string().min(1, "Campaign ID is required"),
  status: z.string().min(1, "Status is required"),
});

export type UpdateCampaignStatusRequest = z.infer<
  typeof UpdateCampaignStatusSchema
>;

export const FindLeadToCallSchema = z.object({
  campaignId: z.string().min(1, "Campaign ID is required"),
});

export type FindLeadToCallRequest = z.infer<typeof FindLeadToCallSchema>;

export const GetAllVoiceCampaignsSchema = z.object({
  all: z.boolean().optional().default(true),
});

export type GetAllVoiceCampaignsRequest = z.infer<
  typeof GetAllVoiceCampaignsSchema
>;
