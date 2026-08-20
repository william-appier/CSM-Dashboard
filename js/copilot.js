/* =============================================================================
 * copilot.js — CSM Copilot（Insight-First 洞察面板）階段二：前端邏輯
 * -----------------------------------------------------------------------------
 * 定案需求：
 *   1. 觸發器放進左側 AIRIS copilot 區塊（.csm-copilot-strip），文字改「產生洞察」。
 *   2. 洞察筆數動態（由回傳決定，2–5 點）。
 *   3. 進階行動動態（由回傳的 actions 決定，不寫死）。
 *   4. 行動結果在同一面板內「對話式」往下接續顯示。
 *
 * 資料抓取：scrapeDashboardData() 讀畫面上的 data-cop-* 屬性（見
 *   copilot-data-attributes.md），組成結構化 JSON。
 * API：fetchCopilotInsight() 打 worker 的 /copilot 代理（避開直接呼叫 GAS 在已登入
 *   Google 時的轉址 404 問題，與 tasks 同一套）。worker 再轉給 GAS→Gemini。
 *
 * DEMO_MODE：後端未接好前設為 true，洞察會直接用畫面 data-cop-* 算出來，讓你先看
 *   到完整互動；worker /copilot 上線後把 DEMO_MODE 改成 false 即走真實 API。
 * ========================================================================== */
(function () {
  "use strict";

  var WORKER = "https://csm-brief-worker.williamlin12.workers.dev";
  var COPILOT_ENDPOINT = WORKER + "/copilot";
  var DEMO_MODE = true; // ← 後端 /copilot 上線後改為 false

  /* --------------------------- helpers --------------------------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function currentEmail() {
    try { var u = typeof getUser === "function" ? getUser() : null; return (u && u.email) || ""; }
    catch (e) { return ""; }
  }
  function todayStr() {
    var d = new Date(Date.now() + 8 * 3600000); // HKT
    return d.toISOString().slice(0, 10);
  }

  /* =========================================================================
   * 1) scrapeDashboardData — 讀畫面 data-cop-* → 結構化 JSON
   * ========================================================================= */
  async function scrapeDashboardData() {
    var out = { csm: currentEmail(), date: todayStr(), modules: {}, counts: {} };
    var mods = document.querySelectorAll("[data-cop-module]");
    for (var i = 0; i < mods.length; i++) {
      var modEl = mods[i];
      var modName = modEl.getAttribute("data-cop-module");
      var items = modEl.querySelectorAll("[data-cop-item]");
      var rows = [];
      for (var j = 0; j < items.length; j++) {
        var el = items[j];
        var rec = {};
        for (var k = 0; k < el.attributes.length; k++) {
          var at = el.attributes[k];
          if (at.name.indexOf("data-cop-") === 0 && at.name !== "data-cop-item") {
            // data-cop-renew-days → renewDays
            var key = at.name.slice("data-cop-".length).replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
            rec[key] = at.value;
          }
        }
        if (Object.keys(rec).length) rows.push(rec);
      }
      out.modules[modName] = rows;
    }
    // 後備：面板可從任何分頁開啟，而 My Accounts / 任務管理 是延遲渲染的——若畫面上
    // 還沒有這些模組的 data-cop 資料，直接向來源抓一份，達成「全局每日洞察」。
    if (!(out.modules.accounts && out.modules.accounts.length)) {
      try { out.modules.accounts = await fetchAccountsData(); } catch (e) {}
    }
    if (!(out.modules.tasks && out.modules.tasks.length)) {
      try { out.modules.tasks = await fetchTasksData(); } catch (e) {}
    }
    Object.keys(out.modules).forEach(function (m) { out.counts[m] = (out.modules[m] || []).length; });
    return out;
  }
  window.scrapeDashboardData = scrapeDashboardData; // 方便 console 測試

  function fetchJSON(url, fallback) {
    return fetch(url, { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : fallback; })
      .catch(function () { return fallback; });
  }
  async function fetchAccountsData() {
    var email = currentEmail(); if (!email) return [];
    var map = await fetchJSON(WORKER + "/mapping?t=" + Date.now(), {});
    var summ = await fetchJSON("accountSummaries.json?t=" + Date.now(), {});
    var mine = (map && map[email]) || [];
    return mine.map(function (a) {
      var s = summ[a.id] || {};
      var d = a.endDate ? Math.round((new Date(a.endDate) - Date.now()) / 86400000) : null;
      return { name: a.account, health: s.health || "", renewDays: (d == null ? "" : String(d)), summary: s.summary || "" };
    });
  }
  async function fetchTasksData() {
    var d = await fetchJSON(WORKER + "/tasks?t=" + Date.now(), { tasks: [] });
    return (d.tasks || []).map(function (t) {
      return { name: t.Task_Name, status: String(t.Status || "").toLowerCase(), due: String(t.Due_Date || "").slice(0, 10), reminder: t.Reminder_Freq || "" };
    });
  }

  /* =========================================================================
   * 2) fetchCopilotInsight — 呼叫後端（或 DEMO 本地產生）
   *    payload = { mode:'insights'|'action', action?, context }
   *    回傳 Promise<{insights?, actions?, result?, followupActions?}>
   * ========================================================================= */
  function fetchCopilotInsight(payload) {
    if (DEMO_MODE) return Promise.resolve(demoRespond(payload));
    return fetch(COPILOT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // 避開 CORS preflight
      body: JSON.stringify(payload),
      redirect: "follow",
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    }).then(function (t) {
      var d; try { d = JSON.parse(t); } catch (e) { throw new Error("回傳非 JSON"); }
      if (d && String(d.status).toLowerCase() === "error") throw new Error(d.message || "API 錯誤");
      return d;
    });
  }
  window.fetchCopilotInsight = fetchCopilotInsight;

  /* --- DEMO：用畫面資料本地算出動態洞察與行動（後端就緒後不會用到）--- */
  function demoRespond(payload) {
    if (payload.mode === "action") {
      var map = {
        dunning: "已根據逾期 AR 產生催款信草稿（DEMO）。實際內容將由 Gemini 依帳戶、金額、逾期天數生成，可一鍵複製或寄出。",
        blockers: "卡關原因彙整（DEMO）：多數黃燈來自長期未動的工單，建議依 assignee 分派並設定回覆期限。",
        weekly: "本週摘要（DEMO）：紅燈 1、黃燈 3、逾期承諾 2。實際版本會列出重點帳戶與下一步。",
      };
      return { result: map[payload.action] || "（DEMO）此行動的結果將由 Gemini 生成。", followupActions: [] };
    }
    // mode = insights：從 scrape 結果動態產生
    var ctx = payload.context || {};
    var acc = (ctx.modules && ctx.modules.accounts) || [];
    var tasks = (ctx.modules && ctx.modules.tasks) || [];
    var ar = (ctx.modules && ctx.modules.ar) || [];
    var insights = [], actions = [];

    if (!acc.length && !tasks.length && !ar.length) {
      insights.push("尚未偵測到可分析的資料——請先為各模組加上 data-cop-* 屬性（見 copilot-data-attributes.md）。");
      return { insights: insights, actions: [] };
    }

    var red = acc.filter(function (a) { return a.health === "red"; });
    var yellow = acc.filter(function (a) { return a.health === "yellow"; });
    var expired = acc.filter(function (a) { return Number(a.renewDays) < 0; });
    var overdueTasks = tasks.filter(function (t) { return t.status === "overdue"; });
    var unpaid = ar.filter(function (r) { return r.status === "unpaid"; });

    if (red.length) insights.push("<b>" + red.length + " 個帳戶亮紅燈</b>:" + red.map(function (a) { return esc(a.name); }).join("、") + "——建議今日優先處理。");
    if (yellow.length) insights.push("<b>" + yellow.length + " 個帳戶亮黃燈</b>:" + yellow.map(function (a) { return esc(a.name); }).join("、") + "——留意老化工單。");
    if (expired.length) insights.push("<b>" + expired.length + " 筆合約已到期</b>未確認續約:" + expired.map(function (a) { return esc(a.name); }).join("、") + "。");
    if (overdueTasks.length) insights.push("有 <b>" + overdueTasks.length + " 筆逾期任務</b>:" + overdueTasks.slice(0, 3).map(function (t) { return esc(t.name); }).join("、") + (overdueTasks.length > 3 ? " 等" : "") + "。");
    if (unpaid.length) insights.push("<b>" + unpaid.length + " 筆 AR 未收款</b>,建議寄出催款提醒。");
    if (!insights.length) insights.push("目前所有帳戶健康,無立即風險。");

    // 動態行動（依情境）
    if (unpaid.length) actions.push({ id: "dunning", label: "寫一封催款信" });
    if (yellow.length || ticketSum > 0) actions.push({ id: "blockers", label: "總結卡關原因" });
    if (expired.length || red.length) actions.push({ id: "renewal", label: "擬續約溝通要點" });
    actions.push({ id: "weekly", label: "產生週報摘要" });

    return { insights: insights.slice(0, 5), actions: actions };
  }

  /* =========================================================================
   * 3) UI — 觸發器（左側 AIRIS copilot 區塊）+ 浮動面板
   * ========================================================================= */
  var lastActions = [];

  function sparkSVG(size) {
    size = size || 18;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2"/></svg>';
  }

  function injectTrigger() {
    var strip = document.querySelector(".csm-copilot-strip");
    if (!strip) return false;
    strip.id = "copTrigger";
    strip.style.cursor = "pointer";
    strip.setAttribute("role", "button");
    strip.setAttribute("aria-label", "產生洞察");
    strip.innerHTML =
      '<span style="display:inline-flex;width:34px;height:34px;border-radius:9px;background:rgba(255,255,255,.12);align-items:center;justify-content:center;flex-shrink:0">' + sparkSVG(18) + "</span>" +
      '<div style="line-height:1.25;min-width:0">' +
      '<div style="font-weight:600;font-size:14px">產生洞察</div>' +
      '<div style="font-size:12px;opacity:.7">AI 現況洞察</div>' +
      "</div>";
    strip.addEventListener("click", openPanel);
    return true;
  }

  function injectPanel() {
    if (document.getElementById("copPanel")) return;
    var el = document.createElement("section");
    el.id = "copPanel";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "今日現況洞察");
    el.innerHTML =
      '<div class="cop-head">' +
        '<span class="cop-badge">' + sparkSVG(16) + "</span>" +
        '<div class="cop-title"><strong>今日現況洞察</strong><span id="copMeta"></span></div>' +
        '<button class="cop-x" id="copClose" aria-label="關閉">&times;</button>' +
      "</div>" +
      '<div class="cop-thread" id="copThread"></div>' +
      '<div class="cop-foot">' +
        '<span class="cop-hint">基於畫面上目前的資料</span>' +
        '<button class="cop-dots" id="copDots" aria-label="進階行動">&#8943;</button>' +
        '<div class="cop-menu" id="copMenu" role="menu"></div>' +
      "</div>";
    document.body.appendChild(el);

    document.getElementById("copClose").addEventListener("click", closePanel);
    var dots = document.getElementById("copDots");
    var menu = document.getElementById("copMenu");
    dots.addEventListener("click", function (e) { e.stopPropagation(); menu.classList.toggle("open"); });
    menu.addEventListener("click", function (e) { e.stopPropagation(); });
    document.addEventListener("click", function () { menu.classList.remove("open"); });
  }

  function openPanel() {
    injectPanel();
    document.getElementById("copPanel").classList.add("open");
    document.getElementById("copMeta").textContent = todayStr();
    generateInsights();
  }
  function closePanel() {
    var p = document.getElementById("copPanel");
    if (p) p.classList.remove("open");
    var m = document.getElementById("copMenu");
    if (m) m.classList.remove("open");
  }

  /* --- thread 區塊 --- */
  function threadEl() { return document.getElementById("copThread"); }
  function setThreadLoading(text) {
    threadEl().innerHTML = '<div class="cop-state"><span class="cop-spinner"></span>' + esc(text) + "</div>";
  }
  function renderInsightsBlock(insights) {
    var html = '<div class="cop-block"><ul class="cop-insights">';
    insights.forEach(function (t, i) {
      html += '<li class="cop-insight"><span class="cop-num">' + (i + 1) + "</span><span>" + t + "</span></li>";
    });
    html += "</ul></div>";
    threadEl().innerHTML = html; // 首塊 = 洞察，重置 thread
  }
  function appendActionBlock(label, result) {
    var div = document.createElement("div");
    div.className = "cop-block cop-action-block";
    div.innerHTML =
      '<div class="cop-action-title">' + sparkSVG(14) + " " + esc(label) + "</div>" +
      '<div class="cop-action-body">' + esc(result).replace(/\n/g, "<br>") + "</div>";
    threadEl().appendChild(div);
    if (div.scrollIntoView) div.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function appendActionLoading(label) {
    var div = document.createElement("div");
    div.className = "cop-block cop-action-block";
    div.innerHTML =
      '<div class="cop-action-title">' + sparkSVG(14) + " " + esc(label) + "</div>" +
      '<div class="cop-action-body"><span class="cop-spinner"></span>生成中…</div>';
    threadEl().appendChild(div);
    if (div.scrollIntoView) div.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return div;
  }

  /* --- 動態行動選單 --- */
  function setActions(actions) {
    lastActions = actions || [];
    var menu = document.getElementById("copMenu");
    if (!menu) return;
    if (!lastActions.length) { menu.innerHTML = '<div class="cop-menu-label">目前沒有建議行動</div>'; return; }
    var html = '<div class="cop-menu-label">進階行動</div>';
    lastActions.forEach(function (a) {
      html += '<button class="cop-act" data-action="' + esc(a.id) + '">' + esc(a.label) + "</button>";
    });
    menu.innerHTML = html;
    menu.querySelectorAll(".cop-act").forEach(function (b) {
      b.addEventListener("click", function () {
        menu.classList.remove("open");
        var id = b.getAttribute("data-action");
        var label = b.textContent;
        runAction(id, label);
      });
    });
  }

  /* --- 主流程 --- */
  async function generateInsights() {
    setThreadLoading("洞察生成中…");
    setActions([]);
    var ctx = await scrapeDashboardData();
    fetchCopilotInsight({ mode: "insights", context: ctx })
      .then(function (d) {
        renderInsightsBlock(d.insights || []);
        setActions(d.actions || []);
      })
      .catch(function (e) {
        threadEl().innerHTML = '<div class="cop-state cop-err">洞察生成失敗:' + esc(e.message) + "</div>";
      });
  }

  async function runAction(id, label) {
    var box = appendActionLoading(label);
    var ctx = await scrapeDashboardData();
    fetchCopilotInsight({ mode: "action", action: id, context: ctx })
      .then(function (d) {
        box.querySelector(".cop-action-body").innerHTML = esc(d.result || "").replace(/\n/g, "<br>");
        if (d.followupActions && d.followupActions.length) setActions(d.followupActions);
      })
      .catch(function (e) {
        box.querySelector(".cop-action-body").innerHTML = '<span class="cop-err">失敗:' + esc(e.message) + "</span>";
      });
  }

  /* =========================================================================
   * 4) 樣式
   * ========================================================================= */
  function injectStyle() {
    if (document.getElementById("cop-style")) return;
    var s = document.createElement("style");
    s.id = "cop-style";
    s.textContent = [
      "#copPanel{position:fixed;right:24px;bottom:24px;z-index:61;width:400px;max-width:calc(100vw - 32px);",
      "background:#fff;border:1px solid #e9edf3;border-radius:16px;box-shadow:0 12px 40px rgba(16,24,40,.18);overflow:hidden;display:none;",
      "font-family:'Inter','Segoe UI',-apple-system,'PingFang TC','Microsoft JhengHei',sans-serif;color:#0f172a;}",
      "#copPanel.open{display:block;}",
      ".cop-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #e9edf3;}",
      ".cop-badge{width:30px;height:30px;border-radius:9px;flex-shrink:0;background:#eef2ff;color:#6366f1;display:inline-flex;align-items:center;justify-content:center;}",
      ".cop-title{flex:1;min-width:0;}.cop-title strong{display:block;font-size:15px;font-weight:600;}.cop-title span{font-size:12px;color:#94a3b8;}",
      ".cop-x{background:none;border:none;color:#94a3b8;cursor:pointer;font-size:20px;line-height:1;padding:4px 6px;border-radius:6px;}",
      ".cop-x:hover{background:#f1f5f9;color:#475569;}",
      ".cop-thread{max-height:52vh;overflow-y:auto;}",
      ".cop-block{padding:14px 16px;border-bottom:1px solid #f1f5f9;}",
      ".cop-insights{list-style:none;margin:0;padding:0;display:grid;gap:14px;}",
      ".cop-insight{display:flex;gap:10px;font-size:14px;line-height:1.7;color:#475569;}",
      ".cop-insight b{color:#0f172a;font-weight:600;}",
      ".cop-num{flex-shrink:0;width:20px;height:20px;margin-top:2px;border-radius:50%;font-size:12px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;background:#eef2ff;color:#6366f1;}",
      ".cop-action-block{background:#fcfcfe;}",
      ".cop-action-title{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#4f46e5;margin-bottom:6px;}",
      ".cop-action-body{font-size:14px;line-height:1.7;color:#334155;}",
      ".cop-state{padding:26px 16px;text-align:center;color:#94a3b8;font-size:14px;}",
      ".cop-err{color:#b91c1c;}",
      ".cop-spinner{width:15px;height:15px;border:2px solid #c7d2fe;border-top-color:#6366f1;border-radius:50%;display:inline-block;vertical-align:-3px;margin-right:8px;animation:cop-spin .7s linear infinite;}",
      "@keyframes cop-spin{to{transform:rotate(360deg);}}",
      ".cop-foot{position:relative;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-top:1px solid #e9edf3;background:#fcfcfe;}",
      ".cop-hint{font-size:12px;color:#94a3b8;}",
      ".cop-dots{width:32px;height:32px;border-radius:9px;cursor:pointer;background:#fff;border:1px solid #d9dee7;color:#475569;font-size:18px;line-height:1;display:inline-flex;align-items:center;justify-content:center;}",
      ".cop-dots:hover{background:#f8fafc;}",
      ".cop-menu{position:absolute;right:16px;bottom:52px;width:220px;background:#fff;border:1px solid #e9edf3;border-radius:12px;box-shadow:0 10px 30px rgba(16,24,40,.16);padding:6px;display:none;}",
      ".cop-menu.open{display:block;}",
      ".cop-menu-label{font-size:11px;color:#94a3b8;padding:6px 8px 4px;}",
      ".cop-act{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:none;border:none;border-radius:8px;padding:9px 8px;font-size:13.5px;color:#0f172a;font-family:inherit;cursor:pointer;}",
      ".cop-act:hover{background:#f1f5f9;}",
    ].join("");
    document.head.appendChild(s);
  }

  /* =========================================================================
   * 5) boot
   * ========================================================================= */
  function init() {
    injectStyle();
    if (!injectTrigger()) {
      // 找不到 AIRIS copilot 區塊時的保底：右下角浮動按鈕
      var fab = document.createElement("button");
      fab.id = "copFab";
      fab.style.cssText = "position:fixed;right:24px;bottom:24px;z-index:60;display:inline-flex;align-items:center;gap:8px;background:#6366f1;color:#fff;border:none;border-radius:999px;padding:12px 18px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 6px 20px rgba(99,102,241,.35);";
      fab.innerHTML = sparkSVG(18) + " 產生洞察";
      fab.addEventListener("click", openPanel);
      document.body.appendChild(fab);
    }
  }

  function boot() {
    var tries = 0;
    (function wait() {
      if (document.querySelector(".csm-copilot-strip") || tries > 20) { init(); return; }
      tries++; setTimeout(wait, 400);
    })();
  }
  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
