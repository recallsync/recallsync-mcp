import { z } from "zod";
import { ListQuerySchema, PaginationSelectSchema } from "./list-query.js";

// Lead related schemas
export const CreateLeadSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    bestEmail: z.string().optional(),
    phone: z.string().optional(),
    bestPhone: z.string().optional(),
    dateOfBirth: z.string().optional(),
    ianaTimezone: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    address: z.string().optional(),
    company: z.string().optional(),
    companyAddress: z.string().optional(),
    industry: z.string().optional(),
    website: z.string().optional(),
    message: z.string().optional(),
    source: z.string().optional(),
    note: z.string().optional(),
  })
  .refine(
    (data) =>
      (data.email && data.email.trim().length > 0) ||
      (data.phone && data.phone.trim().length > 0),
    {
      message: "Either email or phone must be provided",
      path: ["email", "phone"],
    }
  );

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

// Primary agent schemas
const primaryAgentEditableFields = {
  description: z.string().optional(),
  agentGoal: z.string().optional(),
  goalCompleteCriteria: z.string().optional(),
  stopScenarioDescription: z.string().optional(),
  calendarType: z.enum(["CAL", "CALENDLY", "GHL"]).optional(),
  calenderIntegrationId: z.string().optional(),
  ghlCalendarId: z.string().optional(),
  nextPrimaryAgentId: z.string().nullable().optional(),
  n8nTrainingUrl: z.string().optional(),
  n8nTrainingToken: z.string().optional(),
};

export const CreatePrimaryAgentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  ...primaryAgentEditableFields,
});

export type CreatePrimaryAgentRequest = z.infer<typeof CreatePrimaryAgentSchema>;

export const UpdatePrimaryAgentSchema = z.object({
  id: z.string().min(1, "Primary agent ID is required"),
  name: z.string().min(1).optional(),
  ...primaryAgentEditableFields,
});

export type UpdatePrimaryAgentRequest = z.infer<typeof UpdatePrimaryAgentSchema>;

export const GetPrimaryAgentByIdSchema = z.object({
  id: z.string().min(1, "Primary agent ID is required"),
});

export type GetPrimaryAgentByIdRequest = z.infer<
  typeof GetPrimaryAgentByIdSchema
>;

// Channel agent (BaseAgent) schema. Enums mirror the RecallSync Prisma schema.
const CHANNEL_VALUES = [
  "EMAIL",
  "SMS",
  "WHATSAPP",
  "FACEBOOK",
  "INSTAGRAM",
  "LIVE_CHAT",
  "VOICE_CALL",
  "WP_VOICE_CALL",
] as const;

const PROVIDER_VALUES = [
  "VAPI",
  "TWILIO",
  "GHL",
  "HUBSPOT",
  "N8N",
  "LLM",
  "ELEVEN_LABS",
  "CARTESIA",
  "RETELL",
  "ULTRA_VOX",
  "DEEPGRAM",
  "WHATSAPP",
  "INSTAGRAM",
] as const;

export const AGENT_MODE_VALUES = ["AUTO", "DRAFT"] as const;

export const CreateChannelAgentSchema = z
  .object({
    primaryAgentId: z.string().min(1, "Primary agent ID is required"),
    name: z.string().min(1, "Name is required"),
    channel: z.enum(CHANNEL_VALUES),
    provider: z.enum(PROVIDER_VALUES),
    description: z.string().optional(),
    prompt: z.string().optional(),
    baseAgentType: z.enum(["STANDARD", "RECALL", "FLOW"]).optional(),
    agentMode: z.enum(AGENT_MODE_VALUES).optional(),
    type: z
      .enum(["INTEGRATED", "N8N", "VAPI", "ELEVEN_LABS", "RETELL", "ULTRA_VOX"])
      .optional(),
    isActive: z.boolean().optional(),
    // Required when provider is N8N (pick from list-n8n-workflows).
    n8nWorkflowId: z.string().optional(),
  })
  .refine((data) => data.provider !== "N8N" || !!data.n8nWorkflowId, {
    message: "n8nWorkflowId is required when provider is N8N",
    path: ["n8nWorkflowId"],
  });

export type CreateChannelAgentRequest = z.infer<typeof CreateChannelAgentSchema>;

export const GetChannelAgentSchema = z.object({
  id: z.string().min(1, "Channel agent ID is required"),
});

export type GetChannelAgentRequest = z.infer<typeof GetChannelAgentSchema>;

export const UpdateChannelAgentSchema = z.object({
  id: z.string().min(1, "Channel agent ID is required"),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  agentMode: z.enum(AGENT_MODE_VALUES).optional(),
  // STANDARD (single-prompt) system prompt. FLOW prompts live in the flow graph.
  prompt: z.string().min(1).optional(),
});

export type UpdateChannelAgentRequest = z.infer<typeof UpdateChannelAgentSchema>;

export const DeleteChannelAgentSchema = z.object({
  id: z.string().min(1, "Channel agent ID is required"),
});

export type DeleteChannelAgentRequest = z.infer<
  typeof DeleteChannelAgentSchema
>;

export const TestChannelAgentSchema = z.object({
  baseAgentId: z.string().min(1, "Channel agent id is required"),
  message: z.string().min(1, "Message is required"),
});

export type TestChannelAgentRequest = z.infer<typeof TestChannelAgentSchema>;

export const TestN8nWorkflowSchema = z
  .object({
    baseAgentId: z.string().optional(),
    n8nWorkflowId: z.string().optional(),
    leadId: z.string().optional(),
    toEmail: z.string().email().optional(),
    subject: z.string().optional(),
    content: z.string().optional(),
    userMessage: z.string().optional(),
  })
  .refine((data) => Boolean(data.baseAgentId || data.n8nWorkflowId), {
    message: "Provide baseAgentId and/or n8nWorkflowId",
    path: ["baseAgentId"],
  });

export type TestN8nWorkflowRequest = z.infer<typeof TestN8nWorkflowSchema>;

export const ClearTestConversationSchema = z.object({
  baseAgentId: z.string().min(1).optional(),
});

export type ClearTestConversationRequest = z.infer<
  typeof ClearTestConversationSchema
>;

const ChannelAgentToolParameterSchema = z.object({
  name: z.string().min(1, "Parameter name is required"),
  type: z.enum(["string", "number", "boolean"]).default("string"),
  description: z.string().default(""),
  required: z.boolean().default(false),
});

const ChannelAgentToolSchema = z.object({
  name: z.string().min(1, "Tool name is required"),
  description: z.string().min(1, "Tool description is required"),
  serverUrl: z.string().url("Must be a valid URL"),
  headers: z.record(z.string(), z.string()).optional(),
  parameters: z.array(ChannelAgentToolParameterSchema).optional(),
  body: z.any().optional(),
});

export const SetChannelAgentToolsSchema = z.object({
  id: z.string().min(1, "Channel agent id is required"),
  tools: z.array(ChannelAgentToolSchema),
});

export type SetChannelAgentToolsRequest = z.infer<
  typeof SetChannelAgentToolsSchema
>;

// Push a flow graph to a FLOW channel agent's draft (currentFlow). The flow is
// validated/migrated to v2 server-side, so we keep it loose here (object).
export const SetChannelAgentFlowDraftSchema = z.object({
  id: z.string().min(1, "Channel agent id is required"),
  flow: z.record(z.string(), z.any()),
  publish: z.boolean().optional(),
});

export type SetChannelAgentFlowDraftRequest = z.infer<
  typeof SetChannelAgentFlowDraftSchema
>;

const CONVERSATION_CHANNEL_VALUES = [
  "EMAIL",
  "SMS",
  "WHATSAPP",
  "FACEBOOK",
  "INSTAGRAM",
  "LIVE_CHAT",
  "VOICE_CALL",
  "WP_VOICE_CALL",
] as const;

const MESSAGE_SENDER_VALUES = [
  "AI_AGENT",
  "HUMAN_AGENT",
  "LEAD",
  "SYSTEM",
] as const;

const MESSAGE_STATUS_VALUES = [
  "SENT",
  "DRAFT",
  "SCHEDULED",
  "FAILED",
  "REJECTED",
] as const;

export const GetConversationMessagesSchema = z
  .object({
    conversationId: z.string().min(1, "Conversation id is required"),
    status: z.enum(MESSAGE_STATUS_VALUES).optional(),
    sender: z.enum(MESSAGE_SENDER_VALUES).optional(),
    channel: z.enum(CONVERSATION_CHANNEL_VALUES).optional(),
  })
  .merge(ListQuerySchema);

export type GetConversationMessagesRequest = z.infer<
  typeof GetConversationMessagesSchema
>;

export const GetConversationSchema = z
  .object({
    leadId: z.string().optional(),
    conversationId: z.string().optional(),
    channel: z
      .enum([
        "EMAIL",
        "SMS",
        "WHATSAPP",
        "FACEBOOK",
        "INSTAGRAM",
        "LIVE_CHAT",
        "VOICE_CALL",
        "WP_VOICE_CALL",
      ])
      .optional(),
  })
  .refine((data) => data.leadId || data.conversationId, {
    message: "Either leadId or conversationId is required",
    path: ["leadId", "conversationId"],
  });

export type GetConversationRequest = z.infer<typeof GetConversationSchema>;

export const SearchConversationsSchema = z.object({
  leadId: z.string().optional(),
  conversationId: z.string().optional(),
});

export type SearchConversationsRequest = z.infer<
  typeof SearchConversationsSchema
>;

export const ApproveDraftMessageSchema = z.object({
  messageId: z.string().min(1, "Message id is required"),
  content: z.string().optional(),
  subject: z.string().optional(),
});

export type ApproveDraftMessageRequest = z.infer<
  typeof ApproveDraftMessageSchema
>;

export const RejectDraftMessageSchema = z.object({
  messageId: z.string().min(1, "Message id is required"),
});

export type RejectDraftMessageRequest = z.infer<
  typeof RejectDraftMessageSchema
>;

export const SendMessageSchema = z.object({
  conversationId: z.string().min(1, "Conversation id is required"),
  content: z.string().min(1, "Content is required"),
  subject: z.string().optional(),
  baseAgentId: z.string().optional(),
});

export type SendMessageRequest = z.infer<typeof SendMessageSchema>;

const MESSAGE_ITEM_TYPE_VALUES = ["MESSAGE", "CALL"] as const;

export const UpdateConversationSchema = z.object({
  conversationId: z.string().min(1, "Conversation id is required"),
  starred: z.boolean().optional(),
  killed: z.boolean().optional(),
  replyMode: z.enum(["AUTO", "MANUAL"]).optional(),
  activeAgentId: z.string().nullable().optional(),
});

export type UpdateConversationRequest = z.infer<
  typeof UpdateConversationSchema
>;

export const CreateConversationMessageSchema = z.object({
  conversationId: z.string().min(1, "Conversation id is required"),
  leadId: z.string().min(1, "Lead id is required"),
  content: z.string().min(1, "Content is required"),
  sender: z.enum(MESSAGE_SENDER_VALUES).optional(),
  status: z.enum(MESSAGE_STATUS_VALUES).optional(),
  channel: z.enum(CONVERSATION_CHANNEL_VALUES).optional(),
  snippet: z.string().optional(),
  itemType: z.enum(MESSAGE_ITEM_TYPE_VALUES).optional(),
  callId: z.string().optional(),
});

export type CreateConversationMessageRequest = z.infer<
  typeof CreateConversationMessageSchema
>;

export const UpdateConversationMessageSchema = z.object({
  conversationId: z.string().min(1, "Conversation id is required"),
  id: z.string().min(1, "Message id is required"),
  content: z.string().optional(),
  sender: z.enum(MESSAGE_SENDER_VALUES).optional(),
  status: z.enum(MESSAGE_STATUS_VALUES).optional(),
  channel: z.enum(CONVERSATION_CHANNEL_VALUES).optional(),
  snippet: z.string().optional(),
  itemType: z.enum(MESSAGE_ITEM_TYPE_VALUES).optional(),
});

export type UpdateConversationMessageRequest = z.infer<
  typeof UpdateConversationMessageSchema
>;

export const DeleteConversationMessageSchema = z.object({
  conversationId: z.string().min(1, "Conversation id is required"),
  id: z.string().min(1, "Message id is required"),
});

export type DeleteConversationMessageRequest = z.infer<
  typeof DeleteConversationMessageSchema
>;

export const CreateTagSchema = z.object({
  name: z.string().min(1, "Tag name is required"),
});

export type CreateTagRequest = z.infer<typeof CreateTagSchema>;

export const UpdateTagSchema = z.object({
  id: z.string().min(1, "Tag ID is required"),
  name: z.string().min(1, "Tag name is required"),
});

export type UpdateTagRequest = z.infer<typeof UpdateTagSchema>;

export const UpdateLeadSchema = z
  .object({
    id: z.string().min(1, "Lead ID is required"),
    status: z.enum(["NEW", "CONTACTED", "RETRYING", "JUNK", "BOOKED"]).optional(),
    statusType: z.enum(["HOT", "WARM", "COLD"]).optional(),
    quality: z
      .enum(["UNQUALIFIED", "LOW", "MEDIUM", "HIGH", "PERFECT"])
      .optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    bestEmail: z.string().optional(),
    bestPhone: z.string().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    companyShortName: z.string().optional(),
    industry: z.string().optional(),
    website: z.string().optional(),
    note: z.string().optional(),
    message: z.string().optional(),
    /** Merged into automation {{var}} substitution (e.g. personalizationHighlight). */
    customData: z.record(z.string(), z.string()).optional(),
  })
  .refine(
    (data) =>
      Object.keys(data).some(
        (key) => key !== "id" && data[key as keyof typeof data] !== undefined
      ),
    { message: "Provide at least one field to update besides id" }
  );

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

export const GetUpcomingMeetingsByLeadSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
});

export type GetUpcomingMeetingsByLeadRequest = z.infer<
  typeof GetUpcomingMeetingsByLeadSchema
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

export const GetAllFollowUpsSchema = z
  .object({
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
  })
  .merge(ListQuerySchema);

export type GetAllFollowUpsRequest = z.infer<typeof GetAllFollowUpsSchema>;

// Campaign related schemas
const CAMPAIGN_STATUS_VALUES = [
  "DRAFT",
  "TESTING",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "FAILED",
] as const;

const CAMPAIGN_LEAD_STATUS_VALUES = [
  "PENDING",
  "RETRYING",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
] as const;

export const GetAllCampaignsSchema = z
  .object({
    status: z.enum(CAMPAIGN_STATUS_VALUES).optional(),
  })
  .merge(ListQuerySchema);

export type GetAllCampaignsRequest = z.infer<typeof GetAllCampaignsSchema>;

export const GetCampaignSchema = z.object({
  campaignId: z.string().min(1, "Campaign ID is required"),
});

export type GetCampaignRequest = z.infer<typeof GetCampaignSchema>;

export const CreateCampaignSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  // Configuration stops at DRAFT/TESTING. Activation is a separate explicit step.
  status: z.enum(["DRAFT", "TESTING"]).optional(),
  automationId: z.string().nullable().optional(),
});

export type CreateCampaignRequest = z.infer<typeof CreateCampaignSchema>;

export const UpdateCampaignSchema = z.object({
  campaignId: z.string().min(1, "Campaign ID is required"),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["DRAFT", "TESTING"]).optional(),
  automationId: z.string().nullable().optional(),
});

export type UpdateCampaignRequest = z.infer<typeof UpdateCampaignSchema>;

// Weekly schedule shape accepted by configure-campaign-settings.
const CampaignDailyScheduleSchema = z.object({
  enabled: z.boolean(),
  timeSlots: z.array(
    z.object({
      startTime: z.string().min(1),
      endTime: z.string().min(1),
    })
  ),
});

const CampaignWeeklyScheduleSchema = z.object({
  monday: CampaignDailyScheduleSchema,
  tuesday: CampaignDailyScheduleSchema,
  wednesday: CampaignDailyScheduleSchema,
  thursday: CampaignDailyScheduleSchema,
  friday: CampaignDailyScheduleSchema,
  saturday: CampaignDailyScheduleSchema,
  sunday: CampaignDailyScheduleSchema,
});

export const ConfigureCampaignSettingsSchema = z.object({
  campaignId: z.string().min(1, "Campaign ID is required"),
  // The campaign's worker. This is the main thing a campaign binds to.
  primaryAgentId: z.string().min(1, "primaryAgentId is required"),
  timeZone: z.string().optional(),
  withRetries: z.boolean().optional(),
  maxRetryAttempts: z.number().min(1).max(10).optional(),
  retryInterval: z.number().min(1).max(30).optional(),
  retryIntervalType: z.enum(["hour", "day"]).optional(),
  concurrentCalls: z.number().min(1).max(10).optional(),
  automationId: z.string().nullable().optional(),
  channels: z
    .array(z.enum(CHANNEL_VALUES).or(z.literal("NONE")))
    .optional(),
  assistantIds: z.array(z.string()).optional(),
  weeklySchedule: CampaignWeeklyScheduleSchema.optional(),
});

export type ConfigureCampaignSettingsRequest = z.infer<
  typeof ConfigureCampaignSettingsSchema
>;

export const FindCampaignLeadSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
  })
  .refine((data) => data.email || data.phone, {
    message: "Either email or phone must be provided",
    path: ["email", "phone"],
  });

export type FindCampaignLeadRequest = z.infer<typeof FindCampaignLeadSchema>;

export const AddLeadToCampaignSchema = z.object({
  campaignId: z.string().min(1, "Campaign ID is required"),
  leadId: z.string().min(1, "Lead ID is required"),
});

export type AddLeadToCampaignRequest = z.infer<typeof AddLeadToCampaignSchema>;

export const GetCampaignLeadsSchema = z
  .object({
    campaignId: z.string().min(1, "Campaign ID is required"),
    withoutWorkingHoursCheck: z.boolean().optional(),
  })
  .merge(PaginationSelectSchema);

export type GetCampaignLeadsRequest = z.infer<typeof GetCampaignLeadsSchema>;

export const RemoveLeadFromCampaignSchema = z.object({
  campaignId: z.string().min(1, "Campaign ID is required"),
  leadId: z.string().min(1, "Lead ID is required"),
});

export type RemoveLeadFromCampaignRequest = z.infer<
  typeof RemoveLeadFromCampaignSchema
>;

export const GetCampaignLeadSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
});

export type GetCampaignLeadRequest = z.infer<typeof GetCampaignLeadSchema>;

export const UpdateCampaignStatusSchema = z.object({
  campaignId: z.string().min(1, "Campaign ID is required"),
  status: z.enum(CAMPAIGN_STATUS_VALUES),
});

export type UpdateCampaignStatusRequest = z.infer<
  typeof UpdateCampaignStatusSchema
>;

export const UpdateCampaignLeadSchema = z.object({
  campaignLeadId: z.string().min(1, "Campaign lead ID is required"),
  status: z.enum(CAMPAIGN_LEAD_STATUS_VALUES),
});

export type UpdateCampaignLeadRequest = z.infer<
  typeof UpdateCampaignLeadSchema
>;

export const DeleteCampaignSchema = z.object({
  campaignId: z.string().min(1, "Campaign ID is required"),
});

export type DeleteCampaignRequest = z.infer<typeof DeleteCampaignSchema>;

export const FindLeadToCallSchema = z.object({
  campaignId: z.string().min(1, "Campaign ID is required"),
});

export type FindLeadToCallRequest = z.infer<typeof FindLeadToCallSchema>;

// Automation related schemas
const AUTOMATION_STATUS_VALUES = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "TERMINATED",
  "COMPLETED",
  "FAILED",
] as const;

// React Flow JSON for an automation cadence ({ nodes, edges }). Kept permissive
// (the app validates/migrates server-side); nodes/edges are passed through as-is.
const AutomationFlowSchema = z.object({
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
});

export const GetAutomationsSchema = z
  .object({
    status: z.enum(AUTOMATION_STATUS_VALUES).optional(),
  })
  .merge(ListQuerySchema);

export type GetAutomationsRequest = z.infer<typeof GetAutomationsSchema>;

export const GetAutomationSchema = z.object({
  automationId: z.string().min(1, "Automation ID is required"),
});

export type GetAutomationRequest = z.infer<typeof GetAutomationSchema>;

export const CreateAutomationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  // The worker this cadence runs through (must belong to the business).
  primaryAgentId: z.string().min(1, "primaryAgentId is required"),
  status: z.enum(AUTOMATION_STATUS_VALUES).optional(),
  flow: AutomationFlowSchema.optional(),
  flowSettings: z.record(z.any()).optional(),
});

export type CreateAutomationRequest = z.infer<typeof CreateAutomationSchema>;

export const UpdateAutomationSchema = z.object({
  automationId: z.string().min(1, "Automation ID is required"),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(AUTOMATION_STATUS_VALUES).optional(),
  flow: AutomationFlowSchema.optional(),
  flowSettings: z.record(z.any()).optional(),
});

export type UpdateAutomationRequest = z.infer<typeof UpdateAutomationSchema>;

export const TriggerAutomationSchema = z.object({
  automationId: z.string().min(1, "Automation ID is required"),
  leadId: z.string().min(1, "Lead ID is required"),
});

export type TriggerAutomationRequest = z.infer<typeof TriggerAutomationSchema>;

export const StopAutomationSchema = z.object({
  automationId: z.string().min(1, "Automation ID is required"),
  leadId: z.string().min(1, "Lead ID is required"),
});

export type StopAutomationRequest = z.infer<typeof StopAutomationSchema>;

const AGENT_SESSION_STATUS_VALUES = [
  "ACTIVE",
  "TERMINATED",
  "COMPLETED",
  "FAILED",
] as const;

export const GetLeadAutomationSessionsSchema = z
  .object({
    leadId: z.string().min(1, "Lead ID is required"),
    status: z.enum(AGENT_SESSION_STATUS_VALUES).optional(),
  })
  .merge(ListQuerySchema);

export type GetLeadAutomationSessionsRequest = z.infer<
  typeof GetLeadAutomationSessionsSchema
>;

// Pipeline schemas
export const GetPipelinesSchema = z.object({}).merge(ListQuerySchema);
export type GetPipelinesRequest = z.infer<typeof GetPipelinesSchema>;

export const GetPipelineByIdSchema = z.object({
  id: z.string().min(1, "Pipeline ID is required"),
});
export type GetPipelineByIdRequest = z.infer<typeof GetPipelineByIdSchema>;

export const CreatePipelineSchema = z.object({
  name: z.string().min(1, "Pipeline name is required"),
});
export type CreatePipelineRequest = z.infer<typeof CreatePipelineSchema>;

export const UpdatePipelineSchema = z.object({
  id: z.string().min(1, "Pipeline ID is required"),
  name: z.string().min(1, "Pipeline name is required"),
});
export type UpdatePipelineRequest = z.infer<typeof UpdatePipelineSchema>;

export const DeletePipelineSchema = z.object({
  id: z.string().min(1, "Pipeline ID is required"),
});
export type DeletePipelineRequest = z.infer<typeof DeletePipelineSchema>;

// Stage schemas
export const GetStagesSchema = z
  .object({
    pipelineId: z.string().min(1, "Pipeline ID is required"),
  })
  .merge(ListQuerySchema);
export type GetStagesRequest = z.infer<typeof GetStagesSchema>;

export const GetStageByIdSchema = z.object({
  id: z.string().min(1, "Stage ID is required"),
});
export type GetStageByIdRequest = z.infer<typeof GetStageByIdSchema>;

export const CreateStageSchema = z.object({
  name: z.string().min(1, "Stage name is required"),
  pipelineId: z.string().min(1, "Pipeline ID is required"),
});
export type CreateStageRequest = z.infer<typeof CreateStageSchema>;

export const UpdateStageSchema = z.object({
  id: z.string().min(1, "Stage ID is required"),
  name: z.string().min(1, "Stage name is required"),
});
export type UpdateStageRequest = z.infer<typeof UpdateStageSchema>;

export const DeleteStageSchema = z.object({
  id: z.string().min(1, "Stage ID is required"),
});
export type DeleteStageRequest = z.infer<typeof DeleteStageSchema>;

// Opportunity schemas
const OPPORTUNITY_STATUS_VALUES = ["OPEN", "LOST", "WON", "ABANDONED"] as const;

export const GetOpportunitiesSchema = z
  .object({
    pipelineId: z.string().optional(),
    stageId: z.string().optional(),
    leadId: z.string().optional(),
  })
  .merge(ListQuerySchema);
export type GetOpportunitiesRequest = z.infer<typeof GetOpportunitiesSchema>;

export const GetOpportunityByIdSchema = z.object({
  id: z.string().min(1, "Opportunity ID is required"),
});
export type GetOpportunityByIdRequest = z.infer<
  typeof GetOpportunityByIdSchema
>;

export const CreateOpportunitySchema = z.object({
  name: z.string().min(1, "Opportunity name is required"),
  description: z.string().optional(),
  value: z.number().optional(),
  stageId: z.string().min(1, "Stage ID is required"),
  leadId: z.string().min(1, "Lead ID is required"),
  pipelineId: z.string().min(1, "Pipeline ID is required"),
});
export type CreateOpportunityRequest = z.infer<typeof CreateOpportunitySchema>;

export const UpdateOpportunitySchema = z.object({
  id: z.string().min(1, "Opportunity ID is required"),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  value: z.number().optional(),
  status: z.enum(OPPORTUNITY_STATUS_VALUES).optional(),
  source: z.string().optional(),
  businessName: z.string().optional(),
  stageId: z.string().optional(),
  leadId: z.string().optional(),
  pipelineId: z.string().optional(),
});
export type UpdateOpportunityRequest = z.infer<typeof UpdateOpportunitySchema>;

export const DeleteOpportunitySchema = z.object({
  id: z.string().min(1, "Opportunity ID is required"),
});
export type DeleteOpportunityRequest = z.infer<typeof DeleteOpportunitySchema>;

// Call (LeadCall) schemas
const CALL_TYPE_VALUES = ["INBOUND", "OUTBOUND", "WEB"] as const;
const LEAD_CALL_TYPE_VALUES = ["GLOBAL", "CAMPAIGN"] as const;

export const GetCallsSchema = z
  .object({
    leadId: z.string().optional(),
    campaignId: z.string().optional(),
  })
  .merge(ListQuerySchema);
export type GetCallsRequest = z.infer<typeof GetCallsSchema>;

export const GetCallByIdSchema = z.object({
  id: z.string().min(1, "Call ID is required"),
});
export type GetCallByIdRequest = z.infer<typeof GetCallByIdSchema>;

export const CreateCallSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  type: z.enum(CALL_TYPE_VALUES),
  callId: z.string().min(1, "Provider call ID is required"),
  endedReason: z.string().min(1, "Ended reason is required"),
  result: z.string().min(1, "Result is required"),
  transcript: z.any().optional(),
  summary: z.string().optional(),
  notes: z.string().optional(),
  audioUrl: z.string().optional(),
  callType: z.enum(LEAD_CALL_TYPE_VALUES).optional(),
  callDuration: z.number().optional(),
  costVoiceAi: z.number().optional(),
  costTelephony: z.number().optional(),
  totalCost: z.number().optional(),
  campaignId: z.string().optional(),
});
export type CreateCallRequest = z.infer<typeof CreateCallSchema>;

export const UpdateCallSchema = z.object({
  id: z.string().min(1, "Call ID is required"),
  type: z.enum(CALL_TYPE_VALUES).optional(),
  callId: z.string().optional(),
  endedReason: z.string().optional(),
  result: z.string().optional(),
  transcript: z.any().optional(),
  summary: z.string().optional(),
  notes: z.string().optional(),
  audioUrl: z.string().optional(),
  callType: z.enum(LEAD_CALL_TYPE_VALUES).optional(),
  callDuration: z.number().optional(),
  costVoiceAi: z.number().optional(),
  costTelephony: z.number().optional(),
  totalCost: z.number().optional(),
  campaignId: z.string().optional(),
});
export type UpdateCallRequest = z.infer<typeof UpdateCallSchema>;
