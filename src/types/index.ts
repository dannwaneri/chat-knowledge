export interface Env {
    AI: any;
    VECTORIZE: VectorizeIndex;
    DB: D1Database;
    API_KEY: string;
    MCP_OBJECT: DurableObjectNamespace;
  }
  
  export interface ImportRequest {
    chatId: string;
    title: string;
    chunks: Chunk[];
    metadata?: Record<string, any>;
  }
  
  export interface Chunk {
    content: string;
    tokens: number;
    metadata?: {
      speaker?: string;
      messageIndex?: number;
      type?: string;
    };
  }
  
  export interface SearchRequest {
    query: string;
    maxResults?: number;
    filters?: Record<string, any>;
  }
  
  export interface SearchResult {
    content: string;
    chatTitle: string;
    chatId: string;
    relevance: number;
    metadata: any;
    chatMetadata: any;
  }