import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express, { Request, Response } from "express";
import cors from "cors";
import {
  leadTools,
  handleCreateLead,
  handleFindLead,
  handleGetLeads,
  handleGetLead,
  handleUpdateLead,
  handleDeleteLead,
} from "./src/tools/lead.js";
import {
  tagTools,
  handleCreateTag,
  handleGetTags,
  handleGetTag,
  handleUpdateTag,
  handleDeleteTag,
} from "./src/tools/tag.js";
import {
  meetingTools,
  handleCreateMeeting,
  handleGetMeetings,
  handleGetMeetingsByLead,
  handleUpdateMeeting,
  handleUpdateMeetingByLead,
  handleUpdateMeetingStatus,
  handleUpdateOverdueNoShow,
} from "./src/tools/meeting.js";
import {
  noteTools,
  handleCreateNote,
  handleGetNotes,
  handleUpdateNote,
  handleDeleteNote,
} from "./src/tools/note.js";
import {
  followUpTools,
  handleCreateFollowUp,
  handleGetFollowUp,
  handleGetAllFollowUps,
  handleUpdateFollowUp,
  handleDeleteFollowUp,
} from "./src/tools/followUp.js";
import {
  voiceCampaignTools,
  handleFindVoiceLead,
  handleAddLeadToCampaign,
  handleGetVoiceLead,
  handleUpdateCampaignStatus,
  handleFindLeadToCall,
  handleGetAllVoiceCampaigns,
} from "./src/tools/voiceCampaign.js";
import dotenv from "dotenv";

dotenv.config();

const server = new Server(
  {
    name: "recallsync-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      prompts: {},
      resources: {},
      tools: {},
      operations: {
        "list-prompts": {},
        "get-prompt": {},
        "list-resources": {},
        "get-resource": {},
        "list-tools": {},
        "get-tool": {},
        "execute-tool": {},
      },
    },
  }
);

// Register the tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
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
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "create-lead":
      return handleCreateLead(request);
    case "find-lead":
      return handleFindLead(request);
    case "get-leads":
      return handleGetLeads(request);
    case "get-lead":
      return handleGetLead(request);
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
    case "create-note":
      return handleCreateNote(request);
    case "get-notes":
      return handleGetNotes(request);
    case "update-note":
      return handleUpdateNote(request);
    case "delete-note":
      return handleDeleteNote(request);
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
    default:
      throw new Error("Unknown tool");
  }
});

// Keep the existing prompt handlers
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  throw new Error("Unknown prompt");
});

const app = express();

// Enable CORS for all routes
app.use(cors());

// Store active SSE transports
const transports: { [sessionId: string]: SSEServerTransport } = {};

// SSE endpoint for establishing connections
app.get("/sse", async (_: Request, res: Response) => {
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;

  // Clean up transport when connection closes
  res.on("close", () => {
    delete transports[transport.sessionId];
  });

  await server.connect(transport);
});

// Endpoint for handling messages
app.post("/messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];
  const api_token = req.headers["api_token"] as string;
  if (!api_token) {
    res.status(401).send("Unauthorized");
    return;
  }

  if (transport) {
    try {
      // Add API token to request metadata
      await transport.handlePostMessage(req, res);
    } catch (error) {
      console.error("Error handling message:", error);
      res.status(500).send("Error handling message");
    }
  } else {
    res.status(400).send("No transport found for sessionId");
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
