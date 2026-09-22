/* ── Competitive Intel tab ───────────────────────────────────
   Data: competitor-intel.json (monthly, hand-curated pilot + scheduled refresh).

   Design intent (per William, 2026-09-22):
   - "Story card" per competitor, not a flat table — quick to absorb.
   - External product/market news is folded INTO the same card as the
     internal signals for that competitor, shown together, not as two
     separate sections.
   - Each card carries talking points (battlecard-style) so a CSM can use
     it defensively/offensively in a live conversation.
   - Deliberately narrower than the company-wide #proj-ai-sota competitor
     monitor: only signals tied to real account/deal conversations, plus a
     light external-news summary. See _meta.note for the division of labour.
*/
(function () {
  'use strict';

  var CI_URL = 'competitor-intel.json';

  var THREAT_ORDER = { high: 0, medium: 1, low: 2 };
  var THREAT_COLOR = { high: '#dc2626', medium: '#d97706', low: '#64748b' };
  var THREAT_BG    = { high: 'rgba(220,38,38,.10)', medium: 'rgba(217,119,6,.12)', low: 'var(--surface2)' };

  var TAG_LABEL = { risk: '續約風險', gap: '產品缺口', competitive: '競爭商機', win: '贏單案例', watch: '觀察名單' };
  var TAG_COLOR = {
    risk:        { fg: '#dc2626', bg: 'rgba(220,38,38,.10)' },
    gap:         { fg: '#d97706', bg: 'rgba(217,119,6,.12)' },
    competitive: { fg: '#2563eb', bg: 'rgba(37,99,235,.10)' },
    win:         { fg: '#16a34a', bg: 'rgba(22,163,74,.10)' },
    watch:       { fg: '#64748b', bg: 'var(--surface2)' }
  };

  var st = { meta: null, cards: [], q: '', threatFilter: null, open: {}, loaded: false };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function injectCss() {
    var css = ''
      + '.ci-banner{margin-bottom:14px;padding:12px 14px;border:1px solid var(--border);border-radius:10px;background:var(--surface2);font-size:12.5px;line-height:1.6;color:var(--muted2,var(--muted))}'
      + '.ci-banner b{color:var(--text)}'
      + '.ci-toolbar{display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap}'
      + '.ci-search{flex:1;min-width:200px}'
      + '.ci-chip{font-size:11px;padding:4px 11px;border-radius:100px;border:1px solid var(--border);cursor:pointer;user-select:none;color:var(--muted);white-space:nowrap}'
      + '.ci-chip.on{background:rgba(79,142,247,.15);border-color:var(--accent);color:var(--accent)}'
      + '.ci-grid{display:flex;flex-direction:column;gap:12px}'
      + '.ci-card{border:1px solid var(--border);border-radius:12px;background:var(--surface);overflow:hidden}'
      + '.ci-card-head{display:flex;align-items:flex-start;gap:10px;padding:14px 16px;cursor:pointer}'
      + '.ci-card-head:hover{background:var(--surface2)}'
      + '.ci-name{font-size:15px;font-weight:700;color:var(--text)}'
      + '.ci-badge{font-size:11px;font-weight:700;padding:2px 9px;border-radius:100px;white-space:nowrap;flex-shrink:0}'
      + '.ci-oneliner{font-size:12.5px;color:var(--muted);margin-top:3px;line-height:1.5}'
      + '.ci-caret{margin-left:auto;color:var(--muted);flex-shrink:0;transition:transform .15s}'
      + '.ci-card.open .ci-caret{transform:rotate(90deg)}'
      + '.ci-card-body{display:none;padding:0 16px 16px;border-top:1px solid var(--border)}'
      + '.ci-card.open .ci-card-body{display:block;padding-top:12px}'
      + '.ci-sec-title{font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);font-weight:700;margin:14px 0 8px}'
      + '.ci-sec-title:first-child{margin-top:0}'
      + '.ci-ext-item{font-size:13px;line-height:1.6;color:var(--text);padding:7px 0;border-bottom:1px dashed var(--border)}'
      + '.ci-ext-item:last-child{border-bottom:none}'
      + '.ci-ext-date{font-family:"DM Mono",monospace;font-size:11px;color:var(--muted);margin-right:6px}'
      + '.ci-ext-item a{color:var(--accent);font-size:11.5px;margin-left:4px;white-space:nowrap}'
      + '.ci-sig{padding:9px 0;border-bottom:1px dashed var(--border)}'
      + '.ci-sig:last-child{border-bottom:none}'
      + '.ci-sig-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px}'
      + '.ci-sig-account{font-size:13px;font-weight:600;color:var(--text)}'
      + '.ci-sig-tag{font-size:10.5px;font-weight:700;padding:1px 8px;border-radius:100px;white-space:nowrap}'
      + '.ci-sig-text{font-size:12.5px;line-height:1.6;color:var(--text)}'
      + '.ci-sig-src{font-size:11px;color:var(--muted);margin-top:3px}'
      + '.ci-sig-src a{color:var(--muted)}'
      + '.ci-tp-list{margin:0;padding-left:18px}'
      + '.ci-tp-list li{font-size:12.5px;line-height:1.7;color:var(--text);margin-bottom:5px}'
      + '.ci-empty{padding:24px;text-align:center;color:var(--muted);font-size:13px}'
      + '.ci-footer{margin-top:12px;font-size:11px;color:var(--muted)}';
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  function load() {
    fetch(CI_URL + '?v=' + Date.now())
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        st.meta = d._meta || {};
        st.cards = (d.cards || []).slice().sort(function (a, b) {
          return (THREAT_ORDER[a.threat] != null ? THREAT_ORDER[a.threat] : 9)
               - (THREAT_ORDER[b.threat] != null ? THREAT_ORDER[b.threat] : 9);
        });
        st.loaded = true;
        var highCount = st.cards.filter(function (c) { return c.threat === 'high'; }).length;
        var cnt = document.getElementById('snc-competitor');
        if (cnt) cnt.textContent = highCount;
        var cnt2 = document.getElementById('tc-competitor');
        if (cnt2) cnt2.textContent = highCount;
        render();
      })
      .catch(function (e) {
        var root = document.getElementById('competitorRoot');
        if (root) root.innerHTML = '<div class="ci-empty">競品情報載入失敗：' + esc(e.message) + '</div>';
      });
  }

  function visible() {
    var q = st.q.trim().toLowerCase();
    return st.cards.filter(function (c) {
      if (st.threatFilter && c.threat !== st.threatFilter) return false;
      if (!q) return true;
      var hay = [c.name, c.oneLiner]
        .concat((c.signals || []).map(function (s) { return s.account + ' ' + s.text; }))
        .concat((c.external || []).map(function (e) { return e.text; }))
        .join(' ').toLowerCase();
      return hay.indexOf(q) > -1;
    });
  }

  function extItemHtml(e) {
    return '<div class="ci-ext-item"><span class="ci-ext-date">' + esc(e.date || '') + '</span>' + esc(e.text)
      + (e.url ? '<a href="' + esc(e.url) + '" target="_blank">↗ 來源</a>' : '') + '</div>';
  }

  function sigItemHtml(s) {
    var tc = TAG_COLOR[s.tag] || TAG_COLOR.watch;
    var label = TAG_LABEL[s.tag] || s.tag;
    return '<div class="ci-sig">'
      + '<div class="ci-sig-head">'
      +   '<span class="ci-sig-account">' + esc(s.account || '') + '</span>'
      +   '<span class="ci-sig-tag" style="color:' + tc.fg + ';background:' + tc.bg + '">' + esc(label) + '</span>'
      + '</div>'
      + '<div class="ci-sig-text">' + esc(s.text) + '</div>'
      + '<div class="ci-sig-src">來源：' + esc(s.sourceLabel || '')
      + (s.sourceUrl ? ' · <a href="' + esc(s.sourceUrl) + '" target="_blank">訊息連結</a>' : '') + '</div>'
      + '</div>';
  }

  function cardHtml(c) {
    var isOpen = !!st.open[c.id];
    var color = THREAT_COLOR[c.threat] || THREAT_COLOR.low;
    var bg = THREAT_BG[c.threat] || THREAT_BG.low;
    var ext = (c.external || []).map(extItemHtml).join('');
    var sigs = (c.signals || []).slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); })
      .map(sigItemHtml).join('');
    var tps = (c.talkingPoints || []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    return '<div class="ci-card' + (isOpen ? ' open' : '') + '" data-id="' + esc(c.id) + '">'
      + '<div class="ci-card-head" onclick="ciToggle(this.parentElement.getAttribute(&quot;data-id&quot;))">'
      +   '<div style="min-width:0;flex:1">'
      +     '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
      +       '<span class="ci-name">' + esc(c.name) + '</span>'
      +       '<span class="ci-badge" style="color:' + color + ';background:' + bg + '">' + esc(c.threatLabel || c.threat) + '</span>'
      +     '</div>'
      +     '<div class="ci-oneliner">' + esc(c.oneLiner || '') + '</div>'
      +   '</div>'
      +   '<span class="ci-caret">▸</span>'
      + '</div>'
      + '<div class="ci-card-body">'
      +   (ext ? '<div class="ci-sec-title">本期外部動態</div>' + ext : '')
      +   (sigs ? '<div class="ci-sec-title">你的帳號裡出現的訊號</div>' + sigs : '<div class="ci-sec-title">你的帳號裡出現的訊號</div><div style="font-size:12.5px;color:var(--muted)">這期沒有掃到相關的內部訊號。</div>')
      +   (tps ? '<div class="ci-sec-title">💬 怎麼應對 / Talking points</div><ul class="ci-tp-list">' + tps + '</ul>' : '')
      + '</div>'
      + '</div>';
  }

  function render() {
    var root = document.getElementById('competitorRoot');
    if (!root) return;

    var chips = [['all', '全部'], ['high', '高關注'], ['medium', '中度'], ['low', '觀察']].map(function (f) {
      var on = (f[0] === 'all' && !st.threatFilter) || st.threatFilter === f[0];
      return '<span class="ci-chip' + (on ? ' on' : '') + '" data-f="' + f[0] + '" onclick="ciSetFilter(this.getAttribute(&quot;data-f&quot;))">' + esc(f[1]) + '</span>';
    }).join('');

    var items = visible();
    var body = items.length
      ? '<div class="ci-grid">' + items.map(cardHtml).join('') + '</div>'
      : '<div class="ci-empty">沒有符合的競品卡片</div>';

    root.innerHTML = ''
      + '<div class="ci-banner">'
      +   '📅 涵蓋期間 <b>' + esc(st.meta.window || '—') + '</b> · 每月更新一次 · '
      +   esc(st.meta.note || '')
      + '</div>'
      + '<div class="ci-toolbar">'
      +   '<input class="wiz-input ci-search" type="text" placeholder="搜尋競品、帳號、關鍵字…" value="' + esc(st.q) + '" oninput="ciSetQuery(this.value)">'
      +   chips
      + '</div>'
      + body
      + '<div class="ci-footer">資料更新於 ' + esc(st.meta.updated || '?') + ' · 共 ' + st.cards.length + ' 家競品追蹤中</div>';
  }

  // ── PUBLIC HANDLERS ────────────────────────────────────────
  window.ciSetQuery = function (v) { st.q = v || ''; render(); };
  window.ciSetFilter = function (f) { st.threatFilter = (f === 'all') ? null : f; render(); };
  window.ciToggle = function (id) {
    st.open[id] = !st.open[id];
    var el = document.querySelector('.ci-card[data-id="' + id.replace(/"/g, '') + '"]');
    if (el) el.classList.toggle('open', !!st.open[id]);
  };
  window.reloadCompetitorIntel = load;

  function init() { injectCss(); load(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
