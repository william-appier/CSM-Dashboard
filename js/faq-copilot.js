/* =============================================================================
 * faq-copilot.js — FAQ 智慧搜尋（Insight-First 風格，接 Gemini）
 * -----------------------------------------------------------------------------
 * 用途：讓所有 CSM 用「一句話」定位到對應的 FAQ。
 * 做法：讀 csm-faq.json（前端本來就有的 FAQ 快取）→ 把「問題清單(id/q/category/
 *   product)」+ 使用者的問題送到 worker /copilot 的 faq 模式 → Gemini 只回傳
 *   最相關的 id → 前端用「vetted 的官方答案 a 欄」直接展開顯示（零幻覺）。
 * 不需改 faq.js、不需改 GAS（沿用同一支 Gemini）。自我注入到 FAQ 分頁頂端。
 * ========================================================================== */
(function () {
  "use strict";

  var COPILOT_ENDPOINT = "https://csm-brief-worker.williamlin12.workers.dev/copilot";
  var FAQ_URL = "csm-faq.json"; // 與 faq.js 同一份資料（GitHub Pages 同源）

  var faqEntries = null; // 快取
  var byId = {};

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function sparkSVG(n) {
    n = n || 18;
    return '<svg width="' + n + '" height="' + n + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2"/></svg>';
  }

  function loadFaqs() {
    if (faqEntries) return Promise.resolve(faqEntries);
    return fetch(FAQ_URL + "?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : { entries: [] }; })
      .then(function (j) {
        faqEntries = j && j.entries ? j.entries : Array.isArray(j) ? j : [];
        byId = {};
        faqEntries.forEach(function (e) { if (e && e.id) byId[e.id] = e; });
        return faqEntries;
      })
      .catch(function () { faqEntries = []; return faqEntries; });
  }

  /* --------------------------- search --------------------------- */
  function runSearch(query) {
    var box = document.getElementById("faqcop-result");
    if (!box) return;
    query = (query || "").trim();
    if (!query) {
      box.innerHTML = '<div class="faqcop-hint">輸入一句話描述你的問題，AI 幫你找到對應 FAQ。</div>';
      return;
    }
    box.innerHTML = '<div class="faqcop-state"><span class="faqcop-spin"></span>AI 檢索中…</div>';
    loadFaqs()
      .then(function (list) {
        if (!list.length) throw new Error("FAQ 資料載入失敗");
        var compact = list.map(function (e) {
          return { id: e.id, q: e.q, category: e.category, product: e.product };
        });
        return fetch(COPILOT_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" }, // 避開 CORS preflight
          body: JSON.stringify({ mode: "faq", query: query, context: { faqs: compact } }),
          redirect: "follow",
        });
      })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(function (txt) {
        var d;
        try { d = JSON.parse(txt); } catch (e) { d = { ids: [] }; }
        if (d && String(d.status).toLowerCase() === "error") throw new Error(d.message || "檢索失敗");
        renderResults(d.ids || []);
      })
      .catch(function (e) {
        box.innerHTML = '<div class="faqcop-state faqcop-err">檢索失敗：' + esc(e.message) + "</div>";
      });
  }

  function renderResults(ids) {
    var box = document.getElementById("faqcop-result");
    if (!box) return;
    var hits = ids.map(function (id) { return byId[id]; }).filter(Boolean);
    if (!hits.length) {
      box.innerHTML = '<div class="faqcop-state">找不到相關的 FAQ。換個說法，或用上方關鍵字搜尋看看。</div>';
      return;
    }
    var html = '<div class="faqcop-reslabel">找到 ' + hits.length + " 筆最相關：</div>";
    hits.forEach(function (e) {
      var chips = "";
      if (e.category) chips += '<span class="faqcop-chip">' + esc(e.category) + "</span>";
      if (e.product && e.product !== e.category) chips += '<span class="faqcop-chip">' + esc(e.product) + "</span>";
      if (e.urgency) chips += '<span class="faqcop-chip faqcop-chip-u">' + esc(e.urgency) + "</span>";
      html +=
        '<div class="faqcop-card">' +
        '<div class="faqcop-id">' + esc(e.id || "") + "</div>" +
        '<div class="faqcop-q">' + esc(e.q || "") + "</div>" +
        (chips ? '<div class="faqcop-chips">' + chips + "</div>" : "") +
        '<div class="faqcop-a">' + esc(e.a || "").replace(/\n/g, "<br>") + "</div>" +
        '<div class="faqcop-foot">' +
        (e.source ? '<a class="faqcop-src" href="' + esc(e.source) + '" target="_blank" rel="noopener">開啟原文出處 ↗</a>' : "<span></span>") +
        (e.last_verified ? '<span class="faqcop-verified">最後確認 ' + esc(e.last_verified) + "</span>" : "") +
        "</div>" +
        "</div>";
    });
    box.innerHTML = html;
  }

  /* --------------------------- inject --------------------------- */
  function boxHTML() {
    return (
      '<div class="faqcop-head">' +
        '<span class="faqcop-spark">' + sparkSVG(18) + "</span>" +
        "<div><div class=\"faqcop-title\">FAQ 智慧搜尋</div>" +
        '<div class="faqcop-subtitle">用一句話描述問題，AI 幫你定位對應 FAQ</div></div>' +
      "</div>" +
      '<div class="faqcop-inputrow">' +
        '<input id="faqcop-input" class="faqcop-input" type="text" placeholder="例如：客戶 console 帳號被盜、被拿去發釣魚信怎麼處理？" />' +
        '<button id="faqcop-btn" class="faqcop-btn">AI 找</button>' +
      "</div>" +
      '<div id="faqcop-result" class="faqcop-result"><div class="faqcop-hint">輸入一句話描述你的問題，AI 幫你找到對應 FAQ。</div></div>'
    );
  }

  function wire() {
    var inp = document.getElementById("faqcop-input");
    var btn = document.getElementById("faqcop-btn");
    if (btn) btn.addEventListener("click", function () { runSearch(inp ? inp.value : ""); });
    if (inp) inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); runSearch(inp.value); }
    });
  }

  function ensureBox() {
    var pane = document.getElementById("pane-faq");
    if (!pane) return;
    if (document.getElementById("faqcop")) return; // 已存在
    var box = document.createElement("div");
    box.id = "faqcop";
    box.className = "faqcop";
    box.innerHTML = boxHTML();
    pane.insertBefore(box, pane.firstChild);
    wire();
  }

  function injectStyle() {
    if (document.getElementById("faqcop-style")) return;
    var s = document.createElement("style");
    s.id = "faqcop-style";
    s.textContent = [
      ".faqcop{font-family:'Inter','Segoe UI',-apple-system,'PingFang TC','Microsoft JhengHei',sans-serif;color:#0f172a;background:#fff;border:1px solid #e9edf3;border-radius:16px;box-shadow:0 1px 2px rgba(16,24,40,.04),0 8px 24px rgba(16,24,40,.05);padding:16px 18px;margin:0 0 16px;}",
      ".faqcop-head{display:flex;align-items:center;gap:10px;margin-bottom:12px;}",
      ".faqcop-spark{width:32px;height:32px;border-radius:9px;flex-shrink:0;background:#eef2ff;color:#6366f1;display:inline-flex;align-items:center;justify-content:center;}",
      ".faqcop-title{font-size:15px;font-weight:600;}",
      ".faqcop-subtitle{font-size:12px;color:#94a3b8;}",
      ".faqcop-inputrow{display:flex;gap:8px;}",
      ".faqcop-input{flex:1;min-width:0;box-sizing:border-box;padding:10px 12px;font-size:14px;border:1px solid #d9dee7;border-radius:10px;outline:none;font-family:inherit;transition:border-color .15s,box-shadow .15s;}",
      ".faqcop-input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.15);}",
      ".faqcop-btn{flex-shrink:0;display:inline-flex;align-items:center;gap:6px;background:#6366f1;color:#fff;border:none;border-radius:10px;padding:0 18px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .15s;}",
      ".faqcop-btn:hover{background:#4f46e5;}",
      ".faqcop-result{margin-top:12px;}",
      ".faqcop-hint{font-size:13px;color:#94a3b8;padding:4px 2px;}",
      ".faqcop-state{padding:18px 2px;font-size:14px;color:#64748b;}",
      ".faqcop-err{color:#b91c1c;}",
      ".faqcop-spin{width:14px;height:14px;border:2px solid #c7d2fe;border-top-color:#6366f1;border-radius:50%;display:inline-block;vertical-align:-2px;margin-right:8px;animation:faqcop-spin .7s linear infinite;}",
      "@keyframes faqcop-spin{to{transform:rotate(360deg);}}",
      ".faqcop-reslabel{font-size:12px;color:#94a3b8;margin:2px 2px 10px;}",
      ".faqcop-card{border:1px solid #eef1f6;border-radius:12px;padding:14px 16px;margin-bottom:10px;background:#fcfcfe;}",
      ".faqcop-id{font-family:'DM Mono',monospace;font-size:11px;color:#6366f1;margin-bottom:4px;}",
      ".faqcop-q{font-size:15px;font-weight:600;color:#0f172a;line-height:1.5;}",
      ".faqcop-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;}",
      ".faqcop-chip{font-size:11px;color:#475569;background:#f1f5f9;border-radius:999px;padding:2px 9px;}",
      ".faqcop-chip-u{background:#fef3c7;color:#92400e;}",
      ".faqcop-a{font-size:14px;line-height:1.7;color:#334155;white-space:normal;}",
      ".faqcop-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px;}",
      ".faqcop-src{font-size:12.5px;color:#4f46e5;text-decoration:none;font-weight:600;}",
      ".faqcop-src:hover{text-decoration:underline;}",
      ".faqcop-verified{font-size:11px;color:#94a3b8;}",
    ].join("");
    document.head.appendChild(s);
  }

  /* --------------------------- boot --------------------------- */
  function observe(pane) {
    try {
      var mo = new MutationObserver(function () {
        // faq.js 若重繪整個 pane，把我們的搜尋盒補回頂端
        if (!document.getElementById("faqcop")) ensureBox();
      });
      mo.observe(pane, { childList: true });
    } catch (e) {}
  }

  function boot() {
    injectStyle();
    var tries = 0;
    (function wait() {
      var pane = document.getElementById("pane-faq");
      if (pane) {
        ensureBox();
        observe(pane);
        loadFaqs(); // 先預載，第一次查詢更快
        return;
      }
      if (tries++ > 30) return;
      setTimeout(wait, 400);
    })();
  }

  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
