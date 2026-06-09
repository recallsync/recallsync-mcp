export const API_ENDPOINTS = {
  LEAD: {
    CREATE_LEAD: "/leads",
    FIND_LEAD: "/leads/find",
    GET_LEADS: "/leads",
  },
  AGENT: {
    GET_PRIMARY_AGENTS: "/primary-agent",
    GET_PRIMARY_AGENT_BY_ID: "/primary-agent", // GET, append `/{id}`
    CREATE_PRIMARY_AGENT: "/primary-agent",
    UPDATE_PRIMARY_AGENT: "/primary-agent", // append `/{id}`
  },
  INTEGRATION: {
    LIST_PROVIDERS: "/provider",
    LIST_N8N_WORKFLOWS: "/n8n-workflow",
    TEST_N8N_WORKFLOW: "/n8n-workflow/test",
  },
  CHANNEL_AGENT: {
    CREATE_CHANNEL_AGENT: "/channel-agent",
    GET_CHANNEL_AGENT: "/channel-agent", // append `/{id}`
    UPDATE_CHANNEL_AGENT: "/channel-agent", // append `/{id}`
    DELETE_CHANNEL_AGENT: "/channel-agent", // DELETE, append `/{id}`
    SET_CHANNEL_AGENT_TOOLS: "/channel-agent", // append `/{id}/tools`
    SET_CHANNEL_AGENT_FLOW_DRAFT: "/channel-agent", // append `/{id}/flow-draft`
    TEST_CHANNEL_AGENT: "/channel-agent/test",
    CLEAR_TEST_CONVERSATION: "/channel-agent/test/clear",
    GET_TEST_LEAD: "/test-lead",
  },
  CONVERSATION: {
    GET_CONVERSATION: "/conversation",
    SEARCH_CONVERSATIONS: "/conversation/search",
    UPDATE_CONVERSATION: (conversationId: string) =>
      `/conversation/${conversationId}`,
    GET_MESSAGES: (conversationId: string) =>
      `/conversation/${conversationId}/message`,
    CREATE_MESSAGE: (conversationId: string) =>
      `/conversation/${conversationId}/message`,
    UPDATE_MESSAGE: (conversationId: string, id: string) =>
      `/conversation/${conversationId}/message/${id}`,
    DELETE_MESSAGE: (conversationId: string, id: string) =>
      `/conversation/${conversationId}/message/${id}`,
    APPROVE_DRAFT_MESSAGE: (messageId: string) =>
      `/conversation/message/${messageId}/approve`,
    REJECT_DRAFT_MESSAGE: (messageId: string) =>
      `/conversation/message/${messageId}/reject`,
    SEND_MESSAGE: (conversationId: string) =>
      `/conversation/${conversationId}/send`,
  },
  TAG: {
    CREATE_TAG: "/leads/tag",
    GET_TAGS: "/leads/tag",
    GET_TAG: "/leads/tag",
    UPDATE_TAG: "/leads/tag",
    DELETE_TAG: "/leads/tag",
  },
  MEETING: {
    CREATE_MEETING: "/meeting",
    GET_MEETINGS: "/meeting",
    GET_MEETING_BY_LEAD: "/meeting/lead",
    UPDATE_MEETING: "/meeting",
    UPDATE_MEETING_BY_LEAD: "/meeting/lead",
    UPDATE_MEETING_STATUS: "/meeting",
    UPDATE_OVERDUE_NO_SHOW: "/meeting/overdue-no-show",
    GET_UPCOMING_BY_LEAD: "/meeting/lead", // GET, append `/{leadId}/upcoming`
    SET_ALL_OVERDUE_NO_SHOW: "/meeting", // PATCH, append `/all` (id ignored server-side)
  },
  NOTE: {
    CREATE_NOTE: (leadId: string) => `${leadId}/note`,
    GET_NOTES: (leadId: string) => `${leadId}/note`,
    UPDATE_NOTE: (leadId: string, noteId: string) => `${leadId}/note/${noteId}`,
    DELETE_NOTE: (leadId: string, noteId: string) => `${leadId}/note/${noteId}`,
    GET_NOTE_BY_ID: (leadid: string, noteId: string) =>
      `${leadid}/note/${noteId}`,
  },
  FOLLOW_UP: {
    CREATE_FOLLOW_UP: "/follow-up",
    GET_FOLLOW_UP: "/follow-up",
    GET_ALL_FOLLOW_UPS: "/follow-up",
    UPDATE_FOLLOW_UP: "/follow-up",
    DELETE_FOLLOW_UP: "/follow-up",
  },
  CAMPAIGN: {
    GET_ALL_CAMPAIGNS: "/campaign",
    CREATE_CAMPAIGN: "/campaign",
    GET_CAMPAIGN_BY_ID: "/campaign", // append `/{id}`
    UPDATE_CAMPAIGN: "/campaign", // PATCH, append `/{id}`
    UPDATE_CAMPAIGN_STATUS: "/campaign", // PUT, append `/{id}`
    DELETE_CAMPAIGN: "/campaign", // DELETE, append `/{id}`
    CONFIGURE_SETTINGS: "/campaign", // PUT, append `/{id}/settings`
    FIND_LEAD: "/campaign/find-lead",
    ADD_LEAD_TO_CAMPAIGN: "/campaign", // append `/{id}/add-lead/{leadId}`
    GET_CAMPAIGN_LEADS: "/campaign", // GET, append `/{id}/leads`
    REMOVE_LEAD_FROM_CAMPAIGN: "/campaign", // DELETE, append `/{id}/lead/{leadId}`
    GET_LEAD_BY_ID: "/campaign/lead", // append `/{id}`
    UPDATE_CAMPAIGN_LEAD: "/campaign/lead", // PUT, append `/{id}`
    FIND_LEAD_TO_CALL: "/campaign", // append `/{id}/find`
  },
  AUTOMATION: {
    GET_AUTOMATIONS: "/automation",
    CREATE_AUTOMATION: "/automation",
    GET_AUTOMATION_BY_ID: "/automation", // GET, append `/{id}`
    UPDATE_AUTOMATION: "/automation", // PATCH, append `/{id}`
    TRIGGER_AUTOMATION: "/automation", // POST, append `/{id}/trigger`
    STOP_AUTOMATION: "/automation", // POST, append `/{id}/stop`
    GET_LEAD_SESSIONS: "/automation/session", // GET, ?leadId=&status=&page=...
  },
  PIPELINE: {
    GET_PIPELINES: "/pipeline",
    CREATE_PIPELINE: "/pipeline",
    GET_PIPELINE_BY_ID: "/pipeline", // GET, append `/{id}`
    UPDATE_PIPELINE: "/pipeline", // PUT, append `/{id}`
    DELETE_PIPELINE: "/pipeline", // DELETE, append `/{id}`
  },
  STAGE: {
    GET_STAGES: "/stage", // GET, ?pipelineId=&page=...
    CREATE_STAGE: "/stage",
    GET_STAGE_BY_ID: "/stage", // GET, append `/{id}`
    UPDATE_STAGE: "/stage", // PUT, append `/{id}`
    DELETE_STAGE: "/stage", // DELETE, append `/{id}`
  },
  OPPORTUNITY: {
    GET_OPPORTUNITIES: "/pipeline/opportunity",
    CREATE_OPPORTUNITY: "/pipeline/opportunity",
    GET_OPPORTUNITY_BY_ID: "/pipeline/opportunity", // GET, append `/{id}`
    UPDATE_OPPORTUNITY: "/pipeline/opportunity", // PUT, append `/{id}`
    DELETE_OPPORTUNITY: "/pipeline/opportunity", // DELETE, append `/{id}`
  },
  CALL: {
    GET_CALLS: "/call", // GET, ?leadId=&campaignId=&page=...
    GET_CALL_BY_ID: "/call", // GET, append `/{id}`
    CREATE_CALL: "/call", // POST
    UPDATE_CALL: "/call", // PUT, append `/{id}`
  },
  CUSTOM_FIELD: {
    GET_CUSTOM_FIELDS: "/custom-field", // GET, ?page=...
    CREATE_CUSTOM_FIELD: "/custom-field", // POST
    GET_CUSTOM_FIELD_BY_ID: "/custom-field", // GET, append `/{id}`
    UPDATE_CUSTOM_FIELD: "/custom-field", // PUT, append `/{id}`
    DELETE_CUSTOM_FIELD: "/custom-field", // DELETE, append `/{id}`
    GET_LEAD_VALUES: "/custom-field/lead", // GET, append `/{leadId}`
    UPSERT_VALUE: "/custom-field/value", // POST (single or { values: [] } bulk)
    DELETE_VALUE: "/custom-field/value", // DELETE, append `/{id}`
  },
} as const;
