// src/worker/ui/collections.ts

export function getCollectionsHTML(): string {
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Collections — The Foundation</title>
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
.nav-link:hover, .nav-link.active { color:var(--text); background:var(--surface); }
.nav-right { display:flex; align-items:center; gap:8px; }
.theme-btn {
  width:32px; height:32px; border-radius:50%;
  background:none; border:1px solid var(--border);
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  color:var(--text); transition:all 0.15s;
}
.theme-btn:hover { border-color:var(--accent); color:var(--accent); }

.container { max-width:900px; margin:0 auto; padding:48px 24px 80px; }

.page-header {
  margin-bottom:40px;
  padding-bottom:24px;
  border-bottom:2px solid var(--text);
}
.page-title {
  font-family:'Lora',Georgia,serif;
  font-size:36px; font-weight:600; color:var(--text);
  letter-spacing:-0.5px; line-height:1.1; margin-bottom:8px;
}
.page-subtitle { font-size:13px; color:var(--text-muted); font-family:'JetBrains Mono',monospace; }

.collections-grid {
  display:grid;
  grid-template-columns:repeat(auto-fill, minmax(380px, 1fr));
  gap:16px;
}

.collection-card {
  display:block; text-decoration:none; color:inherit;
  background:var(--surface); border:1px solid var(--border-light);
  border-radius:4px; padding:24px;
  transition:border-color 0.15s, box-shadow 0.15s;
  position:relative; overflow:hidden;
}
.collection-card::before {
  content:''; position:absolute; left:0; top:0; bottom:0; width:3px;
  background:var(--accent); opacity:0; transition:opacity 0.15s;
}
.collection-card:hover { border-color:var(--border); box-shadow:0 2px 12px rgba(0,0,0,0.06); }
.collection-card:hover::before { opacity:1; }

.cc-title {
  font-family:'Lora',serif; font-size:17px; font-weight:600;
  color:var(--text); margin-bottom:6px; line-height:1.35;
}
.cc-desc { font-size:13px; color:var(--text-secondary); margin-bottom:16px; line-height:1.5; }

.cc-meta {
  display:flex; gap:16px; align-items:center;
  font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--text-muted);
}
.cc-stat { display:flex; align-items:center; gap:4px; }
.cc-stat-value { color:var(--text); font-weight:500; }

.cc-insight-pills {
  display:flex; gap:6px; flex-wrap:wrap; margin-top:14px; padding-top:14px;
  border-top:1px solid var(--border-light);
}
.cc-pill {
  display:flex; align-items:center; gap:5px;
  font-family:'JetBrains Mono',monospace; font-size:10px;
  padding:3px 8px; border-radius:2px; border:1px solid var(--border-light);
  color:var(--text-muted);
}
.cc-pill-dot { width:5px; height:5px; border-radius:50%; }
.cc-pill.has-items { border-color:currentColor; }
.cc-pill.resume   { color:var(--c-resume); }
.cc-pill.warn     { color:var(--c-warn); }
.cc-pill.cmd      { color:var(--c-cmd); }
.cc-pill.decision { color:var(--c-decision); }
.cc-pill-dot.resume   { background:var(--c-resume); }
.cc-pill-dot.warn     { background:var(--c-warn); }
.cc-pill-dot.cmd      { background:var(--c-cmd); }
.cc-pill-dot.decision { background:var(--c-decision); }

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

.auth-btn {
  font-size:12px; color:var(--text-secondary);
  background:none; border:1px solid var(--border);
  padding:4px 10px; border-radius:3px; cursor:pointer;
  font-family:'JetBrains Mono',monospace; transition:all 0.15s;
}
.auth-btn:hover { border-color:var(--accent); color:var(--accent); }
.auth-btn.is-owner { border-color:var(--c-cmd); color:var(--c-cmd); }

.empty-state {
  padding:80px 40px; text-align:center;
  color:var(--text-muted); font-size:14px;
  border:1px dashed var(--border); border-radius:4px;
}
.empty-state strong { display:block; font-size:16px; color:var(--text-secondary); margin-bottom:8px; }

.loading-state {
  padding:80px; text-align:center; color:var(--text-muted); font-size:14px;
  font-style:italic;
}

@media(max-width:600px){
  .nav{padding:0 12px;}
  .container{padding:24px 16px 60px;}
  .page-title{font-size:28px;}
  .collections-grid{grid-template-columns:1fr;}
}
</style>
</head>
<body>
<nav class="nav">
  <a class="nav-brand" href="/">The Foundation</a>
  <div class="nav-links">
    <a class="nav-link active" href="/collections">/collections</a>
    <a class="nav-link" href="/chats">/chats</a>
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
    <h1 class="page-title">Collections</h1>
    <div class="page-subtitle" id="pageSubtitle">Loading…</div>
  </div>
  <div id="grid" class="collections-grid">
    <div class="loading-state">Loading collections…</div>
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

var SECTION_MAP = {
  resume:   ['commitment','deferred'],
  warn:     ['dead_end','mistake'],
  cmd:      ['command','exact_value'],
  decision: ['decision','reasoning','solution','pattern','relationship','context']
};

function getBucket(type) {
  for (var k in SECTION_MAP) {
    if (SECTION_MAP[k].indexOf(type) !== -1) return k;
  }
  return 'decision';
}

function escapeHtml(t) {
  if (!t) return '';
  var d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}

function formatDate(s) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

async function loadCollections() {
  try {
    var headers = {};
    if (getApiKey()) headers['X-API-Key'] = getApiKey();
    var res = await fetch('/api/collections', { headers: headers });
    var data = await res.json();
    var cols = data.collections || [];

    document.getElementById('pageSubtitle').textContent =
      cols.length + ' collection' + (cols.length !== 1 ? 's' : '');

    if (!cols.length) {
      document.getElementById('grid').innerHTML =
        '<div class="empty-state"><strong>No collections yet</strong>Create a collection to group related chats together.</div>';
      return;
    }

    // Fetch insight counts for each collection in parallel
    var enriched = await Promise.all(cols.map(async function(col) {
      try {
        var r = await fetch('/api/collections/' + col.id);
        var d = await r.json();
        var insights = d.insights || {};
        var counts = { resume:0, warn:0, cmd:0, decision:0 };
        var total = 0;
        Object.keys(insights).forEach(function(type) {
          var bucket = getBucket(type);
          var len = (insights[type] || []).length;
          counts[bucket] += len;
          total += len;
        });
        return Object.assign({}, col, { counts: counts, totalInsights: total, chatCount: (d.chats || []).length });
      } catch(e) {
        return Object.assign({}, col, { counts: {resume:0,warn:0,cmd:0,decision:0}, totalInsights: 0, chatCount: col.chat_count || 0 });
      }
    }));

    var html = enriched.map(function(col) {
      var desc = col.description ? '<div class="cc-desc">' + escapeHtml(col.description) + '</div>' : '';
      var pills = ['resume','warn','cmd','decision'].map(function(k) {
        var n = col.counts[k] || 0;
        var labels = { resume:'Resume', warn:'Watch out', cmd:'Commands', decision:'Decisions' };
        return '<div class="cc-pill ' + (n > 0 ? k : '') + '">' +
          '<div class="cc-pill-dot ' + k + '"></div>' +
          labels[k] + ' ' + n +
          '</div>';
      }).join('');

      return '<a class="collection-card" href="/collections/' + col.id + '">' +
        '<div class="cc-title">' + escapeHtml(col.title) + '</div>' +
        desc +
        '<div class="cc-meta">' +
          '<div class="cc-stat"><span class="cc-stat-value">' + col.chatCount + '</span>&nbsp;chats</div>' +
          '<div class="cc-stat"><span class="cc-stat-value">' + col.totalInsights + '</span>&nbsp;insights</div>' +
          (col.updated_at ? '<div class="cc-stat">updated ' + formatDate(col.updated_at) + '</div>' : '') +
        '</div>' +
        '<div class="cc-insight-pills">' + pills + '</div>' +
        (getApiKey() ? (
          '<div style="padding-top:10px;border-top:1px solid var(--border-light);margin-top:10px;">' +
          '<button class="toggle-vis ' + (col.visibility === 'public' ? 'is-public' : '') + '" ' +
          'onclick="toggleVis(event,&apos;' + col.id + '&apos;,&apos;' + col.visibility + '&apos;)">' +
          (col.visibility === 'public' ? 'Public' : 'Private') +
          '</button></div>'
        ) : '') +
        '</a>';
    }).join('');

    document.getElementById('grid').innerHTML = html;
  } catch(err) {
    document.getElementById('grid').innerHTML =
      '<div class="empty-state"><strong>Could not load collections</strong>' + escapeHtml(err.message) + '</div>';
  }
}

async function toggleVis(e, id, current) {
  e.preventDefault(); e.stopPropagation();
  var next = current === 'public' ? 'private' : 'public';
  try {
    var res = await fetch('/api/collections/' + id + '/visibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility: next })
    });
    if (res.ok) loadCollections();
  } catch(err) { console.error('Toggle failed', err); }
}

renderAuthBtn();
loadCollections();
</script>
</body>
</html>`;
}

export function getCollectionDetailHTML(): string {
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Collection — The Foundation</title>
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
.nav-left { display:flex; align-items:center; gap:16px; min-width:0; }
.nav-back { color:var(--text-secondary); text-decoration:none; font-size:13px; font-weight:500; white-space:nowrap; transition:color 0.15s; }
.nav-back:hover { color:var(--accent); }
.nav-divider { width:1px; height:16px; background:var(--border); flex-shrink:0; }
.nav-title { font-family:'Lora',serif; font-size:14px; font-weight:500; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.theme-btn {
  width:32px; height:32px; border-radius:50%;
  background:none; border:1px solid var(--border);
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  color:var(--text); transition:all 0.15s; flex-shrink:0;
}
.theme-btn:hover { border-color:var(--accent); }

.layout {
  display:grid;
  grid-template-columns:240px 1fr;
  min-height:calc(100vh - 52px);
}

/* Sidebar — chats list */
.sidebar {
  border-right:1px solid var(--border);
  padding:28px 16px;
  position:sticky; top:52px;
  height:calc(100vh - 52px);
  overflow-y:auto;
  transition:var(--transition);
}
.sidebar-label {
  font-size:10px; font-weight:600; letter-spacing:0.14em;
  text-transform:uppercase; color:var(--text-muted);
  font-family:'JetBrains Mono',monospace;
  margin-bottom:12px; display:block;
}
.chat-link {
  display:block; padding:8px 10px; border-radius:3px;
  font-size:13px; color:var(--text-secondary); text-decoration:none;
  transition:all 0.15s; margin-bottom:2px;
  border:1px solid transparent;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.chat-link:hover { background:var(--surface); color:var(--text); border-color:var(--border-light); }
.chat-link-meta { font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--text-muted); margin-top:2px; }

/* Main — insights feed identical to homepage */
.feed { padding:32px 36px 80px; min-width:0; }
.feed-header {
  margin-bottom:28px; padding-bottom:20px;
  border-bottom:2px solid var(--text);
}
.feed-title { font-family:'Lora',Georgia,serif; font-size:32px; font-weight:600; color:var(--text); letter-spacing:-0.5px; line-height:1.1; }
.feed-desc { font-size:13px; color:var(--text-secondary); margin-top:6px; }
.feed-subtitle { font-size:13px; color:var(--text-muted); font-family:'JetBrains Mono',monospace; margin-top:4px; }

/* Filters */
.filter-bar {
  display:flex; gap:4px; margin-bottom:24px; flex-wrap:wrap;
}
.filter-btn {
  display:flex; align-items:center; gap:6px;
  padding:5px 10px; border-radius:3px; font-size:12px;
  background:none; border:1px solid var(--border-light);
  color:var(--text-secondary); cursor:pointer; font-family:'Inter',sans-serif;
  transition:all 0.15s;
}
.filter-btn:hover { border-color:var(--border); color:var(--text); }
.filter-btn.active { background:var(--surface); border-color:var(--border); color:var(--text); }
.filter-dot { width:6px; height:6px; border-radius:50%; }
.filter-dot.resume   { background:var(--c-resume); }
.filter-dot.warn     { background:var(--c-warn); }
.filter-dot.cmd      { background:var(--c-cmd); }
.filter-dot.decision { background:var(--c-decision); }
.filter-count { font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--text-muted); margin-left:2px; }

/* Bucket sections — identical to homepage */
.bucket-section { margin-bottom:8px; }
.bucket-header {
  display:flex; align-items:center; gap:10px;
  padding:11px 16px; background:var(--surface);
  border:1px solid var(--border); cursor:pointer;
  transition:all 0.15s; user-select:none;
}
.bucket-header:hover { background:var(--surface-alt); }
.bucket-pip { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.bucket-section[data-kind="resume"]   .bucket-pip { background:var(--c-resume);   box-shadow:0 0 6px var(--c-resume); }
.bucket-section[data-kind="warn"]     .bucket-pip { background:var(--c-warn);     box-shadow:0 0 6px var(--c-warn); }
.bucket-section[data-kind="cmd"]      .bucket-pip { background:var(--c-cmd);      box-shadow:0 0 6px var(--c-cmd); }
.bucket-section[data-kind="decision"] .bucket-pip { background:var(--c-decision); box-shadow:0 0 6px var(--c-decision); }
.bucket-name { font-size:12px; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; font-family:'JetBrains Mono',monospace; }
.bucket-section[data-kind="resume"]   .bucket-name { color:var(--c-resume); }
.bucket-section[data-kind="warn"]     .bucket-name { color:var(--c-warn); }
.bucket-section[data-kind="cmd"]      .bucket-name { color:var(--c-cmd); }
.bucket-section[data-kind="decision"] .bucket-name { color:var(--c-decision); }
.bucket-desc { font-size:12px; color:var(--text-muted); margin-left:4px; }
.bucket-tally { margin-left:auto; font-size:11px; color:var(--text-muted); font-family:'JetBrains Mono',monospace; }
.bucket-chevron { width:14px; height:14px; color:var(--text-muted); transition:transform 0.2s; flex-shrink:0; margin-left:4px; }
.bucket-section.collapsed .bucket-chevron { transform:rotate(-90deg); }
.bucket-section.collapsed .bucket-body { display:none; }
.bucket-body { border:1px solid var(--border); border-top:none; }

.insight-item {
  display:flex; align-items:flex-start; gap:0;
  padding:14px 16px; border-bottom:1px solid var(--border-light);
  transition:background 0.15s; position:relative;
}
.insight-item:last-child { border-bottom:none; }
.insight-item::before {
  content:''; position:absolute; left:0; top:0; bottom:0;
  width:3px; opacity:0; transition:opacity 0.15s;
}
.bucket-section[data-kind="resume"]   .insight-item::before { background:var(--c-resume); }
.bucket-section[data-kind="warn"]     .insight-item::before { background:var(--c-warn); }
.bucket-section[data-kind="cmd"]      .insight-item::before { background:var(--c-cmd); }
.bucket-section[data-kind="decision"] .insight-item::before { background:var(--c-decision); }
.insight-item:hover { background:var(--surface-alt); }
.insight-item:hover::before { opacity:1; }
.insight-main { flex:1; min-width:0; padding-left:4px; }
.insight-content { font-size:14px; color:var(--text); line-height:1.6; margin-bottom:5px; }
.bucket-section[data-kind="cmd"] .insight-content {
  font-family:'JetBrains Mono',monospace; font-size:12px;
  background:var(--bg); border:1px solid var(--border);
  padding:6px 10px; color:var(--c-cmd);
  word-break:break-all; display:block; border-radius:2px;
}
.insight-meta {
  font-size:11px; color:var(--text-muted);
  font-family:'JetBrains Mono',monospace;
  display:flex; gap:10px; align-items:center; flex-wrap:wrap;
}
.insight-source { color:var(--accent); text-decoration:none; transition:opacity 0.15s; }
.insight-source:hover { opacity:0.7; }
.insight-ctx { font-size:12px; color:var(--text-secondary); font-style:italic; margin-top:4px; line-height:1.5; font-family:'Inter',sans-serif; }
.insight-actions { display:flex; gap:4px; align-items:flex-start; opacity:0; transition:opacity 0.15s; flex-shrink:0; }
.insight-item:hover .insight-actions { opacity:1; }
.insight-btn {
  width:28px; height:28px; background:none;
  border:1px solid var(--border); border-radius:3px;
  cursor:pointer; color:var(--text-muted);
  display:flex; align-items:center; justify-content:center; transition:all 0.15s;
}
.insight-btn:hover { border-color:var(--accent); color:var(--accent); }
.insight-btn.is-link { text-decoration:none; }

.empty-state {
  padding:60px 40px; text-align:center;
  color:var(--text-muted); font-size:14px;
  border:1px dashed var(--border); border-radius:3px;
}
.loading-state { padding:80px; text-align:center; color:var(--text-muted); font-size:14px; font-style:italic; }

@media(max-width:700px){
  .layout{grid-template-columns:1fr;}
  .sidebar{display:none;}
  .feed{padding:24px 16px 60px;}
  .feed-title{font-size:24px;}
}
</style>
</head>
<body>
<nav class="nav">
  <div class="nav-left">
    <a href="/collections" class="nav-back">← Collections</a>
    <div class="nav-divider"></div>
    <div class="nav-title" id="navTitle">Loading…</div>
  </div>
  <button class="theme-btn" onclick="toggleTheme()" title="Toggle dark mode">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor" stroke="none"/>
    </svg>
  </button>
</nav>

<div class="layout">
  <aside class="sidebar" id="chatsSidebar">
    <span class="sidebar-label">Chats in collection</span>
    <div id="chatsList"><div style="font-size:13px;color:var(--text-muted)">Loading…</div></div>
  </aside>

  <main class="feed">
    <div class="feed-header">
      <div class="feed-title" id="feedTitle">Loading…</div>
      <div class="feed-desc" id="feedDesc"></div>
      <div class="feed-subtitle" id="feedSubtitle"></div>
    </div>
    <div class="filter-bar" id="filterBar" style="display:none"></div>
    <div id="feedContent"><div class="loading-state">Loading insights…</div></div>
  </main>
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

var collectionId = window.location.pathname.split('/').pop();

var SECTION_MAP = {
  resume:   ['commitment','deferred'],
  warn:     ['dead_end','mistake'],
  cmd:      ['command','exact_value'],
  decision: ['decision','reasoning','solution','pattern','relationship','context']
};
var SECTION_META = {
  resume:   { label:'Resume',    desc:'open threads & deferred decisions' },
  warn:     { label:'Watch out', desc:'dead ends & mistakes' },
  cmd:      { label:'Commands',  desc:'copy-ready, exact values' },
  decision: { label:'Decisions', desc:'why we built it this way' }
};
var BUCKET_ORDER = ['resume','warn','cmd','decision'];

var allInsights = [];
var currentFilter = 'all';
var chatTitles = {};

function getBucket(type) {
  for (var k in SECTION_MAP) {
    if (SECTION_MAP[k].indexOf(type) !== -1) return k;
  }
  return 'decision';
}

function escapeHtml(t) {
  if (!t) return '';
  var d = document.createElement('div'); d.textContent = t; return d.innerHTML;
}

function formatDate(s) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

async function load() {
  try {
    var res = await fetch('/api/collections/' + collectionId);
    if (!res.ok) throw new Error('Collection not found');
    var data = await res.json();

    var col = data.collection;
    var chats = data.chats || [];
    var insightsGrouped = data.insights || {};

    // Build chatTitles map
    chats.forEach(function(c) { chatTitles[c.id] = c.title; });

    // Update nav + header
    document.title = col.title + ' — The Foundation';
    document.getElementById('navTitle').textContent = col.title;
    document.getElementById('feedTitle').textContent = col.title;
    if (col.description) {
      document.getElementById('feedDesc').textContent = col.description;
    }

    // Render sidebar chats
    var chatsHtml = chats.map(function(c) {
      return '<a class="chat-link" href="/view/' + c.id + '" title="' + escapeHtml(c.title) + '">' +
        escapeHtml(c.title) +
        '<div class="chat-link-meta">' + (c.message_count || 0) + ' msgs</div>' +
        '</a>';
    }).join('');
    document.getElementById('chatsList').innerHTML = chatsHtml || '<span style="font-size:13px;color:var(--text-muted)">No chats</span>';

    // Flatten insights, tag with chat info
    allInsights = [];
    Object.keys(insightsGrouped).forEach(function(type) {
      (insightsGrouped[type] || []).forEach(function(ins) {
        allInsights.push(Object.assign({}, ins, { type: ins.type || type }));
      });
    });

    // Sort by score desc
    allInsights.sort(function(a,b) { return (b.score||0) - (a.score||0); });

    // Counts
    var counts = { resume:0, warn:0, cmd:0, decision:0 };
    allInsights.forEach(function(ins) { counts[getBucket(ins.type)]++; });

    document.getElementById('feedSubtitle').textContent =
      allInsights.length + ' insights across ' + chats.length + ' chats';

    // Filter bar
    var filterBar = document.getElementById('filterBar');
    filterBar.style.display = 'flex';
    var filterLabels = { resume:'Resume', warn:'Watch out', cmd:'Commands', decision:'Decisions' };
    var filterHtml = '<button class="filter-btn active" data-filter="all" onclick="setFilter(&apos;all&apos;,this)">All <span class="filter-count">' + allInsights.length + '</span></button>';
    BUCKET_ORDER.forEach(function(k) {
      filterHtml += '<button class="filter-btn" data-filter="' + k + '" onclick="setFilter(&apos;' + k + '&apos;,this)">' +
        '<span class="filter-dot ' + k + '"></span>' +
        filterLabels[k] +
        ' <span class="filter-count">' + counts[k] + '</span>' +
        '</button>';
    });
    filterBar.innerHTML = filterHtml;

    renderFeed('all');
  } catch(err) {
    document.getElementById('feedContent').innerHTML =
      '<div class="empty-state">' + escapeHtml(err.message) + '</div>';
  }
}

function setFilter(filter, el) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
  el.classList.add('active');
  renderFeed(filter);
}

function renderFeed(filter) {
  var filtered = filter === 'all'
    ? allInsights
    : allInsights.filter(function(ins) { return getBucket(ins.type) === filter; });

  if (!filtered.length) {
    document.getElementById('feedContent').innerHTML =
      '<div class="empty-state">No insights in this category.</div>';
    return;
  }

  var buckets = { resume:[], warn:[], cmd:[], decision:[] };
  filtered.forEach(function(ins) { buckets[getBucket(ins.type)].push(ins); });

  var order = filter === 'all' ? BUCKET_ORDER : [filter];
  var html = '';

  order.forEach(function(kind) {
    var items = buckets[kind] || [];
    if (filter === 'all' && items.length === 0) return;
    var meta = SECTION_META[kind];

    html += '<div class="bucket-section' + (items.length === 0 ? ' collapsed' : '') + '" data-kind="' + kind + '">';
    html += '<div class="bucket-header" onclick="toggleBucket(this)">';
    html += '<span class="bucket-pip"></span>';
    html += '<span class="bucket-name">' + meta.label + '</span>';
    html += '<span class="bucket-desc">' + meta.desc + '</span>';
    html += '<span class="bucket-tally">' + items.length + '</span>';
    html += '<svg class="bucket-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
    html += '</div><div class="bucket-body">';

    items.forEach(function(ins) {
      var content = ins.content || '';
      var chatTitle = ins.chat_title || chatTitles[ins.chat_id] || 'Unknown';
      var chatId = ins.chat_id || '';
      var isCmd = kind === 'cmd';

      html += '<div class="insight-item">';
      html += '<div class="insight-main">';
      html += '<div class="insight-content">' + escapeHtml(content) + '</div>';
      if (ins.context) html += '<div class="insight-ctx">' + escapeHtml(ins.context) + '</div>';
      html += '<div class="insight-meta">';
      if (chatId) html += '<a class="insight-source" href="/view/' + chatId + '">' + escapeHtml(chatTitle) + '</a>';
      if (ins.score) html += '<span>' + (ins.score * 100).toFixed(0) + '%</span>';
      html += '</div></div>';
      html += '<div class="insight-actions">';
      if (isCmd) {
        var escaped = content.replace(/"/g, '&quot;');
        var safe = content.replace(/&/g,'&amp;').replace(/'/g,'&#39;');
html += '<button class="insight-btn" onclick="copyInsight(this,&apos;' + safe + '&apos;)" title="Copy">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
          '</button>';
      }
      if (chatId) {
        html += '<a class="insight-btn is-link" href="/view/' + chatId + '" title="Open chat">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' +
          '</a>';
      }
      html += '</div></div>';
    });

    html += '</div></div>';
  });

  document.getElementById('feedContent').innerHTML = html;
}

function toggleBucket(header) {
  header.closest('.bucket-section').classList.toggle('collapsed');
}

function copyInsight(btn, text) {
  navigator.clipboard.writeText(text).then(function() {
    btn.style.borderColor = 'var(--c-cmd)';
    btn.style.color = 'var(--c-cmd)';
    setTimeout(function() { btn.style.borderColor = ''; btn.style.color = ''; }, 1200);
  });
}

load();
</script>
</body>
</html>`;
}