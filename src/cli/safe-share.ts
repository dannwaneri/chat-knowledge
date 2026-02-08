const WORKER_URL = process.env.WORKER_URL || 'http://localhost:8787';

async function safeShare(chatId: string, options: any = {}) {
  console.log('🔒 SAFE-BY-DEFAULT SHARING WORKFLOW');
  console.log('═'.repeat(60));
  console.log('');

  // Step 1: Scan for sensitive data
  console.log('📡 Step 1: Scanning for sensitive data...');
  const scanResponse = await fetch(`${WORKER_URL}/api/pre-share-review/chats/${chatId}/scan`, {
    method: 'POST'
  });

  if (!scanResponse.ok) {
    throw new Error(`Scan failed: ${await scanResponse.text()}`);
  }

  const scanResult = await scanResponse.json() as any;
  
  // Display report
  console.log('');
  console.log(scanResult.uiReport);
  console.log('');

  // Step 2: Decision point
  if (scanResult.safe) {
    console.log('✅ SAFE TO SHARE - No sensitive data detected');
    console.log('');
    
    if (!options.autoApprove) {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise<string>((resolve) => {
        readline.question('Share this chat publicly? (yes/no): ', resolve);
      });
      readline.close();

      if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Sharing cancelled');
        return;
      }
    }

    // Auto-approve and share
    await approveAndShare(chatId, 'public', 'CC-BY', false);
    
  } else {
    console.log('⚠️ ISSUES FOUND - Manual review required');
    console.log('');
    console.log('Options:');
    console.log('  1. Use auto-redacted version (recommended)');
    console.log('  2. Manual redaction (advanced)');
    console.log('  3. Cancel sharing');
    console.log('');

    if (options.autoRedact) {
      console.log('Using auto-redacted version...');
      await approveAndShare(chatId, 'public', 'CC-BY', true);
    } else {
      console.log('Please review the issues above and:');
      console.log('  - Run with --auto-redact to use redacted version');
      console.log('  - Or manually edit the chat and re-scan');
      process.exit(1);
    }
  }
}

async function approveAndShare(
  chatId: string,
  visibility: string,
  license: string,
  useRedacted: boolean
) {
  console.log('');
  console.log('📤 Step 2: Sharing to federation...');

  const response = await fetch(`${WORKER_URL}/api/pre-share-review/chats/${chatId}/approve-share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visibility, license, useRedacted })
  });

  if (!response.ok) {
    throw new Error(`Share failed: ${await response.text()}`);
  }

  const result = await response.json() as any;

  console.log('');
  console.log('✅ SUCCESS!');
  console.log('');
  console.log(`Chat ID: ${result.chatId}`);
  console.log(`Visibility: ${result.visibility}`);
  console.log(`License: ${license}`);
  console.log(`Redacted: ${result.redacted ? 'Yes' : 'No'}`);
  console.log('');
  console.log('Your chat is now discoverable on the federated network! 🌐');
  console.log('');
}

async function getShareStatus(chatId: string) {
  const response = await fetch(`${WORKER_URL}/api/pre-share-review/chats/${chatId}/share-status`);
  const status = await response.json() as any;

  console.log('📊 SHARE STATUS');
  console.log('═'.repeat(60));
  console.log(`Chat ID: ${status.chatId}`);
  console.log(`Current Visibility: ${status.currentVisibility}`);
  console.log(`Scanned: ${status.scanned ? 'Yes' : 'No'}`);
  if (status.scanned) {
    console.log(`Scan Date: ${status.scanDate}`);
    console.log(`Safe: ${status.safe ? 'Yes ✅' : 'No ⚠️'}`);
    console.log(`Can Auto-Share: ${status.canAutoShare ? 'Yes' : 'No'}`);
  }
  console.log(`Next Step: ${status.nextStep}`);
  console.log('');
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];
const chatId = args[1];

if (!command || !chatId) {
  console.log(`
Usage:
  Safe sharing workflow:
    npm run safe-share <chatId> [--auto-approve] [--auto-redact]

  Check sharing status:
    npm run safe-share status <chatId>

Examples:
  # Interactive review
  npm run safe-share abc-123-def

  # Auto-approve if safe
  npm run safe-share abc-123-def --auto-approve

  # Auto-redact sensitive data
  npm run safe-share abc-123-def --auto-redact

  # Check status
  npm run safe-share status abc-123-def

Environment:
  WORKER_URL - Your worker URL (default: http://localhost:8787)
  `);
  process.exit(1);
}

const options = {
  autoApprove: args.includes('--auto-approve'),
  autoRedact: args.includes('--auto-redact')
};

if (command === 'status') {
  getShareStatus(chatId).catch(console.error);
} else {
  safeShare(chatId, options).catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}