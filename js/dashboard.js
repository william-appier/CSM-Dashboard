// Sync csm-memory.json ignore list into localStorage on init
(async function syncIgnoreFromMemory(){
  try {
    const r = await fetch('https://raw.githubusercontent.com/williamwtlin-bit/williamwtlin-bit.github.io/main/csm-memory.json?t='+Date.now());
    if(!r.ok) return;
    const mem = await r.json();
    const memKeys = (mem.ignoreTickets||[]).map(function(t){return t.key;}).filter(Boolean);
    if(!memKeys.length) return;
    const existing = new Set(JSON.parse(localStorage.getItem('jd_tbd_ignored')||'[]'));
    memKeys.forEach(function(k){ existing.add(k); });
    localStorage.setItem('jd_tbd_ignored', JSON.stringify([...existing]));
  } catch(e){}
})();

'use strict';

// SECTION 5 \u2014 DASHBOARD LOGIC (unchanged from previous version)
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

function normU(s){
  return(s||'').replace(/[\uFF01-\uFF5E]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0)).replace(/\u3000/g,' ').trim();
}
const ALIASES={'10/10hope':'10/10Hope','1010hope':'10/10Hope','10/10':'10/10Hope','\u7530\u539f\u9999':'Qchicken','qchicken':'Qchicken','sogo':'Sogo','SOGO':'Sogo'};
function normClient(raw){
  if(!raw) return null;
  const n=normU(raw);
  const k=n.toLowerCase().replace(/[^a-z0-9\/\u4e00-\u9fff]/g,'');
  for(const[a,b] of Object.entries(ALIASES))
    if(k===a.toLowerCase().replace(/[^a-z0-9\/\u4e00-\u9fff]/g,'')) return b;
  return n.charAt(0).toUpperCase()+n.slice(1);
}
function extractClient(s){
  const m=normU(s).match(/\[([^\]]+)\]/);
  return m ? normClient(m[1].trim())||'Others' : 'Others';
}
function isDone(s){const l=(s||'').toLowerCase();return['done','duplicate','archive','closed','resolved'].includes(l)||l.includes("won't fix")||l.includes('wontfix')||l.includes('invalid');}
function isBacklog(s){const l=(s||'').toLowerCase();return l==='backlog'||l==='csm backlog'||l==='issue backlog';}
function isActive(s){return !isDone(s)&&!isBacklog(s);}
function statusPriority(s){
  const l=(s||'').toLowerCase();
  if(isBacklog(s))return 0; if(l==='to do')return 1;
  if(l.includes('progress'))return 2; if(l.includes('client review'))return 3;
  return 4;
}
function ltC(d){return d<=3?'lt-lo':d<=14?'lt-mi':'lt-hi';}
function calcLT(c){return Math.floor((Date.now()-new Date(c))/86400000);}
function sClass(s){
  const l=(s||'').toLowerCase();
  if(['done','duplicate','archive'].includes(l))return 's-done';
  if(l.includes('progress'))return 's-ip'; if(l==='to do')return 's-todo';
  if(isBacklog(s))return 's-bl'; if(l.includes('review')||l.includes('approval')||l==='prep')return 's-rev';
  return 's-oth';
}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// Mark Done \u2014 now uses direct REST API
async function markDone(key,btn){
  btn.disabled=true; btn.innerHTML='<span class="spin">\u21bb</span>';
  toast('info',`Transitioning ${key} to Done\u2026`);
  try{
    await markIssueDone(key);
    const i=allData.find(x=>x.key===key);
    if(i){i.status='Done'; i.resolutiondate=new Date().toISOString().slice(0,10);}
    toast('success',`\u2713 ${key} marked as Done in Jira`);
    renderDashboard(allData);
  }catch(e){
    toast('error',`Failed to update ${key}: ${e.message}`);
    btn.disabled=false; btn.innerHTML='\u2713 Mark Done';
  }
}

function toast(type,msg){
  const c=document.getElementById('tw'),t=document.createElement('div');
  t.className=`toast ${type}`; t.textContent=msg; c.appendChild(t);
  setTimeout(()=>t.remove(),4000);
}

function ddToggle(id,e){
  e.stopPropagation();
  const panel=document.getElementById(id+'Panel'),btn=document.getElementById(id+'Btn');
  const opening=!panel.classList.contains('open');
  document.getElementById('asnPanel').classList.remove('open');
  document.getElementById('asnBtn').classList.remove('open');
  if(opening){panel.classList.add('open');btn.classList.add('open');document.getElementById(id+'Srch').focus();}
}
document.addEventListener('click',()=>{
  const p=document.getElementById('asnPanel'),b=document.getElementById('asnBtn');
  if(p){p.classList.remove('open');b.classList.remove('open');}
});
function ddFilter(id){
  const q=document.getElementById(id+'Srch').value.toLowerCase();
  document.querySelectorAll(`#${id}List .dd-opt`).forEach(o=>{o.style.display=o.textContent.toLowerCase().includes(q)?'':'none';});
}
function ddPick(id,val,el){
  selAsn=val;
  document.querySelectorAll(`#${id}List .dd-opt`).forEach(o=>o.classList.remove('sel'));
  el.classList.add('sel');
  document.getElementById('asnLabel').textContent=val?`\u{1f464} ${val}`:'\u{1f464} All Assignees';
  document.getElementById(id+'Panel').classList.remove('open');
  document.getElementById(id+'Btn').classList.remove('open');
  applyFilters();
}
function buildDropdown(id,values){
  const list=document.getElementById(id+'List');
  list.innerHTML=`<div class="dd-opt ${selAsn===null?'sel':''}" onclick="ddPick('${id}',null,this)"><span class="dd-dot"></span>All Assignees</div>`
    +values.map(v=>`<div class="dd-opt ${selAsn===v?'sel':''}" onclick="ddPick('${id}','${esc(v)}',this)"><span class="dd-dot"></span>${esc(v)}</div>`).join('');
}

function mkRow(issue,showBtn){
  const days=calcLT(issue.created), done=isDone(issue.status);
  const sumClean=esc(normU(issue.summary).replace(/\[[^\]]+\]\s*/,''));
  const _ign=(new Set(JSON.parse(localStorage.getItem('jd_tbd_ignored')||'[]'))) .has(issue.key);
  return `<tr class="tracking-row${_ign?' row-ignored':''}" data-key="${issue.key}" data-search="${(issue.key+' '+issue.summary+' '+issue.assignee+' '+issue.reporter+' '+issue.status).toLowerCase()}" data-asn="${esc(issue.assignee)}" onclick="openPanel('${issue.key}',event,'tracking')">
    <td class="cb-td" onclick="event.stopPropagation()">
      <input type="checkbox" class="row-cb" data-key="${issue.key}" onchange="onRowCbChange(this)"/>
    </td>
    <td onclick="event.stopPropagation()"><a class="ticket-key" href="${issue.url}" target="_blank">${issue.key}</a></td>
    <td><div class="ticket-summary">${sumClean}</div></td>
    <td><span class="sb ${sClass(issue.status)}"><span class="sd"></span>${esc(issue.status)}</span></td>
    <td><span class="ac">${esc(issue.assignee)}</span></td>
    <td><span class="dc">${issue.created}</span></td>
    <td><span class="lt ${ltC(days)}">${days}d</span></td>
    <td style="min-width:108px" onclick="event.stopPropagation()">${showBtn&&!done?`<button class="btn-md" onclick="markDone('${issue.key}',this)">\u2713 Mark Done</button>`:(done?'<span style="color:var(--green);font-family:DM Mono,monospace;font-size:11px;opacity:.6">\u2713 done</span>':'')}</td>
  </tr>`;
}

function mkGroup(client,issues,ci){
  const color=COLORS[ci%COLORS.length];
  const gid='g_'+client.replace(/[^a-z0-9]/gi,'_');
  const cbThId=`gcb_${gid}`;
  const thead=`<thead><tr>
    <th class="cb-th"><input type="checkbox" class="group-cb" id="${cbThId}" title="Select all in group" onchange="onGroupCbChange('${gid}',this)"/></th>
    <th>Ticket</th><th>Summary</th><th>Status</th><th>Assignee</th><th>Created</th><th>Lead Time</th><th>Action</th>
  </tr></thead>`;
  const done=issues.filter(i=>isDone(i.status));
  const notDone=issues.filter(i=>!isDone(i.status)).sort((a,b)=>statusPriority(a.status)-statusPriority(b.status));
  const cActive=notDone.filter(i=>isActive(i.status)).length;
  const cNS=notDone.filter(i=>isBacklog(i.status)).length;
  const allDone = notDone.length===0 && done.length>0;

  // \u2500\u2500 ALL-DONE: render as a single compact row \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  if(allDone){
    // Hidden search targets so search still finds tickets inside collapsed rows
    const searchTargets=done.map(i=>`<span class="ad-search-target" data-search="${(i.key+' '+i.summary+' '+i.assignee+' '+i.status).toLowerCase()}" data-asn="${esc(i.assignee)}"></span>`).join('');
    return `<div class="all-done-section" id="${gid}">
      ${searchTargets}
      <div class="all-done-row" onclick="toggleAllDone('${gid}')">
        <span class="client-dot" style="background:${color}"></span>
        <span class="client-name" style="color:${color}">${esc(client)}</span>
        <span class="ad-done-badge">\u2713 ${done.length} done</span>
        <span class="ad-chev" id="${gid}_adchev">\u25b8</span>
      </div>
      <div class="all-done-tickets" id="${gid}_adtickets">
        <table class="done-table">${thead}<tbody>${done.map(i=>mkRow(i,false)).join('')}</tbody></table>
      </div>
    </div>`;
  }

  // \u2500\u2500 NORMAL: has active/not-started tickets \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  return `<div class="client-group" id="${gid}">
    <div class="client-header" onclick="toggleGroup('${gid}')">
      <div class="client-name-wrap"><span class="client-dot" style="background:${color}"></span><span class="client-name" style="color:${color}">${esc(client)}</span></div>
      <div class="client-badges">
        <span class="badge b-total">${issues.length} total</span>
        ${cActive?`<span class="badge b-active">${cActive} active</span>`:''}
        ${cNS?`<span class="badge b-ns">${cNS} not started</span>`:''}
        ${done.length?`<span class="badge b-done">${done.length} done</span>`:''}
        <span class="chevron open" id="${gid}_chev">\u25be</span>
      </div>
    </div>
    <div class="group-body" id="${gid}_body">
      ${notDone.length?`<div class="table-wrap"><table>${thead}<tbody>${notDone.map(i=>mkRow(i,true)).join('')}</tbody></table></div>`
        :'<div style="padding:13px 18px;color:var(--muted);font-size:13px;font-style:italic">No active tickets</div>'}
      ${done.length?`<div class="done-section">
        <div class="done-toggle" onclick="toggleDone('${gid}_done')"><span class="done-chev" id="${gid}_done_chev">\u25b8</span>Archive / Done <span class="done-badge">${done.length}</span></div>
        <div class="done-body" id="${gid}_done"><table class="done-table">${thead}<tbody>${done.map(i=>mkRow(i,false)).join('')}</tbody></table></div>
      </div>`:''}
    </div>
  </div>`;
}

function toggleAllDone(gid){
  const tickets=document.getElementById(gid+'_adtickets');
  const chev=document.getElementById(gid+'_adchev');
  if(!tickets) return;
  tickets.classList.toggle('open');
  if(chev) chev.classList.toggle('open', tickets.classList.contains('open'));
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// SIDE PANEL \u2014 open, load, comment, reassign, transition
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
let panelKey  = null;
let panelMode = 'tracking'; // 'tracking' = read-only | 'tbd' = full actions
let assigneeSearchTimer = null;

function openPanel(key, e, mode='tbd'){
  if(e) e.stopPropagation();
  panelKey  = key;
  panelMode = mode;

  // Highlight active row in the correct tab
  document.querySelectorAll('.tbd-row, .tracking-row').forEach(r=>{
    r.classList.toggle('panel-active', r.dataset.key===key);
  });

  // Show/hide action sections based on mode
  const actionsEl = document.getElementById('panelActions');
  actionsEl.style.display = mode==='tbd' ? '' : 'none';

  // Update comment section title
  document.getElementById('panelCommentTitle').textContent =
    mode==='tracking' ? 'Recent Comments (last 5)' : 'Add Comment';

  // Find issue from correct data source for instant meta render
  const issue = mode==='tbd'
    ? tbdData.find(i=>i.key===key)
    : allData.find(i=>i.key===key);
  if(issue) populatePanelMeta(issue);

  // Reset description + comments to loading state, clear media registry
  _mediaRegistry = [];
  document.querySelector('.preview-modal')?.remove();
  document.getElementById('panelDescription').innerHTML='<span class="panel-loading">Loading\u2026</span>';
  document.getElementById('panelCommentList').innerHTML='<span class="panel-loading">Loading\u2026</span>';

  // Open panel
  document.getElementById('sidePanel').classList.add('open');
  document.getElementById('panelOverlay').classList.add('open');

  // Reset inputs (only needed in tbd mode but harmless to always reset)
  document.getElementById('panelComment').value='';
  document.getElementById('panelAssigneeSearch').value='';
  document.getElementById('panelUserResults').style.display='none';
  document.getElementById('panelAssignedTo').textContent='';

  // Load data from Jira
  loadPanelDescription(key);
  loadPanelComments(key, mode==='tracking' ? 5 : 8);
  if(mode==='tbd') loadPanelTransitions(key);
}

function closePanel(){
  document.getElementById('sidePanel').classList.remove('open');
  document.getElementById('panelOverlay').classList.remove('open');
  document.querySelectorAll('.tbd-row, .tracking-row').forEach(r=>r.classList.remove('panel-active'));
  panelKey=null;
}

// Close on Escape key
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closePanel(); });

function populatePanelMeta(issue){
  const days = calcLT(issue.created);
  document.getElementById('panelKey').textContent = issue.key;
  document.getElementById('panelKey').href = issue.url;
  document.getElementById('panelSummary').textContent = normU(issue.summary);
  document.getElementById('panelAssignee').textContent = issue.assignee || '\u2014';
  document.getElementById('panelReporter').textContent = issue.reporter;
  document.getElementById('panelCreated').textContent = issue.created;
  document.getElementById('panelLT').textContent = days + 'd';
  document.getElementById('panelLT').style.color =
    days<=3?'var(--green)':days<=14?'var(--yellow)':'var(--red)';

  const sb = document.getElementById('panelStatus');
  sb.textContent = issue.status;
  sb.className = 'panel-status-badge sb ' + sClass(issue.status);
}

async function loadPanelTransitions(key){
  const el = document.getElementById('panelTransitions');
  el.innerHTML = '<span class="panel-loading">Loading\u2026</span>';
  try{
    const user = getUser();
    if(!user){ el.innerHTML='<span class="panel-empty">Login required</span>'; return; }
    const base = `${CONFIG.API_BASE}/ex/jira/${user.cloudId}`;
    const data = await apiFetch(`${base}/rest/api/3/issue/${key}/transitions`);
    const transitions = (data.transitions||[]).filter(t=>t.isAvailable!==false);
    if(!transitions.length){ el.innerHTML='<span class="panel-empty">No transitions available</span>'; return; }
    el.innerHTML = transitions.map(t=>{
      const isDoneT = t.name.toLowerCase()==='done';
      return `<button class="tr-btn ${isDoneT?'done-tr':''}"
        onclick="applyTransition('${key}','${t.id}','${esc(t.name)}',this)">
        ${isDoneT?'\u2713 ':''}${esc(t.name)}
      </button>`;
    }).join('');
  }catch(e){
    el.innerHTML=`<span class="panel-empty">Could not load transitions</span>`;
  }
}

async function applyTransition(key, transitionId, transitionName, btn){
  btn.disabled=true;
  const orig=btn.innerHTML;
  btn.innerHTML='<span class="spin">\u21bb</span>';
  try{
    const user=getUser();
    const base=`${CONFIG.API_BASE}/ex/jira/${user.cloudId}`;
    await apiFetch(`${base}/rest/api/3/issue/${key}/transitions`,{
      method:'POST',
      body:JSON.stringify({transition:{id:transitionId}}),
    });
    toast('success',`\u2713 ${key} \u2192 ${transitionName}`);

    // Update tbdData status
    const issue = tbdData.find(i=>i.key===key);
    if(issue) issue.status = transitionName;

    // If Done \u2014 remove from list and close panel
    if(transitionName.toLowerCase()==='done'){
      tbdData = tbdData.filter(i=>i.key!==key);
      const tracked = allData.find(i=>i.key===key);
      if(tracked){tracked.status='Done';tracked.resolutiondate=new Date().toISOString().slice(0,10);}
      renderDashboard(allData);
      renderTbd(tbdData);
      closePanel();
    } else {
      // Refresh transitions + update status badge
      if(issue) populatePanelMeta(issue);
      renderTbd(tbdData);
      loadPanelTransitions(key);
    }
  }catch(e){
    toast('error',`Transition failed: ${e.message}`);
    btn.disabled=false; btn.innerHTML=orig;
  }
}

async function loadPanelDescription(key){
  const el=document.getElementById('panelDescription');
  try{
    const user=getUser();
    if(!user){ el.innerHTML='<span class="panel-empty">Login required</span>'; return; }
    const base=`${CONFIG.API_BASE}/ex/jira/${user.cloudId}`;
    const data=await apiFetch(`${base}/rest/api/3/issue/${key}?fields=description,summary,attachment`);
    const desc   = data.fields?.description;
    const attaches = data.fields?.attachment || [];

    // Render text
    const text = desc ? extractAdfText(desc).trim() : '';
    let html = '';
    if(text){
      html += `<div class="desc-text">${esc(text)}</div>`;
    } else {
      html += '<div class="desc-text empty">No description provided.</div>';
    }

    // Separate image and video attachments
    const imgAtts   = attaches.filter(a=>a.mimeType?.startsWith('image/'));
    const videoAtts = attaches.filter(a=>a.mimeType?.startsWith('video/'));

    if(imgAtts.length || videoAtts.length){
      const allMedia = [...imgAtts, ...videoAtts];
      html += `<div class="desc-media">
        <div class="desc-media-label">Attachments (${allMedia.length})</div>
        <div class="media-grid" id="mediaGrid-${key}">`;
      for(const att of allMedia){
        html += `<div class="media-item" id="media-${esc(att.id)}" title="${esc(att.filename)}">
          <div class="media-zoom">\u{1f50d}</div>
          <span class="panel-loading" style="font-size:10px;padding:4px">Loading\u2026</span>
        </div>`;
      }
      html += '</div></div>';
    }

    el.className='panel-description';
    el.innerHTML=html;

    // Fetch each attachment blob with auth and swap in
    const token = await getAccessToken();
    const allMedia = [...imgAtts, ...videoAtts];
    // Store mediaList on the grid element for navigator access
    const gridEl = document.getElementById('mediaGrid-'+key);
    if(gridEl) gridEl._mediaList = [];
    for(let idx=0; idx<allMedia.length; idx++){
      const att = allMedia[idx];
      const type = att.mimeType?.startsWith('video/') ? 'video' : 'img';
      fetchMediaBlob(att, token, type, allMedia, idx);
    }

  }catch(e){
    el.innerHTML='<span class="panel-empty">Could not load description</span>';
  }
}

// \u2500\u2500 MEDIA PREVIEW SYSTEM \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Stores all loaded media for the current panel: [{url, name, type}]
let _mediaRegistry = [];

async function fetchMediaBlob(att, token, type, allMedia, idx){
  const slot = document.getElementById('media-'+att.id);
  if(!slot) return;
  try{
    // Step 1: Call Jira attachment API with Bearer token \u2014 it returns a 302
    // redirect to api.media.atlassian.com with a self-authenticating pre-signed URL.
    // Step 2: Follow the redirect manually WITHOUT the Authorization header
    // (sending auth headers across domains is blocked by browsers).
    const user = getUser();
    const apiContentUrl = `${CONFIG.API_BASE}/ex/jira/${user.cloudId}/rest/api/3/attachment/content/${att.id}`;

    // First request: get the redirect URL (don't follow automatically)
    let mediaUrl = apiContentUrl;
    try{
      const redir = await fetch(apiContentUrl, {
        headers:{ 'Authorization': `Bearer ${token}` },
        redirect: 'manual', // capture the redirect without following
      });
      // redirect: 'manual' gives type 'opaqueredirect' \u2014 extract Location header
      // In most browsers this isn't accessible due to CORS, so fall through to
      // direct fetch with follow which works when CSP allows the media domain
    }catch(_){}

    // Direct fetch with redirect follow \u2014 now that CSP allows api.media.atlassian.com
    // the browser can follow the 302 from api.atlassian.com \u2192 api.media.atlassian.com
    const resp = await fetch(apiContentUrl, {
      headers:{ 'Authorization': `Bearer ${token}` },
      redirect: 'follow',
    });
    if(!resp.ok){
      slot.innerHTML=`<span style="font-size:10px;color:var(--muted);padding:6px;text-align:center;display:block">${esc(att.filename)}<br><span style="font-size:9px">Failed to load (${resp.status})</span></span>`;
      return;
    }
    const blob = await resp.blob();
    const url  = URL.createObjectURL(blob);

    // Register in global media list for navigator
    _mediaRegistry[idx] = {url, name: att.filename, type};

    // Find the list index of this slot for the click handler
    if(type==='img'){
      slot.innerHTML=`
        <img class="media-thumb" src="${url}" alt="${esc(att.filename)}" draggable="false"/>
        <div class="media-zoom">\u{1f50d}</div>
        <div class="media-name">${esc(att.filename)}</div>`;
      slot.addEventListener('click', ()=>openPreviewModal(idx, allMedia.length));
    } else {
      // Video: show first frame as thumbnail via video element
      slot.innerHTML=`
        <video class="media-video-thumb" src="${url}" preload="metadata" muted playsinline></video>
        <div class="media-zoom">\u25b6</div>
        <div class="media-video-badge">VIDEO</div>
        <div class="media-name">${esc(att.filename)}</div>`;
      // Seek to 0.5s to show a frame as thumbnail
      const vid = slot.querySelector('video');
      vid.addEventListener('loadedmetadata', ()=>{ vid.currentTime=0.5; });
      slot.addEventListener('click', ()=>openPreviewModal(idx, allMedia.length));
    }
  }catch(e){
    slot.innerHTML=`<span style="font-size:10px;color:var(--muted);padding:6px;text-align:center;display:block">Could not load</span>`;
  }
}

function openPreviewModal(idx, total){
  // Remove any existing modal
  document.querySelector('.preview-modal')?.remove();
  const item = _mediaRegistry[idx];
  if(!item) return;

  const modal = document.createElement('div');
  modal.className='preview-modal';
  modal.dataset.idx = idx;
  modal.dataset.total = total;

  const contentHtml = item.type==='img'
    ? `<img class="preview-img" src="${item.url}" alt="${esc(item.name)}" draggable="false"/>`
    : `<video class="preview-video" src="${item.url}" controls autoplay></video>`;

  modal.innerHTML=`
    <div class="preview-backdrop"></div>
    <div class="preview-box">
      <div class="preview-topbar">
        <span class="preview-filename">${esc(item.name)}</span>
        <span class="preview-hint">Click outside or press Esc to close</span>
        <button class="preview-close" onclick="document.querySelector('.preview-modal')?.remove()">\u2715</button>
      </div>
      <div class="preview-content">${contentHtml}</div>
      ${total>1?`<div class="preview-footer">
        <div class="preview-nav">
          <button class="prev-nav-btn" id="prevBtn" onclick="navigatePreview(-1)" ${idx===0?'disabled':''}>\u2190 Prev</button>
          <button class="prev-nav-btn" id="nextBtn" onclick="navigatePreview(1)" ${idx>=total-1?'disabled':''}>Next \u2192</button>
        </div>
        <span class="preview-counter">${idx+1} / ${total}</span>
      </div>`:''}
    </div>`;

  // Close on backdrop click
  modal.querySelector('.preview-backdrop').addEventListener('click', ()=>modal.remove());
  document.body.appendChild(modal);
}

function navigatePreview(dir){
  const modal = document.querySelector('.preview-modal');
  if(!modal) return;
  const idx   = parseInt(modal.dataset.idx);
  const total = parseInt(modal.dataset.total);
  const next  = idx + dir;
  if(next < 0 || next >= total) return;
  // Stop any playing video before switching
  modal.querySelector('video')?.pause();
  openPreviewModal(next, total);
}

// Close preview on Escape (separate from panel close)
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){
    const modal = document.querySelector('.preview-modal');
    if(modal){ modal.remove(); e.stopImmediatePropagation(); }
  }
}, true);

// Arrow key navigation in preview
document.addEventListener('keydown', e=>{
  if(!document.querySelector('.preview-modal')) return;
  if(e.key==='ArrowRight') navigatePreview(1);
  if(e.key==='ArrowLeft')  navigatePreview(-1);
});

async function loadPanelComments(key, maxResults=8){
  const el=document.getElementById('panelCommentList');
  el.innerHTML='<span class="panel-loading">Loading comments\u2026</span>';
  try{
    const user=getUser();
    if(!user){ el.innerHTML='<span class="panel-empty">Login required</span>'; return; }
    const base=`${CONFIG.API_BASE}/ex/jira/${user.cloudId}`;
    const data=await apiFetch(`${base}/rest/api/3/issue/${key}/comment?maxResults=${maxResults}&orderBy=-created`);
    const comments=(data.comments||[]);
    if(!comments.length){
      el.innerHTML='<span class="panel-empty">No comments yet</span>';
      return;
    }

    // Render comment shells (text only first)
    el.innerHTML=comments.map((c,ci)=>{
      const author=c.author?.displayName||'Unknown';
      const date=(c.created||'').slice(0,10);
      const bodyText=extractAdfText(c.body).trim()||'';
      const mediaNodes=extractAdfMedia(c.body);
      const mediaHtml=mediaNodes.length
        ? `<div class="comment-media" id="cmedia-${key}-${ci}"></div>`
        : '';
      return `<div class="comment-item">
        <div class="comment-author">${esc(author)}<span class="comment-date">${date}</span></div>
        ${bodyText?`<div class="comment-body">${esc(bodyText)}</div>`:''}
        ${mediaHtml}
      </div>`;
    }).join('');

    // Now fetch media for each comment that has attachments
    const token=await getAccessToken();
    let globalMediaIdx=0; // shared index into _mediaRegistry for navigation
    comments.forEach((c,ci)=>{
      const mediaNodes=extractAdfMedia(c.body);
      if(!mediaNodes.length) return;
      const gridEl=document.getElementById(`cmedia-${key}-${ci}`);
      if(!gridEl) return;

      mediaNodes.forEach((m,mi)=>{
        const slotId=`cslot-${key}-${ci}-${mi}`;
        const slot=document.createElement('div');
        slot.className='comment-media-item';
        slot.id=slotId;
        slot.innerHTML='<span class="panel-loading" style="font-size:9px">\u2026</span>';
        slot.dataset.mIdx=globalMediaIdx;
        gridEl.appendChild(slot);

        if(m.mediaType==='external' && m.url){
          // External image \u2014 use URL directly, no auth needed
          const imgEl=document.createElement('img');
          imgEl.className='comment-thumb';
          imgEl.src=m.url;
          imgEl.alt='';
          const zoomEl=document.createElement('div');
          zoomEl.className='media-zoom'; zoomEl.textContent='\u{1f50d}';
          slot.innerHTML='';
          slot.appendChild(imgEl);
          slot.appendChild(zoomEl);
          _mediaRegistry[globalMediaIdx]={url:m.url, name:`attachment-${mi+1}`, type:'img'};
          const capturedIdx=globalMediaIdx;
          slot.addEventListener('click',()=>openPreviewModal(capturedIdx, _mediaRegistry.filter(Boolean).length));
        } else {
          // Internal Jira file \u2014 fetch with auth via api.atlassian.com
          // (same approach as issue attachments \u2014 redirects to api.media.atlassian.com)
          const apiUrl=`${CONFIG.API_BASE}/ex/jira/${user.cloudId}/rest/api/3/attachment/content/${m.id}`;
          const capturedIdx=globalMediaIdx;
          fetch(apiUrl,{headers:{'Authorization':`Bearer ${token}`},redirect:'follow'})
            .then(r=>{
              if(!r.ok) throw new Error(r.status);
              return r.blob();
            })
            .then(blob=>{
              const url=URL.createObjectURL(blob);
              const isVideo=m.mimeType?.startsWith('video/');
              _mediaRegistry[capturedIdx]={url, name:`comment-attachment-${mi+1}`, type:isVideo?'video':'img'};
              if(isVideo){
                slot.innerHTML=`<video class="comment-thumb" src="${url}" preload="metadata" muted playsinline></video>
                  <div class="media-zoom">\u25b6</div>`;
                slot.querySelector('video').addEventListener('loadedmetadata',v=>v.target.currentTime=0.5);
              } else {
                slot.innerHTML=`<img class="comment-thumb" src="${url}" alt="" draggable="false"/>
                  <div class="media-zoom">\u{1f50d}</div>`;
              }
              slot.addEventListener('click',()=>openPreviewModal(capturedIdx, _mediaRegistry.filter(Boolean).length));
            })
            .catch(()=>{
              slot.innerHTML='<span style="font-size:9px;color:var(--muted);text-align:center;padding:4px">Could not load</span>';
            });
        }
        globalMediaIdx++;
      });
    });

  }catch(e){
    el.innerHTML='<span class="panel-empty">Could not load comments</span>';
  }
}

// Recursively extract plain text from ADF
function extractAdfText(node){
  if(!node) return '';
  if(typeof node==='string') return node;
  if(node.type==='text') return node.text||'';
  if(node.type==='hardBreak') return '\n';
  if(node.type==='paragraph') return (node.content||[]).map(extractAdfText).join('')+'\n';
  // Skip media nodes \u2014 handled separately by extractAdfMedia
  if(node.type==='mediaSingle'||node.type==='mediaInline') return '';
  if(node.content) return (node.content||[]).map(extractAdfText).join('');
  return '';
}

// Extract media file IDs and types from ADF (for comment attachments)
function extractAdfMedia(node, results=[]){
  if(!node||typeof node!=='object') return results;
  if(node.type==='media' && node.attrs?.id){
    results.push({
      id:         node.attrs.id,
      mediaType:  node.attrs.type||'file',       // 'file' | 'external'
      mimeType:   node.attrs.mimeType||'',
      url:        node.attrs.url||null,          // for external images
      collection: node.attrs.collection||'',
    });
  }
  if(node.content) node.content.forEach(n=>extractAdfMedia(n,results));
  return results;
}

async function submitComment(){
  const text=document.getElementById('panelComment').value.trim();
  if(!text){ toast('info','Please write a comment first'); return; }
  if(!panelKey) return;

  const btn=document.getElementById('panelCommentBtn');
  btn.disabled=true; btn.textContent='Sending\u2026';
  try{
    const user=getUser();
    const base=`${CONFIG.API_BASE}/ex/jira/${user.cloudId}`;
    // Jira REST API v3 requires ADF format for comment body
    await apiFetch(`${base}/rest/api/3/issue/${panelKey}/comment`,{
      method:'POST',
      body:JSON.stringify({
        body:{
          type:'doc', version:1,
          content:[{type:'paragraph',content:[{type:'text',text}]}]
        }
      }),
    });
    toast('success','Comment posted');
    document.getElementById('panelComment').value='';
    loadPanelComments(panelKey); // Refresh comment list
  }catch(e){
    toast('error',`Failed to post comment: ${e.message}`);
  }
  btn.disabled=false; btn.textContent='Send Comment';
}

// Debounced user search for reassign
function searchAssignees(){
  clearTimeout(assigneeSearchTimer);
  const q=document.getElementById('panelAssigneeSearch').value.trim();
  const res=document.getElementById('panelUserResults');
  if(q.length<2){ res.style.display='none'; return; }
  assigneeSearchTimer=setTimeout(()=>doSearchAssignees(q), 300);
}

async function doSearchAssignees(q){
  const res=document.getElementById('panelUserResults');
  res.style.display='block';
  res.innerHTML='<div class="panel-user-opt" style="pointer-events:none"><span class="panel-loading">Searching\u2026</span></div>';
  try{
    const user=getUser();
    if(!user){ res.style.display='none'; return; }
    const base=`${CONFIG.API_BASE}/ex/jira/${user.cloudId}`;
    const data=await apiFetch(
      `${base}/rest/api/3/user/search?query=${encodeURIComponent(q)}&maxResults=8`
    );
    if(!data.length){
      res.innerHTML='<div class="panel-user-opt" style="pointer-events:none"><span class="panel-empty">No users found</span></div>';
      return;
    }
    res.innerHTML=data.map(u=>`
      <div class="panel-user-opt" onclick="selectAssignee('${esc(u.accountId)}','${esc(u.displayName)}',this)">
        ${u.avatarUrls?.['24x24']?`<img class="panel-user-avatar" src="${u.avatarUrls['24x24']}" alt=""/>`:'<span class="panel-user-avatar" style="display:inline-flex;align-items:center;justify-content:center;font-size:10px;color:var(--muted)">\u{1f464}</span>'}
        <span>${esc(u.displayName)}</span>
        <span style="font-size:10px;color:var(--muted);margin-left:auto">${esc(u.emailAddress||'')}</span>
      </div>`).join('');
  }catch(e){
    res.style.display='none';
  }
}

async function selectAssignee(accountId, displayName, el){
  document.getElementById('panelUserResults').style.display='none';
  document.getElementById('panelAssigneeSearch').value='';
  if(!panelKey) return;

  document.getElementById('panelAssignedTo').textContent='Assigning\u2026';
  try{
    const user=getUser();
    const base=`${CONFIG.API_BASE}/ex/jira/${user.cloudId}`;
    await apiFetch(`${base}/rest/api/3/issue/${panelKey}/assignee`,{
      method:'PUT',
      body:JSON.stringify({accountId}),
    });
    document.getElementById('panelAssignedTo').textContent=`\u2713 Reassigned to ${displayName}`;
    document.getElementById('panelAssignedTo').style.color='var(--green)';
    toast('success',`\u2713 ${panelKey} reassigned to ${displayName}`);

    // If reassigned away from self, offer to remove from To Be Done list
    const currentUser=getUser();
    if(accountId!==currentUser.accountId){
      tbdData=tbdData.filter(i=>i.key!==panelKey);
      renderTbd(tbdData);
      closePanel();
    }
  }catch(e){
    document.getElementById('panelAssignedTo').textContent='Reassign failed: '+e.message;
    document.getElementById('panelAssignedTo').style.color='var(--red)';
    toast('error',`Reassign failed: ${e.message}`);
  }
}

// \u2500\u2500 TAB MANAGEMENT \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
let tbdData = [];

function switchTab(name){
  ['tracking','tbd','brief','ar'].forEach(t=>{
    document.getElementById('tab-'+t).classList.toggle('active', t===name);
    document.getElementById('pane-'+t).classList.toggle('active', t===name);
  });
  if(name==='tracking') renderOnboardingProgress();
  if(name==='brief'){ renderBriefStats(); briefUpdateTabCounts(); }
  if(name==='ar'){ arTabActivated(); }
}

// \u2500\u2500 REASSIGN HELPERS (shared by bulk + per-row) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
let _asnCache = [];

async function loadAsnCache(){
  if(_asnCache.length) return _asnCache;
  const user = getUser();
  if(!user) return [];
  try{
    const base = `${CONFIG.API_BASE}/ex/jira/${user.cloudId}`;
    const data = await apiFetch(`${base}/rest/api/3/user/search?query=.&maxResults=50`);
    _asnCache = (data||[]).filter(u=>u.accountType==='atlassian');
  }catch(_){ _asnCache=[]; }
  return _asnCache;
}

function renderAsnList(listEl, searchEl, onPick){
  const q = (searchEl?.value||'').toLowerCase();
  const users = q ? _asnCache.filter(u=>(u.displayName||'').toLowerCase().includes(q)||(u.emailAddress||'').toLowerCase().includes(q)) : _asnCache;
  if(!users.length){ listEl.innerHTML='<div class="inline-asn-opt" style="pointer-events:none;color:var(--muted)">No users found</div>'; return; }
  listEl.innerHTML = users.map(u=>`
    <div class="inline-asn-opt" onclick="(${onPick.toString()})('${esc(u.accountId)}','${esc(u.displayName)}')">
      ${u.avatarUrls?.['48x48']||u.avatarUrls?.['24x24']
        ? `<img class="asn-avatar" src="${u.avatarUrls['48x48']||u.avatarUrls['24x24']}" alt=""/>`
        : `<span class="asn-avatar" style="display:flex;align-items:center;justify-content:center;font-size:12px;background:var(--accent);color:#fff;font-weight:700">${(u.displayName||'?')[0].toUpperCase()}</span>`}
      <span class="asn-name">${esc(u.displayName)}</span>
      <span class="asn-email">${esc(u.emailAddress||'')}</span>
    </div>`).join('');
}

// \u2500\u2500 Per-row reassign \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
let _openRowDd = null;

async function openRowAsnDd(key, btn, e){
  e.stopPropagation();
  const dd = document.getElementById('rowAsn-'+key);
  if(!dd) return;
  // Close any other open dropdown
  if(_openRowDd && _openRowDd!==key){
    const prev = document.getElementById('rowAsn-'+_openRowDd);
    if(prev) prev.classList.remove('open');
  }
  const isOpen = dd.classList.toggle('open');
  _openRowDd = isOpen ? key : null;
  if(isOpen){
    // Position dropdown using fixed coords based on button location
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropH = 240; // estimated dropdown height
    if(spaceBelow < dropH){
      // Open upward
      dd.style.top    = (rect.top - dropH - 4) + 'px';
      dd.style.bottom = '';
    } else {
      dd.style.top    = (rect.bottom + 4) + 'px';
      dd.style.bottom = '';
    }
    dd.style.left  = Math.max(4, rect.right - 220) + 'px';
    dd.style.width = '220px';
    document.getElementById('rowAsnSearch-'+key)?.focus();
    const list   = document.getElementById('rowAsnList-'+key);
    const search = document.getElementById('rowAsnSearch-'+key);
    if(list && !list.children.length){
      list.innerHTML='<div class="inline-asn-opt" style="pointer-events:none;color:var(--muted)">Loading\u2026</div>';
      await loadAsnCache();
      renderAsnList(list, search, (accountId, displayName)=>pickRowAsn(key, accountId, displayName));
    }
  }
}

function filterRowAsn(key){
  const list   = document.getElementById('rowAsnList-'+key);
  const search = document.getElementById('rowAsnSearch-'+key);
  if(list) renderAsnList(list, search, (accountId, displayName)=>pickRowAsn(key, accountId, displayName));
}

async function pickRowAsn(key, accountId, displayName){
  const dd = document.getElementById('rowAsn-'+key);
  if(dd) dd.classList.remove('open');
  _openRowDd = null;
  toast('info',`Reassigning ${key} to ${displayName}\u2026`);
  try{
    const user = getUser();
    const base = `${CONFIG.API_BASE}/ex/jira/${user.cloudId}`;
    await apiFetch(`${base}/rest/api/3/issue/${key}/assignee`,{ method:'PUT', body:JSON.stringify({accountId}) });
    toast('success',`\u2713 ${key} reassigned to ${displayName}`);
    // Remove from TBD list if reassigned away from self
    if(accountId !== user.accountId){
      tbdData = tbdData.filter(i=>i.key!==key);
      renderTbd(tbdData);
    }
  }catch(e){ toast('error',`Reassign failed: ${e.message}`); }
}

// \u2500\u2500 Bulk reassign \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
async function toggleTbdBulkAsnDd(e){
  e.stopPropagation();
  const dd   = document.getElementById('tbdBulkAsnDd');
  const list = document.getElementById('tbdBulkAsnList');
  const srch = document.getElementById('tbdBulkAsnSearch');
  if(!dd) return;
  const isOpen = dd.classList.toggle('open');
  if(isOpen){
    srch?.focus();
    if(!_asnCache.length){
      list.innerHTML='<div class="inline-asn-opt" style="pointer-events:none;color:var(--muted)">Loading\u2026</div>';
      await loadAsnCache();
    }
    renderAsnList(list, srch, (accountId, displayName)=>tbdBulkReassign(accountId, displayName));
  }
}

function filterTbdBulkAsn(){
  const list = document.getElementById('tbdBulkAsnList');
  const srch = document.getElementById('tbdBulkAsnSearch');
  renderAsnList(list, srch, (accountId, displayName)=>tbdBulkReassign(accountId, displayName));
}

async function tbdBulkReassign(accountId, displayName){
  document.getElementById('tbdBulkAsnDd')?.classList.remove('open');
  if(!tbdBulkSelected.size){ toast('info','No tickets selected'); return; }
  const keys = [...tbdBulkSelected];
  toast('info',`Reassigning ${keys.length} tickets to ${displayName}\u2026`);
  const user = getUser();
  const base = `${CONFIG.API_BASE}/ex/jira/${user.cloudId}`;
  let ok=0, fail=0;
  for(const key of keys){
    try{
      await apiFetch(`${base}/rest/api/3/issue/${key}/assignee`,{ method:'PUT', body:JSON.stringify({accountId}) });
      ok++;
    }catch(_){ fail++; }
  }
  if(ok)   toast('success',`\u2713 Reassigned ${ok} tickets to ${displayName}`);
  if(fail) toast('error',`${fail} tickets could not be reassigned`);
  clearTbdBulk();
  // If reassigned to someone else, remove from list
  if(accountId !== user?.accountId){
    tbdData = tbdData.filter(i=>!keys.includes(i.key));
    renderTbd(tbdData);
  }
}

// Close dropdowns on outside click
document.addEventListener('click', ()=>{
  document.querySelectorAll('.inline-asn-dd.open').forEach(d=>d.classList.remove('open'));
  _openRowDd = null;
  document.getElementById('tbdBulkAsnDd')?.classList.remove('open');
});

// \u2500\u2500 TBD BULK ACTIONS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
let tbdBulkSelected = new Set();

function onTbdCbChange(cb){
  const key = cb.dataset.key;
  if(cb.checked) tbdBulkSelected.add(key);
  else            tbdBulkSelected.delete(key);
  updateTbdBulkBar();
  // Sync group checkbox
  const groupCb = document.getElementById('tbdGroupCb');
  if(groupCb){
    const allCbs = [...document.querySelectorAll('.tbd-cb')].filter(c=>c.closest('tr')?.style.display!=='none');
    groupCb.checked       = allCbs.length>0 && allCbs.every(c=>c.checked);
    groupCb.indeterminate = !groupCb.checked && allCbs.some(c=>c.checked);
  }
}

function onTbdGroupCbChange(headerCb){
  document.querySelectorAll('.tbd-cb').forEach(cb=>{
    const tr = cb.closest('tr');
    if(tr && tr.style.display!=='none'){
      cb.checked = headerCb.checked;
      if(headerCb.checked) tbdBulkSelected.add(cb.dataset.key);
      else                  tbdBulkSelected.delete(cb.dataset.key);
    }
  });
  updateTbdBulkBar();
}

function updateTbdBulkBar(){
  const bar   = document.getElementById('tbdBulkBar');
  const count = document.getElementById('tbdBulkCount');
  if(!bar||!count) return;
  // Derive count + keys directly from DOM \u2014 always in sync with what's visually checked
  const checked = [...document.querySelectorAll('.tbd-cb:checked')];
  tbdBulkSelected = new Set(checked.map(c=>c.dataset.key));
  const n = tbdBulkSelected.size;
  bar.classList.toggle('active', n>0);
  count.innerHTML = `<strong>${n}</strong> ticket${n===1?'':'s'} selected`;
}

function clearTbdBulk(){
  tbdBulkSelected.clear();
  document.querySelectorAll('.tbd-cb').forEach(cb=>cb.checked=false);
  const groupCb = document.getElementById('tbdGroupCb');
  if(groupCb){ groupCb.checked=false; groupCb.indeterminate=false; }
  updateTbdBulkBar();
}

function tbdBulkCopyKeys(){
  if(!tbdBulkSelected.size){ toast('info','No tickets selected'); return; }
  navigator.clipboard.writeText([...tbdBulkSelected].join(', '))
    .then(()=>toast('success',`Copied ${tbdBulkSelected.size} ticket keys`));
}

// \u2500\u2500 TBD IGNORE \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const TBD_IGNORE_KEY = 'jd_tbd_ignored';
function loadTbdIgnored(){ try{ return new Set(JSON.parse(localStorage.getItem(TBD_IGNORE_KEY)||'[]')); }catch(e){ console.error('[TBD Ignore] loadTbdIgnored:',e); return new Set(); } }
function saveTbdIgnored(s){ try{ localStorage.setItem(TBD_IGNORE_KEY, JSON.stringify([...s])); }catch(e){ console.error('[TBD Ignore] saveTbdIgnored:',e); } }

function tbdBulkIgnoreTickets(){
  if(!tbdBulkSelected.size){ toast('info','No tickets selected'); return; }
  const ign = loadTbdIgnored();
  const keys = [...tbdBulkSelected];
  keys.forEach(k=>ign.add(k));
  saveTbdIgnored(ign);
  tbdData = tbdData.filter(i=>!ign.has(i.key));
  toast('info',`${keys.length} ticket${keys.length===1?'':'s'} ignored \u2014 hidden from TBD view`);
  clearTbdBulk();
  renderTbd(tbdData);
}

function tbdUnignoreTicket(key){
  const ign = loadTbdIgnored();
  ign.delete(key);
  saveTbdIgnored(ign);
  toast('info',`${key} restored to TBD`);
  renderTbd(tbdData);
}
async function tbdBulkMarkDone(){
  if(!tbdBulkSelected.size){ toast('info','No tickets selected'); return; }
  const keys = [...tbdBulkSelected];
  const user = getUser();
  if(!user){ toast('error','Not logged in'); return; }
  const base = `${CONFIG.API_BASE}/ex/jira/${user.cloudId}`;
  toast('info',`Marking ${keys.length} tickets as Done\u2026`);
  let ok=0, fail=0;
  for(const key of keys){
    try{
      const data = await apiFetch(`${base}/rest/api/3/issue/${key}/transitions`);
      const doneT = (data.transitions||[]).find(t=>t.name.toLowerCase()==='done'&&t.isAvailable!==false);
      if(!doneT) throw new Error('No Done transition');
      await apiFetch(`${base}/rest/api/3/issue/${key}/transitions`,{
        method:'POST', body:JSON.stringify({transition:{id:doneT.id}})
      });
      tbdData = tbdData.filter(i=>i.key!==key);
      ok++;
    }catch(e){ fail++; }
  }
  if(ok)   toast('success',`\u2713 Marked ${ok} ticket${ok===1?'':'s'} as Done`);
  if(fail) toast('error',`${fail} ticket${fail===1?'':'s'} could not be transitioned`);
  clearTbdBulk();
  renderTbd(tbdData);
}

// \u2500\u2500 TO BE DONE RENDER \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function renderTbd(issues){
  tbdData = issues;
  tbdBulkSelected.clear();
  const ign = loadTbdIgnored();

  // Separate ignored from active
  const active  = issues.filter(i=>!ign.has(i.key));
  const ignored = issues.filter(i=> ign.has(i.key));

  // Sort active by lead time DESC
  const sorted = [...active].sort((a,b)=>calcLT(a.created)-calcLT(b.created)).reverse();

  const pending = sorted.length;
  const overdue = sorted.filter(i=>calcLT(i.created)>14).length;
  const avg = pending ? Math.round(sorted.reduce((s,i)=>s+calcLT(i.created),0)/pending) : 0;

  document.getElementById('tbdPending').textContent = pending;
  document.getElementById('tbdOverdue').textContent = overdue;
  document.getElementById('tbdAvg').textContent = pending ? avg+'d' : '\u2014';
  document.getElementById('tc-tbd').textContent = pending;

  let html = '';

  if(pending===0){
    html += '<div class="tbd-empty">\uD83C\uDF89 No pending tickets assigned to you!</div>';
  } else {
    const thead=`<thead><tr>
    <th class="cb-th"><input type="checkbox" class="group-cb" id="tbdGroupCb" title="Select all" onchange="onTbdGroupCbChange(this)"/></th>
    <th>Ticket</th><th>Summary</th><th>Client</th><th>Status</th>
    <th>Reporter</th><th>Created</th><th>Lead Time \u2193</th><th>Action</th>
  </tr></thead>`;

    const rows = sorted.map(i=>{
      const days=calcLT(i.created);
      const client=extractClient(i.summary)||'\u2014';
      const sumClean=esc(normU(i.summary).replace(/\[[^\]]+\]\s*/,''));
      return `<tr class="tbd-row" data-key="${i.key}" data-tbd-search="${(i.key+' '+i.summary+' '+i.status+' '+i.reporter).toLowerCase()}" onclick="openPanel('${i.key}',event,'tbd')">
      <td class="cb-td" onclick="event.stopPropagation()">
        <input type="checkbox" class="row-cb tbd-cb" data-key="${i.key}" onchange="onTbdCbChange(this)"/>
      </td>
      <td onclick="event.stopPropagation()"><a class="ticket-key" href="${i.url}" target="_blank">${i.key}</a></td>
      <td><div class="ticket-summary">${sumClean}</div></td>
      <td><span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted2)">${esc(client)}</span></td>
      <td><span class="sb ${sClass(i.status)}"><span class="sd"></span>${esc(i.status)}</span></td>
      <td><span class="ac">${esc(i.reporter)}</span></td>
      <td><span class="dc">${i.created}</span></td>
      <td><span class="lt ${ltC(days)}">${days}d</span></td>
      <td onclick="event.stopPropagation()">
        <button class="btn-md btn-done-tbd" onclick="markDoneTbd('${i.key}',this)">Mark Done</button>
      </td>
    </tr>`;
    }).join('');

    html += `<div class="table-wrap"><table>${thead}<tbody>${rows}</tbody></table></div>`;
  }

  // \u2500\u2500 Ignored section \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  if(ignored.length){
    const ignRows = ignored.map(i=>{
      const sumClean=esc(normU(i.summary).replace(/\[[^\]]+\]\s*/,''));
      const days=calcLT(i.created);
      return `<tr style="opacity:.5">
      <td></td>
      <td onclick="event.stopPropagation()"><a class="ticket-key" href="${i.url}" target="_blank">${i.key}</a></td>
      <td><div class="ticket-summary">${sumClean}</div></td>
      <td><span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted2)">${esc(extractClient(i.summary)||'\u2014')}</span></td>
      <td><span class="sb ${sClass(i.status)}"><span class="sd"></span>${esc(i.status)}</span></td>
      <td><span class="ac">${esc(i.reporter)}</span></td>
      <td><span class="dc">${i.created}</span></td>
      <td><span class="lt ${ltC(days)}">${days}d</span></td>
      <td onclick="event.stopPropagation()">
        <button class="btn-md" style="color:var(--muted)" onclick="tbdUnignoreTicket('${i.key}')">&#8617; Restore</button>
      </td>
    </tr>`;
    }).join('');

    html += `<div class="done-section" style="margin-top:8px">
      <div class="done-toggle" onclick="this.nextElementSibling.classList.toggle('open');this.querySelector('.done-chev').classList.toggle('open')">
        <span class="done-chev">\u25B6</span>
        \uD83D\uDEAB Ignored Tickets
        <span class="done-badge">${ignored.length} hidden</span>
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);margin-left:6px">Click to restore</span>
      </div>
      <div class="done-body">
        <div class="table-wrap"><table><thead><tr>
          <th></th><th>Ticket</th><th>Summary</th><th>Client</th><th>Status</th>
          <th>Reporter</th><th>Created</th><th>Lead Time</th><th>Action</th>
        </tr></thead><tbody>${ignRows}</tbody></table></div>
      </div>
    </div>`;
  }

  document.getElementById('tbdDash').innerHTML = html;
}
function applyTbdFilters(){
  const q=document.getElementById('tbdSrch').value.toLowerCase().trim();
  document.querySelectorAll('tr[data-tbd-search]').forEach(tr=>{
    tr.style.display=!q||tr.dataset.tbdSearch.includes(q)?'':'none';
  });
}

async function markDoneTbd(key,btn){
  btn.disabled=true; btn.innerHTML='<span class="spin">\u21bb</span>';
  toast('info',`Transitioning ${key} to Done\u2026`);
  try{
    await markIssueDone(key);
    // Remove from tbdData and re-render
    tbdData=tbdData.filter(i=>i.key!==key);
    renderTbd(tbdData);
    // Also update allData if present (keeps Issue Tracking in sync)
    const tracked=allData.find(i=>i.key===key);
    if(tracked){tracked.status='Done';tracked.resolutiondate=new Date().toISOString().slice(0,10);}
    renderDashboard(allData);
    toast('success',`\u2713 ${key} marked as Done`);
  }catch(e){
    toast('error',`Failed to update ${key}: ${e.message}`);
    btn.disabled=false; btn.innerHTML='\u2713 Mark Done';
  }
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// IGNORED TICKETS (local only \u2014 hides from active view, shows in archive)
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
const IGNORE_KEY = 'jd_ignored_tickets';
function loadIgnored(){ try{ return new Set(JSON.parse(localStorage.getItem(IGNORE_KEY)||'[]')); }catch(_){ return new Set(); } }
function saveIgnored(s){ localStorage.setItem(IGNORE_KEY, JSON.stringify([...s])); }

function bulkIgnoreTickets(){
  if(!bulkSelected.size){ toast('info','No tickets selected'); return; }
  const ign = loadIgnored();
  [...bulkSelected].forEach(k=>ign.add(k));
  saveIgnored(ign);
  toast('info',`${bulkSelected.size} ticket${bulkSelected.size===1?'':'s'} ignored \u2014 moved to Archive`);
  clearBulkSelection();
  renderDashboard(allData);
}

function unignoreTicket(key){
  const ign = loadIgnored();
  ign.delete(key);
  saveIgnored(ign);
  renderDashboard(allData);
  toast('info',`${key} restored to active`);
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// BULK ACTIONS
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
let bulkSelected = new Set(); // Set of ticket keys currently checked

function onRowCbChange(cb){
  const key = cb.dataset.key;
  if(cb.checked) bulkSelected.add(key);
  else           bulkSelected.delete(key);
  updateBulkBar();
  syncGroupCb(cb.closest('table'));
}

function onGroupCbChange(gid, headerCb){
  const body = document.getElementById(gid+'_body');
  if(!body) return;
  body.querySelectorAll('.row-cb').forEach(cb=>{
    const tr = cb.closest('tr');
    if(!tr || tr.style.display==='none') return;
    // Skip rows inside .done-body (archived/done) \u2014 only select active rows
    if(cb.closest('.done-body')) return;
    cb.checked = headerCb.checked;
    if(headerCb.checked) bulkSelected.add(cb.dataset.key);
    else                  bulkSelected.delete(cb.dataset.key);
  });
  updateBulkBar();
}

function syncGroupCb(table){
  // Update group header checkbox state to reflect row states
  if(!table) return;
  const headerCb = table.querySelector('.group-cb');
  if(!headerCb) return;
  // Only sync based on active (non-done) visible rows
  const rowCbs = [...table.querySelectorAll('.row-cb')].filter(c=>!c.closest('.done-body') && c.closest('tr')?.style.display!=='none');
  const allChecked = rowCbs.length>0 && rowCbs.every(c=>c.checked);
  const anyChecked = rowCbs.some(c=>c.checked);
  headerCb.checked       = allChecked;
  headerCb.indeterminate = !allChecked && anyChecked;
}

function updateBulkBar(){
  const bar   = document.getElementById('bulkBar');
  const count = document.getElementById('bulkCount');
  if(!bar||!count) return;
  // Derive count + keys directly from DOM \u2014 always in sync with what's visually checked
  const checked = [...document.querySelectorAll('#pane-tracking .row-cb:checked')];
  bulkSelected = new Set(checked.map(c=>c.dataset.key));
  const n = bulkSelected.size;
  bar.classList.toggle('active', n>0);
  count.innerHTML = `<strong>${n}</strong> ticket${n===1?'':'s'} selected`;
}

function clearBulkSelection(){
  bulkSelected.clear();
  document.querySelectorAll('.row-cb').forEach(cb=>cb.checked=false);
  document.querySelectorAll('.group-cb').forEach(cb=>{cb.checked=false;cb.indeterminate=false;});
  updateBulkBar();
}

function bulkCopyKeys(){
  if(!bulkSelected.size){ toast('info','No tickets selected'); return; }
  const keys = [...bulkSelected].join(', ');
  navigator.clipboard.writeText(keys).then(()=>toast('success',`Copied ${bulkSelected.size} ticket keys`));
}

async function bulkMarkDone(){
  if(!bulkSelected.size){ toast('info','No tickets selected'); return; }
  const keys = [...bulkSelected];
  const user = getUser();
  if(!user){ toast('error','Not logged in'); return; }
  const base = `${CONFIG.API_BASE}/ex/jira/${user.cloudId}`;

  toast('info',`Marking ${keys.length} tickets as Done\u2026`);
  let successCount=0, failCount=0;

  for(const key of keys){
    try{
      // Fetch transitions for this ticket
      const data = await apiFetch(`${base}/rest/api/3/issue/${key}/transitions`);
      const doneT = (data.transitions||[]).find(t=>t.name.toLowerCase()==='done'&&t.isAvailable!==false);
      if(!doneT) throw new Error('No Done transition');
      await apiFetch(`${base}/rest/api/3/issue/${key}/transitions`,{
        method:'POST', body:JSON.stringify({transition:{id:doneT.id}})
      });
      // Update local data
      const issue = allData.find(i=>i.key===key);
      if(issue){ issue.status='Done'; issue.resolutiondate=new Date().toISOString().slice(0,10); }
      successCount++;
    }catch(e){
      console.warn(`Bulk done failed for ${key}:`, e.message);
      failCount++;
    }
  }

  if(successCount) toast('success',`\u2713 Marked ${successCount} ticket${successCount===1?'':'s'} as Done`);
  if(failCount)    toast('error',`${failCount} ticket${failCount===1?'':'s'} could not be transitioned`);
  clearBulkSelection();
  renderDashboard(allData);
}

function getOnboardingTicketKeys(){
  const keys = new Set();
  try{
    [...loadOnboardings(), ...loadDrafts()].forEach(ob=>{
      if(ob.onboardTicketKey) keys.add(ob.onboardTicketKey);
      (ob.features||[]).forEach(f=>{ if(f.ticketKey) keys.add(f.ticketKey); });
    });
  }catch(_){}
  return keys;
}

function renderDashboard(issues){
  allData=issues; // keep full set for mark-done sync
  // Reset bulk selection state so stale counts don't persist across renders
  bulkSelected.clear();
  updateBulkBar();

  // Filter out onboarding wizard tickets \u2014 shown in Onboarding Progress only
  const obKeys  = getOnboardingTicketKeys();
  const ignored = loadIgnored();
  const filtered = issues.filter(i=>!obKeys.has(i.key) && !ignored.has(i.key));

  // Build client\u2192issues map using filtered set
  const map={};
  for(const i of filtered){const c=extractClient(i.summary);if(!map[c])map[c]=[];map[c].push(i);}

  // Split into: active clients (has open tickets) vs completed clients (all done)
  const activeClients    = [];
  const completedClients = [];
  Object.keys(map).forEach(c=>{
    const hasOpen = map[c].some(i=>!isDone(i.status));
    if(hasOpen) activeClients.push(c);
    else         completedClients.push(c);
  });

  // Rule 1 & 2: Sort active clients by open ticket count DESC; Others always last
  const openCount = c => map[c].filter(i=>!isDone(i.status)).length;
  activeClients.sort((a,b)=>{
    if(a==='Others') return 1;   // Others always last among active
    if(b==='Others') return -1;
    return openCount(b) - openCount(a);
  });

  // Rule 3: Completed clients sorted alphabetically inside the super-group
  completedClients.sort((a,b)=>a.localeCompare(b));

  // Stats
  const doneCt = filtered.filter(i=>isDone(i.status)).length;
  document.getElementById('sTotal').textContent=filtered.length;
  document.getElementById('sDone').textContent=doneCt;
  document.getElementById('sNS').textContent=filtered.filter(i=>isBacklog(i.status)).length;
  document.getElementById('sActive').textContent=filtered.filter(i=>isActive(i.status)).length;
  document.getElementById('tc-tracking').textContent=issues.length - doneCt;
  const now=new Date();
  document.getElementById('lu').textContent='Updated: '+now.toLocaleDateString('en-GB')+' '+now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});

  // Render active client groups
  let html = activeClients.map((c,i)=>mkGroup(c,map[c],i)).join('');

  // Render completed super-group (contains all all-done clients)
  if(completedClients.length){
    const totalDoneTickets = completedClients.reduce((s,c)=>s+map[c].length,0);
    const innerRows = completedClients.map((c,i)=>mkGroup(c,map[c],activeClients.length+i)).join('');
    html += `
    <div class="completed-super" id="completedSuper">
      <div class="completed-header" id="completedHeader" onclick="toggleCompleted()">
        <span>\u2713</span>
        <span class="completed-title">Completed Clients</span>
        <span class="completed-badge">${completedClients.length} clients \u00b7 ${totalDoneTickets} tickets</span>
        <span class="completed-chev" id="completedChev">\u25be</span>
      </div>
      <div class="completed-body" id="completedBody">
        ${innerRows}
      </div>
    </div>`;
  }

  document.getElementById('dash').innerHTML=html;
  buildDropdown('asn',[...new Set(issues.map(i=>i.assignee))].sort());
  applyFilters();
}

function toggleCompleted(){
  const body=document.getElementById('completedBody');
  const chev=document.getElementById('completedChev');
  const hdr =document.getElementById('completedHeader');
  if(!body) return;
  body.classList.toggle('open');
  chev.classList.toggle('open', body.classList.contains('open'));
  hdr.classList.toggle('open',  body.classList.contains('open'));
}

function applyFilters(){
  const q=document.getElementById('srch').value.toLowerCase().trim();

  // \u2500\u2500 Filter regular group rows \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  document.querySelectorAll('tr[data-search]').forEach(tr=>{
    tr.style.display=(!q||tr.dataset.search.includes(q))&&(!selAsn||tr.dataset.asn===selAsn)?'':'none';
  });

  // \u2500\u2500 Show/hide normal client groups \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  document.querySelectorAll('.client-group').forEach(g=>{
    g.style.display=g.querySelectorAll('tr[data-search]:not([style*="none"])').length?'':'none';
  });

  // \u2500\u2500 Handle all-done compact rows inside the super-group \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  let anyCompletedMatch=false;
  document.querySelectorAll('.all-done-section').forEach(sec=>{
    const targets=sec.querySelectorAll('.ad-search-target');
    const hasMatch=!q || [...targets].some(t=>
      t.dataset.search.includes(q)&&(!selAsn||t.dataset.asn===selAsn)
    );
    sec.style.display=hasMatch?'':'none';
    if(hasMatch) anyCompletedMatch=true;

    if(q && hasMatch){
      // Auto-expand the compact client row so results are visible
      const tickets=sec.querySelector('.all-done-tickets');
      const chev=sec.querySelector('.ad-chev');
      if(tickets&&!tickets.classList.contains('open')){
        tickets.classList.add('open');
        if(chev) chev.classList.add('open');
      }
      sec.querySelectorAll('tr[data-search]').forEach(tr=>{
        tr.style.display=tr.dataset.search.includes(q)&&(!selAsn||tr.dataset.asn===selAsn)?'':'none';
      });
    } else if(!q){
      sec.querySelectorAll('tr[data-search]').forEach(tr=>tr.style.display='');
    }
  });

  // \u2500\u2500 Show/hide + auto-expand the Completed Clients super-group \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const superEl  = document.getElementById('completedSuper');
  const superBody= document.getElementById('completedBody');
  const superChev= document.getElementById('completedChev');
  const superHdr = document.getElementById('completedHeader');
  if(superEl){
    superEl.style.display = anyCompletedMatch ? '' : 'none';
    // Auto-expand the super-group when user is searching
    if(q && anyCompletedMatch && superBody && !superBody.classList.contains('open')){
      superBody.classList.add('open');
      if(superChev) superChev.classList.add('open');
      if(superHdr)  superHdr.classList.add('open');
    }
  }
}
function toggleGroup(gid){
  const b=document.getElementById(gid+'_body'),c=document.getElementById(gid+'_chev');
  if(!b)return; const h=b.style.display==='none'; b.style.display=h?'':'none'; c.classList.toggle('open',h);
}
function toggleDone(id){
  const e=document.getElementById(id),c=document.getElementById(id+'_chev');
  if(!e)return; e.classList.toggle('open'); if(c)c.classList.toggle('open',e.classList.contains('open'));
}
function expandAll(){document.querySelectorAll('.group-body').forEach(e=>e.style.display='');document.querySelectorAll('.chevron').forEach(e=>e.classList.add('open'));}
function collapseAll(){document.querySelectorAll('.group-body').forEach(e=>e.style.display='none');document.querySelectorAll('.chevron').forEach(e=>e.classList.remove('open'));}

async function refresh(){
  const btn=document.getElementById('btnR'),icon=document.getElementById('rIcon');
  btn.classList.add('loading'); icon.innerHTML='<span class="spin">\u21bb</span>';
  toast('info','Fetching latest tickets\u2026');
  try{
    const user=getUser();
    if(!user) throw new Error('Not logged in');
    const [reported, assigned] = await Promise.all([
      fetchAllIssues(user),
      fetchAssignedIssues(user),
    ]);
    // Filter Issue Tracking to CSM Brief tickets only
    let _bIssues = reported;
    try {
      const _bR = await fetch('./csm-brief.json?' + Date.now());
      const _bD = await _bR.json();
      const _bK = new Set((_bD.accounts||[]).flatMap(function(a){return (a.tickets||[]).map(function(t){return t.key;});}));
      if (_bK.size > 0) _bIssues = reported.filter(function(i){return _bK.has(i.key);});
    } catch(_e) {}
    renderDashboard(_bIssues);
    saveCsmTracked(_bIssues);
    renderTbd(assigned);
    toast('success',`\u2713 ${reported.length} reported \u00b7 ${assigned.length} assigned`);
  }catch(e){
    toast('error',`Refresh failed: ${e.message}`);
  }
  btn.classList.remove('loading'); icon.textContent='\u21bb';
}

// Save currently-tracked (non-done) tickets per client to localStorage
function saveCsmTracked(issues) {
  var _t = {};
  (issues || []).forEach(function(issue) {
    var _c = extractClient(issue);
    if (!_c) return;
    if (!_t[_c]) _t[_c] = [];
    if (!isDone(issue)) _t[_c].push(issue.key);
  });
  try { localStorage.setItem('csmTracked', JSON.stringify(_t)); } catch(_e) {}
}

function scheduleDaily(){
  const t=new Date(); t.setDate(t.getDate()+1); t.setHours(0,1,0,0);
  setTimeout(()=>{refresh().catch(()=>{});scheduleDaily();}, t-new Date());
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

/* Ignored ticket row style */
document.head.insertAdjacentHTML('beforeend','<style>.row-ignored{opacity:.4;background:#f8f8f8}.row-ignored td{color:#aaa}.row-ignored td:first-child::before{content:"[ignored] ";font-style:normal;opacity:1}.row-ignored a{color:#bbb;pointer-events:none}</style>');
