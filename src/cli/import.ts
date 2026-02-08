import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { ChatParser } from './parser.js';

interface ImportOptions {
  file: string;
  title?: string;
  metadata?: Record<string, any>;
  workerUrl: string;
}

interface ImportResponse {
  success: boolean;
  chatId: string;
  chunksProcessed: number;
}

async function importChat(options: ImportOptions) {
  console.log(`📥 Importing chat from: ${options.file}`);
  
  // 1. Read file
  const fileContent = await fs.readFile(options.file, 'utf-8');
  console.log(`✅ Read ${fileContent.length} characters`);

  // 2. Parse chat
  const parser = new ChatParser();
  const parsed = parser.parseChatExport(fileContent);
  console.log(`✅ Parsed ${parsed.messages.length} messages`);

  // 3. Chunk messages
  const chunks = parser.chunkMessages(parsed.messages);
  console.log(`✅ Created ${chunks.length} chunks`);
  
  parser.cleanup();

  // 4. Generate chat ID
  const chatId = options.metadata?.id || randomUUID();
  const title = options.title || parsed.title;

  // 5. Send to worker
  console.log(`📤 Sending to worker...`);
  const response = await fetch(`${options.workerUrl}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId,
      title,
      chunks,
      metadata: {
        ...options.metadata,
        sourceFile: path.basename(options.file),
        importedAt: new Date().toISOString()
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Import failed: ${errorText}`);
  }

  const result = await response.json() as ImportResponse;
  console.log(`✅ Import complete!`);
  console.log(`   Chat ID: ${result.chatId}`);
  console.log(`   Chunks processed: ${result.chunksProcessed}`);
  
  return result;
}

// CLI interface
const args = process.argv.slice(2);
const file = args[0];
const workerUrl = process.env.WORKER_URL || 'http://localhost:8787';

if (!file) {
  console.error('Usage: node dist/cli/import.js <chat-file.txt>');
  process.exit(1);
}

importChat({ 
  file, 
  workerUrl,
  metadata: {
    topic: args[1] || 'general'
  }
}).catch((error: Error) => {
  console.error('❌ Import failed:', error.message);
  process.exit(1);
});