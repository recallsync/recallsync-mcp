import {
  CallToolRequestSchema,
  CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { API_ENDPOINTS } from "../constants/tool.js";
import {
  CreateTagSchema,
  CreateTagRequest,
  UpdateTagSchema,
  UpdateTagRequest,
} from "../schema/tool.js";

export const tagTools = [
  {
    name: "create-tag",
    description: "Create a new tag for leads",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the tag",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "get-tags",
    description: "Get all available tags",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get-tag",
    description: "Get a specific tag by ID",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "ID of the tag to retrieve",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "update-tag",
    description: "Update a tag by ID",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "ID of the tag to update",
        },
        name: {
          type: "string",
          description: "New name for the tag",
        },
      },
      required: ["id", "name"],
    },
  },
  {
    name: "delete-tag",
    description: "Delete a tag by ID",
    arguments: [],
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "ID of the tag to delete",
        },
      },
      required: ["id"],
    },
  },
];

export async function handleCreateTag(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as CreateTagRequest;
    const result = CreateTagSchema.safeParse(args);

    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to create tag: ${errorMessages}`,
          },
        ],
      };
    }

    const { name } = result.data;
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.TAG.CREATE_TAG}`;
    const body = { name };

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
            text: `Failed to create tag: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Successfully created tag: ${JSON.stringify(data)}`,
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
          text: `Failed to execute create-tag tool: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleGetTags(request: CallToolRequest) {
  try {
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.TAG.GET_TAGS}`;

    const response = await fetch(url, {
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
            text: `Failed to get tags: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Available tags: ${JSON.stringify(data)}`,
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
          text: `Failed to execute get-tags tool: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleGetTag(request: CallToolRequest) {
  try {
    const { id } = request.params.arguments as { id: string };
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.TAG.GET_TAG}/${id}`;

    const response = await fetch(url, {
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
            text: `Failed to get tag: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Tag details: ${JSON.stringify(data)}`,
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
          text: `Failed to execute get-tag tool: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleUpdateTag(request: CallToolRequest) {
  try {
    const args = request.params.arguments as unknown as UpdateTagRequest;
    const result = UpdateTagSchema.safeParse(args);

    if (!result.success) {
      const errorMessages = result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Failed to update tag: ${errorMessages}`,
          },
        ],
      };
    }

    const { id, name } = result.data;
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.TAG.UPDATE_TAG}/${id}`;
    const body = { name };

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
            text: `Failed to update tag: ${response.statusText}`,
          },
        ],
      };
    }

    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `Successfully updated tag: ${JSON.stringify(data)}`,
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
          text: `Failed to execute update-tag tool: ${errorMessage}`,
        },
      ],
    };
  }
}

export async function handleDeleteTag(request: CallToolRequest) {
  try {
    const { id } = request.params.arguments as { id: string };
    const url = `${process.env.BASE_URL}${API_ENDPOINTS.TAG.DELETE_TAG}/${id}`;

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
            text: `Failed to delete tag: ${response.statusText}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully deleted tag with ID: ${id}`,
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
          text: `Failed to execute delete-tag tool: ${errorMessage}`,
        },
      ],
    };
  }
}
