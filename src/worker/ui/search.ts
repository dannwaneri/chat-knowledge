export function getSearchHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Chat Knowledge</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 15px;
  line-height: 1.7;
  color: #2a2a2a;
  background: #f5f3f0;
  padding: 40px 20px;
}

.container { max-width: 900px; margin: 0 auto; }

header {
  margin-bottom: 48px;
  padding-bottom: 24px;
  border-bottom: 2px solid #2a2a2a;
}

h1 {
  font-family: 'Lora', Georgia, serif;
  font-size: 48px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #1a1a1a;
  letter-spacing: -0.5px;
}

.tagline { font-size: 16px; color: #6b6b6b; font-style: italic; font-weight: 300; }

.search-box {
  background: #fff;
  border: 1px solid #d4d0ca;
  padding: 28px;
  margin-bottom: 32px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.search-input {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #d4d0ca;
  background: #fafaf9;
  font-size: 15px;
  font-family: 'Inter', sans-serif;
  color: #2a2a2a;
  margin-bottom: 16px;
  transition: all 0.2s;
}

.search-input:focus { outline: none; border-color: #8b4513; background: #fff; }
.search-input::placeholder { color: #999; font-weight: 300; }

.search-controls { display: flex; gap: 12px; align-items: center; }

select {
  padding: 12px 16px;
  border: 1px solid #d4d0ca;
  background: #fafaf9;
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  color: #2a2a2a;
  cursor: pointer;
  transition: all 0.2s;
}
select:hover, select:focus { border-color: #8b4513; outline: none; }

button {
  padding: 12px 28px;
  background: #2a2a2a;
  color: #f5f3f0;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  letter-spacing: 0.3px;
  transition: all 0.2s;
}
button:hover { background: #1a1a1a; }
button:active { transform: translateY(1px); }

.recent-section { margin-bottom: 40px; }

.section-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #999;
  margin-bottom: 16px;
}

.recent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.recent-card {
  background: #fff;
  border: 1px solid #d4d0ca;
  padding: 20px 22px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}
.recent-card:hover {
  border-color: #8b4513;
  box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  transform: translateY(-1px);
}
.recent-card-title {
  font-family: 'Lora', Georgia, serif;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.35;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.recent-card-summary {
  font-size: 13px;
  color: #6b6b6b;
  line-height: 1.55;
  margin-bottom: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.recent-card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #aaa;
  border-top: 1px solid #f0ede8;
  padding-top: 12px;
}
.recent-card-count {
  background: #f5f3f0;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  color: #8b4513;
}
.recent-loading {
  grid-column: 1 / -1;
  padding: 32px;
  text-align: center;
  color: #bbb;
  font-size: 14px;
  font-style: italic;
}

a.result, a.recent-card {
  display: block;
  text-decoration: none;
  color: inherit;
}

.results { display: flex; flex-direction: column; gap: 16px; }

.result {
  background: #fff;
  border: 1px solid #d4d0ca;
  padding: 24px 28px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}
.result:hover {
  border-color: #8b4513;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transform: translateY(-1px);
}
.result-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
  gap: 16px;
}
.result-title {
  font-family: 'Lora', Georgia, serif;
  font-size: 19px;
  font-weight: 600;
  color: #1a1a1a;
  flex: 1;
  line-height: 1.4;
}
.result-score {
  font-size: 13px;
  color: #8b4513;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  background: #fef6f0;
  padding: 4px 10px;
  border-radius: 2px;
}
.result-passage {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #bbb;
  margin-bottom: 10px;
}
.result-content {
  font-size: 15px;
  color: #4a4a4a;
  line-height: 1.65;
  margin-bottom: 12px;
}
.result-meta { font-size: 13px; color: #999; font-weight: 300; }

.empty, .loading {
  padding: 80px 40px;
  text-align: center;
  color: #999;
  font-size: 15px;
  background: #fff;
  border: 1px solid #d4d0ca;
  font-style: italic;
}

.perf {
  margin-top: 24px;
  padding: 16px 20px;
  background: #fff;
  border: 1px solid #d4d0ca;
  font-size: 13px;
  color: #6b6b6b;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

@media (max-width: 600px) {
  body { padding: 20px 16px; }
  h1 { font-size: 36px; }
  .search-box { padding: 20px; }
  .search-controls { flex-direction: column; }
  select, button { width: 100%; }
  .result { padding: 20px; }
  .result-title { font-size: 17px; }
  .recent-grid { grid-template-columns: 1fr; }
}
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>Chat Knowledge</h1>
    <div class="tagline">AI-powered conversation search, driven by your data</div>
  </header>

  <div class="search-box">
    <input
      type="text"
      class="search-input"
      id="searchInput"
      placeholder="Ask me anything about your conversations..."
      autocomplete="off"
      autofocus
    >
    <div class="search-controls">
      <select id="maxResults">
        <option value="5" selected>5 results</option>
        <option value="10">10 results</option>
        <option value="20">20 results</option>
      </select>
      <button onclick="search()">Search</button>
    </div>
  </div>

  <div class="recent-section" id="recentSection" style="display:none">
    <div class="section-label">Recent Conversations</div>
    <div class="recent-grid" id="recentGrid">
      <div class="recent-loading">Loading conversations...</div>
    </div>
  </div>

  <div id="results" style="display:none"></div>
  <div id="performance" style="display:none"></div>
</div>

<script>
async function loadRecentConversations() {
  var section = document.getElementById("recentSection");
  var grid = document.getElementById("recentGrid");
  try {
    var res = await fetch("/chats");
    var data = await res.json();
    var chats = data.chats || [];
    if (chats.length === 0) {
      grid.innerHTML = "<div class=\\"recent-loading\\">No conversations captured yet.</div>";
      section.style.display = "block";
      return;
    }
    grid.innerHTML = chats.map(function(chat) {
      var summary = chat.summary
        ? (chat.summary.length > 110 ? chat.summary.substring(0, 110) + "..." : chat.summary)
        : "No summary available.";
      return "<a class=\\"recent-card\\" href=\\"/view/" + chat.id + "\\">" +
        "<div class=\\"recent-card-title\\">" + escapeHtml(chat.title || "Untitled") + "</div>" +
        "<div class=\\"recent-card-summary\\">" + escapeHtml(summary) + "</div>" +
        "<div class=\\"recent-card-meta\\">" +
          "<span class=\\"recent-card-count\\">" + (chat.message_count || 0) + " msgs</span>" +
          "<span>" + formatDate(chat.imported_at) + "</span>" +
        "</div></a>";
    }).join("");
    section.style.display = "block";
  } catch (err) {
    grid.innerHTML = "<div class=\\"recent-loading\\">Could not load conversations.</div>";
    section.style.display = "block";
  }
}

async function search() {
  var query = document.getElementById("searchInput").value.trim();
  var maxResults = parseInt(document.getElementById("maxResults").value);
  var resultsDiv = document.getElementById("results");
  var perfDiv = document.getElementById("performance");
  var recentSection = document.getElementById("recentSection");

  if (!query) {
    resultsDiv.style.display = "none";
    perfDiv.style.display = "none";
    recentSection.style.display = "block";
    return;
  }

  recentSection.style.display = "none";
  resultsDiv.style.display = "block";
  resultsDiv.innerHTML = "<div class=\\"loading\\">Searching...</div>";
  perfDiv.style.display = "none";

  var startTime = performance.now();

  try {
    var response = await fetch("/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query, maxResults: maxResults })
    });

    var data = await response.json();
    var elapsed = ((performance.now() - startTime) / 1000).toFixed(2);

    if (data.error) {
      resultsDiv.innerHTML = "<div class=\\"empty\\">" + escapeHtml(data.error) + "</div>";
      return;
    }
    if (!data.results || data.results.length === 0) {
      resultsDiv.innerHTML = "<div class=\\"empty\\">No results found</div>";
      return;
    }

    var chatCounts = {};
    data.results.forEach(function(r) {
      chatCounts[r.chatId] = (chatCounts[r.chatId] || 0) + 1;
    });
    var chatSeen = {};

    resultsDiv.innerHTML = "<div class=\\"results\\">" +
      data.results.map(function(r) {
        var isDupe = chatCounts[r.chatId] > 1;
        chatSeen[r.chatId] = (chatSeen[r.chatId] || 0) + 1;

        var msgIndex = (r.metadata && r.metadata.message_index !== undefined)
          ? r.metadata.message_index : '';
        var url = '/view/' + r.chatId + (msgIndex !== '' ? '?msg=' + msgIndex : '');

        var passageHTML = isDupe
          ? "<div class=\\"result-passage\\">Passage " + chatSeen[r.chatId] + " of " + chatCounts[r.chatId] + "</div>"
          : "";

        var raw = r.content || "";
        var cleaned = raw.replace(/^Q: */m, "");
        var aIdx = cleaned.indexOf("\\nA: ");
        if (aIdx !== -1) cleaned = cleaned.substring(0, aIdx) + " - " + cleaned.substring(aIdx + 4);
        cleaned = cleaned.split("**").join("").trim();
        var snippet = cleaned.substring(0, 240) + (cleaned.length > 240 ? "..." : "");

        return "<a class=\\"result\\" href=\\"" + url + "\\">" +
          "<div class=\\"result-header\\">" +
            "<div class=\\"result-title\\">" + escapeHtml(r.chatTitle) + "</div>" +
            "<div class=\\"result-score\\">" + (r.relevance * 100).toFixed(0) + "%</div>" +
          "</div>" +
          passageHTML +
          "<div class=\\"result-content\\">" + escapeHtml(snippet) + "</div>" +
          "<div class=\\"result-meta\\">" + formatDate(r.chatMetadata && r.chatMetadata.importedAt ? r.chatMetadata.importedAt : "") + "</div>" +
        "</a>";
      }).join("") +
    "</div>";

    perfDiv.style.display = "block";
    perfDiv.innerHTML = "<div class=\\"perf\\">Found " + data.count + " results in " + elapsed + "s</div>";

  } catch (error) {
    resultsDiv.innerHTML = "<div class=\\"empty\\">Error: " + escapeHtml(error.message) + "</div>";
  }
}

function escapeHtml(text) {
  if (!text) return "";
  var div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

document.getElementById("searchInput").addEventListener("keypress", function(e) {
  if (e.key === "Enter") search();
});

document.getElementById("searchInput").addEventListener("input", function(e) {
  if (!e.target.value.trim()) {
    document.getElementById("results").style.display = "none";
    document.getElementById("performance").style.display = "none";
    document.getElementById("recentSection").style.display = "block";
  }
});

loadRecentConversations();
</script>
</body>
</html>`;
}