/* ── CSM FAQ tab ─────────────────────────────────────────────
   Data: csm-faq.json (generated from Confluence "CSM FAQ" pages).

   v2 — multi-dimensional tagging
   ────────────────────────────────────────────────────────────
   Product alone was too coarse: filtering to "AIQUA" still left a long list.
   Entries now carry four extra orthogonal dimensions — 類型 / 通道 / 階段 /
   處理方 — which can be combined (OR inside a dimension, AND across them).

   Tags are DERIVED CLIENT-SIDE from the question + answer text using the
   keyword table below, so nothing in Confluence has to change and the weekly
   csm-faq.json refresh cannot wipe them. If a future cache refresh writes an
   explicit `tags` object onto an entry, that always wins over the derived one.

   Also new: a one-line TL;DR under each question, so the common case needs
   no expand at all. Uses `entry.tldr` when present, otherwise the first
   sentence of the answer. */
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

  // ── TAXONOMY ───────────────────────────────────────────────────────────────
  // Order matters: the first matching rule in a dimension wins for the primary
  // tag, but every match is kept so an entry can carry several channel tags.
  var TAXONOMY = {
    // `type` is multi (capped at 2) on purpose: a question can legitimately be
    // both "計費" and "排錯", and first-match-wins mis-filed too many entries
    // during calibration against the live 82-entry set.
    type: {
      label: '類型',
      multi: true,
      cap: 2,
      rules: [
        ['billing',     '計費',   /計費|帳單|費用|報價|付款|請款|發票|billing|invoice|quotation|credit|quota|訂單|order\s*form/i],
        ['access',      '權限帳號', /停權|停用|被盜|釣魚|登入|\bsso\b|2fa|whitelist|permission|權限|帳號密碼|重設密碼|reset\s*password|加開帳號|帳號數/i],
        ['enablement',  '功能開通', /開通|啟用|開啟|申請開|enable|enabling|toggle|白名單|上線申請/i],
        ['integration', '資料串接', /串接|整合|對接|\bapi\b|\bsdk\b|webhook|integration|匯入|import|同步|sync|streaming/i],
        ['limitation',  '產品限制', /限制|不支援|不支持|無法支援|上限|\bcap\b|limitation|not supported|受限/i],
        ['troubleshoot','排錯',   /錯誤|失敗|異常|無法|不能|沒有收到|沒收到|沒有產出|沒出現|掉了|延遲|排查|debug|bug|error|fail|issue|不一致|對不起來|落差/i],
        ['howto',       '設定 how-to', /如何|怎麼|該怎麼|設定|配置|步驟|流程|how\s*to|setup|configure/i]
      ]
    },
    channel: {
      label: '通道',
      multi: true,
      rules: [
        ['ios',     'iOS',      /\bios\b|iphone|apns|\.p8\b|\.p12\b|apple/i],
        ['android', 'Android',  /android|\bfcm\b|\bgcm\b/i],
        ['web',     'Web',      /web\s*push|webpush|瀏覽器|browser|網頁推播/i],
        ['line',    'LINE',     /\bline\b|line\s*oa|line\s*uid/i],
        ['meta',    'FB / IG',  /facebook|messenger|\bfb\b|instagram|\big\b/i],
        ['edm',     'EDM',      /\bedm\b|email|sendgrid|郵件|信件|電子報|mail/i],
        ['sms',     'SMS',      /\bsms\b|簡訊/i],
        ['inapp',   'In-App',   /in\s*-?\s*app|inapp|站內|app\s*inbox|pop\s*-?\s*up/i],
        ['push',    'App Push', /推播|push/i]
      ]
    },
    stage: {
      label: '階段',
      multi: true,
      rules: [
        ['onboarding', 'Onboarding', /onboard|導入|建置|初始設定|kick\s*-?off|新帳號|開站/i],
        ['prelaunch',  '上線前檢查', /測試|驗證|檢查|前置|pre\s*-?launch|dry\s*run|sandbox|uat/i],
        ['renewal',    '續約',      /續約|renew|合約|contract|order\s*form|到期/i],
        ['change',     '帳號異動',   /轉移|移轉|migrat|異動|換人|離職|接手|合併帳號/i]
      ]
    },
    owner: {
      label: '處理方',
      multi: false,
      rules: [
        ['legal',  '需 Legal / 財務', /legal|財務|finance|請款|發票|合約審|order\s*form/i],
        ['rd',     '需 RD',          /\brd\b|工程|後端|backend|dev\s*team|escalat|產品團隊|\bpm\b/i],
        ['ps',     '需 PS / TS',     /開票|開\s*ticket|\bets\b|\bts\b|technical support|professional service|jira/i],
        ['csm',    'CSM 自解',       /.*/]
      ]
    }
  };

  var QUICK_VIEWS = [
    ['recent30', '近 30 天新增'],
    ['needrd',   '需 RD 協助'],
    ['stale',    '待重驗 stale'],
    ['high',     '緊急']
  ];

  var st = {
    meta: null, entries: [], q: '', cat: 'all',
    sel: { type: [], channel: [], stage: [], owner: [] },
    quick: null,
    showDeprecated: false, open: {}, loaded: false
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ── TAG DERIVATION ─────────────────────────────────────────────────────────
  function deriveTags(e) {
    if (e.tags && typeof e.tags === 'object') return e.tags;   // baked-in wins
    var text = (e.q || '') + ' \n ' + (e.a || '') + ' ' + (e.product || '');
    var out = {};
    Object.keys(TAXONOMY).forEach(function (dim) {
      var spec = TAXONOMY[dim];
      var hits = [];
      for (var i = 0; i < spec.rules.length; i++) {
        var r = spec.rules[i];
        if (r[2].test(text)) {
          hits.push(r[0]);
          if (!spec.multi) break;                    // single-value: first wins
          if (spec.cap && hits.length >= spec.cap) break;
        }
      }
      out[dim] = hits;
    });
    // "App Push" is a catch-all — drop it when a more specific channel matched.
    if (out.channel.length > 1 && out.channel.indexOf('push') > -1) {
      out.channel = out.channel.filter(function (c) { return c !== 'push'; });
    }
    // Keep channel lists readable
    if (out.channel.length > 3) out.channel = out.channel.slice(0, 3);
    return out;
  }

  function tagLabel(dim, key) {
    var rules = TAXONOMY[dim].rules;
    for (var i = 0; i < rules.length; i++) if (rules[i][0] === key) return rules[i][1];
    return key;
  }

  // ── TL;DR ──────────────────────────────────────────────────────────────────
  function tldrOf(e) {
    if (e.tldr) return e.tldr;
    var a = String(e.a || '').trim();
    if (!a) return '';
    // Strip a leading "(1)" / "1." style enumerator so the summary reads cleanly
    a = a.replace(/^[\(\[]?\s*\d+\s*[\)\].、]\s*/, '');
    // Take whole sentences until we have something actually informative.
    // A bare first sentence is often useless on its own ("有限制。"), so keep
    // pulling the next one until we clear ~24 chars or hit the 110 cap.
    var flat = a.replace(/\s+/g, ' ').trim();
    var parts = flat.split(/(?<=[。！？!?])/);
    var s = '';
    for (var i = 0; i < parts.length; i++) {
      if (s && (s.length >= 24 || (s + parts[i]).length > 110)) break;
      s += parts[i];
    }
    s = s.trim();
    if (!s) s = flat.slice(0, 110);
    if (s.length > 112) s = s.slice(0, 110) + '…';
    else if (flat.length > s.length && !/[。！？!?]$/.test(s)) s += '…';
    return s;
  }

  function injectCss() {
    var css = ''
      + '.faq-toolbar{margin-bottom:12px}'
      + '.faq-search{width:100%;margin-bottom:8px}'
      + '.faq-chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center}'
      + '.faq-chip{font-size:11px;padding:3px 10px;border-radius:100px;border:1px solid var(--border);cursor:pointer;user-select:none;color:var(--muted)}'
      + '.faq-chip.on{background:rgba(79,142,247,.15);border-color:var(--accent);color:var(--accent)}'
      + '.faq-chip.quick.on{background:rgba(16,185,129,.16);border-color:#10b981;color:#10b981}'
      + '.faq-dim{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px}'
      + '.faq-dim-label{font-size:10px;letter-spacing:.06em;color:var(--muted);min-width:42px;text-transform:uppercase}'
      + '.faq-filterbar{margin-top:10px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface2)}'
      + '.faq-filter-head{display:flex;justify-content:space-between;align-items:center;cursor:pointer}'
      + '.faq-filter-head .t{font-size:10px;letter-spacing:.08em;color:var(--muted);text-transform:uppercase}'
      + '.faq-filter-body{margin-top:8px}'
      + '.faq-filter-body.collapsed{display:none}'
      + '.faq-clear{font-size:11px;color:var(--accent);cursor:pointer}'
      + '.faq-recent{margin:10px 0 14px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface2)}'
      + '.faq-recent-title{font-size:10px;letter-spacing:.08em;color:var(--muted);margin-bottom:6px;text-transform:uppercase}'
      + '.faq-recent-items{display:flex;gap:6px;flex-wrap:wrap}'
      + '.faq-recent-item{font-size:11px;padding:3px 10px;border-radius:8px;cursor:pointer;background:rgba(16,185,129,.12);color:#10b981;white-space:nowrap}'
      + '.faq-list{display:flex;flex-direction:column;gap:0;border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--surface)}'
      + '.faq-row{display:flex;align-items:flex-start;gap:8px;padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border)}'
      + '.faq-row:hover{background:var(--surface2)}'
      + '.faq-row:last-child{border-bottom:none}'
      + '.faq-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:5px}'
      + '.faq-id{font-family:"DM Mono",monospace;font-size:10px;color:var(--muted);flex-shrink:0;margin-top:2px}'
      + '.faq-main{flex:1;min-width:0}'
      + '.faq-q{font-size:13px;color:var(--text)}'
      + '.faq-tldr{font-size:11.5px;line-height:1.5;color:var(--muted);margin-top:3px}'
      + '.faq-tagline{display:flex;gap:4px;flex-wrap:wrap;margin-top:5px}'
      + '.faq-tag{font-size:9.5px;padding:1px 7px;border-radius:100px;background:var(--surface2);color:var(--muted);border:1px solid var(--border);white-space:nowrap}'
      + '.faq-tag.t-type{color:#7c5cfa;border-color:rgba(124,92,250,.35)}'
      + '.faq-tag.t-channel{color:#22d3ee;border-color:rgba(34,211,238,.35)}'
      + '.faq-tag.t-stage{color:#fb923c;border-color:rgba(251,146,60,.35)}'
      + '.faq-tag.t-owner{color:#34d399;border-color:rgba(52,211,153,.35)}'
      + '.faq-row.stale .faq-q{color:var(--muted)}'
      + '.faq-badge{font-size:10px;padding:2px 8px;border-radius:100px;flex-shrink:0;white-space:nowrap;margin-top:1px}'
      + '.faq-badge.urg-high{background:rgba(220,38,38,.12);color:#dc2626}'
      + '.faq-badge.urg-medium{background:rgba(245,158,11,.14);color:#d97706}'
      + '.faq-badge.urg-low{background:var(--surface2);color:var(--muted)}'
      + '.faq-badge.b-stale{background:rgba(245,158,11,.14);color:#d97706}'
      + '.faq-badge.b-cat{background:var(--surface2);color:var(--muted)}'
      + '.faq-date{font-size:11px;color:var(--muted);flex-shrink:0;margin-top:2px}'
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
        st.entries = (d.entries || []).map(function (e) {
          e._tags = deriveTags(e);
          e._tldr = tldrOf(e);
          return e;
        });
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

  function faqFreshnessSuffix() {
    var lvs = (st.entries || []).map(function (e) { return e.last_verified; }).filter(Boolean).sort();
    if (!lvs.length) return '';
    var newest = lvs[lvs.length - 1];
    var upd = (st.meta && st.meta.updated) ? st.meta.updated : newest;
    var wk = new Date(new Date(upd + 'T00:00:00Z').getTime() - 7 * 86400000).toISOString().slice(0, 10);
    var weekNew = (st.entries || []).filter(function (e) { return e.last_verified && e.last_verified >= wk; }).length;
    var lagDays = Math.round((new Date(upd + 'T00:00:00Z').getTime() - new Date(newest + 'T00:00:00Z').getTime()) / 86400000);
    var s = ' · 最新條目 ' + esc(newest) + ' · 近 7 天新增 ' + weekNew + ' 條';
    if (lagDays > 8) s += ' <span style="color:var(--danger,#e5484d)">⚠️ 內容可能落後 ' + lagDays + ' 天</span>';
    return s;
  }

  // Which tag values actually occur, so we never show a chip that matches nothing
  function availableTags(dim) {
    var seen = {};
    st.entries.forEach(function (e) {
      if (e.status === 'deprecated' && !st.showDeprecated) return;
      (e._tags[dim] || []).forEach(function (t) { seen[t] = (seen[t] || 0) + 1; });
    });
    return TAXONOMY[dim].rules
      .map(function (r) { return { key: r[0], label: r[1], n: seen[r[0]] || 0 }; })
      .filter(function (x) { return x.n > 0; });
  }

  function activeFilterCount() {
    return Object.keys(st.sel).reduce(function (n, d) { return n + st.sel[d].length; }, 0)
         + (st.quick ? 1 : 0) + (st.cat !== 'all' ? 1 : 0);
  }

  function renderShell() {
    var root = document.getElementById('faqRoot');
    if (!root) return;

    var catChips = CATS.map(function (c) {
      return '<span class="faq-chip' + (st.cat === c[0] ? ' on' : '') + '" data-cat="' + c[0] + '" onclick="faqSetCat(this.getAttribute(&quot;data-cat&quot;))">' + esc(c[1]) + '</span>';
    }).join('');

    var quickChips = QUICK_VIEWS.map(function (v) {
      return '<span class="faq-chip quick' + (st.quick === v[0] ? ' on' : '') + '" data-qv="' + v[0] + '" onclick="faqSetQuick(this.getAttribute(&quot;data-qv&quot;))">' + esc(v[1]) + '</span>';
    }).join('');

    var dims = Object.keys(TAXONOMY).map(function (dim) {
      var opts = availableTags(dim);
      if (!opts.length) return '';
      var chips = opts.map(function (o) {
        var on = st.sel[dim].indexOf(o.key) > -1;
        return '<span class="faq-chip' + (on ? ' on' : '') + '" data-dim="' + dim + '" data-key="' + o.key + '" '
             + 'onclick="faqToggleTag(this.getAttribute(&quot;data-dim&quot;),this.getAttribute(&quot;data-key&quot;))">'
             + esc(o.label) + ' <span style="opacity:.6">' + o.n + '</span></span>';
      }).join('');
      return '<div class="faq-dim"><span class="faq-dim-label">' + esc(TAXONOMY[dim].label) + '</span>' + chips + '</div>';
    }).join('');

    var n = activeFilterCount();
    root.innerHTML = ''
      + '<div class="faq-toolbar">'
      +   '<input class="wiz-input faq-search" id="faqSearch" type="text" placeholder="搜尋問題、答案、ID…" value="' + esc(st.q) + '" oninput="faqSetQuery(this.value)">'
      +   '<div class="faq-chips">' + catChips
      +     '<span style="flex:1"></span>' + quickChips
      +     '<span class="faq-chip' + (st.showDeprecated ? ' on' : '') + '" onclick="faqToggleDeprecated()">顯示 deprecated</span>'
      +   '</div>'
      +   '<div class="faq-filterbar">'
      +     '<div class="faq-filter-head" onclick="faqToggleFilters()">'
      +       '<span class="t">議題篩選' + (n ? ' · ' + n + ' 項套用中' : '') + '</span>'
      +       '<span class="faq-clear" onclick="event.stopPropagation();faqClearFilters()">清除全部</span>'
      +     '</div>'
      +     '<div class="faq-filter-body" id="faqFilterBody">' + (dims || '<div class="faq-dim-label">無可用標籤</div>') + '</div>'
      +   '</div>'
      + '</div>'
      + '<div class="faq-recent" id="faqRecent" style="display:none"></div>'
      + '<div class="faq-list" id="faqList"></div>'
      + '<div class="faq-footer"><span>資料快取於 ' + esc(st.meta.updated || '?') + ' · 共 ' + st.entries.length + ' 條' + faqFreshnessSuffix() + '</span>'
      + '<a href="' + esc(st.meta.indexUrl || '#') + '" target="_blank" style="color:var(--accent)">在 Confluence 開啟 FAQ INDEX ↗</a></div>';
  }

  function daysAgoStr(days) {
    var ref = st.meta && st.meta.updated ? new Date(st.meta.updated + 'T00:00:00Z') : new Date();
    return new Date(ref.getTime() - days * 86400000).toISOString().slice(0, 10);
  }

  function matchesQuick(e) {
    if (!st.quick) return true;
    if (st.quick === 'recent30') return (e.last_verified || '') >= daysAgoStr(30);
    if (st.quick === 'needrd')   return (e._tags.owner || []).indexOf('rd') > -1;
    if (st.quick === 'stale')    return e.status === 'stale';
    if (st.quick === 'high')     return (e.urgency || 'medium') === 'high';
    return true;
  }

  function visible() {
    var q = st.q.trim().toLowerCase();
    return st.entries.filter(function (e) {
      if (e.status === 'deprecated' && !st.showDeprecated) return false;
      if (st.cat !== 'all' && e.category !== st.cat) return false;
      if (!matchesQuick(e)) return false;
      // AND across dimensions, OR within a dimension
      for (var dim in st.sel) {
        var want = st.sel[dim];
        if (!want.length) continue;
        var have = e._tags[dim] || [];
        var hit = want.some(function (w) { return have.indexOf(w) > -1; });
        if (!hit) return false;
      }
      if (!q) return true;
      return (e.id + ' ' + e.q + ' ' + e.a + ' ' + (e.product || '')).toLowerCase().indexOf(q) > -1;
    });
  }

  function sortKey(e) {
    var stalePenalty = e.status === 'stale' ? 100 : (e.status === 'deprecated' ? 200 : 0);
    return stalePenalty + (URG[e.urgency || 'medium'] != null ? URG[e.urgency || 'medium'] : 1);
  }

  function tagChipsFor(e) {
    var out = [];
    ['type', 'channel', 'stage', 'owner'].forEach(function (dim) {
      (e._tags[dim] || []).forEach(function (k) {
        if (dim === 'owner' && k === 'csm') return;   // default, not worth the pixels
        out.push('<span class="faq-tag t-' + dim + '">' + esc(tagLabel(dim, k)) + '</span>');
      });
    });
    return out.length ? '<div class="faq-tagline">' + out.join('') + '</div>' : '';
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
      var cutoff = daysAgoStr(7);
      var recent = st.entries
        .filter(function (e) { return e.status === 'active' && (e.last_verified || '') >= cutoff; })
        .sort(function (a, b) { return (b.last_verified || '').localeCompare(a.last_verified || ''); })
        .slice(0, 8);
      if (recent.length && !st.q && st.cat === 'all' && !st.quick && activeFilterCount() === 0) {
        recentEl.style.display = '';
        recentEl.innerHTML = '<div class="faq-recent-title">最近動態（近 7 天更新）</div><div class="faq-recent-items">'
          + recent.map(function (e) {
            return '<span class="faq-recent-item" data-id="' + esc(e.id) + '" onclick="faqJump(this.getAttribute(&quot;data-id&quot;))">' + esc(e.id) + ' ' + esc(e.q.length > 24 ? e.q.substring(0, 24) + '…' : e.q) + '</span>';
          }).join('') + '</div>';
      } else {
        recentEl.style.display = 'none';
      }
    }

    if (!items.length) {
      list.innerHTML = '<div class="faq-empty">沒有符合的條目<br><span class="faq-clear" onclick="faqClearFilters()">清除篩選</span></div>';
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
        + '<span class="faq-main">'
        +   '<span class="faq-q">' + esc(e.q) + '</span>'
        +   (e._tldr ? '<div class="faq-tldr">' + esc(e._tldr) + '</div>' : '')
        +   tagChipsFor(e)
        + '</span>'
        + badges
        + '<span class="faq-date">' + esc((e.last_verified || '').substring(5)) + '</span>'
        + '</div>'
        + '<div class="faq-ans' + openCls + '" id="faqAns-' + esc(e.id) + '">' + esc(e.a)
        + '<div class="faq-ans-meta">source: <a href="' + esc(e.source) + '" target="_blank">' + esc((e.source || '').replace(/^https?:\/\//, '').substring(0, 60)) + '</a>'
        + ' · last_verified ' + esc(e.last_verified || '?') + ' · ' + esc(e.product || '') + '</div></div>';
    }).join('');
  }

  // ── PUBLIC HANDLERS ────────────────────────────────────────────────────────
  window.faqSetQuery = function (v) { st.q = v || ''; renderList(); };

  window.faqSetCat = function (c) {
    st.cat = c;
    document.querySelectorAll('.faq-chip[data-cat]').forEach(function (el) {
      el.classList.toggle('on', el.getAttribute('data-cat') === c);
    });
    renderShell(); renderList();
  };

  window.faqToggleTag = function (dim, key) {
    if (!st.sel[dim]) return;
    var i = st.sel[dim].indexOf(key);
    if (i > -1) st.sel[dim].splice(i, 1); else st.sel[dim].push(key);
    renderShell(); renderList();
  };

  window.faqSetQuick = function (v) {
    st.quick = (st.quick === v) ? null : v;
    renderShell(); renderList();
  };

  window.faqClearFilters = function () {
    st.sel = { type: [], channel: [], stage: [], owner: [] };
    st.quick = null; st.cat = 'all'; st.q = '';
    renderShell(); renderList();
  };

  window.faqToggleFilters = function () {
    var b = document.getElementById('faqFilterBody');
    if (b) b.classList.toggle('collapsed');
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
