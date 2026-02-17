export function getChatHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>The Foundation</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --bg: #f5f3f0; --surface: #fff; --border: #d4d0ca;
  --border-light: #e8e5e0; --text: #2a2a2a; --text-secondary: #6b6b6b;
  --text-muted: #999; --accent: #8b4513;
  --user-border: #8b4513; --assistant-border: #2a2a2a; --code-bg: #1a1a2e;
}
body { font-family: 'Inter', -apple-system, sans-serif; font-size: 15px; line-height: 1.7; color: var(--text); background: var(--bg); min-height: 100vh; }
.nav { position: sticky; top: 0; z-index: 100; background: rgba(245,243,240,0.95); backdrop-filter: blur(8px); border-bottom: 1px solid var(--border); padding: 0 24px; height: 52px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.nav-left { display: flex; align-items: center; gap: 16px; min-width: 0; }
.nav-back { color: var(--text-secondary); text-decoration: none; font-size: 13px; font-weight: 500; white-space: nowrap; transition: color 0.15s; }
.nav-back:hover { color: var(--accent); }
.nav-divider { width: 1px; height: 16px; background: var(--border); flex-shrink: 0; }
.nav-title { font-family: 'Lora', serif; font-size: 14px; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nav-meta { font-size: 12px; color: var(--text-muted); white-space: nowrap; flex-shrink: 0; }
.container { max-width: 780px; margin: 0 auto; padding: 32px 20px 80px; }
.conv-header { margin-bottom: 32px; }
.conv-title { font-family: 'Lora', Georgia, serif; font-size: 26px; font-weight: 600; color: var(--text); line-height: 1.35; letter-spacing: -0.3px; margin-bottom: 12px; }
.conv-stats { display: flex; align-items: center; gap: 16px; font-size: 13px; color: var(--text-muted); font-weight: 300; margin-bottom: 20px; flex-wrap: wrap; }
.conv-stats span { display: flex; align-items: center; gap: 4px; }
.summary-box { background: var(--surface); border: 1px solid var(--border); border-left: 3px solid var(--accent); padding: 20px 24px; margin-bottom: 32px; }
.summary-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--accent); margin-bottom: 10px; }
.summary-text { font-size: 14px; color: var(--text-secondary); line-height: 1.7; font-style: italic; }
.summary-text.collapsed { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.summary-toggle { margin-top: 10px; font-size: 12px; color: var(--accent); cursor: pointer; background: none; border: none; padding: 0; font-family: inherit; font-weight: 500; }
.summary-toggle:hover { text-decoration: underline; }
.messages { display: flex; flex-direction: column; gap: 2px; }
.message { position: relative; padding: 20px 24px; background: var(--surface); border: 1px solid var(--border-light); transition: border-color 0.15s, background 0.4s; }
.message:hover { border-color: var(--border); }
.message.user { border-left: 3px solid var(--user-border); background: #fafaf8; }
.message.assistant { border-left: 3px solid var(--assistant-border); }
.message:first-child { border-radius: 4px 4px 0 0; }
.message:last-child { border-radius: 0 0 4px 4px; }
.message:only-child { border-radius: 4px; }

/* Highlight pulse — triggered when arriving from a search result */
@keyframes highlight-pulse {
  0%   { background: #fff8e6; border-color: #c8a050; }
  60%  { background: #fff8e6; border-color: #c8a050; }
  100% { background: var(--surface); border-color: var(--border-light); }
}
.message.highlighted {
  animation: highlight-pulse 2.4s ease-out forwards;
  scroll-margin-top: 72px; /* clear the sticky nav */
}
.message.user.highlighted {
  animation: highlight-pulse 2.4s ease-out forwards;
}

.message-role { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 10px; }
.message.user .message-role { color: var(--user-border); }
.message.assistant .message-role { color: var(--text-muted); }
.message-body { font-size: 15px; line-height: 1.75; color: var(--text); }
.message-body p { margin-bottom: 14px; }
.message-body p:last-child { margin-bottom: 0; }
.message-body strong { font-weight: 600; }
.message-body em { font-style: italic; }
.message-body h1, .message-body h2, .message-body h3 { font-family: 'Lora', serif; font-weight: 600; margin: 20px 0 10px; line-height: 1.4; }
.message-body h1 { font-size: 20px; } .message-body h2 { font-size: 17px; } .message-body h3 { font-size: 15px; }
.message-body ul, .message-body ol { padding-left: 20px; margin-bottom: 14px; }
.message-body li { margin-bottom: 6px; line-height: 1.65; }
.message-body blockquote { border-left: 3px solid var(--border); padding-left: 16px; color: var(--text-secondary); margin: 16px 0; font-style: italic; }
.message-body a { color: var(--accent); text-decoration: none; }
.message-body a:hover { text-decoration: underline; }
.message-body code:not(pre code) { font-family: 'JetBrains Mono', monospace; font-size: 12.5px; background: #f0ede8; color: var(--accent); padding: 2px 6px; border-radius: 3px; border: 1px solid var(--border-light); }
.message-body table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
.message-body th { background: var(--bg); padding: 8px 12px; text-align: left; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); border-bottom: 2px solid var(--border); }
.message-body td { padding: 8px 12px; border-bottom: 1px solid var(--border-light); vertical-align: top; }
.message-body tr:last-child td { border-bottom: none; }
.code-block { margin: 16px 0; border-radius: 6px; overflow: hidden; border: 1px solid #2a2a3e; box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
.code-header { display: flex; justify-content: space-between; align-items: center; background: #16162a; padding: 8px 14px; border-bottom: 1px solid #2a2a3e; }
.code-lang { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #7c7cad; font-weight: 500; }
.code-copy { font-size: 11px; color: #7c7cad; background: none; border: none; cursor: pointer; font-family: 'Inter', sans-serif; padding: 2px 8px; border-radius: 3px; transition: all 0.15s; }
.code-copy:hover { color: #fff; background: rgba(255,255,255,0.1); }
.code-block pre { margin: 0; padding: 16px; background: var(--code-bg); overflow-x: auto; }
.code-block pre code { font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.6; background: none; border: none; padding: 0; color: #cdd6f4; }
.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; color: var(--text-muted); gap: 12px; }
.loading-spinner { width: 24px; height: 24px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.error-state { padding: 32px; background: var(--surface); border: 1px solid var(--border); border-left: 3px solid #c44; color: #c44; border-radius: 4px; }
@media (max-width: 600px) {
  .nav { 
    padding: 0 12px; 
    height: 56px; /* slightly taller for touch targets */
  }
  
  .nav-back { 
    font-size: 15px; /* bigger touch target */
    padding: 8px 12px; /* more hit area */
    margin: -8px -12px; /* expand clickable zone */
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .nav-back::before {
    content: '←';
    font-size: 20px; /* bigger arrow */
  }
  
  .nav-title { 
    display: block; /* show title on mobile */
    font-size: 13px;
    max-width: 50%; /* prevent overflow */
  }
  
  .nav-meta {
    font-size: 11px;
  }
  
  .container { padding: 20px 12px 60px; }
  .conv-title { font-size: 20px; }
  .message { padding: 14px 16px; }
  .summary-box { padding: 14px 16px; }
}
</style>
</head>
<body>
<nav class="nav">
  <div class="nav-left">
    <a href="/" class="nav-back">Back</a>
    <div class="nav-divider"></div>
    <div class="nav-title" id="navTitle">Loading...</div>
  </div>
  <div class="nav-meta" id="navMeta"></div>
</nav>
<div class="container">
  <div id="app">
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <span>Loading conversation...</span>
    </div>
  </div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-typescript.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-sql.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js"></script>
<script src="/chat-viewer.js"></script>
</body>
</html>`;
}

export const chatViewerScript = getChatViewerScript();

function getChatViewerScript(): string {
  const lines: string[] = [];

  lines.push("var chatId = window.location.pathname.split('/').pop();");
  lines.push("var FENCE = String.fromCharCode(96, 96, 96);");
  lines.push("");

  // Read ?msg= param from URL
  lines.push("function getMsgParam() {");
  lines.push("  var params = new URLSearchParams(window.location.search);");
  lines.push("  var m = params.get('msg');");
  lines.push("  return m !== null ? parseInt(m, 10) : null;");
  lines.push("}");
  lines.push("");

  lines.push("async function loadConversation() {");
  lines.push("  try {");
  lines.push("    var res = await fetch('/chat/' + chatId, { headers: { 'Accept': 'application/json' } });");
  lines.push("    if (!res.ok) throw new Error('Failed to load conversation');");
  lines.push("    var data = await res.json();");
  lines.push("    if (data.error) throw new Error(data.error);");
  lines.push("    render(data);");
  lines.push("  } catch (err) {");
  lines.push("    document.getElementById('app').innerHTML = '<div class=\"error-state\">Error: ' + escapeHtml(err.message) + '</div>';");
  lines.push("  }");
  lines.push("}");
  lines.push("");

  lines.push("function render(data) {");
  lines.push("  var chat = data.chat;");
  lines.push("  var messages = data.messages || [];");
  lines.push("  document.title = chat.title + ' \u2014 The Foundation';");
  lines.push("  document.getElementById('navTitle').textContent = chat.title;");
  lines.push("  document.getElementById('navMeta').textContent = messages.length + ' messages' + (chat.imported_at ? ' \u00b7 ' + formatDate(chat.imported_at) : '');");
  lines.push("  var summaryHTML = chat.summary ? buildSummary(chat.summary) : '';");
  lines.push("  var messagesHTML = messages.map(buildMessage).join('');");
  lines.push("  document.getElementById('app').innerHTML =");
  lines.push("    '<div class=\"conv-header\">' +");
  lines.push("    '<h1 class=\"conv-title\">' + escapeHtml(chat.title) + '</h1>' +");
  lines.push("    '<div class=\"conv-stats\"><span>' + messages.length + ' messages</span>' +");
  lines.push("    (chat.created_at ? '<span>\u00b7 ' + formatDate(chat.created_at) + '</span>' : '') +");
  lines.push("    (chat.source ? '<span>\u00b7 via ' + escapeHtml(chat.source) + '</span>' : '') +");
  lines.push("    '</div></div>' + summaryHTML + '<div class=\"messages\">' + messagesHTML + '</div>';");
  lines.push("  Prism.highlightAll();");
  lines.push("  scrollToMessage();");
  lines.push("}");
  lines.push("");

  // Scroll directly to the message identified by the ?msg= index param
  lines.push("function scrollToMessage() {");
  lines.push("  var msgIndex = getMsgParam();");
  lines.push("  if (msgIndex === null) return;");
  lines.push("  var target = document.querySelector('.message[data-index=\"' + msgIndex + '\"]');");
  lines.push("  if (!target) return;");
  lines.push("  target.classList.add('highlighted');");
  lines.push("  // Slight delay so the page has settled before scrolling");
  lines.push("  setTimeout(function() {");
  lines.push("    target.scrollIntoView({ behavior: 'smooth', block: 'start' });");
  lines.push("  }, 120);");
  lines.push("}");
  lines.push("");

  lines.push("function buildSummary(summary) {");
  lines.push("  return '<div class=\"summary-box\"><div class=\"summary-label\">Summary</div>' +");
  lines.push("    '<div class=\"summary-text collapsed\" id=\"summaryText\">' + formatProse(summary) + '</div>' +");
  lines.push("    '<button class=\"summary-toggle\" id=\"summaryToggle\" onclick=\"toggleSummary()\">Show more</button></div>';");
  lines.push("}");
  lines.push("");

  lines.push("function toggleSummary() {");
  lines.push("  var text = document.getElementById('summaryText');");
  lines.push("  var btn = document.getElementById('summaryToggle');");
  lines.push("  var collapsed = text.classList.toggle('collapsed');");
  lines.push("  btn.textContent = collapsed ? 'Show more' : 'Show less';");
  lines.push("}");
  lines.push("");

  // data-index attribute added so scrollToMessage can find the element
  lines.push("function buildMessage(msg, index) {");
  lines.push("  var role = msg.role === 'user' ? 'user' : 'assistant';");
  lines.push("  var label = role === 'user' ? 'You' : 'Claude';");
  lines.push("  var body = formatMessageContent(msg.content);");
  lines.push("  return '<div class=\"message ' + role + '\" data-index=\"' + index + '\"><div class=\"message-role\">' + label + '</div><div class=\"message-body\">' + body + '</div></div>';");
  lines.push("}");
  lines.push("");

  lines.push("function formatMessageContent(rawContent) {");
  lines.push("  if (!rawContent) return '';");
  lines.push("  var fenceRegex = new RegExp('(' + FENCE + '[\\\\w]*[\\\\s\\\\S]*?' + FENCE + ')', 'g');");
  lines.push("  var parts = rawContent.split(fenceRegex);");
  lines.push("  return parts.map(function(part) {");
  lines.push("    if (part.charCodeAt(0) === 96 && part.charCodeAt(1) === 96 && part.charCodeAt(2) === 96) return buildCodeBlock(part);");
  lines.push("    return formatProse(part);");
  lines.push("  }).join('');");
  lines.push("}");
  lines.push("");

  lines.push("function buildCodeBlock(raw) {");
  lines.push("  var m = raw.match(new RegExp('^' + FENCE + '(\\\\w*)[\\\\r\\\\n]+([\\\\s\\\\S]*?)' + FENCE + '$'));");
  lines.push("  if (!m) m = raw.match(new RegExp('^' + FENCE + '(\\\\w*)([\\\\s\\\\S]*?)' + FENCE + '$'));");
  lines.push("  if (!m) return '<pre><code>' + escapeHtml(raw) + '</code></pre>';");
  lines.push("  var lang = m[1] || 'text';");
  lines.push("  var code = m[2] || '';");
  lines.push("  if (code.charAt(0) === '\\n') code = code.slice(1);");
  lines.push("  return '<div class=\"code-block\"><div class=\"code-header\"><span class=\"code-lang\">' + escapeHtml(lang) + '</span>' +");
  lines.push("    '<button class=\"code-copy\" onclick=\"copyCode(this)\">Copy</button></div>' +");
  lines.push("    '<pre><code class=\"language-' + mapLang(lang) + '\">' + escapeHtml(code) + '</code></pre></div>';");
  lines.push("}");
  lines.push("");

  lines.push("function formatProse(text) {");
  lines.push("  if (!text.trim()) return '';");
  lines.push("  var html = escapeHtml(text);");
  lines.push("  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');");
  lines.push("  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');");
  lines.push("  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');");
  lines.push("  html = html.replace(/[*]{3}(.+?)[*]{3}/g, '<strong><em>$1</em></strong>');");
  lines.push("  html = html.replace(/[*]{2}(.+?)[*]{2}/g, '<strong>$1</strong>');");
  lines.push("  html = html.replace(/[*](.+?)[*]/g, '<em>$1</em>');");
  lines.push("  var BT = String.fromCharCode(96);");
  lines.push("  html = html.replace(new RegExp(BT + '([^' + BT + ']+)' + BT, 'g'), '<code>$1</code>');");
  lines.push("  html = formatTables(html);");
  lines.push("  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');");
  lines.push("  html = formatLists(html);");
  lines.push("  html = html.replace(/^---+$/gm, '<hr style=\"border:none;border-top:1px solid #d4d0ca;margin:20px 0\">');");
  lines.push("  var blocks = html.split(/\\n\\n+/);");
  lines.push("  html = blocks.map(function(block) {");
  lines.push("    block = block.trim();");
  lines.push("    if (!block) return '';");
  lines.push("    if (/^<(h[1-6]|ul|ol|li|blockquote|hr|div|pre|table)/.test(block)) return block;");
  lines.push("    return '<p>' + block.replace(/\\n/g, '<br>') + '</p>';");
  lines.push("  }).join('');");
  lines.push("  return html;");
  lines.push("}");
  lines.push("");

  lines.push("function formatTables(html) {");
  lines.push("  return html.replace(/((?:\\|.+\\|\\n)+)/g, function(match) {");
  lines.push("    var rows = match.trim().split('\\n').filter(function(r) { return r.trim(); });");
  lines.push("    if (rows.length < 2) return match;");
  lines.push("    var sepIndex = -1;");
  lines.push("    for (var i = 0; i < rows.length; i++) { if (/^[\\|\\s\\-:]+$/.test(rows[i])) { sepIndex = i; break; } }");
  lines.push("    if (sepIndex === -1) return match;");
  lines.push("    var t = '<table>';");
  lines.push("    for (var j = 0; j < rows.length; j++) {");
  lines.push("      if (j === sepIndex) continue;");
  lines.push("      var cells = rows[j].split('|').slice(1, -1);");
  lines.push("      var tag = j < sepIndex ? 'th' : 'td';");
  lines.push("      t += '<tr>' + cells.map(function(c) { return '<' + tag + '>' + c.trim() + '</' + tag + '>'; }).join('') + '</tr>';");
  lines.push("    }");
  lines.push("    return t + '</table>';");
  lines.push("  });");
  lines.push("}");
  lines.push("");

  lines.push("function formatLists(html) {");
  lines.push("  html = html.replace(/((?:^[-*] .+\\n?)+)/gm, function(match) {");
  lines.push("    var items = match.trim().split('\\n').map(function(l) { return l.replace(/^[-*] /, '').trim(); }).filter(Boolean).map(function(i) { return '<li>' + i + '</li>'; }).join('');");
  lines.push("    return '<ul>' + items + '</ul>';");
  lines.push("  });");
  lines.push("  html = html.replace(/((?:^\\d+\\. .+\\n?)+)/gm, function(match) {");
  lines.push("    var items = match.trim().split('\\n').map(function(l) { return l.replace(/^\\d+\\. /, '').trim(); }).filter(Boolean).map(function(i) { return '<li>' + i + '</li>'; }).join('');");
  lines.push("    return '<ol>' + items + '</ol>';");
  lines.push("  });");
  lines.push("  return html;");
  lines.push("}");
  lines.push("");

  lines.push("function copyCode(btn) {");
  lines.push("  var code = btn.closest('.code-block').querySelector('code').textContent;");
  lines.push("  navigator.clipboard.writeText(code).then(function() { btn.textContent = 'Copied!'; setTimeout(function() { btn.textContent = 'Copy'; }, 2000); });");
  lines.push("}");
  lines.push("");

  lines.push("function mapLang(lang) {");
  lines.push("  var map = { js: 'javascript', ts: 'typescript', py: 'python', sh: 'bash', shell: 'bash', zsh: 'bash', yml: 'yaml', md: 'markdown' };");
  lines.push("  return map[lang] || lang || 'text';");
  lines.push("}");
  lines.push("");

  lines.push("function escapeHtml(text) {");
  lines.push("  if (typeof text !== 'string') return '';");
  lines.push("  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');");
  lines.push("}");
  lines.push("");

  lines.push("function formatDate(dateStr) {");
  lines.push("  if (!dateStr) return '';");
  lines.push("  try { return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }");
  lines.push("  catch(e) { return ''; }");
  lines.push("}");
  lines.push("");

  lines.push("loadConversation();");

  return lines.join('\n');
}