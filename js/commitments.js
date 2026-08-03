'use strict';
// ════════════════════════════════════════════════════════════════════════════
// CSM COMMITMENTS — open promises scanned from Gmail / Slack by the daily brief
// ────────────────────────────────────────────────────────────────────────────
// Data source : csm-brief.json  →  account.commitments[]
// State store : localStorage (instant) + csm-memory.json via worker (durable)
// Zero edits required to brief.js — this file wraps the existing renderers.
// ════════════════════════════════════════════════════════════════════════════

const CMT_FLAGS_KEY  = 'csmCommitFlags';
const CMT_MEMORY_URL = 'https://raw.githubusercontent.com/william-appier/CSM-Dashboard/main/csm-memory.json';
const CMT_WORKER_URL = 'https://csm-brief-worker.williamlin12.workers.dev/update-memory';

// ── Local escape helper (brief.js defines a global esc(); fall back if absent) ─
function cmtEsc(s) {
  if (typeof esc === 'function') return esc(s == null ? '' : String(s));
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function cmtToday() {
  var d = new Date(); d.setHours(0, 0, 0, 0); return d;
}

// ── FLAG STORE ───────────────────────────────────────────────────────────────
// { "<commitment id>": { status:'done'|'dropped'|'open', snoozedUntil:'YYYY-MM-DD'|null } }
function cmtGetFlags() {
  try { return JSON.parse(localStorage.getItem(CMT_FLAGS_KEY) || '{}'); }
  catch (_) { return {}; }
}
function cmtSetFlag(id, patch) {
  var flags = cmtGetFlags();
  flags[id] = Object.assign({ status: 'open', snoozedUntil: null }, flags[id] || {}, patch);
  localStorage.setItem(CMT_FLAGS_KEY, JSON.stringify(flags));
}

// ── EFFECTIVE STATE ──────────────────────────────────────────────────────────
// A commitment is visible when it is open, not snoozed, and not locally flagged.
function cmtIsVisible(c) {
  var f = cmtGetFlags()[c.id];
  var status = (f && f.status) || c.status || 'open';
  if (status !== 'open') return false;
  var snooze = (f && f.snoozedUntil) || c.snoozedUntil;
  if (snooze && new Date(snooze) > cmtToday()) return false;
  return true;
}

function cmtForAccount(acct) {
  return (acct && acct.commitments ? acct.commitments : []).filter(cmtIsVisible);
}

function cmtDaysOverdue(c) {
  if (!c.due) return null;
  return Math.round((cmtToday() - new Date(c.due)) / 86400000);
}

// Look a commitment up across all accounts in the loaded brief, so a write-back
// can persist the whole record rather than just its id.
function cmtFindInAccounts(id) {
  if (typeof ACCOUNTS === 'undefined') return null;
  for (var i = 0; i < ACCOUNTS.length; i++) {
    var list = ACCOUNTS[i].commitments || [];
    for (var j = 0; j < list.length; j++) {
      if (list[j].id === id) return JSON.parse(JSON.stringify(list[j]));
    }
  }
  return null;
}

// ── DURABLE WRITE-BACK ───────────────────────────────────────────────────────
// Read-modify-write csm-memory.json through the worker. Best effort: the
// localStorage flag already updated the UI, so a network failure is non-fatal.
//
// IMPORTANT: raw.githubusercontent.com serves the main branch from a CDN that
// lags roughly 5 minutes behind the commit. Re-reading it right after a write
// returns the PRE-write copy, so two clicks inside that window would silently
// clobber the first one. We therefore keep the object we last wrote in memory
// and use it as the base for subsequent writes in the same session.
var _cmtMemCache = null;      // last successfully written memory object
var _cmtMemCacheAt = 0;       // epoch ms of that write
var _cmtQueue = Promise.resolve();  // serialise writes so clicks can't interleave
const CMT_CACHE_TTL_MS = 10 * 60 * 1000;

async function cmtLoadMemory() {
  if (_cmtMemCache && (Date.now() - _cmtMemCacheAt) < CMT_CACHE_TTL_MS) {
    return JSON.parse(JSON.stringify(_cmtMemCache));
  }
  var mr = await fetch(CMT_MEMORY_URL + '?t=' + Date.now());
  if (!mr.ok) throw new Error('HTTP ' + mr.status);
  return await mr.json();
}

function cmtPersist(id, patch) {
  // Chain onto the queue so concurrent clicks apply in order, not in parallel.
  _cmtQueue = _cmtQueue.then(function () { return cmtPersistInner(id, patch); })
                       .catch(function () { /* already logged */ });
  return _cmtQueue;
}

async function cmtPersistInner(id, patch) {
  var badge = document.getElementById('cmt-sync-' + id);
  if (badge) { badge.textContent = 'saving…'; badge.className = 'cmt-sync spin'; }
  try {
    var mem = await cmtLoadMemory();
    mem.commitments = mem.commitments || [];
    var hit = mem.commitments.find(function (c) { return c.id === id; });
    if (hit) {
      Object.assign(hit, patch);
    } else {
      // Commitment is in the brief but not yet in memory (e.g. an earlier write
      // failed). Write the FULL record, not a bare {id,status} stub — a stub
      // would leave memory with an entry that has no account or text, which the
      // daily scan cannot reconcile or report on.
      var full = cmtFindInAccounts(id);
      mem.commitments.push(Object.assign(
        { id: id, status: 'open', snoozedUntil: null },
        full || {},
        patch
      ));
    }
    var wr = await fetch(CMT_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mem)
    });
    if (!wr.ok) throw new Error('HTTP ' + wr.status);
    // Cache what we just wrote — the CDN copy will be stale for ~5 minutes.
    _cmtMemCache = mem;
    _cmtMemCacheAt = Date.now();
    if (badge) { badge.textContent = 'saved'; badge.className = 'cmt-sync ok'; }
  } catch (e) {
    console.warn('[CSM] commitment write-back failed:', e.message);
    if (badge) { badge.textContent = 'local only'; badge.className = 'cmt-sync err'; }
  }
}

// ── ACTIONS (wired to buttons) ───────────────────────────────────────────────
function commitDone(id) {
  cmtSetFlag(id, { status: 'done' });
  cmtPersist(id, { status: 'done', closedAt: new Date().toISOString().slice(0, 10) });
  cmtRefresh();
}
function commitDrop(id) {
  cmtSetFlag(id, { status: 'dropped' });
  cmtPersist(id, { status: 'dropped', droppedReason: 'dismissed-on-dashboard' });
  cmtRefresh();
}
function commitSnooze(id, days) {
  var d = cmtToday();
  d.setDate(d.getDate() + (days || 3));
  var until = d.toISOString().slice(0, 10);
  cmtSetFlag(id, { snoozedUntil: until });
  cmtPersist(id, { snoozedUntil: until });
  cmtRefresh();
}
function commitRestore(id) {
  cmtSetFlag(id, { status: 'open', snoozedUntil: null });
  cmtPersist(id, { status: 'open', snoozedUntil: null });
  cmtRefresh();
}
function cmtToggleHidden(acctId) {
  var el = document.getElementById('cmt-hidden-' + acctId);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}
function cmtRefresh() {
  if (typeof renderBriefCards === 'function') renderBriefCards();
  // Re-open the panel so the section re-renders with new state
  var sp = document.getElementById('briefSidePanel');
  var titleEl = document.getElementById('briefPanelTitle');
  if (sp && sp.classList.contains('open') && titleEl && typeof ACCOUNTS !== 'undefined') {
    var acct = ACCOUNTS.find(function (a) { return a.name === titleEl.textContent; });
    if (acct && typeof openBriefPanel === 'function') openBriefPanel(acct.id);
  }
}

// ── ROW RENDER ───────────────────────────────────────────────────────────────
function cmtRow(c, active) {
  var over = cmtDaysOverdue(c);
  var dueHTML = '';
  if (c.due) {
    if (over > 0)      dueHTML = '<span class="cmt-due overdue">' + over + 'd overdue</span>';
    else if (over === 0) dueHTML = '<span class="cmt-due today">due today</span>';
    else               dueHTML = '<span class="cmt-due">due ' + cmtEsc(c.due) + '</span>';
  } else {
    dueHTML = '<span class="cmt-due none">no date</span>';
  }
  var ownerTag = { me: '\u{1f9d1} you', client: '\u{1f3e2} client', internal: '\u{1f465} internal' }[c.owner] || '';
  var srcIcon  = c.source === 'slack' ? '\u{1f4ac}' : '✉️';
  var srcHTML  = c.sourceUrl
    ? '<a class="cmt-src" href="' + cmtEsc(c.sourceUrl) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">' + srcIcon + ' source</a>'
    : '';

  var actions = active
    ? '<button class="cmt-btn done"   onclick="commitDone(\'' + cmtEsc(c.id) + '\')"      title="Mark done">✓</button>'
    + '<button class="cmt-btn snooze" onclick="commitSnooze(\'' + cmtEsc(c.id) + '\',3)"  title="Snooze 3 days">⏱</button>'
    + '<button class="cmt-btn drop"   onclick="commitDrop(\'' + cmtEsc(c.id) + '\')"      title="Not a commitment">⊘</button>'
    : '<button class="cmt-btn restore" onclick="commitRestore(\'' + cmtEsc(c.id) + '\')"  title="Restore">↩</button>';

  return '<div class="cmt-row' + (active ? '' : ' cmt-inactive') + (over > 0 && active ? ' cmt-overdue' : '') + '">'
    +   '<div class="cmt-main">'
    +     '<div class="cmt-text">' + cmtEsc(c.text) + '</div>'
    +     '<div class="cmt-meta">'
    +       '<span>' + ownerTag + '</span>'
    +       (c.counterpart ? '<span>→ ' + cmtEsc(c.counterpart) + '</span>' : '')
    +       dueHTML + srcHTML
    +       '<span class="cmt-sync" id="cmt-sync-' + cmtEsc(c.id) + '"></span>'
    +     '</div>'
    +   '</div>'
    +   '<div class="cmt-actions">' + actions + '</div>'
    + '</div>';
}

function cmtSectionHTML(acct) {
  var all = (acct.commitments || []);
  if (!all.length) return '';
  var active = all.filter(cmtIsVisible);
  var hidden = all.filter(function (c) { return !cmtIsVisible(c); });
  var safeId = String(acct.id).replace(/[^a-z0-9]/gi, '');

  // Overdue first, then earliest due, then oldest
  active.sort(function (a, b) {
    var oa = cmtDaysOverdue(a), ob = cmtDaysOverdue(b);
    if ((oa > 0) !== (ob > 0)) return oa > 0 ? -1 : 1;
    if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
    if (a.due && !b.due) return -1;
    if (!a.due && b.due) return 1;
    return (a.created || '') < (b.created || '') ? -1 : 1;
  });

  var html = active.length
    ? active.map(function (c) { return cmtRow(c, true); }).join('')
    : '<div class="brief-empty-state">All commitments cleared ✓</div>';

  if (hidden.length) {
    html += '<div class="brief-flagged-toggle">'
         +    '<button class="brief-flagged-toggle-btn" onclick="cmtToggleHidden(\'' + safeId + '\')">'
         +      hidden.length + ' hidden (done / snoozed / dismissed) · show</button>'
         +  '</div>'
         +  '<div id="cmt-hidden-' + safeId + '" style="display:none">'
         +    hidden.map(function (c) { return cmtRow(c, false); }).join('')
         +  '</div>';
  }

  var overdueCount = active.filter(function (c) { return cmtDaysOverdue(c) > 0; }).length;
  var titleExtra = overdueCount ? ' <span class="cmt-count-bad">' + overdueCount + ' overdue</span>' : '';

  return '<div class="p-section">'
       +   '<div class="p-section-title">\u{1f91d} Open Commitments' + titleExtra + '</div>'
       +   html
       +   '<div style="font-family:\'DM Mono\',monospace;font-size:10px;color:var(--muted);margin-top:10px">'
       +     'Scanned from Gmail &amp; Slack each morning. ✓ done · ⏱ snooze 3d · ⊘ not a commitment'
       +   '</div>'
       + '</div>';
}

// ── WRAP THE EXISTING RENDERERS ──────────────────────────────────────────────
(function () {
  function install() {
    if (typeof window.openBriefPanel !== 'function') return false;

    // 1. Panel section — injected before the Suggestions block
    var _origOpen = window.openBriefPanel;
    window.openBriefPanel = function (id) {
      _origOpen.apply(this, arguments);
      try {
        var acct = ACCOUNTS.find(function (a) { return a.id === id; });
        var body = document.getElementById('briefPanelBody');
        if (!acct || !body) return;
        var html = cmtSectionHTML(acct);
        if (!html) return;
        var sections = body.querySelectorAll('.p-section');
        var target = null;
        for (var i = 0; i < sections.length; i++) {
          var t = sections[i].querySelector('.p-section-title');
          if (t && t.textContent.indexOf('Suggestions') !== -1) { target = sections[i]; break; }
        }
        if (target) target.insertAdjacentHTML('beforebegin', html);
        else body.insertAdjacentHTML('beforeend', html);
      } catch (e) { console.warn('[CSM] commitments panel render failed:', e); }
    };

    // 2. Card badge — appended to each account card's meta line
    if (typeof window.renderBriefCards === 'function') {
      var _origCards = window.renderBriefCards;
      window.renderBriefCards = function () {
        _origCards.apply(this, arguments);
        try {
          var grid = document.getElementById('accountGrid');
          if (!grid) return;
          grid.querySelectorAll('.acct-card').forEach(function (card) {
            var nameEl = card.querySelector('.acct-name');
            var metaEl = card.querySelector('.acct-meta');
            if (!nameEl || !metaEl) return;
            var acct = ACCOUNTS.find(function (a) { return a.name === nameEl.textContent; });
            if (!acct) return;
            var open = cmtForAccount(acct);
            if (!open.length) return;
            var overdue = open.filter(function (c) { return cmtDaysOverdue(c) > 0; }).length;
            var span = document.createElement('span');
            span.className = 'acct-cmt-badge' + (overdue ? ' bad' : '');
            span.textContent = '\u{1f91d} ' + open.length + (overdue ? ' (' + overdue + ' overdue)' : '');
            metaEl.appendChild(span);
          });
        } catch (e) { console.warn('[CSM] commitment badge failed:', e); }
      };
    }

    if (typeof renderBriefCards === 'function') renderBriefCards();
    return true;
  }

  // brief.js may load after this file — retry briefly until its globals exist.
  if (!install()) {
    var tries = 0;
    var iv = setInterval(function () {
      if (install() || ++tries > 40) clearInterval(iv);
    }, 250);
  }
})();

// ── STYLES (injected so no CSS file edit is needed) ──────────────────────────
(function () {
  var css = ''
  + '.cmt-row{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06)}'
  + '.cmt-row:last-child{border-bottom:none}'
  + '.cmt-row.cmt-inactive{opacity:.4}'
  + '.cmt-row.cmt-inactive .cmt-text{text-decoration:line-through}'
  + '.cmt-main{flex:1;min-width:0}'
  + '.cmt-text{font-size:12.5px;line-height:1.45;margin-bottom:3px}'
  + '.cmt-row.cmt-overdue .cmt-text{font-weight:600}'
  + '.cmt-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;'
  +   "font-family:'DM Mono',monospace;font-size:10px;color:var(--muted)}"
  + '.cmt-due{padding:1px 6px;border-radius:4px;background:rgba(255,255,255,.07)}'
  + '.cmt-due.overdue{background:rgba(248,113,113,.18);color:#f87171;font-weight:600}'
  + '.cmt-due.today{background:rgba(251,191,36,.18);color:#fbbf24;font-weight:600}'
  + '.cmt-due.none{opacity:.55}'
  + '.cmt-src{color:var(--muted);text-decoration:none;border-bottom:1px dotted currentColor}'
  + '.cmt-src:hover{color:#4f8ef7}'
  + '.cmt-sync{font-size:9px;opacity:.7}'
  + '.cmt-sync.ok{color:#34d399}.cmt-sync.err{color:#fbbf24}.cmt-sync.spin{color:var(--muted)}'
  + '.cmt-actions{display:flex;gap:4px;flex-shrink:0}'
  + '.cmt-btn{width:22px;height:22px;border-radius:5px;border:1px solid rgba(255,255,255,.14);'
  +   'background:transparent;color:var(--muted);cursor:pointer;font-size:11px;line-height:1;'
  +   'display:flex;align-items:center;justify-content:center;transition:all .12s}'
  + '.cmt-btn:hover{border-color:currentColor}'
  + '.cmt-btn.done:hover{color:#34d399}.cmt-btn.snooze:hover{color:#fbbf24}'
  + '.cmt-btn.drop:hover{color:#f87171}.cmt-btn.restore:hover{color:#4f8ef7}'
  + '.cmt-count-bad{font-family:\'DM Mono\',monospace;font-size:10px;color:#f87171;'
  +   'background:rgba(248,113,113,.14);padding:1px 6px;border-radius:4px;margin-left:6px}'
  + '.acct-cmt-badge{color:var(--muted)}'
  + '.acct-cmt-badge.bad{color:#f87171;font-weight:600}';
  var tag = document.createElement('style');
  tag.id = 'cmt-styles';
  tag.textContent = css;
  document.head.appendChild(tag);
})();
