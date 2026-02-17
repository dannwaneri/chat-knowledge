import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const WORKER_URL = process.env.WORKER_URL || 'https://chat-knowledge-api.fpl-test.workers.dev';

const server = new Server(
  {
    name: 'chat-knowledge',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'search_knowledge',
      description: 'Search across all imported chat conversations for relevant context. Use this automatically when the user references past discussions, asks about previous work, or needs context from earlier conversations.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'What to search for (e.g., "Article 3 decisions", "Vinicius Stack Overflow quote", "Ben solver judge framework")'
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of results to return (default: 5)',
            default: 5
          }
        },
        required: ['query']
      }
    },
    {
      name: 'list_chats',
      description: 'List all imported chat conversations with their metadata',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'get_chat_context',
      description: 'Get full context from a specific chat by ID',
      inputSchema: {
        type: 'object',
        properties: {
          chatId: {
            type: 'string',
            description: 'The ID of the chat to retrieve'
          }
        },
        required: ['chatId']
      }
    }
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'search_knowledge') {
      const response = await fetch(`${WORKER_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: args.query,
          maxResults: args.maxResults || 5
        })
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data: any = await response.json();
      
      // Format results for Claude
      const formattedResults = data.results.map((r: any, i: number) => 
        `[Result ${i + 1}] (Relevance: ${r.relevance.toFixed(2)})\n` +
        `From: ${r.chatTitle}\n` +
        `Content: ${r.content}\n`
      ).join('\n---\n\n');

      return {
        content: [{
          type: 'text',
          text: `Found ${data.count} relevant results:\n\n${formattedResults}`
        }]
      };
    }

    if (name === 'list_chats') {
      const response = await fetch(`${WORKER_URL}/chats`);
      
      if (!response.ok) {
        throw new Error(`List chats failed: ${response.statusText}`);
      }

      const data: any = await response.json();

      const chatList = data.chats.map((c: any) => 
        `- ${c.title} (${c.message_count} messages, imported ${new Date(c.imported_at).toLocaleDateString()})`
      ).join('\n');

      return {
        content: [{
          type: 'text',
          text: `Imported chats:\n${chatList}`
        }]
      };
    }

    if (name === 'get_chat_context') {
      const response = await fetch(`${WORKER_URL}/chat/${args.chatId}`, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Get chat failed: ${response.statusText}`);
      }

      const data: any = await response.json();

      const context = data.messages.map((m: any) => 
        `[${m.role.toUpperCase()}]: ${m.content}`
      ).join('\n\n---\n\n');

      return {
        content: [{
          type: 'text',
          text: `Chat: ${data.chat.title}\n\nSummary: ${data.chat.summary || 'N/A'}\n\n${context}`
        }]
      };
    }

    throw new Error(`Unknown tool: ${name}`);

  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Chat Knowledge MCP Server running on stdio');
}

main().catch(console.error);