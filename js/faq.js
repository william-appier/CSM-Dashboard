/* ── CSM FAQ tab ─────────────────────────────────────────────
   Data: csm-faq.json (generated from Confluence "CSM FAQ" pages).
   Sorting: urgency (high→medium→low) then last_verified desc;
   stale sinks below active; deprecated hidden unless toggled. */
(function () {
  'use strict';

  var FAQ_URL = 'csm-faq.json';
  var URG = { high: 0, medium: 1, low: 2 };
  var URG_LABEL = { high: '緊急', medium: '中', low: '低' };
  var URG_COLOR = { high: '#dc2626', medium: '#f59e0b', low: '#94a3b8' };
  var CATS = [
    ['all', '全部'], ['AIQUA', 'AIQUA'], ['AIRIS', 'AIRIS'],
    ['BotBonnie', 'BotBonnie'], ['AdCreative', 'AdCreative'], ['OPS', '流程 / Billing']
  ];
  var st = { meta: null, entries: [], q: '', cat: 'all', showDeprecated: false, open: {}, loaded: false };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function injectCss() {
    var css = ''
      + '.faq-toolbar{margin-bottom:12px}'
      + '.faq-search{width:100%;margin-bottom:8px}'
      + '.faq-chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center}'
      + '.faq-chip{font-size:11px;padding:3px 10px;border-radius:100px;border:1px solid var(--border);cursor:pointer;user-select:none;color:var(--muted)}'
      + '.faq-chip.on{background:rgba(79,142,247,.15);border-color:var(--accent);color:var(--accent)}'
      + '.faq-recent{margin:10px 0 14px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface2)}'
      + '.faq-recent-title{font-size:10px;letter-spacing:.08em;color:var(--muted);margin-bottom:6px;text-transform:uppercase}'
      + '.faq-recent-items{display:flex;gap:6px;flex-wrap:wrap}'
      + '.faq-recent-item{font-size:11px;padding:3px 10px;border-radius:8px;cursor:pointer;background:rgba(16,185,129,.12);color:#10b981;white-space:nowrap}'
      + '.faq-list{display:flex;flex-direction:column;gap:0;border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--surface)}'
      + '.faq-row{display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border)}'
      + '.faq-row:hover{background:var(--surface2)}'
      + '.faq-row:last-child{border-bottom:none}'
      + '.faq-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}'
      + '.faq-id{font-family:"DM Mono",monospace;font-size:10px;color:var(--muted);flex-shrink:0}'
      + '.faq-q{font-size:13px;flex:1;color:var(--text);min-width:0}'
      + '.faq-row.stale .faq-q{color:var(--muted)}'
      + '.faq-badge{font-size:10px;padding:2px 8px;border-radius:100px;flex-shrink:0;white-space:nowrap}'
      + '.faq-badge.urg-high{background:rgba(220,38,38,.12);color:#dc2626}'
      + '.faq-badge.urg-medium{background:rgba(245,158,11,.14);color:#d97706}'
      + '.faq-badge.urg-low{background:var(--surface2);color:var(--muted)}'
      + '.faq-badge.b-stale{background:rgba(245,158,11,.14);color:#d97706}'
      + '.faq-badge.b-cat{background:var(--surface2);color:var(--muted)}'
      + '.faq-date{font-size:11px;color:var(--muted);flex-shrink:0}'
      + '.faq-ans{display:none;padding:10px 14px 14px 30px;border-bottom:1px solid var(--border);background:var(--surface2);font-size:13px;line-height:1.7;color:var(--text);white-space:pre-wrap}'
      + '.faq-ans.open{display:block}'
      + '.faq-ans-meta{margin-top:8px;font-size:11px;color:var(--muted)}'
      + '.faq-ans-meta a{color:var(--accent)}'
      + '.faq-footer{margin-top:10px;font-size:11px;color:var(--muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px}'
      + '.faq-empty{padding:24px;text-align:center;color:var(--muted);font-size:13px}';
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  function load() {
    fetch(FAQ_URL + '?v=' + Date.now())
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        st.meta = d._meta || {};
        st.entries = d.entries || [];
        st.loaded = true;
        var cnt = document.getElementById('snc-faq');
        if (cnt) cnt.textContent = st.entries.filter(function (e) { return e.status !== 'deprecated'; }).length;
        var cnt2 = document.getElementById('tc-faq');
        if (cnt2) cnt2.textContent = cnt ? cnt.textContent : '';
        renderShell();
        renderList();
      })
      .catch(function (e) {
        var root = document.getElementById('faqRoot');
        if (root) root.innerHTML = '<div class="faq-empty">FAQ 資料載入失敗：' + esc(e.message) + '</div>';
      });
  }

  function renderShell() {
    var root = document.getElementById('faqRoot');
    if (!root) return;
    var chips = CATS.map(function (c) {
      return '<span class="faq-chip' + (st.cat === c[0] ? ' on' : '') + '" data-cat="' + c[0] + '" onclick="faqSetCat(this.getAttribute(&quot;data-cat&quot;))">' + esc(c[1]) + '</span>';
    }).join('');
    root.innerHTML = ''
      + '<div class="faq-toolbar">'
      + '<input class="wiz-input faq-search" id="faqSearch" type="text" placeholder="搜尋問題、答案、ID…" oninput="faqSetQuery(this.value)">'
      + '<div class="faq-chips">' + chips
      + '<span style="flex:1"></span>'
      + '<span class="faq-chip' + (st.showDeprecated ? ' on' : '') + '" onclick="faqToggleDeprecated()">顯示 deprecated</span>'
      + '</div></div>'
      + '<div class="faq-recent" id="faqRecent" style="display:none"></div>'
      + '<div class="faq-list" id="faqList"></div>'
      + '<div class="faq-footer"><span>資料快取於 ' + esc(st.meta.updated || '?') + ' · 共 ' + st.entries.length + ' 條</span>'
      + '<a href="' + esc(st.meta.indexUrl || '#') + '" target="_blank" style="color:var(--accent)">在 Confluence 開啟 FAQ INDEX ↗</a></div>';
  }

  function visible() {
    var q = st.q.trim().toLowerCase();
    return st.entries.filter(function (e) {
      if (e.status === 'deprecated' && !st.showDeprecated) return false;
      if (st.cat !== 'all' && e.category !== st.cat) return false;
      if (!q) return true;
      return (e.id + ' ' + e.q + ' ' + e.a + ' ' + (e.product || '')).toLowerCase().indexOf(q) > -1;
    });
  }

  function sortKey(e) {
    var stalePenalty = e.status === 'stale' ? 100 : (e.status === 'deprecated' ? 200 : 0);
    return stalePenalty + (URG[e.urgency || 'medium'] != null ? URG[e.urgency || 'medium'] : 1);
  }

  function renderList() {
    var list = document.getElementById('faqList');
    if (!list) return;
    var items = visible().slice().sort(function (a, b) {
      var k = sortKey(a) - sortKey(b);
      if (k !== 0) return k;
      return (b.last_verified || '').localeCompare(a.last_verified || '');
    });

    var recentEl = document.getElementById('faqRecent');
    if (recentEl) {
      var ref = st.meta.updated ? new Date(st.meta.updated) : new Date();
      var cutoff = new Date(ref.getTime() - 14 * 86400000).toISOString().slice(0, 10);
      var recent = st.entries
        .filter(function (e) { return e.status === 'active' && (e.last_verified || '') >= cutoff; })
        .sort(function (a, b) { return (b.last_verified || '').localeCompare(a.last_verified || ''); })
        .slice(0, 8);
      if (recent.length && !st.q && st.cat === 'all') {
        recentEl.style.display = '';
        recentEl.innerHTML = '<div class="faq-recent-title">最近動態（近 14 天更新）</div><div class="faq-recent-items">'
          + recent.map(function (e) {
            return '<span class="faq-recent-item" data-id="' + esc(e.id) + '" onclick="faqJump(this.getAttribute(&quot;data-id&quot;))">' + esc(e.id) + ' ' + esc(e.q.length > 24 ? e.q.substring(0, 24) + '…' : e.q) + '</span>';
          }).join('') + '</div>';
      } else {
        recentEl.style.display = 'none';
      }
    }

    if (!items.length) {
      list.innerHTML = '<div class="faq-empty">沒有符合的條目</div>';
      return;
    }
    list.innerHTML = items.map(function (e) {
      var u = e.urgency || 'medium';
      var openCls = st.open[e.id] ? ' open' : '';
      var badges = '';
      if (e.status === 'active') badges += '<span class="faq-badge urg-' + u + '">' + URG_LABEL[u] + '</span>';
      if (e.status === 'stale') badges += '<span class="faq-badge b-stale">stale 待重驗</span>';
      if (e.status === 'deprecated') badges += '<span class="faq-badge b-cat">deprecated</span>';
      badges += '<span class="faq-badge b-cat">' + esc(e.category) + '</span>';
      return '<div class="faq-row' + (e.status !== 'active' ? ' stale' : '') + '" data-id="' + esc(e.id) + '" onclick="faqToggle(this.getAttribute(&quot;data-id&quot;))">'
        + '<span class="faq-dot" style="background:' + (e.status === 'active' ? URG_COLOR[u] : 'var(--border)') + '"></span>'
        + '<span class="faq-id">' + esc(e.id) + '</span>'
        + '<span class="faq-q">' + esc(e.q) + '</span>'
        + badges
        + '<span class="faq-date">' + esc((e.last_verified || '').substring(5)) + '</span>'
        + '</div>'
        + '<div class="faq-ans' + openCls + '" id="faqAns-' + esc(e.id) + '">' + esc(e.a)
        + '<div class="faq-ans-meta">source: <a href="' + esc(e.source) + '" target="_blank">' + esc((e.source || '').replace(/^https?:\/\//, '').substring(0, 60)) + '</a>'
        + ' · last_verified ' + esc(e.last_verified || '?') + ' · ' + esc(e.product || '') + '</div></div>';
    }).join('');
  }

  window.faqSetQuery = function (v) { st.q = v || ''; renderList(); };
  window.faqSetCat = function (c) {
    st.cat = c;
    document.querySelectorAll('.faq-chip[data-cat]').forEach(function (el) {
      el.classList.toggle('on', el.getAttribute('data-cat') === c);
    });
    renderList();
  };
  window.faqToggleDeprecated = function () { st.showDeprecated = !st.showDeprecated; renderShell(); renderList(); };
  window.faqToggle = function (id) {
    st.open[id] = !st.open[id];
    var el = document.getElementById('faqAns-' + id);
    if (el) el.classList.toggle('open', !!st.open[id]);
  };
  window.faqJump = function (id) {
    st.open[id] = true;
    renderList();
    var el = document.getElementById('faqAns-' + id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  window.reloadFaq = load;

  function init() { injectCss(); load(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
