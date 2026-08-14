/* ------------------------------------------------------------------
 * roster.js — "My Accounts"
 * Account-first roster for the signed-in CSM, following the CSM-brief
 * practice: accounts come from the Worker /mapping endpoint and live Jira
 * tickets from /tickets?csm=<email>. No Salesforce report, no manual
 * connect — the same per-CSM source the brief uses.
 *
 * Additive module: adds a sidebar item + pane, wraps snavSwitch, touches
 * nothing else.
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  var WORKER = 'https://csm-brief-worker.williamlin12.workers.dev';

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
    var sub = document.getElementById('headerSub'); if (sub) sub.textContent = 'Your accounts, live from Jira + the Salesforce mapping';
    render();
  };

  function currentEmail() {
    try { if (typeof arGetCurrentEmail === 'function') { var e = arGetCurrentEmail(); if (e) return String(e).toLowerCase(); } } catch (_) {}
    try { if (typeof getUser === 'function') { var u = getUser(); if (u && u.email) return String(u.email).toLowerCase(); } } catch (_) {}
    return '';
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
    // live Jira tickets for this CSM's accounts (best-effort — cards still render without)
    try {
      var tr = await fetch(WORKER + '/tickets?csm=' + encodeURIComponent(email) + '&t=' + Date.now());
      if (tr.ok) tix = await tr.json();
    } catch (_) { tix = {}; }

    var list = mine.map(function (a) {
      var d = daysTo(a.endDate);
      var opps = a.opportunities || [];
      var prods = {}; opps.forEach(function (o) { prods[product(o && o.name ? o.name : o)] = 1; });
      var tickets = tix[a.id] || [];
      return {
        name: a.account, endDate: a.endDate || '', days: d, upcoming: (d != null && d >= 0),
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
    var chips = a.products.map(function (p) {
      return '<span style="display:inline-block;font-size:11px;font-weight:600;background:#eef2ff;color:#4338ca;border-radius:5px;padding:1px 7px;margin-right:4px">' + esc(p) + '</span>';
    }).join('');
    var tk = a.tickets || [];
    var ticketsHtml = tk.length
      ? tk.slice(0, 8).map(ticketRow).join('') + (tk.length > 8 ? '<div style="font-size:11px;color:#94a3b8;padding-top:3px">+' + (tk.length - 8) + ' more</div>' : '')
      : '<div style="font-size:12px;color:#94a3b8;padding-top:4px">No open Jira tickets</div>';
    return '' +
      '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-bottom:12px;background:#fff">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">' +
          '<div style="font-size:16px;font-weight:700;color:#0f172a">' + esc(a.name) + '</div>' +
          '<div style="text-align:right">' + renewChip(a.days, a.upcoming) +
            '<div style="font-size:12px;color:#64748b">contract end ' + esc(a.endDate || '—') + '</div></div>' +
        '</div>' +
        '<div style="margin-top:8px">' + chips +
          '<span style="font-size:12px;color:#94a3b8;margin-left:4px">' +
            tk.length + ' open ticket' + (tk.length === 1 ? '' : 's') + ' · ' + a.opps.length + ' opportunit' + (a.opps.length === 1 ? 'y' : 'ies') +
          '</span></div>' +
        '<div style="margin-top:8px">' + ticketsHtml + '</div>' +
      '</div>';
  }
  function header(email, n) {
    return '<div style="margin:4px 0 14px">' +
      '<div style="font-size:20px;font-weight:800;color:#0f172a">My Accounts</div>' +
      '<div style="font-size:13px;color:#64748b">' + n + ' account' + (n === 1 ? '' : 's') + ' assigned to ' + esc(email) + ' · live from Jira</div></div>';
  }
})();
