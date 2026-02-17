(function () {
    'use strict';
  
    console.log('[Chat Knowledge] Content script loaded');
  
    // ============================================
    // ORG ID - AUTO FETCH (no manual config)
    // ============================================
  
    async function getOrganizationId() {
  
      const res = await fetch('https://claude.ai/api/organizations', {
        credentials: 'include',
      });
  
      if (!res.ok) {
        throw new Error('Not authenticated. Please log in to claude.ai first.');
      }
  
      const orgs = await res.json();
  
      if (!orgs || orgs.length === 0) {
        throw new Error('No organizations found.');
      }
  
      const orgId = orgs[0].uuid;

      return orgId;
    }
  
    // ============================================
    // FETCH COMPLETE CONVERSATION FROM CLAUDE API
    // ============================================
  
    async function fetchConversation(conversationId, orgId) {
      const res = await fetch(
        `https://claude.ai/api/organizations/${orgId}/chat_conversations/${conversationId}`,
        { credentials: 'include' }
      );
  
      if (!res.ok) {
        throw new Error(`Failed to fetch conversation: ${res.status} ${res.statusText}`);
      }
  
      return await res.json();
      // Returns full conversation object:
      // {
      //   uuid, name, created_at, updated_at,
      //   chat_messages: [
      //     {
      //       uuid, sender, text, created_at,
      //       attachments: [...],
      //       files: [...],
      //       content: [...] // includes artifacts
      //     }
      //   ]
      // }
    }
  
    // ============================================
    // EXTRACT CONVERSATION ID FROM URL
    // ============================================
  
    function getConversationId() {
      const match = window.location.pathname.match(/\/chat\/([a-zA-Z0-9\-]+)/);
      return match ? match[1] : null;
    }
  
    // ============================================
    // SECURITY SCANNING (kept from original)
    // ============================================
  
    function scanForSecrets(text) {
      const issues = [];
  
      const patterns = [
        { type: 'OpenAI API Key', pattern: /sk-[a-zA-Z0-9]{20,}/g, severity: 'critical' },
        { type: 'Anthropic API Key', pattern: /sk-ant-api03-[a-zA-Z0-9\-_]{50,}/g, severity: 'critical' },
        { type: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g, severity: 'critical' },
        { type: 'Google API Key', pattern: /AIza[0-9A-Za-z\-_]{20,}/g, severity: 'critical' },
        { type: 'GitHub Token', pattern: /ghp_[0-9a-zA-Z]{20,}/g, severity: 'critical' },
        { type: 'Stripe Key', pattern: /sk_live_[0-9a-zA-Z]{24,}/g, severity: 'critical' },
        { type: 'Bearer Token', pattern: /Bearer\s+[a-zA-Z0-9\-._~+\/]{20,}/g, severity: 'critical' },
        { type: 'Generic Secret', pattern: /(?:secret|password|token|key|api[-_]?key)[\s:=]+[a-zA-Z0-9\-._~+\/]{20,}/gi, severity: 'high' },
      ];
  
      patterns.forEach(({ type, pattern, severity }) => {
        const matches = text.match(pattern);
        if (matches) {
          matches.forEach((match) => {
            issues.push({ type, severity, match });
          });
        }
      });
  
      return {
        critical: issues.filter((i) => i.severity === 'critical').length,
        high: issues.filter((i) => i.severity === 'high').length,
        issues,
      };
    }
  
    function redactSecrets(text, issues) {
      let redacted = text;
      const seen = new Set();
  
      issues.forEach(({ match, type }) => {
        if (!seen.has(match)) {
          seen.add(match);
          const marker = `[REDACTED-${type.toUpperCase().replace(/\s+/g, '-')}]`;
          const escaped = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          redacted = redacted.replace(new RegExp(escaped, 'g'), marker);
        }
      });
  
      return redacted;
    }
  
    // ============================================
    // NORMALIZE API RESPONSE TO YOUR MESSAGE FORMAT
    // ============================================
    //
    // CONFIRMED API STRUCTURE (tested Feb 2026):
    // Each message has these keys:
    // uuid, text, sender, index, created_at, updated_at,
    // truncated, attachments, files, files_v2, sync_sources,
    // parent_message_uuid
    //
    // KEY FACTS:
    // - ALL content (text + code blocks + artifacts) lives in msg.text
    // - msg.content does NOT exist on this endpoint
    // - Artifacts are embedded as ```lang\ncode\n``` inside msg.text
    // - Uploaded files appear in msg.attachments / msg.files_v2
    // - msg.truncated flags if text was cut off (handle carefully)
    // ============================================
  
    function normalizeConversation(apiData) {
      const messages = (apiData.chat_messages || []).map((msg, idx) => {
  
        const rawText = msg.text || '';
  
        // Warn if message was truncated by Claude's API
        if (msg.truncated) {
          console.warn(`[Chat Knowledge] ⚠️ Message ${idx} is truncated - content may be incomplete`);
        }
  
        // Parse code blocks OUT of text so import-extension.ts
        // can handle them as separate typed content blocks
        const contentBlocks = parseContentBlocks(rawText);
  
        // File attachments - metadata only
        // Actual file contents are NOT accessible (Anthropic privacy policy)
        const allFiles = [
          ...(msg.attachments || []),
          ...(msg.files_v2 || msg.files || []),
        ];
  
        const fileRefs = allFiles.map((att) => ({
          name: att.file_name || att.name || 'unknown',
          type: att.file_type || att.media_type || att.type || 'unknown',
          size: att.file_size || att.size || 0,
          id: att.id || att.file_id || null,
          note: 'File content not accessible - Anthropic privacy policy',
        }));
  
        return {
          id: msg.uuid || `msg_${idx}`,
          conversation_id: apiData.uuid,
          role: msg.sender === 'human' ? 'user' : 'assistant',
          content: contentBlocks,
          timestamp: msg.created_at
            ? new Date(msg.created_at).getTime()
            : Date.now(),
          truncated: msg.truncated || false,
          parent_message_uuid: msg.parent_message_uuid || null,
          file_refs: fileRefs,
        };
      });
  
      return {
        id: apiData.uuid,
        title: apiData.name || 'Untitled Conversation',
        summary: apiData.summary || '',   // Claude auto-generates this - FREE semantic summary
        created_at: apiData.created_at,
        updated_at: apiData.updated_at,
        message_count: messages.length,
        messages,
      };
    }
  
    // Split raw message text into typed content blocks:
    // text blocks and code blocks (which contain artifact source code)
    function parseContentBlocks(rawText) {
      const blocks = [];
      const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
      let lastIndex = 0;
      let match;
  
      while ((match = codeBlockRegex.exec(rawText)) !== null) {
        // Text before this code block
        const before = rawText.slice(lastIndex, match.index).trim();
        if (before) {
          blocks.push({ type: 'text', content: before });
        }
  
        // The code block itself (this is where artifact source lives)
        const language = match[1]?.trim() || 'text';
        const code = match[2]?.trim() || '';
        if (code) {
          blocks.push({ type: 'code', language, content: code });
        }
  
        lastIndex = match.index + match[0].length;
      }
  
      // Any remaining text after the last code block
      const remaining = rawText.slice(lastIndex).trim();
      if (remaining) {
        blocks.push({ type: 'text', content: remaining });
      }
  
      // If no blocks parsed (no code fences), treat as plain text
      if (blocks.length === 0 && rawText.trim()) {
        blocks.push({ type: 'text', content: rawText.trim() });
      }
  
      return blocks;
    }
  
    // ============================================
    // MAIN SHARE HANDLER
    // ============================================
  
    async function handleShare() {
      const btn = document.getElementById('ck-share-btn');
      if (btn) {
        btn.textContent = '⏳ Capturing...';
        btn.disabled = true;
      }
  
      try {
        // 1. Get conversation ID from URL
        const conversationId = getConversationId();
        if (!conversationId) {
          throw new Error('Not on a Claude chat page. Navigate to a conversation first.');
        }
  
        // 2. Auto-fetch org ID (zero config for user)
        showInfo('🔍 Connecting to Claude...');
        const orgId = await getOrganizationId();
  
        // 3. Fetch COMPLETE conversation from Claude's API
        showInfo('📥 Fetching conversation...');
        const apiData = await fetchConversation(conversationId, orgId);
  
        if (!apiData || !apiData.chat_messages || apiData.chat_messages.length === 0) {
          throw new Error('Conversation is empty or could not be fetched.');
        }
  
        // 4. Security scan on raw API data
        const rawText = JSON.stringify(apiData);
        const secrets = scanForSecrets(rawText);
  
        let processedText = rawText;
        if (secrets.critical > 0 || secrets.high > 0) {
          processedText = redactSecrets(rawText, secrets.issues);
          showInfo(
            `ℹ️ Auto-redacted ${secrets.critical + secrets.high} secrets before saving.`
          );
        }
  
        // 5. Normalize to your message format
        const conversation = normalizeConversation(
          secrets.critical + secrets.high > 0
            ? JSON.parse(processedText)
            : apiData
        );
  
        // 6. Warn about file attachments (can't get content)
        const totalFiles = conversation.messages.reduce(
          (sum, m) => sum + (m.file_refs?.length || 0), 0
        );
        if (totalFiles > 0) {
          showInfo(
            `ℹ️ Found ${totalFiles} uploaded file(s). Metadata captured, but file contents are not accessible (Anthropic privacy policy).`
          );
        }
  
        // 7. Send to background script for storage + sharing
        await saveConversation(conversation);
  
        showSuccess(
          `✅ Captured ${conversation.messages.length} messages!` +
          (totalFiles > 0 ? ` (${totalFiles} file refs noted)` : '')
        );
  
        console.log('[Chat Knowledge] ✓ Saved:', conversation.title, conversation.id);
  
      } catch (error) {
        console.error('[Chat Knowledge] ✗ Capture failed:', error);
        showWarning(`❌ Failed: ${error.message}`);
      } finally {
        if (btn) {
          btn.textContent = '📚 Share to Foundation';
          btn.disabled = false;
        }
      }
    }
  
    // ============================================
    // STORAGE (via Background Script)
    // ============================================
  
    async function saveConversation(conversation) {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: 'saveConversation', conversation },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (response?.success) {
              resolve(response);
            } else {
              reject(new Error(response?.error || 'Failed to save conversation'));
            }
          }
        );
      });
    }
  
    // ============================================
    // INJECT "SHARE TO FOUNDATION" BUTTON INTO CLAUDE UI
    // ============================================
  
    function injectShareButton() {
      // Don't inject twice
      if (document.getElementById('ck-share-btn')) return;
  
      // Only inject on chat pages
      if (!getConversationId()) return;
  
      const btn = document.createElement('button');
      btn.id = 'ck-share-btn';
      btn.textContent = '📚 Share to Foundation';
      btn.title = 'Save this conversation to The Foundation knowledge commons';
      btn.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 20px;
        padding: 10px 16px;
        background: #2a2a2a;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        font-family: system-ui, -apple-system, sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 9999;
        transition: background 0.2s, transform 0.1s;
      `;
  
      btn.addEventListener('mouseenter', () => {
        btn.style.background = '#1a1a1a';
        btn.style.transform = 'scale(1.03)';
      });
  
      btn.addEventListener('mouseleave', () => {
        btn.style.background = '#2a2a2a';
        btn.style.transform = 'scale(1)';
      });
  
      btn.addEventListener('click', handleShare);
      document.body.appendChild(btn);
  
      console.log('[Chat Knowledge] ✓ Share button injected');
    }
  
    function removeShareButton() {
      const btn = document.getElementById('ck-share-btn');
      if (btn) btn.remove();
    }
  
    // ============================================
    // WATCH FOR SPA NAVIGATION (Claude is a React SPA)
    // ============================================
  
    let lastUrl = location.href;
  
    const observer = new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
  
        if (currentUrl.includes('/chat/')) {
          // Small delay to let React render the new page
          setTimeout(injectShareButton, 800);
        } else {
          removeShareButton();
        }
      }
    });
  
    observer.observe(document.body, { subtree: true, childList: true });
  
    // Initial injection on page load
    if (location.href.includes('/chat/')) {
      // Wait for React to render
      setTimeout(injectShareButton, 1000);
    }
  
    // ============================================
    // USER NOTIFICATIONS (kept from original)
    // ============================================
  
    function showSuccess(message) {
      showNotification(message, '#2e7d32', '✅', 4000);
    }
  
    function showWarning(message) {
      showNotification(message, '#d32f2f', '⚠️', 8000);
    }
  
    function showInfo(message) {
      showNotification(message, '#1565c0', 'ℹ️', 5000);
    }
  
    function showNotification(message, color, icon, duration = 3000) {
      // Remove existing notification of same type to avoid stacking
      const existing = document.getElementById('ck-notification');
      if (existing) existing.remove();
  
      const div = document.createElement('div');
      div.id = 'ck-notification';
      div.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 6px; font-size: 14px;">
          ${icon} Chat Knowledge
        </div>
        <div style="white-space: pre-line; font-size: 13px; line-height: 1.5;">
          ${escapeHtml(message)}
        </div>
      `;
      div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${color};
        color: white;
        padding: 14px 18px;
        border-radius: 8px;
        z-index: 10000;
        font-family: system-ui, -apple-system, sans-serif;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        max-width: 380px;
        animation: ckSlideIn 0.3s ease-out;
      `;
  
      // Add animation if not already added
      if (!document.getElementById('ck-styles')) {
        const style = document.createElement('style');
        style.id = 'ck-styles';
        style.textContent = `
          @keyframes ckSlideIn {
            from { transform: translateX(110%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
        `;
        document.head.appendChild(style);
      }
  
      document.body.appendChild(div);
  
      setTimeout(() => {
        div.style.transition = 'opacity 0.3s, transform 0.3s';
        div.style.opacity = '0';
        div.style.transform = 'translateX(110%)';
        setTimeout(() => div.remove(), 300);
      }, duration);
    }
  
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  
  })();