import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express, { Request, Response } from "express";
import fetch from "node-fetch";
import cors from "cors";

// Add type definitions at the top of the file after imports
interface WeatherResponse {
  main: {
    temp: number;
  };
  weather: Array<{
    description: string;
  }>;
  message?: string;
}

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

// Register the google-get tool
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "google-get",
        description: "Search Google for information about a topic",
        arguments: [],
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query to look up on Google",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "weather",
        description: "Get weather for a city",
        arguments: [],
        inputSchema: {
          type: "object",
          properties: {
            city: { type: "string" },
          },
          required: ["city"],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "google-get":
      try {
        const query = request.params.arguments?.query;
        if (!query) {
          throw new Error("Search query is required");
        }

        // URL encode the search query
        const encodedQuery = encodeURIComponent(query as string);
        const response = await fetch(
          `https://www.google.com/search?q=${encodedQuery}`
        );
        const text = await response.text();

        return {
          content: [
            {
              type: "text",
              text: `Search results for "${query}" (status: ${
                response.status
              }):\n${text.substring(0, 500)}...`,
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        throw new Error(`Failed to execute google-get tool: ${errorMessage}`);
      }

    case "weather":
      try {
        const city = request.params.arguments?.city;
        if (!city) {
          throw new Error("City parameter is required");
        }

        // Using OpenWeatherMap API as an example (you'll need to add your API key)
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.OPENWEATHER_API_KEY}`
        );
        const data = (await response.json()) as WeatherResponse;

        if (response.status !== 200) {
          throw new Error(data.message || "Failed to fetch weather data");
        }

        return {
          content: [
            {
              type: "text",
              text: `Weather in ${city}: ${Math.round(
                data.main.temp - 273.15
              )}°C, ${data.weather[0].description}`,
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        throw new Error(`Failed to execute weather tool: ${errorMessage}`);
      }

    default:
      throw new Error("Unknown tool");
  }
});

// Keep the existing prompt handlers
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "google-get",
        description: "Search Google for information about a topic",
        arguments: [
          {
            name: "query",
            type: "string",
            description: "The search query to look up on Google",
            required: true,
          },
        ],
      },
      {
        name: "weather",
        description: "Get weather information for a specified city",
        arguments: [
          {
            name: "city",
            type: "string",
            description: "The name of the city to get weather for",
            required: true,
          },
        ],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  switch (request.params.name) {
    case "google-get":
      try {
        const query = request.params.arguments?.query;
        if (!query) {
          return {
            description: "Error: Search query is required",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: "Please provide a search query to look up on Google.",
                },
              },
            ],
          };
        }

        // URL encode the search query
        const encodedQuery = encodeURIComponent(query);
        const response = await fetch(
          `https://www.google.com/search?q=${encodedQuery}`
        );
        const text = await response.text();

        return {
          description: `Search results for "${query}"`,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Search results for "${query}" (status: ${
                  response.status
                }):\n${text.substring(0, 500)}...`,
              },
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        return {
          description: "Error performing Google search",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Error: ${errorMessage}`,
              },
            },
          ],
        };
      }

    case "weather":
      try {
        const city = request.params.arguments?.city;
        if (!city) {
          return {
            description: "Error: City parameter is required",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: "Please provide a city name to get weather information.",
                },
              },
            ],
          };
        }

        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.OPENWEATHER_API_KEY}`
        );
        const data = (await response.json()) as WeatherResponse;

        if (response.status !== 200) {
          return {
            description: "Error fetching weather data",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: `Error: ${
                    data.message || "Failed to fetch weather data"
                  }`,
                },
              },
            ],
          };
        }

        return {
          description: `Weather information for ${city}`,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Weather in ${city}: ${Math.round(
                  data.main.temp - 273.15
                )}°C, ${data.weather[0].description}`,
              },
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        return {
          description: "Error fetching weather data",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Error: ${errorMessage}`,
              },
            },
          ],
        };
      }

    default:
      throw new Error("Unknown prompt");
  }
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

  if (transport) {
    try {
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
