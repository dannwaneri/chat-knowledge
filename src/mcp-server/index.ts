import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Env } from "../types/index.js";

interface Props extends Record<string, unknown> {
  apiKey: string;
}

export class FoundationMCP extends McpAgent<Env> {
  server = new McpServer({
    name: "The Foundation",
    version: "1.0.0",
  });

  async init() {
    this.server.tool(
      "list_chats",
      "List all conversations in The Foundation knowledge base including private ones",
      {},
      async () => {
        const { results } = await this.env.DB.prepare(`
          SELECT id, title, summary, visibility, message_count, imported_at
          FROM chats
          ORDER BY imported_at DESC
        `).all();
        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      }
    );

    this.server.tool(
      "search_knowledge",
      "Semantic search across all conversations in the knowledge base. Use when user references past discussions or needs context from earlier conversations.",
      {
        query: z.string().describe("The search query"),
        maxResults: z.number().optional().describe("Max results to return, default 5"),
      },
      async ({ query, maxResults = 5 }) => {
        const embeddingResult = await this.env.AI.run("@cf/baai/bge-base-en-v1.5", {
          text: query,
        });
        const queryEmbedding = embeddingResult.data[0];

        const results = await this.env.VECTORIZE.query(queryEmbedding, {
          topK: maxResults * 2,
          returnMetadata: true,
        });

        const chunks = (await Promise.all(
          results.matches.slice(0, maxResults).map(async (match: any) => {
            const chunk = await this.env.DB.prepare(`
              SELECT c.content, c.metadata, c.chunk_index,
                     ch.title as chat_title, ch.id as chat_id,
                     ch.summary as chat_summary, ch.imported_at
              FROM chunks c
              JOIN chats ch ON c.chat_id = ch.id
              WHERE c.id = ?
            `).bind(match.id).first();
            if (!chunk) return null;
            return {
              chatId: chunk.chat_id,
              chatTitle: chunk.chat_title,
              chatSummary: chunk.chat_summary,
              content: chunk.content,
              chunkIndex: chunk.chunk_index,
              relevance: match.score,
              importedAt: chunk.imported_at,
            };
          })
        )).filter(Boolean);

        return {
          content: [{ type: "text", text: JSON.stringify(chunks, null, 2) }],
        };
      }
    );

    this.server.tool(
      "get_chat",
      "Get conversation by ID. Use summaryOnly=true first to check if the full conversation is worth fetching.",
      {
        chatId: z.string().describe("The chat ID to retrieve"),
        summaryOnly: z.boolean().optional().describe("Return metadata and summary only, no messages. Default false."),
      },
      async ({ chatId, summaryOnly = false }) => {
        const chat = await this.env.DB.prepare(`
          SELECT id, title, summary, visibility, message_count, imported_at, created_at
          FROM chats WHERE id = ?
        `).bind(chatId).first();

        if (!chat) {
          return { content: [{ type: "text", text: JSON.stringify({ error: "Chat not found" }) }] };
        }

        if (summaryOnly) {
          return {
            content: [{ type: "text", text: JSON.stringify(chat, null, 2) }],
          };
        }

        const { results: messages } = await this.env.DB.prepare(`
          SELECT role, content, message_index
          FROM messages
          WHERE chat_id = ?
          ORDER BY message_index ASC
        `).bind(chatId).all();

        return {
          content: [{
            type: "text",
            text: JSON.stringify({ chat, messages }, null, 2),
          }],
        };
      }
    );

    this.server.tool(
      "get_insights",
      "Get extracted insights from a conversation — decisions, solutions, commands, patterns, dead ends. Much cheaper than loading full chat.",
      {
        chatId: z.string().describe("The chat ID to get insights for"),
        minScore: z.number().optional().describe("Minimum score filter 0.0-1.0. Omit to return all insights."),
      },
      async ({ chatId, minScore }) => {
        const url = minScore !== undefined
          ? `https://chat-knowledge-api.fpl-test.workers.dev/api/insights/${chatId}?minScore=${minScore}`
          : `https://chat-knowledge-api.fpl-test.workers.dev/api/insights/${chatId}`;

        const response = await fetch(url, {
          headers: { 'X-API-Key': this.env.API_KEY }
        });
        const data = await response.json() as any;

        if (!data.total) {
          return {
            content: [{ type: "text", text: JSON.stringify({ message: "No insights extracted yet. Run extraction first." }) }]
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(data.insights, null, 2) }]
        };
      }
    );

    this.server.tool(
      "extract_insights",
      "Trigger insight extraction for a conversation. Call this once per chat before using get_insights.",
      {
        chatId: z.string().describe("The chat ID to extract insights from"),
        force: z.boolean().optional().describe("Force re-extraction even if insights already exist. Default false."),
      },
      async ({ chatId, force = false }) => {
        const response = await fetch(
          `https://chat-knowledge-api.fpl-test.workers.dev/api/insights/extract/${chatId}${force ? '?force=true' : ''}`,
          {
            method: 'POST',
            headers: { 'X-API-Key': this.env.API_KEY }
          }
        );
        const data = await response.json() as any;
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
        };
      }
    );

    this.server.tool(
      "create_collection",
      "Create a new collection to group related chats together",
      {
        title: z.string().describe("Collection title"),
        description: z.string().optional().describe("Optional description"),
        visibility: z.enum(["private", "public"]).optional().describe("Default private"),
      },
      async ({ title, description, visibility = "private" }) => {
        const response = await fetch(
          `https://chat-knowledge-api.fpl-test.workers.dev/api/collections`,
          {
            method: "POST",
            headers: { "X-API-Key": this.env.API_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ title, description, visibility }),
          }
        );
        const data = await response.json();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }
    );

    this.server.tool(
      "list_collections",
      "List all collections with their chat counts",
      {},
      async () => {
        const response = await fetch(
          `https://chat-knowledge-api.fpl-test.workers.dev/api/collections`,
          { headers: { "X-API-Key": this.env.API_KEY } }
        );
        const data = await response.json();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }
    );

    this.server.tool(
      "get_collection",
      "Get a collection with all its chats and aggregated insights across all member chats",
      {
        collectionId: z.string().describe("The collection ID"),
      },
      async ({ collectionId }) => {
        const response = await fetch(
          `https://chat-knowledge-api.fpl-test.workers.dev/api/collections/${collectionId}`,
          { headers: { "X-API-Key": this.env.API_KEY } }
        );
        const data = await response.json();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }
    );

    this.server.tool(
      "add_chat_to_collection",
      "Add a chat to a collection",
      {
        collectionId: z.string().describe("The collection ID"),
        chatId: z.string().describe("The chat ID to add"),
      },
      async ({ collectionId, chatId }) => {
        const response = await fetch(
          `https://chat-knowledge-api.fpl-test.workers.dev/api/collections/${collectionId}/chats`,
          {
            method: "POST",
            headers: { "X-API-Key": this.env.API_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ chatId }),
          }
        );
        const data = await response.json();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }
    );

    this.server.tool(
     "review_insights",
      "Query the Evaluator API to get insights ranked by numeric score (0.0-1.0). This is the ONLY tool that returns score, usage_count, promoted, and flagged fields. Use this instead of get_insights when you need quality-ranked results.",
      {
        minScore: z.number().optional().describe("Minimum score 0.0-1.0, default 0.3"),
        chatId: z.string().optional().describe("Filter by specific chat"),
        flagged: z.boolean().optional().describe("Show only flagged insights needing review"),
      },
      async ({ minScore = 0.3, chatId, flagged }) => {
        let url = `https://chat-knowledge-api.fpl-test.workers.dev/api/evaluator/review?minScore=${minScore}`;
        if (chatId) url += `&chatId=${chatId}`;
        if (flagged) url += `&flagged=true`;
        const response = await fetch(url, { headers: { "X-API-Key": this.env.API_KEY } });
        const data = await response.json();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }
    );

    this.server.tool(
      "promote_insight",
      "Promote an insight to semantic memory — marks it as validated knowledge worth keeping permanently.",
      {
        insightId: z.string().describe("The insight ID to promote"),
      },
      async ({ insightId }) => {
        const response = await fetch(
          `https://chat-knowledge-api.fpl-test.workers.dev/api/evaluator/promote/${insightId}`,
          { method: "POST", headers: { "X-API-Key": this.env.API_KEY } }
        );
        const data = await response.json();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }
    );

    this.server.tool(
      "flag_insight",
      "Flag an insight for human review — marks it as needing validation before promotion.",
      {
        insightId: z.string().describe("The insight ID to flag"),
      },
      async ({ insightId }) => {
        const response = await fetch(
          `https://chat-knowledge-api.fpl-test.workers.dev/api/evaluator/flag/${insightId}`,
          { method: "POST", headers: { "X-API-Key": this.env.API_KEY } }
        );
        const data = await response.json();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }
    );

    this.server.tool(
      "score_insights",
      "Re-score all insights for a chat using the specificity algorithm.",
      {
        chatId: z.string().describe("The chat ID to score insights for"),
      },
      async ({ chatId }) => {
        const response = await fetch(
          `https://chat-knowledge-api.fpl-test.workers.dev/api/evaluator/score/${chatId}`,
          { method: "POST", headers: { "X-API-Key": this.env.API_KEY } }
        );
        const data = await response.json();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }
    );
  }
}