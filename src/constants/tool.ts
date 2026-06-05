export const API_ENDPOINTS = {
  LEAD: {
    CREATE_LEAD: "/leads",
    FIND_LEAD: "/leads/find",
    GET_LEADS: "/leads",
  },
  AGENT: {
    GET_PRIMARY_AGENTS: "/primary-agent",
    CREATE_PRIMARY_AGENT: "/primary-agent",
    UPDATE_PRIMARY_AGENT: "/primary-agent", // append `/{id}`
  },
  INTEGRATION: {
    LIST_PROVIDERS: "/provider",
    LIST_N8N_WORKFLOWS: "/n8n-workflow",
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
    GET_MESSAGES: (conversationId: string) =>
      `/conversation/${conversationId}/message`,
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
    CONFIGURE_SETTINGS: "/campaign", // PUT, append `/{id}/settings`
    FIND_LEAD: "/campaign/find-lead",
    ADD_LEAD_TO_CAMPAIGN: "/campaign", // append `/{id}/add-lead/{leadId}`
    GET_LEAD_BY_ID: "/campaign/lead", // append `/{id}`
    FIND_LEAD_TO_CALL: "/campaign", // append `/{id}/find`
  },
  AUTOMATION: {
    GET_AUTOMATIONS: "/automation",
    CREATE_AUTOMATION: "/automation",
    GET_AUTOMATION_BY_ID: "/automation", // GET, append `/{id}`
    UPDATE_AUTOMATION: "/automation", // PATCH, append `/{id}`
  },
} as const;
