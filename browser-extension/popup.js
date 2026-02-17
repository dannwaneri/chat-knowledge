const WORKER_URL = 'https://chat-knowledge-api.fpl-test.workers.dev';

// Fetch stats from the Foundation
async function loadStats() {
  try {
    const response = await fetch(`${WORKER_URL}/chats`);
    const data = await response.json();
    
    const totalChats = data.chats?.length || 0;
    const totalMessages = data.chats?.reduce((sum, chat) => sum + (chat.message_count || 0), 0) || 0;
    
    return { totalChats, totalMessages };
  } catch (error) {
    console.error('Failed to load stats:', error);
    return { totalChats: 0, totalMessages: 0 };
  }
}

async function shareConversation(convId) {
  const status = document.getElementById('status');
  status.style.display = 'block';
  status.className = 'status';
  status.textContent = 'Sharing to knowledge commons...';

  try {
    // Check if chrome.storage is available
    if (!chrome?.storage?.local) {
      throw new Error('Chrome storage API not available');
    }

    const result = await chrome.storage.local.get(['messages', 'conversations']);
    const messages = result.messages?.[convId] || [];
    const conversation = result.conversations?.[convId];

    if (messages.length === 0) {
      throw new Error('No messages found for this conversation');
    }

    console.log('Sharing:', convId, 'with', messages.length, 'messages');

    const response = await fetch(`${WORKER_URL}/api/import/extension`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: convId,
        title: conversation?.title || 'Claude Conversation',
        messages: messages,
        extension_version: '0.1.0'
      })
    });

    const data = await response.json();

    if (response.ok) {
      status.className = 'status success';
      status.textContent = `✅ Shared! ${data.chunks} chunks created from ${data.messages} messages.`;
      
      // Reload stats after successful share
      await updateStatsDisplay();
      
      setTimeout(() => status.style.display = 'none', 3000);
    } else {
      status.className = 'status error';
      status.textContent = `❌ Failed: ${data.message || data.error || 'Unknown error'}`;
    }
  } catch (error) {
    console.error('Share error:', error);
    status.className = 'status error';
    status.textContent = `❌ Error: ${error.message}`;
  }
}

async function updateStatsDisplay() {
  const statsEl = document.getElementById('stats');
  const { totalChats, totalMessages } = await loadStats();
  
  statsEl.innerHTML = `
    <div class="stat-item">
      <div class="stat-value">${totalChats}</div>
      <div class="stat-label">Conversations</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${totalMessages}</div>
      <div class="stat-label">Messages</div>
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize popup
(async function init() {
  try {
    // Load and display stats first (works even without chrome.storage)
    await updateStatsDisplay();

    // Check if Chrome APIs are available
    if (!chrome?.storage?.local) {
      const container = document.getElementById('conversations');
      container.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #999;">
          <p>Extension context required</p>
          <p style="font-size: 13px; margin-top: 8px;">
            This popup only works when installed as a Chrome extension.
          </p>
        </div>
      `;
      return;
    }

    const result = await chrome.storage.local.get(['messages', 'conversations']);
    const allMessages = result.messages || {};
    const conversations = result.conversations || {};

    console.log('Loaded conversations:', Object.keys(conversations).length);

    const container = document.getElementById('conversations');

    if (Object.keys(conversations).length === 0) {
      container.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #999;">
          <p>No conversations captured yet.</p>
          <p style="font-size: 13px; margin-top: 8px;">
            Go to <a href="https://claude.ai" target="_blank" style="color: #2a2a2a;">claude.ai</a> 
            and start chatting!
          </p>
        </div>
      `;
      return;
    }

    // Sort by most recent
    const sortedConvs = Object.values(conversations).sort((a, b) => b.updated_at - a.updated_at);

    sortedConvs.forEach(conv => {
      const messages = allMessages[conv.id] || [];
      const lastMessage = messages[messages.length - 1];
      const preview = lastMessage?.content?.[0]?.content || '';

      const div = document.createElement('div');
      div.className = 'conv';
      
      div.innerHTML = `
        <div style="margin-bottom: 8px;">
          <strong>${escapeHtml(conv.title)}</strong>
        </div>
        <div style="font-size: 13px; color: #666; margin-bottom: 8px;">
          ${messages.length} messages • ${new Date(conv.updated_at).toLocaleDateString()}
        </div>
        ${preview ? `<div style="font-size: 12px; color: #999; margin-bottom: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(preview.substring(0, 60))}...</div>` : ''}
        <button data-id="${conv.id}">Share to Commons</button>
      `;
      
      container.appendChild(div);
    });

    // Add click handlers
    document.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        shareConversation(btn.dataset.id);
      });
    });

    // Add "Open Foundation" button handler
    const openBtn = document.getElementById('openFoundation');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        if (chrome?.tabs?.create) {
          chrome.tabs.create({ url: WORKER_URL });
        } else {
          window.open(WORKER_URL, '_blank');
        }
      });
    }

  } catch (error) {
    console.error('Popup error:', error);
    const container = document.getElementById('conversations');
    container.innerHTML = `
      <div style="padding: 20px; color: #c62828;">
        <strong>Error loading conversations</strong>
        <p style="font-size: 13px; margin-top: 8px;">${escapeHtml(error.message)}</p>
      </div>
    `;
  }
})();