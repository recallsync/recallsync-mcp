import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  leadTools,
  handleCreateLead,
  handleFindLead,
  handleGetLeads,
  handleGetLead,
  handleUpdateLead,
  handleDeleteLead,
  handleGetLeadByName,
} from "../tools/lead.js";
import {
  tagTools,
  handleCreateTag,
  handleGetTags,
  handleGetTag,
  handleUpdateTag,
  handleDeleteTag,
} from "../tools/tag.js";
import {
  meetingTools,
  handleCreateMeeting,
  handleGetMeetings,
  handleGetMeetingsByLead,
  handleUpdateMeeting,
  handleUpdateMeetingByLead,
  handleUpdateMeetingStatus,
  handleUpdateOverdueNoShow,
} from "../tools/meeting.js";
import {
  noteTools,
  handleCreateNote,
  handleGetNote,
  handleGetAllNotes,
  handleUpdateNote,
  handleDeleteNote,
  handleGetNoteById,
} from "../tools/note.js";
import {
  followUpTools,
  handleCreateFollowUp,
  handleGetFollowUp,
  handleGetAllFollowUps,
  handleUpdateFollowUp,
  handleDeleteFollowUp,
} from "../tools/followUp.js";
import {
  voiceCampaignTools,
  handleFindVoiceLead,
  handleAddLeadToCampaign,
  handleGetVoiceLead,
  handleUpdateCampaignStatus,
  handleFindLeadToCall,
  handleGetAllVoiceCampaigns,
} from "../tools/voiceCampaign.js";

export const primaryServer = new Server(
  {
    name: "recallsync-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      prompts: {},
      resources: {},
      tools: {},
    },
  }
);

// Register the tools
primaryServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      ...leadTools,
      ...tagTools,
      ...meetingTools,
      ...noteTools,
      ...followUpTools,
      ...voiceCampaignTools,
    ],
  };
});

// Handle tool execution
primaryServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "create-lead":
      return handleCreateLead(request);
    case "find-lead":
      return handleFindLead(request);
    case "get-leads":
      return handleGetLeads(request);
    case "get-lead":
      return handleGetLead(request);
    case "get-lead-by-name":
      return handleGetLeadByName(request);
    case "update-lead":
      return handleUpdateLead(request);
    case "delete-lead":
      return handleDeleteLead(request);
    case "create-tag":
      return handleCreateTag(request);
    case "get-tags":
      return handleGetTags(request);
    case "get-tag":
      return handleGetTag(request);
    case "update-tag":
      return handleUpdateTag(request);
    case "delete-tag":
      return handleDeleteTag(request);
    case "create-meeting":
      return handleCreateMeeting(request);
    case "get-meetings":
      return handleGetMeetings(request);
    case "get-meetings-by-lead":
      return handleGetMeetingsByLead(request);
    case "update-meeting":
      return handleUpdateMeeting(request);
    case "update-meeting-by-lead":
      return handleUpdateMeetingByLead(request);
    case "update-meeting-status":
      return handleUpdateMeetingStatus(request);
    case "update-overdue-no-show":
      return handleUpdateOverdueNoShow(request);
    case "create-follow-up":
      return handleCreateFollowUp(request);
    case "get-follow-up":
      return handleGetFollowUp(request);
    case "get-all-follow-ups":
      return handleGetAllFollowUps(request);
    case "update-follow-up":
      return handleUpdateFollowUp(request);
    case "delete-follow-up":
      return handleDeleteFollowUp(request);
    case "find-voice-lead":
      return handleFindVoiceLead(request);
    case "add-lead-to-campaign":
      return handleAddLeadToCampaign(request);
    case "get-voice-lead":
      return handleGetVoiceLead(request);
    case "update-campaign-status":
      return handleUpdateCampaignStatus(request);
    case "find-lead-to-call":
      return handleFindLeadToCall(request);
    case "get-all-voice-campaigns":
      return handleGetAllVoiceCampaigns(request);
    case "create-note":
      return handleCreateNote(request);
    case "get-note":
      return handleGetNote(request);
    case "get-lead-notes":
      return handleGetAllNotes(request);
    case "get-note-by-id":
      return handleGetNoteById(request);
    case "update-note":
      return handleUpdateNote(request);
    case "delete-note":
      return handleDeleteNote(request);
    default:
      throw new Error("Unknown tool");
  }
});

// Keep the existing prompt handlers
primaryServer.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [],
  };
});

primaryServer.setRequestHandler(GetPromptRequestSchema, async (request) => {
  throw new Error("Unknown prompt");
});
