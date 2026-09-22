/* ------------------------------------------------------------------
 * roster.js — "My Accounts"
 * Account-first roster for the signed-in CSM, following the CSM-brief
 * practice: accounts come from the Worker /mapping endpoint and live Jira
 * tickets from /tickets?csm=<email>. No Salesforce report, no manual
 * connect — the same per-CSM source the brief uses.
 *
 * Additive module: adds a sidebar item + pane, wraps snavSwitch, touches
 * nothing else.
 *
 * ── Copilot data (2026-08-20) ── pane carries data-cop-module="accounts";
 *    each card carries data-cop-item + data-cop-{name,health,tickets,renew-days}
 *    so scrapeDashboardData() can read the roster cleanly.
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  var WORKER = 'https://csm-brief-worker.williamlin12.workers.dev';
  var SUMMARIES = {};   // account AI summaries (daily sync), keyed by account id
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }
  ready(function () { tryInit(0); });
  function tryInit(n) {
    var briefBtn = document.getElementById('snav-brief');
    var briefPane = document.getElementById('pane-brief');
    if (!briefBtn || !briefPane) { if (n < 40) setTimeout(function () { tryInit(n + 1); }, 400); return; }
    if (document.getElementById('snav-roster')) return;
    injectNav(briefBtn);
    injectPane(briefPane);
    wrapSnav();
  }
  function injectNav(briefBtn) {
    var btn = briefBtn.cloneNode(true);
    btn.id = 'snav-roster';
    btn.classList.remove('active');
    btn.setAttribute('onclick', 'rosterShow()');
    var label = btn.querySelector('span:not(.csm-nav-count)');
    if (label) label.textContent = 'My Accounts';
    var badge = btn.querySelector('.csm-nav-count');
    if (badge) { badge.id = 'snc-roster'; badge.textContent = ''; badge.style.display = 'none'; }
    briefBtn.parentNode.insertBefore(btn, briefBtn.nextSibling);
  }
  function injectPane(briefPane) {
    var p = document.createElement('div');
    p.id = 'pane-roster';
    p.className = 'tab-pane';
    p.setAttribute('data-cop-module', 'accounts'); // Copilot 抓取用
    p.innerHTML = '<div id="rosterBody" style="padding:4px 2px"></div>';
    briefPane.parentNode.appendChild(p);
  }
  function wrapSnav() {
    if (window.__rosterWrapped || typeof window.snavSwitch !== 'function') return;
    var orig = window.snavSwitch;
    window.snavSwitch = function () { hideRoster(); return orig.apply(this, arguments); };
    window.__rosterWrapped = true;
  }
  function hideRoster() {
    var p = document.getElementById('pane-roster'); if (p) p.classList.remove('active');
    var b = document.getElementById('snav-roster'); if (b) b.classList.remove('active');
  }
  window.rosterShow = function () {
    document.querySelectorAll('.tab-pane').forEach(function (e) { e.classList.remove('active'); });
    document.querySelectorAll('.csm-nav-btn').forEach(function (e) { e.classList.remove('active'); });
    var p = document.getElementById('pane-roster'); if (p) p.classList.add('active');
    var b = document.getElementById('snav-roster'); if (b) b.classList.add('active');
    // Bug fix (2026-09-22, reported by William): rosterShow() switched the pane/nav
    // highlight but never touched the top breadcrumb, so it kept showing whichever
    // tab you'd been on before — e.g. "Issues > Issue tracking" while My Accounts
    // was the active pane. snavSwitch() sets this for the native tabs; we do it
    // manually here since My Accounts is wired to its own onclick, not snavSwitch.
    var top = document.getElementById('crumbTop'); if (top) top.textContent = 'Accounts';
    var cur = document.getElementById('crumbCur'); if (cur) cur.textContent = 'My Accounts';
    var sub = document.getElementById('headerSub'); if (sub) sub.textContent = 'Your accounts, live from Jira + the Salesforce mapping';
    render();
  };
  function currentEmail() {
    try { if (typeof arGetCurrentEmail === 'function') { var e = arGetCurrentEmail(); if (e) return String(e).toLowerCase(); } } catch (_) {}
    try { if (typeof getUser === 'function') { var u = getUser(); if (u && u.email) return String(u.email).toLowerCase(); } } catch (_) {}
    return '';
  }
  // ── 2026-09-22 fix (per William): "My Accounts" ticket counts were driven by
  // the Worker's /tickets?csm= endpoint, which pulls a different (broader/staler)
  // set than what "Issue tracking" (and "To be done") show. My Accounts should
  // reflect the exact same sets those two tabs actually display and count:
  //   - `filteredData` (config.js) — Issue tracking: reporter=me, minus
  //     onboarding-wizard tickets and ignored tickets (the sidebar badge itself
  //     was fixed in this same round — it was wrongly counting those excluded
  //     tickets too, e.g. showing 17 when only 13 were really tracked).
  //   - `filteredTbdData` (config.js) — To be done: assignee=me, statusCategory
  //     != Done, minus ignored tickets. A CSM's account work isn't only what
  //     they personally reported; tickets assigned to them belong too.
  // Using the raw, unfiltered `allData`/`tbdData` here would reproduce the same
  // kind of over/under-count per account, so this reads the filtered globals.
  //
  // Data-shape note: fetchAllIssues()/fetchAssignedIssues() (js/api.js) already
  // flatten each Jira issue to {key, summary, status, assignee, reporter,
  // created, resolutiondate} — NOT the raw {fields:{...}} shape. Read the flat
  // properties directly (issue.summary, issue.status, issue.assignee).
  //
  // Local alias fallback for cases where a ticket's [Bracket] client tag doesn't
  // literally match the roster's account display name (dashboard.js's own
  // ALIASES table has one such case: 田原香 tickets are tagged "[Qchicken]").
  var CLIENT_ALIASES = { '田原香': ['qchicken'], 'qchicken': ['田原香'] };
  function normKey(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9一-鿿]/g, ''); }
  function sameClient(ticketClient, accountName) {
    var a = normKey(ticketClient), b = normKey(accountName);
    if (!a || !b) return false;
    if (a === b) return true;
    var alt = CLIENT_ALIASES[String(accountName || '').toLowerCase()] || CLIENT_ALIASES[accountName] || [];
    return alt.some(function (x) { return normKey(x) === a; });
  }
  // Reads dashboard.js/config.js's shared `filteredData`/`filteredTbdData`/
  // `extractClient`/`isDone` bare globals (classic <script> tags share one
  // top-level scope — same page, loaded earlier). Returns null (not []) when
  // neither Issue tracking nor To be done has loaded yet, so the caller knows
  // to fall back rather than showing a false "0 tickets".
  function myTicketsForAccount(accountName) {
    try {
      if (typeof filteredData === 'undefined' || typeof filteredTbdData === 'undefined') return null;
      if ((!filteredData || !filteredData.length) && (!filteredTbdData || !filteredTbdData.length)) return null;
      if (typeof extractClient !== 'function' || typeof isDone !== 'function') return null;
    } catch (_) { return null; }
    var seenKeys = {};
    var out = [];
    function collect(list) {
      (list || []).forEach(function (issue) {
        if (seenKeys[issue.key]) return; // dedupe — same ticket could be both reported AND assigned to me
        var status = issue.status || '';
        if (isDone(status)) return;
        var client = extractClient(issue.summary || '');
        if (!client || !sameClient(client, accountName)) return;
        seenKeys[issue.key] = true;
        out.push({
          key: issue.key,
          title: String(issue.summary || '').replace(/^\s*\[[^\]]*\]\s*/, '').trim() || issue.key,
          status: status,
          assignee: issue.assignee || ''
        });
      });
    }
    collect(filteredData);     // Issue tracking (reported by me)
    collect(filteredTbdData);  // To be done (assigned to me)
    return out;
  }
  function product(o) { var m = String(o).match(/^[ (（]*([A-Za-z]{2,4})/); return m ? m[1].toUpperCase() : '?'; }
  function daysTo(iso) { if (!iso) return null; var t = new Date(iso); if (isNaN(t)) return null; var today = new Date(); today.setHours(0, 0, 0, 0); return Math.round((t - today) / 86400000); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function setBody(html) { var b = document.getElementById('rosterBody'); if (b) b.innerHTML = html; }
  function note(html) { return '<div style="padding:24px;color:#475569;font-size:14px;line-height:1.5">' + html + '</div>'; }
  async function render() {
    var email = currentEmail();
    setBody('<p style="color:#64748b">Loading your accounts…</p>');
    if (!email) { setBody(note('Sign in to see the accounts assigned to you.')); return; }
    var map, tix = {};
    try {
      var mr = await fetch(WORKER + '/mapping?t=' + Date.now());
      map = await mr.json();
    } catch (e) { setBody(note('Could not load accounts. ' + esc(e.message))); return; }
    var mine = (map && map[email]) || [];
    if (!mine.length) {
      setBody(note('No accounts are assigned to <b>' + esc(email) + '</b> yet.<br>' +
        '<span style="color:#94a3b8">Accounts flow from the OP-summary sheet (CSM Owner column). Once yours are in the sheet, they appear here automatically.</span>'));
      return;
    }
    // Ticket source of truth is now Issue tracking's + To be done's own fetched
    // sets (see myTicketsForAccount above). The Worker's /tickets?csm= call is
    // kept ONLY as a fallback for the (rare) case neither tab has loaded yet —
    // e.g. My Accounts opened before the app's initial refresh() finished.
    var useLocal = mine.some(function (a) { return myTicketsForAccount(a.account) !== null; });
    if (!useLocal) {
      try {
        var tr = await fetch(WORKER + '/tickets?csm=' + encodeURIComponent(email) + '&t=' + Date.now());
        if (tr.ok) tix = await tr.json();
      } catch (_) { tix = {}; }
    }
    // AI summaries from the daily sync (best-effort — cards render without them)
    try {
      var sr = await fetch('accountSummaries.json?t=' + Date.now());
      if (sr.ok) SUMMARIES = await sr.json();
    } catch (_) { SUMMARIES = {}; }
    var list = mine.map(function (a) {
      var d = daysTo(a.endDate);
      var opps = a.opportunities || [];
      var prods = {}; opps.forEach(function (o) { prods[product(o && o.name ? o.name : o)] = 1; });
      var tickets = useLocal ? (myTicketsForAccount(a.account) || []) : (tix[a.id] || []);
      return {
        id: a.id, name: a.account, endDate: a.endDate || '', days: d, upcoming: (d != null && d >= 0),
        products: Object.keys(prods).sort(), opps: opps, tickets: tickets
      };
    }).sort(function (a, b) {
      if (a.upcoming !== b.upcoming) return a.upcoming ? -1 : 1;   // upcoming renewals first
      if (a.upcoming && b.upcoming) return a.days - b.days;         // soonest first
      return (b.tickets.length) - (a.tickets.length);              // else busiest first
    });
    var badge = document.getElementById('snc-roster');
    if (badge) { badge.textContent = list.length; badge.style.display = ''; }
    setBody(header(email, list.length) + list.map(card).join(''));
  }
  function renewChip(days, upcoming) {
    if (days == null) return '<span style="font-size:12px;color:#94a3b8">no contract date</span>';
    if (!upcoming) return '<span style="font-size:12px;font-weight:600;color:#94a3b8">expired ' + (-days) + 'd ago</span>';
    var col = days <= 14 ? '#dc2626' : days <= 35 ? '#d97706' : '#16a34a';
    return '<span style="font-size:12px;font-weight:600;color:' + col + '">renews in ' + days + 'd</span>';
  }
  function ticketRow(t) {
    var st = esc(String(t.status || '').replace(/-/g, ' '));
    return '<div style="display:flex;justify-content:space-between;gap:12px;font-size:12px;color:#475569;padding:3px 0;border-top:1px solid #f1f5f9">' +
      '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:66%">' +
        '<span style="font-family:\'DM Mono\',monospace;color:#6366f1">' + esc(t.key) + '</span> ' + esc(t.title || '') + '</span>' +
      '<span style="white-space:nowrap;color:#64748b">' + st + (t.assignee ? ' · ' + esc(t.assignee) : '') + '</span></div>';
  }
  function card(a) {
    var s = SUMMARIES[a.id] || null;
    var hcol = s && s.health === 'red' ? '#dc2626' : (s && s.health === 'yellow' ? '#d97706' : '#16a34a');
    var chips = a.products.map(function (p) {
      return '<span style="display:inline-block;font-size:11px;font-weight:600;background:#eef2ff;color:#4338ca;border-radius:5px;padding:1px 7px;margin-right:4px">' + esc(p) + '</span>';
    }).join('');
    // summary-first: the digest is the content; tickets are tucked away.
    var summaryHtml = (s && s.summary)
      ? '<div style="font-size:14px;color:#1e293b;line-height:1.55;margin-top:8px">' + esc(s.summary) + '</div>'
      : '<div style="font-size:13px;color:#94a3b8;margin-top:8px">Daily summary not generated yet — it publishes each morning.</div>';
    var followHtml = (s && s.followUp)
      ? '<div style="margin-top:9px;background:#eef2ff;border-radius:8px;padding:9px 12px;font-size:13px;color:#3730a3;line-height:1.5"><b>▶ Follow up:</b> ' + esc(s.followUp) + '</div>'
      : '';
    var tk = a.tickets || [];
    var ticketsHtml = tk.length ? tk.map(ticketRow).join('') : '<div style="font-size:12px;color:#94a3b8;padding:4px 0">No open Jira tickets</div>';
    // ── Copilot data-* (2026-08-20) ── clean machine values for scrapeDashboardData()
    var copAttrs = ' data-cop-item' +
      ' data-cop-name="' + esc(a.name) + '"' +
      ' data-cop-health="' + ((s && s.health) ? esc(s.health) : '') + '"' +
      ' data-cop-tickets="' + tk.length + '"' +
      ' data-cop-renew-days="' + (a.days != null ? a.days : '') + '"';
    return '' +
      '<div' + copAttrs + ' style="border:1px solid #e2e8f0;border-left:4px solid ' + hcol + ';border-radius:12px;padding:14px 16px;margin-bottom:12px;background:#fff">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">' +
          '<div style="font-size:16px;font-weight:700;color:#0f172a">' + esc(a.name) + '</div>' +
          '<div style="text-align:right">' + renewChip(a.days, a.upcoming) +
            '<div style="font-size:12px;color:#64748b">contract end ' + esc(a.endDate || '—') + '</div></div>' +
        '</div>' +
        (chips ? '<div style="margin-top:8px">' + chips + '</div>' : '') +
        summaryHtml +
        followHtml +
        '<details style="margin-top:10px">' +
          '<summary style="cursor:pointer;font-size:12px;color:#64748b;outline:none">' +
            tk.length + ' open ticket' + (tk.length === 1 ? '' : 's') + ' · ' + a.opps.length + ' opportunit' + (a.opps.length === 1 ? 'y' : 'ies') + ' — show' +
          '</summary>' +
          '<div style="margin-top:6px">' + ticketsHtml + '</div>' +
        '</details>' +
      '</div>';
  }
  function header(email, n) {
    return '<div style="margin:4px 0 14px">' +
      '<div style="font-size:20px;font-weight:800;color:#0f172a">My Accounts</div>' +
      '<div style="font-size:13px;color:#64748b">' + n + ' account' + (n === 1 ? '' : 's') + ' assigned to ' + esc(email) + ' · live from Jira</div></div>';
  }
})();
