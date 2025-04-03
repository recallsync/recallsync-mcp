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
} as const;
