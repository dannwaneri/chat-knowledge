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
  }
}