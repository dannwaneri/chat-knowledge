// src/worker/ui/chats.ts

export function getChatsHTML(): string {
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Chats — The Foundation</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

:root {
  --bg:            #f5f3f0;
  --surface:       #ffffff;
  --surface-alt:   #faf9f7;
  --border:        #d4d0ca;
  --border-light:  #e8e5e0;
  --text:          #2a2a2a;
  --text-secondary:#6b6b6b;
  --text-muted:    #999;
  --accent:        #8b4513;
  --c-resume:      #3b82f6;
  --c-warn:        #e05a2b;
  --c-cmd:         #22a05a;
  --c-decision:    #8b5cf6;
  --nav-bg:        rgba(245,243,240,0.95);
  --transition:    background 0.2s, color 0.2s, border-color 0.2s;
}
[data-theme="dark"] {
  --bg:            #111213;
  --surface:       #1a1b1d;
  --surface-alt:   #1e1f22;
  --border:        #2e3033;
  --border-light:  #252729;
  --text:          #d4d5d7;
  --text-secondary:#8e9099;
  --text-muted:    #555a63;
  --accent:        #c0693a;
  --c-resume:      #4a9eff;
  --c-warn:        #e8724a;
  --c-cmd:         #3ec97e;
  --c-decision:    #a78bfa;
  --nav-bg:        rgba(17,18,19,0.96);
}

body {
  font-family:'Inter',-apple-system,sans-serif;
  font-size:15px; line-height:1.7;
  color:var(--text); background:var(--bg);
  min-height:100vh; transition:var(--transition);
}

.nav {
  position:sticky; top:0; z-index:100;
  background:var(--nav-bg); backdrop-filter:blur(10px);
  border-bottom:1px solid var(--border);
  padding:0 24px; height:52px;
  display:flex; align-items:center; justify-content:space-between;
  transition:var(--transition);
}
.nav-brand { font-family:'Lora',serif; font-size:15px; font-weight:600; color:var(--text); text-decoration:none; }
.nav-links { display:flex; align-items:center; gap:4px; }
.nav-link {
  font-size:13px; color:var(--text-secondary); text-decoration:none;
  padding:5px 10px; border-radius:3px; transition:all 0.15s;
  font-family:'JetBrains Mono',monospace;
}
.nav-link:hover { color:var(--text); background:var(--surface); }
.nav-link.active { color:var(--text); background:var(--surface); }
.nav-right { display:flex; align-items:center; gap:8px; }
.theme-btn {
  width:32px; height:32px; border-radius:50%;
  background:none; border:1px solid var(--border);
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  color:var(--text); transition:all 0.15s;
}
.theme-btn:hover { border-color:var(--accent); }
.auth-btn {
  font-size:12px; color:var(--text-secondary);
  background:none; border:1px solid var(--border);
  padding:4px 10px; border-radius:3px; cursor:pointer;
  font-family:'JetBrains Mono',monospace; transition:all 0.15s;
}
.auth-btn:hover { border-color:var(--accent); color:var(--accent); }
.auth-btn.is-owner { border-color:var(--c-cmd); color:var(--c-cmd); }

.container { max-width:860px; margin:0 auto; padding:48px 24px 80px; }

.page-header {
  margin-bottom:40px; padding-bottom:24px;
  border-bottom:2px solid var(--text);
  display:flex; justify-content:space-between; align-items:flex-end;
}
.page-title {
  font-family:'Lora',Georgia,serif;
  font-size:36px; font-weight:600; color:var(--text);
  letter-spacing:-0.5px; line-height:1.1;
}
.page-subtitle { font-size:13px; color:var(--text-muted); font-family:'JetBrains Mono',monospace; margin-top:6px; }

.chats-list { display:flex; flex-direction:column; gap:2px; }

.chat-card {
  display:block; text-decoration:none; color:inherit;
  background:var(--surface); border:1px solid var(--border-light);
  padding:20px 24px; transition:border-color 0.15s, background 0.15s;
  position:relative;
}
.chat-card:first-child { border-radius:4px 4px 0 0; }
.chat-card:last-child  { border-radius:0 0 4px 4px; }
.chat-card:only-child  { border-radius:4px; }
.chat-card::before {
  content:''; position:absolute; left:0; top:0; bottom:0; width:3px;
  background:var(--accent); opacity:0; transition:opacity 0.15s;
}
.chat-card:hover { border-color:var(--border); background:var(--surface-alt); }
.chat-card:hover::before { opacity:1; }

.cc-title {
  font-family:'Lora',serif; font-size:16px; font-weight:600;
  color:var(--text); margin-bottom:6px; line-height:1.35;
}
.cc-summary {
  font-size:13px; color:var(--text-secondary); line-height:1.6;
  margin-bottom:12px;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
  overflow:hidden;
}
.cc-meta {
  display:flex; gap:16px; align-items:center;
  font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--text-muted);
  flex-wrap:wrap;
}
.cc-source {
  display:inline-flex; align-items:center; gap:4px;
  background:var(--bg); border:1px solid var(--border-light);
  padding:2px 7px; border-radius:2px; font-size:10px;
  color:var(--text-secondary);
}

.toggle-vis {
  display:inline-flex; align-items:center; gap:5px;
  margin-top:10px; padding:3px 10px;
  font-family:'JetBrains Mono',monospace; font-size:10px;
  border-radius:2px; cursor:pointer;
  border:1px solid var(--border); background:none;
  color:var(--text-muted); transition:all 0.15s;
}
.toggle-vis:hover { border-color:var(--accent); color:var(--accent); }
.toggle-vis.is-public { border-color:var(--c-cmd); color:var(--c-cmd); }

.toggle-vis-wrap {
  padding-top:10px;
  border-top:1px solid var(--border-light);
  margin-top:10px;
}

.empty-state {
  padding:80px 40px; text-align:center;
  color:var(--text-muted); font-size:14px;
  border:1px dashed var(--border); border-radius:4px;
}
.empty-state strong { display:block; font-size:16px; color:var(--text-secondary); margin-bottom:8px; }
.loading-state { padding:80px; text-align:center; color:var(--text-muted); font-size:14px; font-style:italic; }

@media(max-width:600px){
  .nav{padding:0 12px;}
  .container{padding:24px 16px 60px;}
  .page-title{font-size:28px;}
  .page-header{flex-direction:column;align-items:flex-start;gap:8px;}
  .chat-card{padding:16px;}
}
</style>
</head>
<body>
<nav class="nav">
  <a class="nav-brand" href="/">The Foundation</a>
  <div class="nav-links">
    <a class="nav-link" href="/collections">/collections</a>
    <a class="nav-link active" href="/chats">/chats</a>
  </div>
  <div class="nav-right">
    <button class="auth-btn" id="authBtn" onclick="handleAuth()"></button>
    <button class="theme-btn" onclick="toggleTheme()" title="Toggle dark mode">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor" stroke="none"/>
      </svg>
    </button>
  </div>
</nav>

<div class="container">
  <div class="page-header">
    <div>
      <h1 class="page-title">Chats</h1>
      <div class="page-subtitle" id="pageSubtitle">Loading\u2026</div>
    </div>
  </div>
  <div id="chatsList" class="chats-list">
    <div class="loading-state">Loading conversations\u2026</div>
  </div>
</div>

<script>
(function(){
  var t = localStorage.getItem('foundation-theme') || 'light';
  document.documentElement.setAttribute('data-theme', t);
})();

function toggleTheme() {
  var c = document.documentElement.getAttribute('data-theme');
  var n = c === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', n);
  localStorage.setItem('foundation-theme', n);
}

function getApiKey() { return localStorage.getItem('foundation-api-key') || ''; }

function renderAuthBtn() {
  var btn = document.getElementById('authBtn');
  if (!btn) return;
  if (getApiKey()) {
    btn.textContent = 'Logout';
    btn.classList.add('is-owner');
  } else {
    btn.textContent = 'Owner login';
    btn.classList.remove('is-owner');
  }
}

async function handleAuth() {
  if (getApiKey()) {
    localStorage.removeItem('foundation-api-key');
    location.reload();
    return;
  }
  var key = prompt('Enter your Foundation API key:');
  if (!key) return;
  try {
    var res = await fetch('/api/private/chats', {
      headers: { 'X-API-Key': key }
    });
    if (res.status === 401) { alert('Invalid API key.'); return; }
    localStorage.setItem('foundation-api-key', key);
    location.reload();
  } catch(e) { alert('Could not verify key.'); }
}

function escapeHtml(t) {
  if (!t) return '';
  var d = document.createElement('div'); d.textContent = t; return d.innerHTML;
}

function formatDate(s) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

function stripMarkdown(s) {
  if (!s) return '';
  var out = s;
  while (out.indexOf('**') !== -1) {
    var i = out.indexOf('**');
    var j = out.indexOf('**', i + 2);
    if (j === -1) { out = out.slice(0, i) + out.slice(i + 2); break; }
    out = out.slice(0, i) + out.slice(i + 2, j) + out.slice(j + 2);
  }
  while (out.indexOf('*') !== -1) {
    var i = out.indexOf('*');
    var j = out.indexOf('*', i + 1);
    if (j === -1) { out = out.slice(0, i) + out.slice(i + 1); break; }
    out = out.slice(0, i) + out.slice(i + 1, j) + out.slice(j + 1);
  }
  // strip heading markers at line start
  var lines = out.split('\\n');
  lines = lines.map(function(line) {
    var m = 0;
    while (m < line.length && line[m] === '#') m++;
    if (m > 0 && m < line.length && line[m] === ' ') return line.slice(m + 1);
    return line;
  });
  return lines.join(' ').trim();
}

async function toggleVis(e, id, current) {
  e.preventDefault(); e.stopPropagation();
  var next = current === 'public' ? 'private' : 'public';
  try {
    var res = await fetch('/api/chats/' + id + '/visibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': getApiKey() },
      body: JSON.stringify({ visibility: next })
    });
    if (res.ok) loadChats();
  } catch(err) { console.error('Toggle failed', err); }
}

async function loadChats() {
  try {
    var endpoint = getApiKey() ? '/api/private/chats' : '/chats';
    var headers = { 'Accept': 'application/json' };
    if (getApiKey()) headers['X-API-Key'] = getApiKey();
    var res = await fetch(endpoint, { headers: headers });
    var data = await res.json();
    var chats = data.chats || [];

    var isOwner = !!getApiKey();
    document.getElementById('pageSubtitle').textContent = isOwner
      ? chats.length + ' conversation' + (chats.length !== 1 ? 's' : '')
      : chats.length + ' public conversation' + (chats.length !== 1 ? 's' : '');

    if (!chats.length) {
      document.getElementById('chatsList').innerHTML =
        '<div class="empty-state"><strong>No public chats yet<\/strong>Conversations marked as public will appear here.<\/div>';
      return;
    }

    var html = chats.map(function(chat) {
      var summary = stripMarkdown(chat.summary || '');
      var summaryHtml = summary
        ? '<div class="cc-summary">' + escapeHtml(summary) + '<\/div>'
        : '';
      var source = chat.source
        ? '<span class="cc-source">' + escapeHtml(chat.source) + '<\/span>'
        : '';

        var vis = chat.visibility || 'private';
        var toggleBtn = isOwner
          ? '<div class="toggle-vis-wrap">' +
            '<button class="toggle-vis ' + (vis === 'public' ? 'is-public' : '') + '" ' +
            'data-id="' + chat.id + '" data-vis="' + vis + '" ' +
            'onclick="toggleVis(event,this.dataset.id,this.dataset.vis)">' +
            (vis === 'public' ? 'Public' : 'Private') +
            '<\/button><\/div>'
          : '';

      return '<a class="chat-card" href="/view/' + chat.id + '">' +
        '<div class="cc-title">' + escapeHtml(chat.title) + '<\/div>' +
        summaryHtml +
        '<div class="cc-meta">' +
          '<span>' + (chat.message_count || 0) + ' messages<\/span>' +
          (chat.imported_at ? '<span>' + formatDate(chat.imported_at) + '<\/span>' : '') +
          (chat.model ? '<span class="cc-source">' + escapeHtml(chat.model) + '<\/span>' : '') +
          source +
        '<\/div>' +
        toggleBtn +
        '<\/a>';
    }).join('');

    document.getElementById('chatsList').innerHTML = html;
  } catch(err) {
    document.getElementById('chatsList').innerHTML =
      '<div class="empty-state"><strong>Could not load chats<\/strong>' + escapeHtml(err.message) + '<\/div>';
  }
}

renderAuthBtn();
loadChats();
<\/script>
</body>
</html>`;
}