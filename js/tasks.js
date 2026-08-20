/* =============================================================================
 * tasks.js — 任務管理 Tab（Task Management）
 * -----------------------------------------------------------------------------
 * 自我注入到左側 nav 與內容區，模仿 roster.js（My Accounts）的做法：
 *   - 左側 nav：class="csm-nav-btn" id="snav-tasks"
 *   - 內容區  ：class="tab-pane"    id="pane-tasks"（用 .active class 切換顯示）
 *
 * 權限閘門：只有 gate email（william.wt.lin@appier.com）登入時才注入這個 tab，
 *          其他 CSM 登入完全不會看到。判斷來源與其他頁一致：getUser().email。
 *
 * 後端：Google Apps Script (GAS) REST API。
 *   ⚠️ 為避開 CORS preflight，所有 POST 的 Content-Type 一律用
 *      "text/plain;charset=utf-8"（simple request，不觸發 preflight）。
 * ========================================================================== */
(function () {
  "use strict";

  var GATE_EMAIL = "william.wt.lin@appier.com";

  // 走 worker 伺服器端代理，而不是瀏覽器直接打 GAS。
  // 原因：GAS /exec 在「已登入 Google Workspace」的瀏覽器會 302 轉址到
  //       googleusercontent.com/echo 並回 404（登出/無痕則正常）；且該端點對
  //       URL 極敏感（加任何 query 參數也會壞），用戶端 fetch 無法修。
  //       由 worker 伺服器端（無 Google session）代抓即可穩定拿到 JSON——
  //       與 AR 頁的 /ar-csv 完全同一套做法。worker 內含真正的 GAS 網址。
  var API_URL = "https://csm-brief-worker.williamlin12.workers.dev/tasks";

  /* --------------------------- state --------------------------- */
  var state = {
    tasks: [],
    loading: false,
    error: "",
    marking: null, // Task_ID 正在標記完成
    submitting: false,
  };

  /* --------------------------- helpers --------------------------- */
  function currentEmail() {
    try {
      var u = typeof getUser === "function" ? getUser() : null;
      return u && u.email ? String(u.email).toLowerCase() : "";
    } catch (e) {
      return "";
    }
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });
  }

  // Due_Date 可能是 ISO ("2026-08-15T07:00:00.000Z") 或純日期 → 顯示 YYYY-MM-DD
  function formatDate(v) {
    if (!v) return "—";
    if (typeof v === "string") {
      var m = v.match(/^(\d{4}-\d{2}-\d{2})/);
      if (m) return m[1];
    }
    var d = new Date(v);
    return isNaN(d.getTime()) ? String(v) : d.toISOString().slice(0, 10);
  }

  // Reminder_Freq 友善顯示："5_Days" → "提前 5 天提醒"
  function formatReminder(freq) {
    if (!freq || freq === "None") return "不提醒";
    if (freq === "Daily") return "每日提醒";
    var m = String(freq).match(/^(\d+)_Days$/);
    if (m) return "提前 " + m[1] + " 天提醒";
    return String(freq);
  }

  function statusMeta(status) {
    var k = String(status || "").toLowerCase();
    if (k === "done")
      return { label: "已完成", bg: "#dcfce7", fg: "#166534", dot: "#22c55e" };
    if (k === "overdue")
      return { label: "已逾期", bg: "#fee2e2", fg: "#991b1b", dot: "#ef4444" };
    if (k === "pending")
      return { label: "待處理", bg: "#fef3c7", fg: "#92400e", dot: "#f59e0b" };
    return { label: status || "—", bg: "#f1f5f9", fg: "#475569", dot: "#94a3b8" };
  }

  /* --------------------------- API --------------------------- */
  function fetchTasks() {
    state.loading = true;
    state.error = "";
    renderList();
    return fetch(API_URL, { cache: "no-store", redirect: "follow" })
      .then(function (r) {
        if (!r.ok) throw new Error("載入失敗 (HTTP " + r.status + ")");
        return r.json();
      })
      .then(function (data) {
        state.tasks = Array.isArray(data.tasks) ? data.tasks : [];
        state.loading = false;
        renderList();
        updateNavCount();
      })
      .catch(function (e) {
        state.loading = false;
        state.error = e.message || "無法載入任務清單";
        renderList();
      });
  }

  // POST：一律 text/plain 以避開 preflight
  function postAction(payload) {
    return fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
    }).then(function (r) {
      return r.text().then(function (text) {
        var data = null;
        try {
          data = JSON.parse(text);
        } catch (e) {
          /* GAS 偶爾回非 JSON，容忍 */
        }
        if (!r.ok) throw new Error("伺服器錯誤 (HTTP " + r.status + ")");
        if (data && String(data.status).toLowerCase() === "error")
          throw new Error(data.message || "API 回傳錯誤");
        return data;
      });
    });
  }

  /* --------------------------- actions (public) --------------------------- */
  var TM = {};

  TM.open = function () {
    // 切換 tab：完全模仿 snavSwitch 的行為（.tab-pane / .csm-nav-btn 用 active class）
    var panes = document.querySelectorAll(".tab-pane");
    for (var i = 0; i < panes.length; i++) panes[i].classList.remove("active");
    var navs = document.querySelectorAll(".csm-nav-btn");
    for (var j = 0; j < navs.length; j++) navs[j].classList.remove("active");
    var pane = document.getElementById("pane-tasks");
    var nav = document.getElementById("snav-tasks");
    if (pane) pane.classList.add("active");
    if (nav) nav.classList.add("active");
    // 更新上方麵包屑（原生 snavSwitch 會設，但我們是自己切，所以手動設）
    var crumb = document.getElementById("crumbCur");
    if (crumb) crumb.textContent = "任務管理";
    fetchTasks();
  };

  TM.refresh = function () {
    fetchTasks();
  };

  TM.markDone = function (taskId) {
    if (state.marking) return;
    state.marking = taskId;
    state.error = "";
    renderList();
    postAction({ action: "update_status", Task_ID: taskId, Status: "Done" })
      .then(function () {
        state.marking = null;
        return fetchTasks(); // 成功後重新抓取刷新
      })
      .catch(function (e) {
        state.marking = null;
        state.error = e.message || "更新狀態失敗";
        renderList();
      });
  };

  TM.onReminderChange = function (mode) {
    var row = document.getElementById("tm-custom-row");
    if (row) row.style.display = mode === "custom" ? "flex" : "none";
  };

  TM.submit = function (ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    var elName = document.getElementById("tm-name");
    var elType = document.getElementById("tm-type");
    var elDue = document.getElementById("tm-due");
    var elDays = document.getElementById("tm-days");
    var mode = (
      document.querySelector('input[name="tm-reminder"]:checked') || {}
    ).value || "none";

    var name = (elName.value || "").trim();
    var due = elDue.value || "";
    var days = Number(elDays ? elDays.value : 0);

    var errBox = document.getElementById("tm-form-msg");
    function showMsg(type, text) {
      if (!errBox) return;
      errBox.style.display = "block";
      errBox.className = "tm-banner tm-banner-" + type;
      errBox.textContent = text;
    }
    function clearMsg() {
      if (errBox) errBox.style.display = "none";
    }
    clearMsg();

    // 驗證
    if (!name) return showMsg("error", "請輸入任務名稱");
    if (!due) return showMsg("error", "請選擇截止日");
    if (mode === "custom" && (!days || days < 1))
      return showMsg("error", "自訂提醒天數需為 1 以上的數字");

    // 組裝 Reminder_Freq
    var reminderFreq = "None";
    if (mode === "daily") reminderFreq = "Daily";
    else if (mode === "custom") reminderFreq = days + "_Days";

    state.submitting = true;
    setSubmitBtn(true);
    postAction({
      action: "add_task",
      Task_Name: name,
      Task_Type: elType.value,
      Due_Date: due, // <input type="date"> 已是 YYYY-MM-DD
      Reminder_Freq: reminderFreq,
    })
      .then(function () {
        state.submitting = false;
        setSubmitBtn(false);
        resetForm();
        showMsg("success", "任務已新增 ✔");
        setTimeout(clearMsg, 3000);
        return fetchTasks();
      })
      .catch(function (e) {
        state.submitting = false;
        setSubmitBtn(false);
        showMsg("error", e.message || "新增任務失敗");
      });
    return false;
  };

  function setSubmitBtn(loading) {
    var b = document.getElementById("tm-submit");
    if (!b) return;
    b.disabled = loading;
    b.innerHTML = loading
      ? '<span class="tm-spinner"></span> 新增中…'
      : "新增任務";
  }

  function resetForm() {
    var f = document.getElementById("tm-form");
    if (f) f.reset();
    TM.onReminderChange("none");
  }

  function updateNavCount() {
    var el = document.getElementById("snc-tasks");
    if (!el) return;
    var open = state.tasks.filter(function (t) {
      return String(t.Status).toLowerCase() !== "done";
    }).length;
    el.textContent = open;
  }

  window.TM = TM;

  /* --------------------------- render (list) --------------------------- */
  function renderList() {
    var box = document.getElementById("tm-list");
    if (!box) return;

    var html = "";
    if (state.error)
      html += '<div class="tm-banner tm-banner-error">' + esc(state.error) + "</div>";

    if (state.loading) {
      html +=
        '<div class="tm-center"><span class="tm-spinner tm-spinner-dark"></span> <span class="tm-muted">載入任務中…</span></div>';
    } else if (state.tasks.length === 0) {
      html += '<div class="tm-empty">目前沒有任務，於右側新增一筆吧。</div>';
    } else {
      html += '<ul class="tm-ul">';
      state.tasks.forEach(function (t) {
        var meta = statusMeta(t.Status);
        var isDone = String(t.Status).toLowerCase() === "done";
        var marking = state.marking === t.Task_ID;
        html +=
          '<li class="tm-row" data-cop-item' +
          ' data-cop-name="' + esc(t.Task_Name) + '"' +
          ' data-cop-status="' + esc(String(t.Status || "").toLowerCase()) + '"' +
          ' data-cop-due="' + esc(formatDate(t.Due_Date)) + '"' +
          ' data-cop-reminder="' + esc(t.Reminder_Freq || "") + '">' +
          '<div class="tm-row-main">' +
          '<div class="tm-task-name">' +
          esc(t.Task_Name) +
          "</div>" +
          '<div class="tm-meta">' +
          '<span class="tm-chip">' + esc(t.Task_Type || "—") + "</span>" +
          '<span class="tm-chip">📅 ' + esc(formatDate(t.Due_Date)) + "</span>" +
          '<span class="tm-chip">🔔 ' + esc(formatReminder(t.Reminder_Freq)) + "</span>" +
          "</div>" +
          "</div>" +
          '<div class="tm-row-side">' +
          '<span class="tm-badge" style="background:' + meta.bg + ";color:" + meta.fg + '">' +
          '<span class="tm-dot" style="background:' + meta.dot + '"></span>' +
          esc(meta.label) +
          "</span>" +
          (isDone
            ? ""
            : '<button class="tm-btn tm-btn-primary tm-btn-sm" ' +
              (marking ? "disabled" : "") +
              " onclick=\"TM.markDone('" + esc(t.Task_ID) + "')\">" +
              (marking ? "更新中…" : "標記完成") +
              "</button>") +
          "</div>" +
          "</li>";
      });
      html += "</ul>";
    }
    box.innerHTML = html;
  }

  /* --------------------------- inject nav + pane --------------------------- */
  function navIconSVG() {
    return (
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">' +
      '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>' +
      '<rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 14 2 2 4-4"/></svg>'
    );
  }

  function injectNav() {
    // nav 按鈕：接在 FAQ（或最後一個 nav）之後
    var anchor =
      document.getElementById("snav-faq") ||
      document.getElementById("snav-roster") ||
      document.getElementById("snav-brief");
    if (!anchor || !anchor.parentNode) return false;

    var btn = document.createElement("button");
    btn.className = "csm-nav-btn";
    btn.id = "snav-tasks";
    btn.setAttribute("onclick", "TM.open()");
    btn.innerHTML =
      navIconSVG() +
      '<span style="flex:1;text-align:left">任務管理</span>' +
      '<span class="csm-nav-count" id="snc-tasks">—</span>';
    anchor.parentNode.appendChild(btn);

    // 內容 pane：接在既有 .tab-pane 後面（同一個父節點）
    var paneAnchor =
      document.getElementById("pane-ar") ||
      document.getElementById("pane-brief") ||
      document.querySelector(".tab-pane");
    if (!paneAnchor || !paneAnchor.parentNode) return false;

    var pane = document.createElement("div");
    pane.className = "tab-pane";
    pane.id = "pane-tasks";
    pane.setAttribute("data-cop-module", "tasks"); // Copilot 抓取用
    pane.innerHTML = paneHTML();
    paneAnchor.parentNode.appendChild(pane);

    injectStyle();
    return true;
  }

  function paneHTML() {
    return (
      '<div class="tm-wrap">' +
      '<div class="tm-head">' +
      "<h1>任務管理</h1>" +
      '<p class="tm-sub">Task Management · 排程提醒由後端自動寄送</p>' +
      "</div>" +
      '<div class="tm-grid">' +
      /* 區塊 1：列表 */
      '<section class="tm-card">' +
      '<div class="tm-card-head"><h2>任務列表</h2>' +
      '<button class="tm-btn tm-btn-ghost" onclick="TM.refresh()">重新整理</button></div>' +
      '<div id="tm-list"></div>' +
      "</section>" +
      /* 區塊 2：新增 */
      '<section class="tm-card">' +
      '<div class="tm-card-head"><h2>新增任務</h2></div>' +
      '<form id="tm-form" onsubmit="return TM.submit(event)">' +
      field("任務名稱 (Task Name)",
        '<input class="tm-input" id="tm-name" type="text" placeholder="例如：Mannings 每月發票上傳">') +
      field("任務類型 (Task Type)",
        '<select class="tm-input" id="tm-type">' +
          '<option value="Single">Single（單次）</option>' +
          '<option value="Recurring">Recurring（週期）</option>' +
        "</select>") +
      field("截止日 (Due Date)",
        '<input class="tm-input" id="tm-due" type="date">') +
      field("提醒方式 (Reminder Setting)",
        '<div class="tm-radios">' +
          radio("none", "不提醒", true) +
          radio("daily", "每日提醒", false) +
          radio("custom", "自訂提前天數", false) +
        "</div>" +
        '<div class="tm-custom-row" id="tm-custom-row" style="display:none">' +
          '<span class="tm-muted">提前</span>' +
          '<input class="tm-input tm-num" id="tm-days" type="number" min="1" value="7">' +
          '<span class="tm-muted">天提醒（送出格式：N_Days）</span>' +
        "</div>") +
      '<div class="tm-banner" id="tm-form-msg" style="display:none"></div>' +
      '<button class="tm-btn tm-btn-primary tm-btn-block" id="tm-submit" type="submit">新增任務</button>' +
      "</form>" +
      "</section>" +
      "</div>" +
      "</div>"
    );
  }

  function field(label, inner) {
    return (
      '<div class="tm-field"><label class="tm-label">' +
      label +
      "</label>" +
      inner +
      "</div>"
    );
  }
  function radio(value, label, checked) {
    return (
      '<label class="tm-radio' + (checked ? " tm-radio-on" : "") + '">' +
      '<input type="radio" name="tm-reminder" value="' + value + '"' +
      (checked ? " checked" : "") +
      ' onchange="TM.onReminderChange(this.value); ' +
      "var ls=this.closest('.tm-radios').querySelectorAll('.tm-radio');" +
      "for(var i=0;i<ls.length;i++)ls[i].classList.remove('tm-radio-on');" +
      "this.parentNode.classList.add('tm-radio-on');\"" +
      ' style="display:none">' +
      label +
      "</label>"
    );
  }

  /* --------------------------- styles --------------------------- */
  function injectStyle() {
    if (document.getElementById("tm-style")) return;
    var s = document.createElement("style");
    s.id = "tm-style";
    s.textContent = [
      ".tm-wrap{font-family:inherit;color:#0f172a;max-width:1120px;margin:0 auto;padding:8px 4px 40px;}",
      ".tm-head{margin-bottom:20px;}",
      ".tm-head h1{font-size:24px;font-weight:700;margin:0;letter-spacing:-.02em;}",
      ".tm-sub{color:#64748b;margin:6px 0 0;font-size:14px;}",
      ".tm-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:18px;align-items:start;}",
      "@media(max-width:900px){.tm-grid{grid-template-columns:1fr;}}",
      ".tm-card{background:#fff;border:1px solid #e9edf3;border-radius:16px;box-shadow:0 1px 2px rgba(16,24,40,.04),0 8px 24px rgba(16,24,40,.05);padding:18px;}",
      ".tm-card-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}",
      ".tm-card-head h2{font-size:16px;font-weight:650;margin:0;}",
      ".tm-ul{list-style:none;margin:0;padding:0;display:grid;gap:10px;}",
      ".tm-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 16px;border:1px solid #eef1f6;border-radius:12px;background:#fcfcfe;transition:box-shadow .15s,border-color .15s;}",
      ".tm-row:hover{border-color:#dfe3ea;box-shadow:0 2px 8px rgba(16,24,40,.05);}",
      ".tm-row-main{min-width:0;}",
      ".tm-task-name{font-weight:600;font-size:15px;margin-bottom:6px;}",
      ".tm-meta{display:flex;flex-wrap:wrap;gap:6px;}",
      ".tm-chip{font-size:12px;color:#475569;background:#f1f5f9;border-radius:999px;padding:3px 10px;white-space:nowrap;}",
      ".tm-row-side{display:flex;flex-direction:column;align-items:flex-end;flex-shrink:0;gap:8px;}",
      ".tm-badge{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;border-radius:999px;padding:5px 12px;}",
      ".tm-dot{width:7px;height:7px;border-radius:50%;display:inline-block;}",
      ".tm-field{display:grid;gap:7px;margin-bottom:16px;}",
      ".tm-label{font-size:13px;font-weight:600;color:#334155;}",
      ".tm-input{width:100%;box-sizing:border-box;padding:10px 12px;font-size:14px;border:1px solid #d9dee7;border-radius:10px;background:#fff;color:#0f172a;outline:none;transition:border-color .15s,box-shadow .15s;font-family:inherit;}",
      ".tm-input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.15);}",
      ".tm-num{width:88px;text-align:center;}",
      ".tm-radios{display:flex;gap:8px;flex-wrap:wrap;}",
      ".tm-radio{cursor:pointer;user-select:none;font-size:13.5px;font-weight:600;color:#475569;border:1px solid #d9dee7;background:#fff;border-radius:999px;padding:8px 14px;transition:all .15s;}",
      ".tm-radio:hover{border-color:#c7cdd8;}",
      ".tm-radio-on{background:#eef2ff;border-color:#6366f1;color:#4338ca;}",
      ".tm-custom-row{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:13px;}",
      ".tm-muted{color:#64748b;font-size:13px;}",
      ".tm-btn{font-family:inherit;cursor:pointer;border-radius:10px;font-weight:600;transition:background .15s,transform .05s;border:none;}",
      ".tm-btn:disabled{opacity:.6;cursor:not-allowed;}",
      ".tm-btn-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:#6366f1;color:#fff;padding:9px 16px;font-size:13.5px;}",
      ".tm-btn-primary:hover:not(:disabled){background:#4f46e5;}",
      ".tm-btn-primary:active:not(:disabled){transform:translateY(1px);}",
      ".tm-btn-sm{padding:7px 14px;font-size:13px;}",
      ".tm-btn-block{width:100%;padding:12px;font-size:15px;}",
      ".tm-btn-ghost{background:#fff;color:#475569;border:1px solid #d9dee7;padding:6px 12px;font-size:13px;}",
      ".tm-btn-ghost:hover{background:#f8fafc;}",
      ".tm-banner{border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:12px;}",
      ".tm-banner-error{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;}",
      ".tm-banner-success{background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;}",
      ".tm-center{display:flex;align-items:center;gap:10px;justify-content:center;padding:28px 0;}",
      ".tm-empty{text-align:center;color:#94a3b8;padding:36px 0;font-size:14px;}",
      ".tm-spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.5);border-top-color:#fff;border-radius:50%;display:inline-block;animation:tm-spin .7s linear infinite;vertical-align:-2px;}",
      ".tm-spinner-dark{border-color:#c7d2fe;border-top-color:#6366f1;}",
      "@keyframes tm-spin{to{transform:rotate(360deg);}}",
    ].join("");
    document.head.appendChild(s);
  }

  /* --------------------------- boot --------------------------- */
  function init() {
    if (currentEmail() !== GATE_EMAIL) return; // 非本人不注入
    if (document.getElementById("snav-tasks")) return; // 避免重複
    if (!injectNav()) return;

    // 切到其他 tab 時，原生 snavSwitch 不認得我們動態加的按鈕，任務管理會一直亮著。
    // 這裡包一層：任何一次 snavSwitch（＝點了別的 tab）都先把 tasks 的高亮與畫面關掉，
    // 再交還給原本的處理（它會正確更新麵包屑與其他分頁）。
    if (typeof window.snavSwitch === "function" && !window.__tmSnavWrapped) {
      var _origSnav = window.snavSwitch;
      window.snavSwitch = function () {
        var nb = document.getElementById("snav-tasks");
        if (nb) nb.classList.remove("active");
        var pn = document.getElementById("pane-tasks");
        if (pn) pn.classList.remove("active");
        return _origSnav.apply(this, arguments);
      };
      window.__tmSnavWrapped = true;
    }
    // 預先抓一次以顯示 nav 數字（不切換畫面）
    fetch(API_URL, { cache: "no-store", redirect: "follow" })
      .then(function (r) { return r.ok ? r.json() : { tasks: [] }; })
      .then(function (d) {
        state.tasks = Array.isArray(d.tasks) ? d.tasks : [];
        updateNavCount();
      })
      .catch(function () {});
  }

  function boot() {
    var tries = 0;
    (function wait() {
      // 等 getUser() 準備好（登入後才會有 email）
      if (currentEmail()) {
        init();
        return;
      }
      if (tries++ > 40) return; // ~20 秒後放棄
      setTimeout(wait, 500);
    })();
  }

  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
