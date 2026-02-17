console.log('[Chat Knowledge] Background service worker loaded');

const FOUNDATION_API = 'https://chat-knowledge-api.fpl-test.workers.dev/api/import/extension';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Chat Knowledge] Message received:', message.action);

  if (message.action === 'saveConversation') {
    sendToFoundation(message.conversation)
      .then(result => sendResponse({ success: true, ...result }))
      .catch(error => {
        console.error('[Chat Knowledge] Save error:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // async response
  }
});

async function sendToFoundation(conversation) {
  const response = await fetch(FOUNDATION_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(conversation)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${response.status}: ${error}`);
  }

  const result = await response.json();
  console.log('[Chat Knowledge] ✓ Saved to Foundation:', result);
  return result;
}