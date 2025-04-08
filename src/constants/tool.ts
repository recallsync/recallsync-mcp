export const API_ENDPOINTS = {
  LEAD: {
    CREATE_LEAD: "/leads",
    FIND_LEAD: "/leads/find",
    GET_LEADS: "/leads",
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
    CREATE_NOTE: "/leads/note",
    GET_NOTES: "/leads/note",
    UPDATE_NOTE: "/leads/note",
    DELETE_NOTE: "/leads/note",
  },
  FOLLOW_UP: {
    CREATE_FOLLOW_UP: "/follow-up",
    GET_FOLLOW_UP: "/follow-up",
    GET_ALL_FOLLOW_UPS: "/follow-up",
    UPDATE_FOLLOW_UP: "/follow-up",
    DELETE_FOLLOW_UP: "/follow-up",
  },
  VOICE_CAMPAIGN: {
    GET_ALL_CAMPAIGNS: "/campaign/voice",
    FIND_LEAD: "/campaign/voice/find-lead",
    ADD_LEAD_TO_CAMPAIGN: "/campaign/voice",
    GET_LEAD_BY_ID: "/campaign/voice/lead",
    UPDATE_CAMPAIGN_STATUS: "/campaign/voice",
    FIND_LEAD_TO_CALL: "/campaign/voice",
  },
} as const;
