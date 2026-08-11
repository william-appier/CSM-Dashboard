/* ------------------------------------------------------------------
 * roster.js — "My Accounts" (Phase A)
 * Account-first roster derived live from the Salesforce report, keyed to
 * the signed-in CSM's email. Additive module: adds a sidebar item + pane,
 * wraps snavSwitch, touches nothing else.
 *
 * Data sources (BOTH already in the page CSP connect-src — no new origin):
 *   - report : localStorage 'ar_sheet_url' (the same script.google.com
 *              endpoint the AR view uses; never hardcoded here so the URL
 *              stays out of the public repo)
 *   - aliases: raw.githubusercontent.com/.../csm-account-aliases.json
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  var ALIAS_URL = 'https://raw.githubusercontent.com/william-appier/CSM-Dashboard/main/csm-account-aliases.json';

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
    var sub = document.getElementById('headerSub'); if (sub) sub.textContent = 'Your accounts, live from the Salesforce report';
    render();
  };

  function currentEmail() {
    try { if (typeof arGetCurrentEmail === 'function') { var e = arGetCurrentEmail(); if (e) return String(e).toLowerCase(); } } catch (_) {}
    try { if (typeof getUser === 'function') { var u = getUser(); if (u && u.email) return String(u.email).toLowerCase(); } } catch (_) {}
    return '';
  }
  function parseCsvLine(line) {
    var out = [], cur = '', q = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else { if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c; }
    }
    out.push(cur); return out;
  }
  function product(o) { var m = String(o).match(/^[ (（]*([A-Za-z]{2,4})/); return m ? m[1].toUpperCase() : '?'; }
  function toDate(s) { var m = String(s || '').match(/([0-9]{1,2})[/]([0-9]{1,2})[/]([0-9]{4})/); return m ? new Date(+m[3], +m[1] - 1, +m[2]) : null; }
  function genericCore(o) { var s = String(o).replace(/^[ (（]*[A-Za-z]{2,4}[ )）]*[-_ ]*/, ''); var i = s.indexOf(' - '); if (i < 0) i = s.indexOf(' — '); return (i > 0 ? s.slice(0, i) : s).trim(); }
  function fmtDate(d) { return d ? d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') : '—'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function setBody(html) { var b = document.getElementById('rosterBody'); if (b) b.innerHTML = html; }

  async function render() {
    var email = currentEmail();
    var reportUrl = localStorage.getItem('ar_sheet_url') || '';
    setBody('<p style="color:#64748b">Loading your accounts…</p>');
    if (!reportUrl) { setBody(note('Open <b>CSM AR status</b> once to connect the report, then come back.')); return; }
    if (!email) { setBody(note('Sign in to see the accounts assigned to you.')); return; }

    var report, aliases;
    try {
      var rr = await fetch(reportUrl, { redirect: 'follow' });
      report = await rr.text();
    } catch (e) { setBody(note('Could not load the report. ' + esc(e.message))); return; }
    try {
      var ar = await fetch(ALIAS_URL + '?t=' + Date.now());
      aliases = ar.ok ? (await ar.json()).accounts.filter(function (a) { return a && a.id && a.keep !== false; }) : [];
    } catch (_) { aliases = []; }

    var lines = report.split(String.fromCharCode(10)).map(function (l) { return l.charCodeAt(l.length - 1) === 13 ? l.slice(0, -1) : l; });
    var csm = '', recs = [];
    for (var i = 11; i < lines.length; i++) {
      var r = parseCsvLine(lines[i]); if (r.length < 10) continue;
      if ((r[3] || '').trim()) csm = (r[3] || '').trim().toLowerCase();
      var opp = (r[2] || '').trim();
      if (opp && csm === email) recs.push({ opp: opp, exp: (r[9] || '').trim(), ar: (r[6] || '').trim() });
    }
    if (!recs.length) { setBody(note('No accounts are assigned to <b>' + esc(email) + '</b> in the report yet.<br><span style="color:#94a3b8">Once your accounts are added to the alias map, they will appear here automatically.</span>')); return; }

    var accs = {};
    recs.forEach(function (x) {
      var lo = x.opp.toLowerCase();
      var hit = aliases.find(function (a) { return (a.matchAliases || []).some(function (s) { return lo.indexOf(String(s).toLowerCase()) >= 0; }); });
      var gc = hit ? null : genericCore(x.opp);
      var id = hit ? hit.id : ('_' + gc.toLowerCase());
      var name = hit ? hit.name : gc;
      var A = accs[id] = accs[id] || { name: name, mapped: !!hit, products: {}, lines: [] };
      A.products[product(x.opp)] = 1;
      A.lines.push({ label: x.opp, date: toDate(x.exp), ar: x.ar });
    });

    var today = new Date(); today.setHours(0, 0, 0, 0);
    var list = Object.keys(accs).map(function (id) {
      var A = accs[id];
      var dated = A.lines.filter(function (l) { return l.date; });
      var future = dated.filter(function (l) { return l.date >= today; }).sort(function (a, b) { return a.date - b.date; });
      var past = dated.filter(function (l) { return l.date < today; }).sort(function (a, b) { return b.date - a.date; });
      var pick = future[0] || past[0] || null;
      var soonest = pick ? pick.date : null;
      var upcoming = !!future[0];
      var days = soonest ? Math.round((soonest - today) / 86400000) : null;
      return { name: A.name, mapped: A.mapped, products: Object.keys(A.products).sort(), soonest: soonest, days: days, upcoming: upcoming, lines: A.lines };
    }).sort(function (a, b) {
      if (a.upcoming && b.upcoming) return a.soonest - b.soonest;
      if (a.upcoming !== b.upcoming) return a.upcoming ? -1 : 1;
      return (b.soonest || 0) - (a.soonest || 0);
    });

    var badge = document.getElementById('snc-roster');
    if (badge) { badge.textContent = list.length; badge.style.display = ''; }

    setBody(header(email, list.length) + list.map(card).join(''));
  }

  function renewChip(days, upcoming) {
    if (days == null) return '<span style="font-size:12px;color:#94a3b8">no date</span>';
    if (!upcoming) return '<span style="font-size:12px;font-weight:600;color:#94a3b8">no upcoming renewal</span>';
    var col = days <= 14 ? '#dc2626' : days <= 35 ? '#d97706' : '#16a34a';
    return '<span style="font-size:12px;font-weight:600;color:' + col + '">' + days + 'd left</span>';
  }

  function card(a) {
    var chips = a.products.map(function (p) {
      return '<span style="display:inline-block;font-size:11px;font-weight:600;background:#eef2ff;color:#4338ca;border-radius:5px;padding:1px 7px;margin-right:4px">' + esc(p) + '</span>';
    }).join('');
    var multi = a.lines.length > 1;
    var linesHtml = a.lines.slice().sort(function (x, y) { return (x.date || 9e15) - (y.date || 9e15); }).map(function (l) {
      return '<div style="display:flex;justify-content:space-between;gap:12px;font-size:12px;color:#475569;padding:2px 0;border-top:1px solid #f1f5f9">' +
        '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70%">' + esc(l.label) + '</span>' +
        '<span style="white-space:nowrap">' + fmtDate(l.date) + (l.ar ? ' · ' + esc(l.ar) : '') + '</span></div>';
    }).join('');
    return '' +
      '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-bottom:12px;background:#fff">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">' +
          '<div style="font-size:16px;font-weight:700;color:#0f172a">' + esc(a.name) +
            (a.mapped ? '' : '<span title="not in alias map yet" style="font-size:11px;color:#f59e0b;margin-left:6px">unmapped</span>') + '</div>' +
          '<div style="text-align:right">' + renewChip(a.days, a.upcoming) +
            '<div style="font-size:12px;color:#64748b">' + (a.upcoming ? 'renews ' : 'last ended ') + fmtDate(a.soonest) + '</div></div>' +
        '</div>' +
        '<div style="margin-top:8px">' + chips +
          (multi ? '<span style="font-size:12px;color:#94a3b8;margin-left:4px">' + a.lines.length + ' contract lines · soonest drives the alert</span>' : '') + '</div>' +
        '<div style="margin-top:8px">' + linesHtml + '</div>' +
      '</div>';
  }

  function header(email, n) {
    return '<div style="margin:4px 0 14px">' +
      '<div style="font-size:20px;font-weight:800;color:#0f172a">My Accounts</div>' +
      '<div style="font-size:13px;color:#64748b">' + n + ' account' + (n === 1 ? '' : 's') + ' assigned to ' + esc(email) + ' · live from the Salesforce report</div></div>';
  }
  function note(html) { return '<div style="padding:24px;color:#475569;font-size:14px;line-height:1.5">' + html + '</div>'; }
})();
