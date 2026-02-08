import { ClaudeHTMLParser } from '../worker/utils/html-parser.js'
import * as fs from 'fs';
import * as path from 'path';

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:8787';

interface ImportResult {
  chatId: string;
  chunksProcessed: number;
  title: string;
}

async function importHTMLFile(
  filePath: string,
  category?: string
): Promise<ImportResult> {
  console.log(`📥 Importing HTML from: ${filePath}`);

  // Read HTML file
  const htmlContent = fs.readFileSync(filePath, 'utf-8');
  console.log(`✅ Read ${htmlContent.length} characters`);

  // Parse HTML
  const parser = new ClaudeHTMLParser();
  const parsed = parser.parseHTML(htmlContent);
  console.log(`✅ Parsed ${parsed.messages.length} messages`);
  console.log(`📝 Title: ${parsed.title}`);

  // Extract chunks
  const chunks = parser.extractChunks(parsed);
  console.log(`✅ Created ${chunks.length} chunks`);

  // Prepare import payload
  const chatId = generateChatId();
  const importData = {
    chatId,
    title: parsed.title,
    chunks,
    metadata: {
      ...parsed.metadata,
      category: category || 'general',
      sourceFile: path.basename(filePath),
      importedAt: new Date().toISOString()
    }
  };

  // Send to worker
  console.log(`📤 Sending to worker...`);
  const response = await fetch(`${WORKER_URL}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(importData)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Import failed: ${error}`);
  }

  const result = await response.json() as any;
  console.log(`✅ Import complete!`);
  console.log(`   Chat ID: ${result.chatId}`);
  console.log(`   Chunks processed: ${result.chunksProcessed}`);

  return result as ImportResult;
}

async function batchImportHTMLFiles(directory: string, category?: string) {
  console.log(`📁 Scanning directory: ${directory}\n`);

  const files = fs.readdirSync(directory)
    .filter(f => f.endsWith('.html'))
    .map(f => path.join(directory, f));

  console.log(`Found ${files.length} HTML files\n`);

  const results: ImportResult[] = [];
  
  for (const file of files) {
    try {
      const result = await importHTMLFile(file, category);
      results.push(result);
      console.log('');
    } catch (error) {
      console.error(`❌ Failed to import ${file}:`, error);
      console.log('');
    }
  }

  // Summary
  console.log('═'.repeat(50));
  console.log(`📊 Import Summary`);
  console.log('═'.repeat(50));
  console.log(`Total files: ${files.length}`);
  console.log(`Successful: ${results.length}`);
  console.log(`Failed: ${files.length - results.length}`);
  console.log(`Total chunks: ${results.reduce((sum, r) => sum + r.chunksProcessed, 0)}`);
  console.log('═'.repeat(50));
}

function generateChatId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

// CLI interface
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error(`
Usage:
  Single file:
    node dist/cli/import-html.js <file.html> [category]

  Batch import:
    node dist/cli/import-html.js --batch <directory> [category]

Examples:
  node dist/cli/import-html.js "Building persistent memory - Claude.html" knowledge-base
  node dist/cli/import-html.js --batch ./downloads/claude-chats knowledge-base

Environment:
  WORKER_URL - Your chat-knowledge worker URL (default: http://localhost:8787)
  `);
  process.exit(1);
}

const isBatch = args[0] === '--batch';

if (isBatch) {
  const directory = args[1];
  const category = args[2];
  
  if (!directory) {
    console.error('Error: Directory path required for batch import');
    process.exit(1);
  }

  batchImportHTMLFiles(directory, category).catch((error) => {
    console.error('Batch import failed:', error);
    process.exit(1);
  });
} else {
  const filePath = args[0];
  const category = args[1];

  importHTMLFile(filePath, category).catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });
}