(function(){
  'use strict';

  const AR_URL_KEY = 'ar_sheet_url';
  let arRawData = [];
  let _arSortBy = 'date', _arSortAsc = false;

  function arGetSavedUrl(){ return localStorage.getItem(AR_URL_KEY) || ''; }
  function arClearUrl(){ localStorage.removeItem(AR_URL_KEY); }

  function arToCsvUrl(rawUrl){
    rawUrl = (rawUrl || '').trim();
    if(!rawUrl) return '';
    if(rawUrl.includes('export?format=csv') || rawUrl.includes('output=csv')) return rawUrl;
    var m = rawUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if(m) return 'https://docs.google.com/spreadsheets/d/' + m[1] + '/export?format=csv&gid=0';
    var d = rawUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if(d) return 'https://drive.google.com/uc?export=download&id=' + d[1];
    var q = rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if(q) return 'https://drive.google.com/uc?export=download&id=' + q[1];
    return rawUrl;
  }

  function arGetCurrentEmail(){
    try{
      var u = JSON.parse(sessionStorage.getItem('jt_user'));
      if(u && u.email) return u.email.toLowerCase();
    }catch(e){}
    var sub = document.getElementById('headerSub');
    if(sub){
      var m = sub.textContent.match(/([\w.+\-]+@[\w.\-]+\.[\w]+)/);
      if(m) return m[1].toLowerCase();
    }
    return '';
  }

  function _arVis(id, show){
    var el = document.getElementById(id);
    if(el) el.style.display = show ? '' : 'none';
  }

  function arShowConnect(){
    _arVis('arConnectBox', true);
    _arVis('arLoadBar',    false);
    _arVis('arStatsRow',   false);
    _arVis('arCtrlBar',    false);
    _arVis('arTableWrap',  false);
    _arVis('arSetupNote',  false);
    var inp = document.getElementById('arUrlInput');
    if(inp) inp.value = arGetSavedUrl();
  }

  function arShowData(){
    _arVis('arConnectBox', false);
    _arVis('arSetupNote',  false);
    _arVis('arLoadBar',    true);
    _arVis('arStatsRow',   true);
    _arVis('arCtrlBar',    true);
    _arVis('arTableWrap',  true);
  }

  function arSetStatus(dot, label){
    var d = document.getElementById('arDot');
    var l = document.getElementById('arLoadLabel');
    if(d){ d.className = 'ar-load-dot'; if(dot) d.classList.add(dot); }
    if(l) l.textContent = label;
  }

  window.arSaveUrl = function(){
    var inp = document.getElementById('arUrlInput');
    if(!inp) return;
    var raw = inp.value.trim();
    if(!raw){ alert('Please paste a Google Sheets share link first.'); return; }
    localStorage.setItem(AR_URL_KEY, raw);
    arShowData();
    arLoadData();
  };

  window.arDisconnect = function(){
    arClearUrl();
    arRawData = [];
    arShowConnect();
  };

  window.arLoadData = async function(){
    var savedUrl = arGetSavedUrl();
    if(!savedUrl){ arShowConnect(); return; }
    arSetStatus('spin', 'Loading…');
    var btn = document.getElementById('arRefreshBtn');
    if(btn) btn.disabled = true;
    try{
      var isAppsScript = /script\.google\.com\/macros\/s\//i.test(savedUrl);
      if(false){ // apps script returns CSV - handled by CSV path below
        // ── Apps Script path: fetch JSON ──────────────────────────────────────────────────────
        var myEmail = arGetCurrentEmail();
        var sep = savedUrl.includes('?') ? '&' : '?';
        var fetchUrl = savedUrl + sep + 'action=ar' + (myEmail ? '&email=' + encodeURIComponent(myEmail) : '');
        var resp = await fetch(fetchUrl, {redirect:'follow', cache:'no-store'});
        if(!resp.ok) throw new Error('HTTP ' + resp.status + ' from Apps Script — check deployment settings.');
        var json;
        try{ json = await resp.json(); }
        catch(e){ throw new Error('Apps Script did not return valid JSON. Ensure it is deployed as a web app with execute access for \'Anyone\'.'); }
        if(json && json.error) throw new Error(json.error);
        var rows = (json && json.data) ? json.data : (Array.isArray(json) ? json : null);
        if(!rows) throw new Error('Unexpected JSON shape from Apps Script.');
        if(json.source){
          var tsEl = document.getElementById('arLastLoaded');
          if(tsEl) tsEl.textContent = '📄 ' + json.source;
        }
        arFinalize(rows, 'json');
      } else {
        // ── Direct Sheets / CSV path ────────────────────────────────────────────────────
        var fetchUrl = arToCsvUrl(savedUrl);
        var resp = await fetch(fetchUrl, {cache:'no-store'});
        if(!resp.ok) throw new Error('HTTP ' + resp.status + ' — make sure the sheet is shared as Anyone with the link.');
        var ct = resp.headers.get('content-type') || '';
        var buf = await resp.arrayBuffer();
        var isExcel = ct.includes('spreadsheet') || ct.includes('officedocument') ||
                      ct.includes('excel') || fetchUrl.endsWith('.xlsx') || fetchUrl.endsWith('.xls');
        if(isExcel && typeof XLSX !== 'undefined'){
          var wb = XLSX.read(buf, {type:'array', cellDates:true});
          var ws = wb.Sheets[wb.SheetNames[0]];
          arFinalize(XLSX.utils.sheet_to_json(ws, {defval:''}), 'excel');
        } else {
          var text = new TextDecoder('utf-8').decode(buf);
          var lines = text.split('\n').filter(function(l){ return l.trim(); });
          if(lines.length < 2) throw new Error('Empty or unreadable file — make sure the sheet is shared publicly.');
          var headerIdx=0;for(var hi=0;hi<Math.min(lines.length,30);hi++){var th=arParseCsvLine(lines[hi]);if(th.some(function(c){return c.toLowerCase().includes('account');})){headerIdx=hi;break;}}var headers=arParseCsvLine(lines[headerIdx]);
          var rows2 = [];
          for(var i = headerIdx+1; i < lines.length; i++){
            var vals = arParseCsvLine(lines[i]);
            var obj = {};
            headers.forEach(function(h, idx){ obj[h] = vals[idx] || ''; });
            rows2.push(obj);
          }
          arFinalize(rows2, 'csv');
          var ts = new Date().toLocaleString('en-HK',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Hong_Kong'});
          var tsEl = document.getElementById('arLastLoaded');
          if(tsEl) tsEl.textContent = 'Updated ' + ts;
        }
      }
      arSetStatus('ok', 'Loaded');
      arRender();
    }catch(err){
      arSetStatus('err', 'Error: ' + err.message);
      console.error('[AR]', err);
    }finally{
      if(btn) btn.disabled = false;
    }
  };

  function arParseCsvLine(line){
    var result = [], cur = '', inQ = false;
    for(var i = 0; i < line.length; i++){
      var c = line[i];
      if(c === '"'){
        if(inQ && line[i+1] === '"'){ cur += '"'; i++; }
        else inQ = !inQ;
      } else if(c === ',' && !inQ){
        result.push(cur); cur = '';
      } else { cur += c; }
    }
    result.push(cur);
    return result;
  }

  function arNorm(s){ return String(s).toLowerCase().replace(/[\s_\-:]+/g,''); }

  function arFindCol(headers){
    var candidates = Array.prototype.slice.call(arguments, 1);
    var normH = headers.map(arNorm);
    for(var ci = 0; ci < candidates.length; ci++){
      var cn = arNorm(candidates[ci]);
      for(var i = 0; i < headers.length; i++){
        if(arNorm(headers[i]) === cn) return headers[i];
      }
    }
    for(var ci2 = 0; ci2 < candidates.length; ci2++){
      var cn2 = arNorm(candidates[ci2]);
      for(var i2 = 0; i2 < normH.length; i2++){
        if(normH[i2] && (normH[i2].includes(cn2) || cn2.includes(normH[i2]))) return headers[i2];
      }
    }
    return null;
  }

  function arFinalize(rows, fmt){
    if(!rows || !rows.length){ arRawData = []; arRender(); return; }
    var headers = Object.keys(rows[0]);
    var colAccount  = arFindCol(headers,`Account`,`Account Name`);
    var colOpp      = arFindCol(headers,`Opportunity: Opportunity Name`,`Opportunity Name`,`Opportunity`);
    var colAmount   = arFindCol(headers,`Issued Invoice Amount`,`Invoice Amount`,`Amount`);
    var colCsmEmail = arFindCol(headers,`CSM Email`,`CSM`,`Owner Email`);
    var colStatus   = arFindCol(headers,`AR Status`,`Status`);
    var colDate     = arFindCol(headers,`Expected Sending Date`,`Expected Date`,`Due Date`,`Date`);
    var colStartDate = arFindCol(headers,`Opportunity: Actual Activation Date`,`Activation Date`,`Contract Start`);
    var colExpDate   = arFindCol(headers,`Opportunity: Contract Expiry Date`,`Contract Expiry Date`,`Contract End`);
    var mapped = rows.map(function(r){
      return {
        account:     String(r[colAccount]  || ``).trim(),
        opportunity: String(r[colOpp]      || ``).trim(),
        amount:      r[colAmount] || ``,
        csmEmail:    String(r[colCsmEmail] || ``).trim().toLowerCase(),
        status:      String(r[colStatus]   || ``).trim(),
        date:        String(r[colDate]     || ``).trim(),
        startDate:   String(r[colStartDate]|| ``).trim(),
        endDate:     String(r[colExpDate]  || ``).trim(),
      };
    });
    var _la=``,_lo=``,_le=``;
    mapped.forEach(function(r){
      var isNewA=!!r.account;
      if(r.account) _la=r.account; else r.account=_la;
      if(r.opportunity) _lo=r.opportunity; else r.opportunity=_lo;
      if(isNewA) _le=``;
      if(r.csmEmail) _le=r.csmEmail; else r.csmEmail=_le;
    });
    arRawData = mapped.filter(function(r){ return r.opportunity || r.account; });
    var _cs={};
    arRawData.forEach(function(r){ _cs[r.csmEmail||'__nocsm__']=1; });
    var _sd=document.getElementById('arCsmFilter');
    if(_sd){
      var _pv=_sd.value;
      _sd.innerHTML='<option value="">All CSMs</option>';
      Object.keys(_cs).sort().forEach(function(e){
        var o=document.createElement('option');
        o.value=e; o.textContent=e==='__nocsm__'?'(No CSM)':e.split('@')[0];
        _sd.appendChild(o);
      });
      if(_pv && _sd.querySelector('option[value="'+_pv+'"]')) _sd.value=_pv;
      else { var _me=arGetCurrentEmail(); if(_me && _sd.querySelector('option[value="'+_me+'"]')) _sd.value=_me; }
    }
    arRender();
  }

  window.arSort = function(col){
    if(_arSortBy === col) _arSortAsc = !_arSortAsc;
    else { _arSortBy = col; _arSortAsc = true; }
    ['account','opportunity','amount','status','date'].forEach(function(c){
      var th = document.getElementById('arTh-' + c);
      if(!th) return;
      var arrow = th.querySelector('.sort-arrow');
      if(arrow) arrow.textContent = (c === _arSortBy) ? (_arSortAsc ? '↑' : '↓') : '↕';
    });
    arRender();
  };

  window.arRender = function(){
    var csmFEl = document.getElementById(`arCsmFilter`);
    var searchEl = document.getElementById(`arSearch`);
    var statusEl = document.getElementById(`arStatusFilter`);
    var csmF = csmFEl ? csmFEl.value : ``;
    var search    = searchEl ? searchEl.value.toLowerCase() : ``;
    var statusF   = statusEl ? statusEl.value : ``;
    var rows = arRawData.slice();
    if(csmF===`__nocsm__`) rows=rows.filter(function(r){ return !r.csmEmail; });
    else if(csmF) rows=rows.filter(function(r){ return r.csmEmail===csmF; });
    if(search) rows = rows.filter(function(r){
      return r.account.toLowerCase().includes(search) || r.opportunity.toLowerCase().includes(search);
    });
    if(statusF) rows = rows.filter(function(r){ return r.status === statusF; });
    var total   = rows.length;
    var paid    = rows.filter(function(r){ return /^paid$/i.test(r.status); }).length;
    var invalid = rows.filter(function(r){ return /^invalid$/i.test(r.status); }).length;
    var unpaid  = rows.filter(function(r){ return /^(billed|draft|unpaid|scheduled)$/i.test(r.status); }).length;
    function _set(id,v){ var el=document.getElementById(id); if(el) el.textContent=v; }
    _set(`arStatTotal`,total); _set(`arStatPaid`,paid);
    _set(`arStatUnpaid`,unpaid); _set(`arStatInvalid`,invalid);
    _set(`tc-ar`, total||`—`);
    var tbody = document.getElementById(`arTbody`);
    if(!tbody) return;
    if(!rows.length){
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--muted)">No records match.</td></tr>`;
      return;
    }
    function _pa(s){ return parseFloat(String(s).replace(/[^0-9.\-]/g,``))||0; }
    function _sc(st){
      var s=(st||``).toLowerCase();
      if(s===`paid`) return `paid`; if(s===`invalid`) return `invalid`;
      if(s===`billed`||s===`unpaid`) return `unpaid`; if(s===`draft`) return `draft`;
      if(s===`scheduled`) return `scheduled`; return ``;
    }
    var acctMap={}, acctOrder=[];
    rows.forEach(function(r){
      var a=r.account||`(No Account)`, o=r.opportunity||`(No Opportunity)`;
      if(!acctMap[a]){ acctMap[a]={}; acctOrder.push(a); }
      if(!acctMap[a][o]) acctMap[a][o]=[];
      acctMap[a][o].push(r);
    });
    var html=``;
    acctOrder.forEach(function(acct){
      var oppMap=acctMap[acct], opps=Object.keys(oppMap);
      var aTotal=0, aCur=``;
      opps.forEach(function(o){ oppMap[o].forEach(function(r){
        var m=String(r.amount).match(/([A-Z]{3})/); if(m) aCur=m[1]; aTotal+=_pa(r.amount);
      }); });
      html+=`<tr style="background:var(--surface2)"><td colspan="5" style="padding:8px 14px;border-top:2px solid var(--accent);border-bottom:1px solid var(--border)">`;
      html+=`<div style="display:flex;justify-content:space-between;align-items:center">`;
      html+=`<span style="font-weight:600;font-size:13px">🏢 `+_esc(acct)+`</span>`;
      html+=`<span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--accent)">`+(aCur?_esc(aCur+` `+Math.round(aTotal).toLocaleString()):`—`)+`</span>`;
      html+=`</div></td></tr>`;
      opps.forEach(function(opp){
        var oRows=oppMap[opp], oTotal=0, oCur=``;
        oRows.forEach(function(r){
          var m=String(r.amount).match(/([A-Z]{3})/); if(m) oCur=m[1]; oTotal+=_pa(r.amount);
        });
        html+=`<tr style="background:var(--surface)"><td colspan="5" style="padding:5px 14px 5px 28px;border-bottom:1px solid var(--border)">`;
        html+=`<div style="display:flex;justify-content:space-between;align-items:center">`;
        html+=`<span style="font-size:12px;color:var(--text)">📋 `+_esc(opp)+`</span>`;
        (function(){var _ed=oRows[0]&&oRows[0].endDate||``;var _ec=`var(--muted)`;if(_ed){var _dl=Math.round((new Date(_ed)-new Date(new Date().setHours(0,0,0,0)))/86400000);if(_dl<=0)_ec=`#ef4444`;else if(_dl<=30)_ec=`#f97316`;}html+=`<span style="font-size:11px;color:var(--muted);font-family:'DM Mono',monospace;margin:0 auto;white-space:nowrap">`+(oRows[0]&&(oRows[0].startDate||oRows[0].endDate)?(oRows[0].startDate?_esc(oRows[0].startDate)+` `:``)+`→`+(oRows[0].endDate?` `+`<span style="color:`+_ec+`">`+_esc(oRows[0].endDate)+`</span>`:``):``)+`</span>`;})();;
        html+=`<span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted2)">`+(oCur?_esc(oCur+` `+Math.round(oTotal).toLocaleString()):`—`)+`</span>`;
        html+=`</div></td></tr>`;
        oRows.forEach(function(r){
          html+=`<tr style="background:var(--bg)"><td style="padding:4px 8px 4px 44px;font-family:'DM Mono',monospace;font-size:11px;color:var(--muted)">`+_esc(r.date)+`</td>`;
          html+=`<td></td><td style="padding:4px 12px;text-align:right;font-family:'DM Mono',monospace;font-size:12px">`+_esc(r.amount)+`</td>`;
          html+=`<td style="padding:4px 8px"><span class="ar-badge `+_sc(r.status)+`">`+_esc(r.status||`—`)+`</span></td>`;
          html+=`<td style="padding:4px 12px;font-size:11px;color:var(--muted)">`+_esc(r.csmEmail.split(`@`)[0])+`</td></tr>`;
        });
      });
    });
    tbody.innerHTML = html;
  };

  function _esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  window.arTabActivated = function(){
    var saved = arGetSavedUrl();
    if(!saved){ arShowConnect(); return; }
    arShowData();
    if(arRawData.length === 0) arLoadData();
    else arRender();
  };

})();
