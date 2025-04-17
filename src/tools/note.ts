import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { API_ENDPOINTS } from "../constants/tool.js";
import {
  CreateNoteSchema,
  CreateNoteRequest,
  GetNoteSchema,
  GetNoteRequest,
  GetAllNotesSchema,
  GetAllNotesRequest,
  UpdateNoteSchema,
  UpdateNoteRequest,
  DeleteNoteSchema,
  DeleteNoteRequest,
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
        note: {
          type: "string",
          description: "Content of the note",
        },
      },
      required: ["leadId", "note"],
      additionalProperties: false,
    },
  },
  {
    name: "get-note",
    description: "Get a specific note by ID for a lead",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        leadId: {
          type: "string",
          description: "ID of the lead",
        },
        noteId: {
          type: "string",
          description: "ID of the note to retrieve",
        },
      },
      required: ["leadId", "noteId"],
      additionalProperties: false,
    },
  },
  {
    name: "get-lead-notes",
    description: "Get all notes for a lead using its lead Id",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        leadId: {
          type: "string",
          description: "ID of the lead to get notes for",
        },
        all: {
          type: "boolean",
          description: "Optional parameter to get all notes",
          default: true,
        },
      },
      required: ["leadId"],
      additionalProperties: false,
    },
  },
  {
    name: "update-note",
    description: "Update an existing note for a lead",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        leadId: {
          type: "string",
          description: "ID of the lead",
        },
        noteId: {
          type: "string",
          description: "ID of the note to update",
        },
        note: {
          type: "string",
          description: "New content for the note",
        },
      },
      required: ["leadId", "noteId", "note"],
      additionalProperties: false,
    },
  },
  {
    name: "delete-note",
    description: "Delete a note for a lead",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        leadId: {
          type: "string",
          description: "ID of the lead",
        },
        noteId: {
          type: "string",
          description: "ID of the note to delete",
        },
      },
      required: ["leadId", "noteId"],
      additionalProperties: false,
    },
  },
  {
    name: "get-note-by-id",
    description: "Get a specific note by its ID",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        leadId: {
          type: "string",
          description: "ID of the lead that owns the note",
        },
        noteId: {
          type: "string",
          description: "ID of the note to retrieve",
        },
      },
      required: ["leadId", "noteId"],
      additionalProperties: false,
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

    const { leadId, note } = result.data;
    const url = `${process.env.BASE_URL}/${leadId}/note`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
      body: JSON.stringify({ note }),
    });

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorData = await response.text();
        // Try to parse as JSON if it looks like JSON
        if (
          errorData.trim().startsWith("{") ||
          errorData.trim().startsWith("[")
        ) {
          const jsonError = JSON.parse(errorData);
          errorMessage = jsonError.message || errorData;
        } else {
          errorMessage = errorData;
        }
      } catch (e) {
        console.error("Failed to parse error response:", e);
      }
      return {
        content: [
          {
            type: "text",
            text: `Failed to create note: ${errorMessage}`,
          },
        ],
      };
    }

    const data = await response.json();

    return {
      content: [
        {
          type: "text",
          text: `Successfully created note for lead ${leadId}:\nNote ID: ${data.id}\nContent: ${note}`,
        },
      ],
    };
  } catch (error: unknown) {
    console.error("Create Note Exception:", error);
    return {
      content: [
        {
          type: "text",
          text: `An error occurred while creating the note: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      ],
    };
  }
}

export async function handleGetNote(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as GetNoteRequest;

    // Validate the input using Zod
    const result = GetNoteSchema.safeParse(args);

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to get note: ${errorMessages}. Please provide the missing or incorrect information.`,
          },
        ],
      };
    }

    const { leadId, noteId } = result.data;
    const url = `${process.env.BASE_URL}/${API_ENDPOINTS.NOTE.GET_NOTES(
      leadId
    )}/${noteId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        content: [
          {
            type: "text",
            text: errorData.message || "Failed to get note",
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Successfully retrieved note for lead ${leadId}`,
        },
        {
          type: "data",
          data,
        },
      ],
    };
  } catch (error: unknown) {
    return {
      content: [
        {
          type: "text",
          text: `An error occurred while getting the note: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      ],
    };
  }
}

export async function handleGetAllNotes(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as GetAllNotesRequest;

    // Validate the input using Zod
    const result = GetAllNotesSchema.safeParse(args);

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to get notes: ${errorMessages}. Please provide the missing or incorrect information.`,
          },
        ],
      };
    }

    const { leadId } = result.data;
    const url = `${process.env.BASE_URL}/${leadId}/note`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
    });

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorData = await response.text();
        errorMessage = errorData;
      } catch (e) {
        console.error("Failed to parse error response:", e);
      }
      return {
        content: [
          {
            type: "text",
            text: `Failed to get notes: ${errorMessage}`,
          },
        ],
      };
    }

    const data = await response.json();

    // format the response in a more readable way
    if (Array.isArray(data) && data.length > 0) {
      const formattedNotes = data
        .map((note: any) => {
          return `- Note ID: ${note.id}\n  Content: ${
            note.note
          }\n  Created: ${new Date(note.createdAt).toLocaleString()}`;
        })
        .join("\n\n");

      return {
        content: [
          {
            type: "text",
            text: `Found ${data.length} notes for lead ${leadId}:\n\n${formattedNotes}`,
          },
        ],
      };
    } else if (Array.isArray(data) && data.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No notes found for lead ${leadId}.`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: "Unexpected response format from the server.",
          },
        ],
      };
    }
  } catch (error: unknown) {
    console.error("Get All Notes Exception:", error);
    return {
      content: [
        {
          type: "text",
          text: `An error occurred while getting the notes: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
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
            text: `Failed to update note: ${errorMessages}. Please provide the missing or incorrect information.`,
          },
        ],
      };
    }

    const { leadId, noteId, note } = result.data;

    const url = `${process.env.BASE_URL}/${API_ENDPOINTS.NOTE.GET_NOTES(
      leadId
    )}/${noteId}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
      body: JSON.stringify({ note }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        content: [
          {
            type: "text",
            text: `Failed to update note: ${
              errorData.message || response.statusText
            }`,
          },
        ],
      };
    }

    const data = await response.json();

    return {
      content: [
        {
          type: "text",
          text: `Successfully updated note for lead ${leadId}:\nNote ID: ${noteId}\nContent: ${note}`,
        },
      ],
    };
  } catch (error: unknown) {
    return {
      content: [
        {
          type: "text",
          text: `An error occurred while updating the note: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      ],
    };
  }
}

export async function handleDeleteNote(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as DeleteNoteRequest;

    // Validate the input using Zod
    const result = DeleteNoteSchema.safeParse(args);

    if (!result.success) {
      // Format Zod errors into a readable message
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to delete note: ${errorMessages}. Please provide the missing or incorrect information.`,
          },
        ],
      };
    }

    const { leadId, noteId } = result.data;
    const url = `${process.env.BASE_URL}/${leadId}/note/${noteId}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
    });

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorData = await response.text();
        console.error("Delete Note Error Response:", errorData);
        // Try to parse as JSON if it looks like JSON
        if (
          errorData.trim().startsWith("{") ||
          errorData.trim().startsWith("[")
        ) {
          const jsonError = JSON.parse(errorData);
          errorMessage = jsonError.message || errorData;
        } else {
          errorMessage = errorData;
        }
      } catch (e) {
        console.error("Failed to parse error response:", e);
      }
      return {
        content: [
          {
            type: "text",
            text: `Failed to delete note: ${errorMessage}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted note for lead ${leadId}`,
        },
      ],
    };
  } catch (error: unknown) {
    return {
      content: [
        {
          type: "text",
          text: `An error occurred while deleting the note: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      ],
    };
  }
}

export async function handleGetNoteById(request: CallToolRequest) {
  try {
    const { leadId, noteId } = request.params.arguments as {
      leadId: string;
      noteId: string;
    };

    if (!leadId || !noteId) {
      return {
        content: [
          {
            type: "text",
            text: "Both Lead ID and Note ID are required",
          },
        ],
      };
    }

    const url = `${process.env.BASE_URL}/${leadId}/note/${noteId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
    });

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorData = await response.text();
        console.error("Get Note By ID Error Response:", errorData);
        errorMessage = errorData;
      } catch (e) {
        console.error("Failed to parse error response:", e);
      }
      return {
        content: [
          {
            type: "text",
            text: `Failed to get note: ${errorMessage}`,
          },
        ],
      };
    }

    const data = await response.json();

    return {
      content: [
        {
          type: "text",
          text: `Note Details:\nID: ${data.id}\nContent: ${
            data.note
          }\nCreated: ${new Date(data.createdAt).toLocaleString()}\nLead ID: ${
            data.leadId
          }`,
        },
      ],
    };
  } catch (error: unknown) {
    console.error("Get Note By ID Exception:", error);
    return {
      content: [
        {
          type: "text",
          text: `An error occurred while getting the note: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      ],
    };
  }
}
