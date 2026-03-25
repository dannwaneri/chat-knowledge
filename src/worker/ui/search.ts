export function getSearchHTML(): string {
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>The Foundation</title>
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

/* ── Nav ── */
.nav {
  position:sticky; top:0; z-index:100;
  background:var(--nav-bg); backdrop-filter:blur(10px);
  border-bottom:1px solid var(--border);
  padding:0 24px; height:52px;
  display:flex; align-items:center; justify-content:space-between;
  transition:var(--transition);
}
.nav-brand {
  font-family:'Lora',serif; font-size:15px; font-weight:600;
  color:var(--text); text-decoration:none;
}
.nav-links { display:flex; align-items:center; gap:4px; }
.nav-link {
  font-size:13px; color:var(--text-secondary); text-decoration:none;
  padding:5px 10px; border-radius:3px; transition:all 0.15s;
  font-family:'JetBrains Mono',monospace;
}
.nav-link:hover { color:var(--text); background:var(--surface); }
.nav-right { display:flex; align-items:center; gap:8px; }
.theme-btn {
  width:32px; height:32px; border-radius:50%;
  background:none; border:1px solid var(--border);
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  color:var(--text); transition:all 0.15s;
}
.theme-btn:hover { border-color:var(--accent); color:var(--accent); }
.auth-btn {
  font-size:12px; color:var(--text-secondary);
  background:none; border:1px solid var(--border);
  padding:4px 10px; border-radius:3px; cursor:pointer;
  font-family:'JetBrains Mono',monospace; transition:all 0.15s;
}
.auth-btn:hover { border-color:var(--accent); color:var(--accent); }
.auth-btn.is-owner { border-color:var(--c-cmd); color:var(--c-cmd); }

/* ── Layout ── */
.layout {
  display:grid;
  grid-template-columns:220px 1fr;
  min-height:calc(100vh - 52px);
}

/* ── Sidebar ── */
.sidebar {
  border-right:1px solid var(--border);
  padding:32px 20px;
  position:sticky; top:52px;
  height:calc(100vh - 52px);
  overflow-y:auto;
  transition:var(--transition);
}
.sidebar-section { margin-bottom:32px; }
.sidebar-label {
  font-size:10px; font-weight:600; letter-spacing:0.14em;
  text-transform:uppercase; color:var(--text-muted);
  font-family:'JetBrains Mono',monospace;
  margin-bottom:12px; display:block;
}
.stat-row {
  display:flex; justify-content:space-between; align-items:baseline;
  padding:6px 0; border-bottom:1px solid var(--border-light);
  font-size:13px;
}
.stat-row:last-child { border-bottom:none; }
.stat-label { color:var(--text-secondary); }
.stat-value {
  font-family:'JetBrains Mono',monospace; font-size:12px;
  color:var(--text); font-weight:500;
}
.bucket-pill {
  display:flex; align-items:center; gap:8px;
  padding:6px 8px; border-radius:3px;
  font-size:13px; color:var(--text-secondary);
  cursor:pointer; text-decoration:none;
  transition:all 0.15s; margin-bottom:2px;
}
.bucket-pill:hover { background:var(--surface); color:var(--text); }
.bucket-pill.active { background:var(--surface); color:var(--text); }
.bp-dot {
  width:7px; height:7px; border-radius:50%; flex-shrink:0;
}
.bp-dot.resume   { background:var(--c-resume); box-shadow:0 0 5px var(--c-resume); }
.bp-dot.warn     { background:var(--c-warn);   box-shadow:0 0 5px var(--c-warn); }
.bp-dot.cmd      { background:var(--c-cmd);    box-shadow:0 0 5px var(--c-cmd); }
.bp-dot.decision { background:var(--c-decision);box-shadow:0 0 5px var(--c-decision); }
.bp-count {
  margin-left:auto; font-family:'JetBrains Mono',monospace;
  font-size:11px; color:var(--text-muted);
}
.collection-link {
  display:block; padding:6px 8px; border-radius:3px;
  font-size:13px; color:var(--text-secondary); text-decoration:none;
  transition:all 0.15s; white-space:nowrap; overflow:hidden;
  text-overflow:ellipsis;
}
.collection-link:hover { background:var(--surface); color:var(--text); }

/* ── Main feed ── */
.feed { padding:32px 36px 80px; min-width:0; }
.feed-header {
  display:flex; justify-content:space-between; align-items:flex-end;
  margin-bottom:28px; padding-bottom:20px;
  border-bottom:2px solid var(--text);
}
.feed-title {
  font-family:'Lora',Georgia,serif;
  font-size:36px; font-weight:600; color:var(--text);
  letter-spacing:-0.5px; line-height:1.1;
}
.feed-subtitle {
  font-size:13px; color:var(--text-muted);
  font-family:'JetBrains Mono',monospace; margin-top:6px;
}
.feed-actions { display:flex; gap:8px; align-items:center; }
.feed-search-btn {
  display:flex; align-items:center; gap:6px;
  padding:7px 14px; background:none;
  border:1px solid var(--border); color:var(--text-secondary);
  font-size:13px; cursor:pointer; border-radius:3px;
  font-family:'Inter',sans-serif; transition:all 0.15s;
  text-decoration:none;
}
.feed-search-btn:hover { border-color:var(--accent); color:var(--text); }

/* ── Bucket section ── */
.bucket-section { margin-bottom:8px; }
.bucket-header {
  display:flex; align-items:center; gap:10px;
  padding:11px 16px; background:var(--surface);
  border:1px solid var(--border); cursor:pointer;
  transition:all 0.15s; user-select:none;
}
.bucket-header:hover { border-color:var(--border); background:var(--surface-alt); }
.bucket-pip {
  width:8px; height:8px; border-radius:50%; flex-shrink:0;
}
.bucket-section[data-kind="resume"]   .bucket-pip { background:var(--c-resume);   box-shadow:0 0 6px var(--c-resume); }
.bucket-section[data-kind="warn"]     .bucket-pip { background:var(--c-warn);     box-shadow:0 0 6px var(--c-warn); }
.bucket-section[data-kind="cmd"]      .bucket-pip { background:var(--c-cmd);      box-shadow:0 0 6px var(--c-cmd); }
.bucket-section[data-kind="decision"] .bucket-pip { background:var(--c-decision); box-shadow:0 0 6px var(--c-decision); }
.bucket-name {
  font-size:12px; font-weight:600; letter-spacing:0.1em;
  text-transform:uppercase; font-family:'JetBrains Mono',monospace;
}
.bucket-section[data-kind="resume"]   .bucket-name { color:var(--c-resume); }
.bucket-section[data-kind="warn"]     .bucket-name { color:var(--c-warn); }
.bucket-section[data-kind="cmd"]      .bucket-name { color:var(--c-cmd); }
.bucket-section[data-kind="decision"] .bucket-name { color:var(--c-decision); }
.bucket-desc { font-size:12px; color:var(--text-muted); margin-left:4px; }
.bucket-tally {
  margin-left:auto; font-size:11px; color:var(--text-muted);
  font-family:'JetBrains Mono',monospace;
}
.bucket-chevron {
  width:14px; height:14px; color:var(--text-muted);
  transition:transform 0.2s; flex-shrink:0; margin-left:4px;
}
.bucket-section.collapsed .bucket-chevron { transform:rotate(-90deg); }
.bucket-section.collapsed .bucket-body { display:none; }
.bucket-body { border:1px solid var(--border); border-top:none; }

/* ── Insight items ── */
.insight-item {
  display:flex; align-items:flex-start; gap:0;
  padding:14px 16px; border-bottom:1px solid var(--border-light);
  transition:background 0.15s; position:relative;
}
.insight-item:last-child { border-bottom:none; }
.insight-item::before {
  content:''; position:absolute; left:0; top:0; bottom:0;
  width:3px; opacity:0;
  transition:opacity 0.15s;
}
.bucket-section[data-kind="resume"]   .insight-item::before { background:var(--c-resume); }
.bucket-section[data-kind="warn"]     .insight-item::before { background:var(--c-warn); }
.bucket-section[data-kind="cmd"]      .insight-item::before { background:var(--c-cmd); }
.bucket-section[data-kind="decision"] .insight-item::before { background:var(--c-decision); }
.insight-item:hover { background:var(--surface-alt); }
.insight-item:hover::before { opacity:1; }
.insight-main { flex:1; min-width:0; padding-left:4px; }
.insight-content {
  font-size:14px; color:var(--text); line-height:1.6;
  margin-bottom:5px;
}
.bucket-section[data-kind="cmd"] .insight-content {
  font-family:'JetBrains Mono',monospace; font-size:12px;
  background:var(--bg); border:1px solid var(--border);
  padding:6px 10px; color:var(--c-cmd);
  word-break:break-all; display:block; border-radius:2px;
}
.insight-meta {
  font-size:11px; color:var(--text-muted);
  font-family:'JetBrains Mono',monospace;
  display:flex; gap:10px; align-items:center;
}
.insight-source {
  color:var(--accent); text-decoration:none;
  transition:opacity 0.15s;
}
.insight-source:hover { opacity:0.7; }
.insight-actions {
  display:flex; gap:4px; align-items:flex-start;
  opacity:0; transition:opacity 0.15s; flex-shrink:0;
}
.insight-item:hover .insight-actions { opacity:1; }
.insight-btn {
  width:28px; height:28px; background:none;
  border:1px solid var(--border); border-radius:3px;
  cursor:pointer; color:var(--text-muted);
  display:flex; align-items:center; justify-content:center;
  transition:all 0.15s; flex-shrink:0;
}
.insight-btn:hover { border-color:var(--accent); color:var(--accent); }

/* ── Empty / loading states ── */
.feed-loading {
  padding:80px 40px; text-align:center;
  color:var(--text-muted); font-size:14px; font-style:italic;
}
.feed-empty {
  padding:60px 40px; text-align:center;
  color:var(--text-muted); font-size:14px;
  border:1px dashed var(--border); border-radius:3px;
}
.feed-empty strong { display:block; font-size:16px; color:var(--text-secondary); margin-bottom:8px; }

/* ── Search overlay ── */
.search-overlay {
  display:none; position:fixed; inset:0; z-index:200;
  background:rgba(0,0,0,0.5); backdrop-filter:blur(4px);
  align-items:flex-start; justify-content:center;
  padding-top:15vh;
}
.search-overlay.open { display:flex; }
.search-modal {
  width:100%; max-width:600px; background:var(--surface);
  border:1px solid var(--border);
  box-shadow:0 20px 60px rgba(0,0,0,0.15);
}
.search-input-wrap { display:flex; align-items:center; padding:16px 20px; border-bottom:1px solid var(--border); gap:12px; }
.search-icon { color:var(--text-muted); flex-shrink:0; }
.search-input {
  flex:1; background:none; border:none; outline:none;
  font-size:16px; color:var(--text); font-family:'Inter',sans-serif;
}
.search-input::placeholder { color:var(--text-muted); }
.search-kbd {
  font-size:11px; color:var(--text-muted); font-family:'JetBrains Mono',monospace;
  border:1px solid var(--border); padding:2px 6px; border-radius:2px;
  cursor:pointer; flex-shrink:0; background:var(--surface-alt);
}
.search-results { max-height:360px; overflow-y:auto; }
.search-result-item {
  display:block; padding:12px 20px; text-decoration:none;
  color:inherit; border-bottom:1px solid var(--border-light);
  transition:background 0.1s; cursor:pointer;
}
.search-result-item:last-child { border-bottom:none; }
.search-result-item:hover { background:var(--surface-alt); }
.sri-title { font-size:14px; font-weight:500; color:var(--text); margin-bottom:3px; }
.sri-snippet { font-size:12px; color:var(--text-secondary); line-height:1.5; }
.sri-meta { font-size:11px; color:var(--text-muted); font-family:'JetBrains Mono',monospace; margin-top:4px; }
.search-empty { padding:40px; text-align:center; color:var(--text-muted); font-size:14px; font-style:italic; }
.search-loading { padding:40px; text-align:center; color:var(--text-muted); font-size:14px; font-style:italic; }

/* ── Mobile ── */
@media(max-width:700px){
  .layout { grid-template-columns:1fr; }
  .sidebar { display:none; }
  .feed { padding:24px 16px 60px; }
  .feed-title { font-size:28px; }
  .feed-subtitle { display:none; }
}
</style>
</head>
<body>
<nav class="nav">
  <a class="nav-brand" href="/">The Foundation</a>
  <div class="nav-links">
    <a class="nav-link" href="/collections">/collections</a>
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

<div class="layout">

  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-section">
      <span class="sidebar-label">Stats</span>
      <div class="stat-row"><span class="stat-label">chats</span><span class="stat-value" id="statChats">—</span></div>
      <div class="stat-row"><span class="stat-label">insights</span><span class="stat-value" id="statInsights">—</span></div>
      <div class="stat-row"><span class="stat-label">collections</span><span class="stat-value" id="statCollections">—</span></div>
    </div>

    <div class="sidebar-section">
      <span class="sidebar-label">Insight types</span>
      <a class="bucket-pill active" data-filter="all" onclick="setFilter('all',this)">
        <span class="bp-dot" style="background:var(--text-muted)"></span>
        All
        <span class="bp-count" id="cntAll">—</span>
      </a>
      <a class="bucket-pill" data-filter="resume" onclick="setFilter('resume',this)">
        <span class="bp-dot resume"></span>
        Resume
        <span class="bp-count" id="cntResume">—</span>
      </a>
      <a class="bucket-pill" data-filter="warn" onclick="setFilter('warn',this)">
        <span class="bp-dot warn"></span>
        Watch out
        <span class="bp-count" id="cntWarn">—</span>
      </a>
      <a class="bucket-pill" data-filter="cmd" onclick="setFilter('cmd',this)">
        <span class="bp-dot cmd"></span>
        Commands
        <span class="bp-count" id="cntCmd">—</span>
      </a>
      <a class="bucket-pill" data-filter="decision" onclick="setFilter('decision',this)">
        <span class="bp-dot decision"></span>
        Decisions
        <span class="bp-count" id="cntDecision">—</span>
      </a>
    </div>

    <div class="sidebar-section">
      <span class="sidebar-label">Collections</span>
      <div id="sidebarCollections"><span style="font-size:13px;color:var(--text-muted)">Loading...</span></div>
    </div>
  </aside>

  <!-- Main feed -->
  <main class="feed">
    <div class="feed-header">
      <div>
        <div class="feed-title">Knowledge feed</div>
        <div class="feed-subtitle" id="feedSubtitle">loading insights…</div>
      </div>
      <div class="feed-actions">
        <button class="feed-search-btn" onclick="openSearch()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          Search
          <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted);margin-left:2px">⌘K</span>
        </button>
      </div>
    </div>

    <div id="feedContent">
      <div class="feed-loading">Loading insights across all conversations…</div>
    </div>
  </main>
</div>

<!-- Search overlay -->
<div class="search-overlay" id="searchOverlay" onclick="closeSearchOnBg(event)">
  <div class="search-modal">
    <div class="search-input-wrap">
      <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input class="search-input" id="searchInput" placeholder="Search conversations…" autocomplete="off">
      <span class="search-kbd" onclick="closeSearch()">esc</span>
    </div>
    <div class="search-results" id="searchResults">
      <div class="search-empty">Type to search your conversations</div>
    </div>
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
var SECTION_META = {
  resume:   { label:'Resume',     desc:'open threads & deferred decisions' },
  warn:     { label:'Watch out',  desc:'dead ends & mistakes' },
  cmd:      { label:'Commands',   desc:'copy-ready, exact values' },
  decision: { label:'Decisions',  desc:'why we built it this way' }
};
var BUCKET_ORDER = ['resume','warn','cmd','decision'];

var allInsights = [];
var currentFilter = 'all';

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

// ── Load all insights across all chats ──
async function loadFeed() {
  try {
    var endpoint = getApiKey() ? '/api/private/chats' : '/chats';
    var headers = { 'Accept': 'application/json' };
    if (getApiKey()) headers['X-API-Key'] = getApiKey();
    var res = await fetch(endpoint, { headers: headers });
    var data = await res.json();
    var chats = data.chats || [];

    // Update stats
    document.getElementById('statChats').textContent = chats.length;

    // Load insights for each chat in parallel
    var promises = chats.map(function(chat) {
      return fetch('/api/insights/' + chat.id)
        .then(function(r) { return r.json(); })
        .then(function(d) {
          var raw = d.insights || {};
          var items = [];
          if (Array.isArray(raw)) {
            items = raw;
          } else {
            Object.keys(raw).forEach(function(type) {
              (raw[type] || []).forEach(function(ins) {
                ins.type = ins.type || type;
                items.push(ins);
              });
            });
          }
          items.forEach(function(ins) {
            ins._chatTitle = chat.title || 'Untitled';
            ins._chatId = chat.id;
          });
          return items;
        })
        .catch(function() { return []; });
    });

    var results = await Promise.all(promises);
    allInsights = results.reduce(function(acc, arr) { return acc.concat(arr); }, []);

    // Sort by score desc
    allInsights.sort(function(a,b) { return (b.score||0) - (a.score||0); });

    updateCounts();
    renderFeed(currentFilter);

    // Load collections sidebar
    loadCollections(chats.length);
  } catch(err) {
    document.getElementById('feedContent').innerHTML =
      '<div class="feed-empty"><strong>Could not load insights<\/strong>' + escapeHtml(err.message) + '<\/div>';
  }
}

function updateCounts() {
  var counts = { resume:0, warn:0, cmd:0, decision:0 };
  allInsights.forEach(function(ins) {
    var b = getBucket(ins.type || '');
    counts[b] = (counts[b] || 0) + 1;
  });
  document.getElementById('statInsights').textContent = allInsights.length;
  document.getElementById('cntAll').textContent = allInsights.length;
  document.getElementById('cntResume').textContent = counts.resume;
  document.getElementById('cntWarn').textContent = counts.warn;
  document.getElementById('cntCmd').textContent = counts.cmd;
  document.getElementById('cntDecision').textContent = counts.decision;
}

function renderFeed(filter) {
  var filtered = filter === 'all'
    ? allInsights
    : allInsights.filter(function(ins) { return getBucket(ins.type||'') === filter; });

  var subtitle = filtered.length + ' insight' + (filtered.length !== 1 ? 's' : '');
  if (filter !== 'all') subtitle += ' · ' + SECTION_META[filter].label;
  document.getElementById('feedSubtitle').textContent = subtitle;

  if (!filtered.length) {
    document.getElementById('feedContent').innerHTML =
      '<div class="feed-empty"><strong>No insights yet<\/strong>Run extraction on your chats to surface insights here.<\/div>';
    return;
  }

  // Group by bucket
  var buckets = { resume:[], warn:[], cmd:[], decision:[] };
  filtered.forEach(function(ins) {
    var b = getBucket(ins.type||'');
    buckets[b].push(ins);
  });

  var html = '';
  var order = filter === 'all' ? BUCKET_ORDER : [filter];

  order.forEach(function(kind) {
    var items = buckets[kind] || [];
    if (filter === 'all' && items.length === 0) return;
    var meta = SECTION_META[kind];
    var collapsed = items.length === 0 ? ' collapsed' : '';

    html += '<div class="bucket-section' + collapsed + '" data-kind="' + kind + '">';
    html += '<div class="bucket-header" onclick="toggleBucket(this)">';
    html += '<span class="bucket-pip"><\/span>';
    html += '<span class="bucket-name">' + meta.label + '<\/span>';
    html += '<span class="bucket-desc">' + meta.desc + '<\/span>';
    html += '<span class="bucket-tally">' + items.length + '<\/span>';
    html += '<svg class="bucket-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"\/><\/svg>';
    html += '<\/div>';
    html += '<div class="bucket-body">';

    items.forEach(function(ins) {
      var content = ins.content || '';
      var isCmd = kind === 'cmd';
      html += '<div class="insight-item">';
      html += '<div class="insight-main">';
      html += '<div class="insight-content">' + escapeHtml(content) + '<\/div>';
      html += '<div class="insight-meta">';
      html += '<a class="insight-source" href="/view/' + ins._chatId + '">' + escapeHtml(ins._chatTitle) + '<\/a>';
      if (ins.score) html += '<span>' + (ins.score * 100).toFixed(0) + '%<\/span>';
      html += '<\/div>';
      html += '<\/div>';
      html += '<div class="insight-actions">';
      if (isCmd) {
        html += '<button class="insight-btn" data-copy-content data-content="' + escapeHtml(content) + '" onclick="copyInsight(this)" title="Copy">';
        html += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"\/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"\/><\/svg>';
        html += '<\/button>';
      }
      html += '<a class="insight-btn" href="/view/' + ins._chatId + '" title="Open chat">';
      html += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"\/><polyline points="15 3 21 3 21 9"\/><line x1="10" y1="14" x2="21" y2="3"\/><\/svg>';
      html += '<\/a>';
      html += '<\/div>';
      html += '<\/div>';
    });

    html += '<\/div><\/div>';
  });

  document.getElementById('feedContent').innerHTML = html;
}

function toggleBucket(header) {
  header.closest('.bucket-section').classList.toggle('collapsed');
}

function copyInsight(btn) {
  var text = btn.getAttribute('data-content') || '';
  navigator.clipboard.writeText(text).then(function() {
    btn.style.borderColor = 'var(--c-cmd)';
    btn.style.color = 'var(--c-cmd)';
    setTimeout(function() {
      btn.style.borderColor = '';
      btn.style.color = '';
    }, 1200);
  });
}

function setFilter(filter, el) {
  currentFilter = filter;
  document.querySelectorAll('.bucket-pill').forEach(function(p) { p.classList.remove('active'); });
  el.classList.add('active');
  renderFeed(filter);
}

// ── Collections sidebar ──
async function loadCollections(chatCount) {
  try {
    var headers = {};
    if (getApiKey()) headers['X-API-Key'] = getApiKey();
    var res = await fetch('/api/collections', { headers: headers });
    var data = await res.json();
    var cols = data.collections || [];
    document.getElementById('statCollections').textContent = cols.length;
    var el = document.getElementById('sidebarCollections');
    if (!cols.length) {
      el.innerHTML = '<span style="font-size:13px;color:var(--text-muted)">No collections yet<\/span>';
      return;
    }
    el.innerHTML = cols.map(function(c) {
      return '<a class="collection-link" href="/collections/' + c.id + '">' + escapeHtml(c.title) + '</a>';
    }).join('');
  } catch(e) {
    document.getElementById('sidebarCollections').innerHTML =
      '<span style="font-size:13px;color:var(--text-muted)">—<\/span>';
  }
}

// ── Search overlay ──
var searchTimer = null;

function openSearch() {
  document.getElementById('searchOverlay').classList.add('open');
  document.getElementById('searchInput').focus();
}

function closeSearch() {
  document.getElementById('searchOverlay').classList.remove('open');
  document.getElementById('searchInput').value = '';
  document.getElementById('searchResults').innerHTML = '<div class="search-empty">Type to search your conversations<\/div>';
}

function closeSearchOnBg(e) {
  if (e.target === document.getElementById('searchOverlay')) closeSearch();
}

document.addEventListener('keydown', function(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
  if (e.key === 'Escape') closeSearch();
});

document.getElementById('searchInput').addEventListener('input', function(e) {
  clearTimeout(searchTimer);
  var q = e.target.value.trim();
  if (!q) {
    document.getElementById('searchResults').innerHTML = '<div class="search-empty">Type to search your conversations<\/div>';
    return;
  }
  document.getElementById('searchResults').innerHTML = '<div class="search-loading">Searching…<\/div>';
  searchTimer = setTimeout(function() { doSearch(q); }, 300);
});

async function doSearch(query) {
  try {
    var res = await fetch('/search', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ query: query, maxResults: 10 })
    });
    var data = await res.json();
    var results = data.results || [];
    if (!results.length) {
      document.getElementById('searchResults').innerHTML = '<div class="search-empty">No results for "' + escapeHtml(query) + '"<\/div>';
      return;
    }
    var html = results.map(function(r) {
      var msgIndex = (r.metadata && r.metadata.message_index !== undefined) ? r.metadata.message_index : '';
      var url = '/view/' + r.chatId + (msgIndex !== '' ? '?msg=' + msgIndex : '');
      var raw = r.content || '';
      var cleaned = raw;
if (cleaned.startsWith('Q: ')) cleaned = cleaned.slice(3);
var aIdx = cleaned.indexOf('\\nA: ');
if (aIdx !== -1) cleaned = cleaned.slice(0, aIdx) + ' \u2014 ' + cleaned.slice(aIdx + 5);
while (cleaned.indexOf('**') !== -1) cleaned = cleaned.replace('**', '');
cleaned = cleaned.trim();
      var snippet = cleaned.substring(0,160) + (cleaned.length > 160 ? '…' : '');
      return '<a class="search-result-item" href="' + url + '" onclick="closeSearch()">' +
        '<div class="sri-title">' + escapeHtml(r.chatTitle) + '<\/div>' +
        '<div class="sri-snippet">' + escapeHtml(snippet) + '<\/div>' +
        '<div class="sri-meta">' + (r.relevance * 100).toFixed(0) + '% match · ' + formatDate(r.chatMetadata && r.chatMetadata.importedAt ? r.chatMetadata.importedAt : '') + '<\/div>' +
        '<\/a>';
    }).join('');
    document.getElementById('searchResults').innerHTML = html;
  } catch(err) {
    document.getElementById('searchResults').innerHTML = '<div class="search-empty">Search failed: ' + escapeHtml(err.message) + '<\/div>';
  }
}

renderAuthBtn();
loadFeed();
<\/script>
</body>
</html>`;
}