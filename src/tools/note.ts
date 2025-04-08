import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { API_ENDPOINTS } from "../constants/tool.js";
import {
  CreateNoteSchema,
  CreateNoteRequest,
  UpdateNoteSchema,
  UpdateNoteRequest,
  GetNotesSchema,
  GetNotesRequest,
} from "../schema/tool.js";

export const noteTools = [
  {
    name: "create-note",
    description: "Create a new note for a lead",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        leadId: {
          type: "string",
          description: "ID of the lead to create a note for",
        },
        content: {
          type: "string",
          description: "Content of the note",
        },
      },
      required: ["leadId", "content"],
    },
  },
  {
    name: "get-notes",
    description: "Get all notes for a lead",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        leadId: {
          type: "string",
          description: "ID of the lead to get notes for",
        },
      },
      required: ["leadId"],
    },
  },
  {
    name: "update-note",
    description: "Update an existing note",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "ID of the note to update",
        },
        content: {
          type: "string",
          description: "New content for the note",
        },
      },
      required: ["id", "content"],
    },
  },
  {
    name: "delete-note",
    description: "Delete a note",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "ID of the note to delete",
        },
      },
      required: ["id"],
    },
  },
];

export async function handleCreateNote(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as CreateNoteRequest;

    // Validate the input using Zod
    const result = CreateNoteSchema.safeParse(args);

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to create note: ${errorMessages}. Please provide the missing or incorrect information.`,
          },
        ],
      };
    }

    const { leadId, content } = result.data;
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.NOTE.CREATE_NOTE}`;
    const body = { leadId, content };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to create note: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Successfully created note: ${JSON.stringify(data)}`,
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      content: [
        {
          type: "text",
          text: `Failed to execute create-note tool: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleGetNotes(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as GetNotesRequest;

    // Validate the input using Zod
    const result = GetNotesSchema.safeParse(args);

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to get notes: ${errorMessages}. Please provide the lead ID.`,
          },
        ],
      };
    }

    const { leadId } = result.data;
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.NOTE.GET_NOTES}`;
    const queryParams = new URLSearchParams();
    queryParams.append("leadId", leadId);

    const response = await fetch(`${url}?${queryParams.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get notes: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Retrieved notes: ${JSON.stringify(data)}`,
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      content: [
        {
          type: "text",
          text: `Failed to execute get-notes tool: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleUpdateNote(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as UpdateNoteRequest;

    // Validate the input using Zod
    const result = UpdateNoteSchema.safeParse(args);

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to update note: ${errorMessages}. Please provide the note ID and new content.`,
          },
        ],
      };
    }

    const { id, content } = result.data;
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.NOTE.UPDATE_NOTE}`;
    const body = { id, content };

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to update note: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Successfully updated note: ${JSON.stringify(data)}`,
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      content: [
        {
          type: "text",
          text: `Failed to execute update-note tool: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleDeleteNote(request: CallToolRequest) {
  try {
    const args = request.params.arguments as { id: string };

    if (!args.id) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to delete note: Note ID is required",
          },
        ],
      };
    }

    const url = `${process.env.BASE_URL}${API_ENDPOINTS.NOTE.DELETE_NOTE}/${args.id}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to delete note: ${response.statusText}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: "Successfully deleted note",
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      content: [
        {
          type: "text",
          text: `Failed to execute delete-note tool: ${errorMessage}`,
        },
      ],
    };
  }
}
