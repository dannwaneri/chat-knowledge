export function getChatHTML(): string {
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>The Foundation</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css">
<style>
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

/* ── Theme tokens ─────────────────────────────── */
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
  --code-bg:       #1a1a2e;
  --user-border:   #8b4513;
  --asst-border:   #2a2a2a;
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
  --code-bg:       #0d0e10;
  --user-border:   #c0693a;
  --asst-border:   #404448;
  --c-resume:      #4a9eff;
  --c-warn:        #e8724a;
  --c-cmd:         #3ec97e;
  --c-decision:    #a78bfa;
  --nav-bg:        rgba(17,18,19,0.96);
}

/* ── Base ─────────────────────────────────────── */
body { font-family:'Inter',-apple-system,sans-serif; font-size:15px; line-height:1.7; color:var(--text); background:var(--bg); min-height:100vh; transition:var(--transition); }

/* ── Nav ──────────────────────────────────────── */
.nav { position:sticky; top:0; z-index:100; background:var(--nav-bg); backdrop-filter:blur(10px); border-bottom:1px solid var(--border); padding:0 24px; height:52px; display:flex; align-items:center; justify-content:space-between; gap:16px; transition:var(--transition); }
.nav-left { display:flex; align-items:center; gap:16px; min-width:0; }
.nav-back { color:var(--text-secondary); text-decoration:none; font-size:13px; font-weight:500; white-space:nowrap; transition:color 0.15s; }
.nav-back:hover { color:var(--accent); }
.nav-divider { width:1px; height:16px; background:var(--border); flex-shrink:0; }
.nav-title { font-family:'Lora',serif; font-size:14px; font-weight:500; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.nav-meta { font-size:12px; color:var(--text-muted); white-space:nowrap; flex-shrink:0; }
.nav-actions { display:flex; align-items:center; gap:8px; flex-shrink:0; }
.nav-btn { font-size:12px; color:var(--text-secondary); background:none; border:1px solid var(--border); padding:4px 10px; border-radius:3px; cursor:pointer; font-family:inherit; white-space:nowrap; transition:all 0.15s; }
.nav-btn:hover { color:var(--accent); border-color:var(--accent); }
.theme-btn { width:32px; height:32px; border-radius:50%; background:none; border:1px solid var(--border); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:15px; transition:all 0.15s; flex-shrink:0; }
.theme-btn:hover { border-color:var(--accent); }
/* no icon swap needed — half-circle works in both themes */

/* ── Container ────────────────────────────────── */
.container { max-width:780px; margin:0 auto; padding:32px 20px 80px; }

/* ── Chat header ──────────────────────────────── */
.conv-header { margin-bottom:24px; }
.conv-title { font-family:'Lora',Georgia,serif; font-size:26px; font-weight:600; color:var(--text); line-height:1.35; letter-spacing:-0.3px; margin-bottom:10px; }
.conv-stats { display:flex; align-items:center; gap:12px; font-size:12px; color:var(--text-muted); font-weight:300; flex-wrap:wrap; }
.conv-stats span { display:flex; align-items:center; gap:4px; }

/* ── Insights (PRIMARY — always visible) ─────── */
.insights-wrap { margin-bottom:28px; }
.ip-section { border:1px solid var(--border-light); border-radius:5px; overflow:hidden; background:var(--surface); margin-bottom:3px; transition:var(--transition); }
.ip-header { display:flex; align-items:center; gap:9px; padding:10px 14px; cursor:pointer; user-select:none; transition:background 0.1s; border-bottom:1px solid var(--border-light); }
.ip-header:hover { background:var(--surface-alt); }
.ip-section.collapsed .ip-header { border-bottom-color:transparent; }
.ip-section.collapsed .ip-body { display:none; }
.ip-pip { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.ip-section[data-kind="resume"]   .ip-pip { background:var(--c-resume);   box-shadow:0 0 6px var(--c-resume); }
.ip-section[data-kind="warn"]     .ip-pip { background:var(--c-warn);     box-shadow:0 0 6px var(--c-warn); }
.ip-section[data-kind="cmd"]      .ip-pip { background:var(--c-cmd);      box-shadow:0 0 6px var(--c-cmd); }
.ip-section[data-kind="decision"] .ip-pip { background:var(--c-decision); box-shadow:0 0 6px var(--c-decision); }
.ip-label { font-size:11px; font-weight:600; letter-spacing:0.07em; text-transform:uppercase; font-family:'JetBrains Mono',monospace; }
.ip-section[data-kind="resume"]   .ip-label { color:var(--c-resume); }
.ip-section[data-kind="warn"]     .ip-label { color:var(--c-warn); }
.ip-section[data-kind="cmd"]      .ip-label { color:var(--c-cmd); }
.ip-section[data-kind="decision"] .ip-label { color:var(--c-decision); }
.ip-desc  { font-size:12px; color:var(--text-muted); }
.ip-count { margin-left:auto; font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--text-muted); }
.ip-chevron { font-size:9px; color:var(--text-muted); transition:transform 0.18s; }
.ip-section.collapsed .ip-chevron { transform:rotate(-90deg); }
.ip-body { display:flex; flex-direction:column; }
.ip-item { display:grid; grid-template-columns:1fr auto; gap:10px; padding:11px 14px; border-bottom:1px solid var(--border-light); position:relative; transition:background 0.1s; }
.ip-item:last-child { border-bottom:none; }
.ip-item:hover { background:var(--surface-alt); }
.ip-item::before { content:''; position:absolute; left:0; top:0; bottom:0; width:2px; opacity:0; transition:opacity 0.15s; }
.ip-item:hover::before { opacity:1; }
.ip-section[data-kind="resume"]   .ip-item::before { background:var(--c-resume); }
.ip-section[data-kind="warn"]     .ip-item::before { background:var(--c-warn); }
.ip-section[data-kind="cmd"]      .ip-item::before { background:var(--c-cmd); }
.ip-section[data-kind="decision"] .ip-item::before { background:var(--c-decision); }
.ip-main { display:flex; flex-direction:column; gap:4px; min-width:0; }
.ip-content { font-size:13.5px; color:var(--text); line-height:1.55; }
.ip-section[data-kind="cmd"] .ip-content { font-family:'JetBrains Mono',monospace; font-size:12px; background:var(--bg); border:1px solid var(--border); border-radius:3px; padding:7px 10px; color:var(--c-cmd); word-break:break-all; display:block; }
.ip-ctx { font-size:12px; color:var(--text-muted); font-style:italic; line-height:1.4; }
.ip-actions { display:flex; align-items:flex-start; padding-top:1px; opacity:0; transition:opacity 0.15s; }
.ip-item:hover .ip-actions { opacity:1; }
.ip-copy { background:none; border:1px solid var(--border); border-radius:3px; color:var(--text-muted); font-family:'JetBrains Mono',monospace; font-size:10px; padding:3px 8px; cursor:pointer; transition:all 0.1s; white-space:nowrap; }
.ip-copy:hover { border-color:var(--c-cmd); color:var(--c-cmd); }
.ip-copy.copied { border-color:var(--c-cmd); color:var(--c-cmd); }
.ip-empty { padding:14px 16px; font-size:13px; color:var(--text-muted); font-style:italic; }
.ip-loading { padding:32px; text-align:center; color:var(--text-muted); font-size:13px; }
.ip-footer { display:flex; justify-content:space-between; padding:10px 2px 0; font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--text-muted); }

/* ── Summary (SECONDARY — collapsed accordion) ─ */
.summary-wrap { margin-bottom:24px; }
.summary-accordion { background:var(--surface); border:1px solid var(--border-light); border-radius:5px; overflow:hidden; transition:var(--transition); }
.summary-trigger { display:flex; align-items:center; gap:10px; padding:10px 14px; cursor:pointer; user-select:none; transition:background 0.1s; }
.summary-trigger:hover { background:var(--surface-alt); }
.summary-trigger-label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:1.2px; color:var(--accent); font-family:'JetBrains Mono',monospace; }
.summary-trigger-hint { font-size:12px; color:var(--text-muted); }
.summary-chevron { margin-left:auto; font-size:9px; color:var(--text-muted); transition:transform 0.18s; }
.summary-accordion.open .summary-chevron { transform:rotate(180deg); }
.summary-body { display:none; padding:16px 18px; border-top:1px solid var(--border-light); }
.summary-accordion.open .summary-body { display:block; }
.summary-text { font-size:14px; color:var(--text-secondary); line-height:1.75; font-style:italic; }

/* ── Conversation (TERTIARY — hidden unless expanded or ?msg=) */
.conv-wrap { display:none; }
.conv-wrap.visible { display:block; }
.conv-reveal { display:flex; align-items:center; gap:10px; margin-bottom:20px; }
.conv-reveal-line { flex:1; height:1px; background:var(--border-light); }
.conv-reveal-btn { font-size:12px; color:var(--text-muted); background:none; border:1px solid var(--border-light); border-radius:3px; padding:4px 12px; cursor:pointer; font-family:inherit; transition:all 0.15s; white-space:nowrap; }
.conv-reveal-btn:hover { color:var(--accent); border-color:var(--accent); }

/* ── Messages ─────────────────────────────────── */
.messages { display:flex; flex-direction:column; gap:2px; }
.message { position:relative; padding:20px 24px; background:var(--surface); border:1px solid var(--border-light); transition:border-color 0.15s, background 0.15s; }
.message:hover { border-color:var(--border); }
.message.user { border-left:3px solid var(--user-border); background:var(--surface-alt); }
.message.assistant { border-left:3px solid var(--asst-border); }
.message:first-child { border-radius:4px 4px 0 0; }
.message:last-child  { border-radius:0 0 4px 4px; }
.message:only-child  { border-radius:4px; }
@keyframes highlight-pulse      { 0%,60%{background:#fff8e6;border-color:#c8a050}100%{background:var(--surface);border-color:var(--border-light)} }
@keyframes highlight-pulse-dark { 0%,60%{background:#2a2010;border-color:#7a6030}100%{background:var(--surface);border-color:var(--border-light)} }
.message.highlighted { scroll-margin-top:72px; }
[data-theme="light"] .message.highlighted { animation:highlight-pulse 2.4s ease-out forwards; }
[data-theme="dark"]  .message.highlighted { animation:highlight-pulse-dark 2.4s ease-out forwards; }
.message-role { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1.2px; margin-bottom:10px; }
.message.user .message-role      { color:var(--user-border); }
.message.assistant .message-role { color:var(--text-muted); }
.message-body { font-size:15px; line-height:1.75; color:var(--text); }
.message-body p { margin-bottom:14px; }
.message-body p:last-child { margin-bottom:0; }
.message-body strong { font-weight:600; }
.message-body em { font-style:italic; }
.message-body h1,.message-body h2,.message-body h3 { font-family:'Lora',serif; font-weight:600; margin:20px 0 10px; line-height:1.4; }
.message-body h1{font-size:20px}.message-body h2{font-size:17px}.message-body h3{font-size:15px}
.message-body ul,.message-body ol { padding-left:20px; margin-bottom:14px; }
.message-body li { margin-bottom:6px; line-height:1.65; }
.message-body blockquote { border-left:3px solid var(--border); padding-left:16px; color:var(--text-secondary); margin:16px 0; font-style:italic; }
.message-body a { color:var(--accent); text-decoration:none; }
.message-body a:hover { text-decoration:underline; }
.message-body code:not(pre code) { font-family:'JetBrains Mono',monospace; font-size:12.5px; background:var(--surface-alt); color:var(--accent); padding:2px 6px; border-radius:3px; border:1px solid var(--border-light); }
.message-body table { width:100%; border-collapse:collapse; margin:16px 0; font-size:14px; }
.message-body th { background:var(--bg); padding:8px 12px; text-align:left; font-weight:600; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-secondary); border-bottom:2px solid var(--border); }
.message-body td { padding:8px 12px; border-bottom:1px solid var(--border-light); vertical-align:top; }
.message-body tr:last-child td { border-bottom:none; }

/* ── Code blocks ──────────────────────────────── */
.code-block { margin:16px 0; border-radius:6px; overflow:hidden; border:1px solid #2a2a3e; box-shadow:0 4px 16px rgba(0,0,0,0.15); }
.code-header { display:flex; justify-content:space-between; align-items:center; background:#16162a; padding:8px 14px; border-bottom:1px solid #2a2a3e; }
.code-lang { font-family:'JetBrains Mono',monospace; font-size:11px; color:#7c7cad; font-weight:500; }
.code-copy { font-size:11px; color:#7c7cad; background:none; border:none; cursor:pointer; font-family:'Inter',sans-serif; padding:2px 8px; border-radius:3px; transition:all 0.15s; }
.code-copy:hover { color:#fff; background:rgba(255,255,255,0.1); }
.code-block pre { margin:0; padding:16px; background:var(--code-bg); overflow-x:auto; }
.code-block pre code { font-family:'JetBrains Mono',monospace; font-size:13px; line-height:1.6; background:none; border:none; padding:0; color:#cdd6f4; }

/* ── Loading / Error ──────────────────────────── */
.loading-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:80px 20px; color:var(--text-muted); gap:12px; }
.loading-spinner { width:24px; height:24px; border:2px solid var(--border); border-top-color:var(--accent); border-radius:50%; animation:spin 0.8s linear infinite; }
@keyframes spin { to{transform:rotate(360deg)} }
.error-state { padding:32px; background:var(--surface); border:1px solid var(--border); border-left:3px solid #c44; color:#c44; border-radius:4px; }

/* ── Mobile ───────────────────────────────────── */
@media(max-width:600px){
  .nav{padding:0 12px;height:56px}
  .nav-back{font-size:15px}
  .ip-desc{display:none}
  .container{padding:20px 12px 60px}
  .conv-title{font-size:20px}
  .message{padding:14px 16px}
}
</style>
</head>
<body>
<nav class="nav">
  <div class="nav-left">
    <a href="/" class="nav-back">← Back</a>
    <div class="nav-divider"></div>
    <div class="nav-title" id="navTitle">Loading...</div>
  </div>
  <div class="nav-meta" id="navMeta"></div>
  <div class="nav-actions">
    <button class="theme-btn" onclick="toggleTheme()" title="Toggle dark mode">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor" stroke="none"/>
      </svg>
    </button>
  </div>
</nav>
<div class="container">
  <div id="app">
    <div class="loading-state"><div class="loading-spinner"></div><span>Loading...</span></div>
  </div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-typescript.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-sql.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js"></script>
<script src="/chat-viewer.js?v=4"></script>
</body>
</html>`;
}

export const chatViewerScript = getChatViewerScript();

function getChatViewerScript(): string {
  const lines: string[] = [];

  lines.push("var chatId = window.location.pathname.split('/').pop();");
  lines.push("var FENCE = String.fromCharCode(96,96,96);");
  lines.push("var allMessages=[];");
  lines.push("");

  // Theme — apply before paint to avoid flash
  lines.push("(function(){");
  lines.push("  var t=localStorage.getItem('foundation-theme')||'light';");
  lines.push("  document.documentElement.setAttribute('data-theme',t);");
  lines.push("})();");
  lines.push("");

  lines.push("function toggleTheme(){");
  lines.push("  var c=document.documentElement.getAttribute('data-theme');");
  lines.push("  var n=c==='dark'?'light':'dark';");
  lines.push("  document.documentElement.setAttribute('data-theme',n);");
  lines.push("  localStorage.setItem('foundation-theme',n);");
  lines.push("}");
  lines.push("");

  lines.push("function getMsgParam(){var m=new URLSearchParams(window.location.search).get('msg');return m!==null?parseInt(m,10):null;}");
  lines.push("");

  // Load
  lines.push("async function loadConversation(){");
  lines.push("  try{");
  lines.push("    var res=await fetch('/chat/'+chatId,{headers:{'Accept':'application/json'}});");
  lines.push("    if(!res.ok)throw new Error('Failed to load');");
  lines.push("    var data=await res.json();");
  lines.push("    if(data.error)throw new Error(data.error);");
  lines.push("    render(data);");
  lines.push("  }catch(err){");
  lines.push("    document.getElementById('app').innerHTML='<div class=\"error-state\">Error: '+escapeHtml(err.message)+'</div>';");
  lines.push("  }");
  lines.push("}");
  lines.push("");

  // Render — insights-first architecture
  lines.push("function render(data){");
  lines.push("  var chat=data.chat, messages=data.messages||[];");
  lines.push("  allMessages=messages;");
  lines.push("  rawMessages=messages.filter(function(m){return m.role==='user';});");
  lines.push("  document.title=chat.title+' \u2014 The Foundation';");
  lines.push("  document.getElementById('navTitle').textContent=chat.title;");
  lines.push("  document.getElementById('navMeta').textContent=messages.length+' msgs'+(chat.imported_at?' \u00b7 '+formatDate(chat.imported_at):'');");
  lines.push("  var msgParam=getMsgParam();");
  lines.push("  var showConv=msgParam!==null;");
  lines.push("  var messagesHTML=messages.map(buildMessage).join('');");
  lines.push("  document.getElementById('app').innerHTML=");
  // 1. Header
  lines.push("    '<div class=\"conv-header\">'+");
  lines.push("    '<h1 class=\"conv-title\">'+escapeHtml(chat.title)+'</h1>'+");
  lines.push("    '<div class=\"conv-stats\">'+");
  lines.push("    '<span>'+messages.length+' messages</span>'+");
  lines.push("    (chat.created_at?'<span>\u00b7 '+formatDate(chat.created_at)+'</span>':'')+");
  lines.push("    (chat.source?'<span>\u00b7 via '+escapeHtml(chat.source)+'</span>':'')+");
  lines.push("    '</div></div>'+");
  // 2. Insights — PRIMARY, always visible, loads async
  lines.push("    '<div class=\"insights-wrap\" id=\"insightsWrap\"><div class=\"ip-loading\"><div class=\"loading-spinner\" style=\"margin:0 auto 8px\"></div>Loading insights...</div></div>'+");
  // 3. Summary — SECONDARY, collapsed accordion
  lines.push("    (chat.summary?buildSummaryAccordion(chat.summary):'')+");
  // 4. Conversation — TERTIARY, hidden unless ?msg= or user expands
  lines.push("    '<div class=\"conv-wrap'+(showConv?' visible':'')+'\" id=\"convWrap\">'+");
  lines.push("    '<div class=\"conv-reveal\">'+");
  lines.push("    '<div class=\"conv-reveal-line\"></div>'+");
  lines.push("    '<button class=\"conv-reveal-btn\" id=\"convRevealBtn\" onclick=\"toggleConversation()\">'+(showConv?'Hide conversation':'View conversation')+'</button>'+");
  lines.push("    '<div class=\"conv-reveal-line\"></div></div>'+");
  lines.push("    '<div class=\"messages\">'+messagesHTML+'</div>'+");
  lines.push("    '</div>';");
  lines.push("  Prism.highlightAll();");
  lines.push("  loadInsights();");
  lines.push("  if(msgParam!==null)scrollToMessage(msgParam);");
  lines.push("}");
  lines.push("");

  // Summary accordion
  lines.push("function buildSummaryAccordion(summary){");
  lines.push("  return '<div class=\"summary-wrap\">'+");
  lines.push("    '<div class=\"summary-accordion\" id=\"summaryAccordion\">'+");
  lines.push("    '<div class=\"summary-trigger\" onclick=\"toggleSummary()\">'+");
  lines.push("    '<span class=\"summary-trigger-label\">Summary</span>'+");
  lines.push("    '<span class=\"summary-trigger-hint\">click to expand</span>'+");
  lines.push("    '<span class=\"summary-chevron\">\u25bc</span>'+");
  lines.push("    '</div>'+");
  lines.push("    '<div class=\"summary-body\"><div class=\"summary-text\">'+formatProse(summary)+'</div></div>'+");
  lines.push("    '</div></div>';");
  lines.push("}");
  lines.push("function toggleSummary(){document.getElementById('summaryAccordion').classList.toggle('open');}");
  lines.push("");

  // Conversation toggle
  lines.push("function toggleConversation(){");
  lines.push("  var wrap=document.getElementById('convWrap');");
  lines.push("  var btn=document.getElementById('convRevealBtn');");
  lines.push("  var v=wrap.classList.toggle('visible');");
  lines.push("  btn.textContent=v?'Hide conversation':'View conversation';");
  lines.push("}");
  lines.push("");

  // Scroll to message
  lines.push("function scrollToMessage(idx){");
  lines.push("  var el=document.querySelector('.message[data-index=\"'+idx+'\"]');");
  lines.push("  if(!el)return;");
  lines.push("  el.classList.add('highlighted');");
  lines.push("  setTimeout(function(){el.scrollIntoView({behavior:'smooth',block:'start'});},150);");
  lines.push("}");
  lines.push("");

  // Insights
  lines.push("var SECTION_MAP={resume:['commitment','deferred'],warn:['dead_end','mistake'],cmd:['command','exact_value'],decision:['decision','reasoning','solution','pattern','relationship','context']};");
  lines.push("var SECTION_META={resume:{label:'Resume',desc:'open threads & deferred decisions'},warn:{label:'Watch out',desc:'dead ends & mistakes'},cmd:{label:'Commands',desc:'copy-ready, exact values'},decision:{label:'Decisions',desc:'why we built it this way'}};");
  lines.push("var SECTION_ORDER=['resume','warn','cmd','decision'];");
  lines.push("");

  lines.push("async function loadInsights(){");
  lines.push("  var wrap=document.getElementById('insightsWrap');");
  lines.push("  try{");
  lines.push("    var res=await fetch('/api/insights/'+chatId);");
  lines.push("    if(!res.ok)throw new Error('Failed');");
  lines.push("    var data=await res.json();");
  lines.push("    renderInsights(data.insights||{},wrap);");
  lines.push("  }catch(e){");
  lines.push("    wrap.innerHTML='<div class=\"ip-empty\">No insights extracted yet.</div>';");
  lines.push("  }");
  lines.push("}");
  lines.push("");

  lines.push("function groupIntoBuckets(grouped){");
  lines.push("  var b={resume:[],warn:[],cmd:[],decision:[]};");
  lines.push("  Object.keys(grouped).forEach(function(type){");
  lines.push("    var items=grouped[type]||[], bucket='decision';");
  lines.push("    Object.keys(SECTION_MAP).forEach(function(k){if(SECTION_MAP[k].indexOf(type)!==-1)bucket=k;});");
  lines.push("    b[bucket]=b[bucket].concat(items);");
  lines.push("  });");
  lines.push("  Object.keys(b).forEach(function(k){b[k].sort(function(a,z){return(z.score||0)-(a.score||0);});});");
  lines.push("  return b;");
  lines.push("}");
  lines.push("");

  lines.push("function renderInsights(grouped,wrap){");
  lines.push("  var total=Object.values(grouped).reduce(function(a,arr){return a+arr.length;},0);");
  lines.push("  if(!total){wrap.innerHTML='<div class=\"ip-empty\">No insights extracted yet.</div>';return;}");
  lines.push("  var buckets=groupIntoBuckets(grouped), html='';");
  lines.push("  SECTION_ORDER.forEach(function(kind){");
  lines.push("    var items=buckets[kind], meta=SECTION_META[kind];");
  lines.push("    html+='<div class=\"ip-section'+(items.length===0?' collapsed':'')+'\" data-kind=\"'+kind+'\">';");
  lines.push("    html+='<div class=\"ip-header\" onclick=\"ipToggle(this)\">';");
  lines.push("    html+='<div class=\"ip-pip\"></div>';");
  lines.push("    html+='<span class=\"ip-label\">'+meta.label+'</span>';");
  lines.push("    html+='<span class=\"ip-desc\">'+meta.desc+'</span>';");
  lines.push("    html+='<span class=\"ip-count\">'+items.length+'</span>';");
  lines.push("    html+='<span class=\"ip-chevron\">\u25bc</span>';");
  lines.push("    html+='</div>';");
  lines.push("    if(!items.length){");
  lines.push("      html+='<div class=\"ip-body\"><div class=\"ip-empty\">None found</div></div>';");
  lines.push("    }else{");
  lines.push("      html+='<div class=\"ip-body\">';");
  lines.push("      items.forEach(function(ins){");
  lines.push("        var c=escapeHtml(ins.content||'');");
  lines.push("        var x=ins.context?escapeHtml(ins.context):'';");
  lines.push("        var cv=c.replace(/\\\\/g,'\\\\\\\\').replace(/'/g,\"\\\\'\");");
  lines.push("        html+='<div class=\"ip-item\">';");
  lines.push("        html+='<div class=\"ip-main\"><div class=\"ip-content\">'+c+'</div>';");
  lines.push("        if(x)html+='<div class=\"ip-ctx\">'+x+'</div>';");
  lines.push("        html+='</div>';");
  lines.push("        html+='<div class=\"ip-actions\"><button class=\"ip-copy\" onclick=\"ipCopy(this,\\''+cv+'\\')\" >copy</button></div>';");
  lines.push("        html+='</div>';");
  lines.push("      });");
  lines.push("      html+='</div>';");
  lines.push("    }");
  lines.push("    html+='</div>';");
  lines.push("  });");
  lines.push("  html+='<div class=\"ip-footer\"><span>'+total+' insights</span></div>';");
  lines.push("  wrap.innerHTML=html;");
  lines.push("}");
  lines.push("");

  lines.push("function ipToggle(h){h.closest('.ip-section').classList.toggle('collapsed');}");
  lines.push("function ipCopy(btn,text){navigator.clipboard.writeText(text).then(function(){btn.textContent='copied';btn.classList.add('copied');setTimeout(function(){btn.textContent='copy';btn.classList.remove('copied');},1500);});}");
  lines.push("");

  // Polish
  lines.push("function togglePolish(){");
  lines.push("  polished=!polished;");
  lines.push("  document.getElementById('polishToggle').textContent=polished?'Polished':'Raw';");
  lines.push("  if(!polished){document.querySelectorAll('.message.user .message-body').forEach(function(el,i){el.innerHTML=formatProse(rawMessages[i].content);});return;}");
  lines.push("  var queue=rawMessages.slice(0,10).map(function(msg,i){return{msg:msg,i:i};});");
  lines.push("  function processNext(){");
  lines.push("    if(!queue.length)return;");
  lines.push("    var item=queue.shift();");
  lines.push("    var el=document.querySelectorAll('.message.user .message-body')[item.i];");
  lines.push("    if(!el){processNext();return;}");
  lines.push("    if(polishCache[item.i]){el.innerHTML=formatProse(polishCache[item.i]);processNext();return;}");
  lines.push("    el.innerHTML='<em style=\"color:var(--text-muted);font-size:13px\">Polishing...</em>';");
  lines.push("    fetch('/api/polish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:item.msg.content})})");
  lines.push("      .then(function(r){return r.json();})");
  lines.push("      .then(function(d){polishCache[item.i]=d.polished;el.innerHTML=formatProse(d.polished);processNext();})");
  lines.push("      .catch(function(){el.innerHTML=formatProse(item.msg.content);processNext();});");
  lines.push("  }");
  lines.push("  processNext();");
  lines.push("}");
  lines.push("");

  // Message builder
  lines.push("function buildMessage(msg,index){");
  lines.push("  var role=msg.role==='user'?'user':'assistant';");
  lines.push("  return '<div class=\"message '+role+'\" data-index=\"'+index+'\">'+");
  lines.push("    '<div class=\"message-role\">'+(role==='user'?'You':'Claude')+'</div>'+");
  lines.push("    '<div class=\"message-body\">'+formatMessageContent(msg.content)+'</div></div>';");
  lines.push("}");
  lines.push("");

  lines.push("function formatMessageContent(raw){");
  lines.push("  if(!raw)return'';");
  lines.push("  var re=new RegExp('('+FENCE+'[\\\\w]*[\\\\s\\\\S]*?'+FENCE+')','g');");
  lines.push("  return raw.split(re).map(function(p){");
  lines.push("    return(p.charCodeAt(0)===96&&p.charCodeAt(1)===96&&p.charCodeAt(2)===96)?buildCodeBlock(p):formatProse(p);");
  lines.push("  }).join('');");
  lines.push("}");
  lines.push("");

  lines.push("function buildCodeBlock(raw){");
  lines.push("  var m=raw.match(new RegExp('^'+FENCE+'(\\\\w*)[\\\\r\\\\n]+([\\\\s\\\\S]*)'+FENCE+'$'))||raw.match(new RegExp('^'+FENCE+'(\\\\w*)([\\\\s\\\\S]*)'+FENCE+'$'));");
  lines.push("  if(!m)return'<pre><code>'+escapeHtml(raw)+'</code></pre>';");
  lines.push("  var lang=m[1]||'text',code=m[2]||'';");
  lines.push("  if(code.charAt(0)==='\\n')code=code.slice(1);");
  lines.push("  return'<div class=\"code-block\"><div class=\"code-header\"><span class=\"code-lang\">'+escapeHtml(lang)+'</span><button class=\"code-copy\" onclick=\"copyCode(this)\">Copy</button></div><pre><code class=\"language-'+mapLang(lang)+'\">'+escapeHtml(code)+'</code></pre></div>';");
  lines.push("}");
  lines.push("");

  lines.push("function formatProse(text){");
  lines.push("  if(!text||!text.trim())return'';");
  lines.push("  var h=escapeHtml(text);");
  lines.push("  h=h.replace(/^### (.+)$/gm,'<h3>$1</h3>').replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/^# (.+)$/gm,'<h1>$1</h1>');");
  lines.push("  h=h.replace(/[*]{3}(.+?)[*]{3}/g,'<strong><em>$1</em></strong>').replace(/[*]{2}(.+?)[*]{2}/g,'<strong>$1</strong>').replace(/[*](.+?)[*]/g,'<em>$1</em>');");
  lines.push("  var BT=String.fromCharCode(96);");
  lines.push("  h=h.replace(new RegExp(BT+'([^'+BT+']+)'+BT,'g'),'<code>$1</code>');");
  lines.push("  h=formatTables(h);");
  lines.push("  h=h.replace(/^&gt; (.+)$/gm,'<blockquote>$1</blockquote>');");
  lines.push("  h=formatLists(h);");
  lines.push("  h=h.replace(/^---+$/gm,'<hr style=\"border:none;border-top:1px solid var(--border);margin:20px 0\">');");
  lines.push("  return h.split(/\\n\\n+/).map(function(b){b=b.trim();if(!b)return'';return/^<(h[1-6]|ul|ol|li|blockquote|hr|div|pre|table)/.test(b)?b:'<p>'+b.replace(/\\n/g,'<br>')+'</p>';}).join('');");
  lines.push("}");
  lines.push("");

  lines.push("function formatTables(h){return h.replace(/((?:\\|.+\\|\\n)+)/g,function(m){var rows=m.trim().split('\\n').filter(function(r){return r.trim();});if(rows.length<2)return m;var sep=-1;for(var i=0;i<rows.length;i++){if(/^[\\|\\s\\-:]+$/.test(rows[i])){sep=i;break;}}if(sep===-1)return m;var t='<table>';for(var j=0;j<rows.length;j++){if(j===sep)continue;var tag=j<sep?'th':'td';t+='<tr>'+rows[j].split('|').slice(1,-1).map(function(c){return'<'+tag+'>'+c.trim()+'</'+tag+'>';}).join('')+'</tr>';}return t+'</table>';});}");
  lines.push("");

  lines.push("function formatLists(h){h=h.replace(/((?:^[-*] .+\\n?)+)/gm,function(m){return'<ul>'+m.trim().split('\\n').map(function(l){return'<li>'+l.replace(/^[-*] /,'').trim()+'</li>';}).join('')+'</ul>';});h=h.replace(/((?:^\\d+\\. .+\\n?)+)/gm,function(m){return'<ol>'+m.trim().split('\\n').map(function(l){return'<li>'+l.replace(/^\\d+\\. /,'').trim()+'</li>';}).join('')+'</ol>';});return h;}");
  lines.push("");

  lines.push("function copyCode(btn){var c=btn.closest('.code-block').querySelector('code').textContent;navigator.clipboard.writeText(c).then(function(){btn.textContent='Copied!';setTimeout(function(){btn.textContent='Copy';},2000);});}");
  lines.push("function mapLang(l){var m={js:'javascript',ts:'typescript',py:'python',sh:'bash',shell:'bash',zsh:'bash',yml:'yaml',md:'markdown'};return m[l]||l||'text';}");
  lines.push("function escapeHtml(t){if(typeof t!=='string')return'';return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');}");
  lines.push("function formatDate(s){if(!s)return'';try{return new Date(s).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});}catch(e){return'';}}");
  lines.push("");

  lines.push("loadConversation();");

  return lines.join('\n');
}