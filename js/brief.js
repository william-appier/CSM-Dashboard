'use strict';
// CSM BRIEF — DATA, STATE & FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════
let ACCOUNTS = [
  {
    id:'mannings', name:'Mannings', health:'red',
    insight:'AIXP-1840 open 11 days — no update from Jin Chen. Bi-weekly May 28.',
    diffs:[{type:'warn',text:'AIXP-1840 no update in 11 days'}],
    riskTags:['mtg','ticket'], ticketCount:1, mtgCount:3,
    projects:[
      {name:'Q3 Renewal Contract',status:'progress'},
      {name:'AIXON → AIRIS Upgrade (Q4)',status:'progress'},
    ],
    meetings:[
      {date:'May 28',title:'Bi-weekly Meeting',meta:'11:00–12:00 HKT · Teams · Rola Chung'},
      {date:'Jun 1',title:'Mannings Quotation',meta:'11:15–12:00 HKT'},
      {date:'Jun 4',title:'Monthly Meeting',meta:'11:00–12:00 HKT · Teams · Rola Chung'},
    ],
    tickets:[
      {key:'AIXP-1840',title:'IPA_Mannings_Meta 沒有產出 AI suggestions',status:'in-progress',assignee:'Jin Chen',pinned:true},
    ],
    suggestions:[
      {priority:'high',label:'Ticket · High',text:'Chase Jin Chen on AIXP-1840 before May 28 — 11 days open with no update.'},
      {priority:'high',label:'Renewal · High',text:'Prep Q3 renewal quotation now — Jun 1 meeting is 14 days away.'},
      {priority:'medium',label:'Timeline · Medium',text:'Confirm AIRIS upgrade ETA before Jun 4 monthly — currently no timeline set.'},
    ],
  },
  {
    id:'scmp', name:'SCMP', health:'yellow',
    insight:'PROJ-33328 in backlog since May 15. June renewal has no calendar event yet.',
    diffs:[], riskTags:['renewal','ticket'], ticketCount:1, mtgCount:2,
    projects:[
      {name:'Segments Enablement',status:'progress'},
      {name:'Renewal (June 2026)',status:'blocked'},
    ],
    meetings:[
      {date:'May 19',title:'Segment / Experiment / Insight Interview',meta:'10:30–11:00 HKT · Recurring weekly'},
      {date:'May 26',title:'Segment / Experiment / Insight Interview',meta:'10:30–11:00 HKT'},
    ],
    tickets:[
      {key:'PROJ-33328',title:'Enable segment quota increase to 50',status:'backlog',assignee:'Michael Palmer',pinned:false},
    ],
    suggestions:[
      {priority:'high',label:'Renewal · High',text:'June renewal has no meeting booked yet — schedule it this week.'},
      {priority:'medium',label:'Ticket · Medium',text:'PROJ-33328 sitting in backlog since May 15. Follow up with Michael Palmer.'},
    ],
  },
  {
    id:'1010hope', name:'10/10Hope', health:'yellow',
    insight:'klickngo API integration in progress. EC & POS integration has no ticket yet.',
    diffs:[], riskTags:['ticket'], ticketCount:1, mtgCount:2,
    projects:[
      {name:'AIQUA Usage Tracking',status:'progress'},
      {name:'EC & POS Integration',status:'progress'},
    ],
    meetings:[
      {date:'May 18',title:'10/10 整合',meta:'14:30–15:00 HKT · Recurring'},
      {date:'May 25',title:'10/10 整合',meta:'14:30–15:00 HKT'},
    ],
    tickets:[
      {key:'QGWL-25317',title:'klickngo API Integration for 10/10 Hope',status:'in-progress',assignee:'Mark Liu',pinned:false},
    ],
    suggestions:[
      {priority:'medium',label:'Ticket · Medium',text:'Get Mark Liu update on QGWL-25317 klickngo API integration status.'},
      {priority:'medium',label:'Action · Medium',text:'EC & POS integration has no formal ticket — consider raising one to track it.'},
    ],
  },
  {
    id:'luxgen', name:'Luxgen', health:'yellow',
    insight:'Renewal decision meetings were May 19. Log the outcome and update status.',
    diffs:[{type:'new',text:'確認是否延 Luxgen 合約 — outcome pending log'}],
    riskTags:['renewal'], ticketCount:0, mtgCount:1,
    projects:[{name:'Contract Renewal Decision',status:'progress'}],
    meetings:[{date:'May 26',title:'Luxgen checking',meta:'10:00–10:30 HKT · Recurring'}],
    tickets:[],
    suggestions:[
      {priority:'high',label:'Renewal · High',text:'Log the May 19 renewal outcome — renew, churn, or pending? Update account status.'},
    ],
  },
  {
    id:'55688', name:'55688', health:'yellow',
    insight:'Tracking Service Agent purchase intent. Weekly check-in ongoing.',
    diffs:[], riskTags:['ticket'], ticketCount:0, mtgCount:2,
    projects:[{name:'Service Agent Purchase Decision',status:'progress'}],
    meetings:[
      {date:'May 19',title:'55688 SA Tracking',meta:'09:15–09:45 HKT · Recurring'},
      {date:'May 26',title:'55688 SA Tracking',meta:'09:15–09:45 HKT'},
    ],
    tickets:[],
    suggestions:[
      {priority:'medium',label:'Action · Medium',text:'Bring Service Agent pricing summary to May 19 meeting. Push for a clear decision timeline.'},
    ],
  },
  {
    id:'tiyuanxiang', name:'田原香', health:'green',
    insight:'Use case tracking session weekly. No blockers detected.',
    diffs:[], riskTags:['ok'], ticketCount:0, mtgCount:2,
    projects:[
      {name:'Automation Journey Development',status:'progress'},
      {name:'Agent Usage & Feedback',status:'ok'},
    ],
    meetings:[
      {date:'May 20',title:'田原香 use case tracking',meta:'09:30–10:00 HKT · Recurring'},
      {date:'May 27',title:'田原香 use case tracking',meta:'09:30–10:00 HKT'},
    ],
    tickets:[],
    suggestions:[
      {priority:'low',label:'Action · Low',text:'Collect agent usage feedback at May 20 session and log for OKR.'},
    ],
  },
];
const BRIEF_CAT_META = {
  onboard:  {emoji:'\u{1f680}', label:'Onboard',           cls:'onboard'},
  renewal:  {emoji:'\u{1f504}', label:'Renewal',            cls:'renewal'},
  ticket:   {emoji:'\u{1f3ab}', label:'Ticket Resolved',    cls:'ticket'},
  feature:  {emoji:'⚡', label:'Feature Enabled',    cls:'feature'},
  pitching: {emoji:'\u{1f3af}', label:'Pitching',           cls:'pitching'},
  ai:       {emoji:'\u{1f916}', label:'AI Adoption',        cls:'ai'},
  team:     {emoji:'\u{1f91d}', label:'Team Contribution',  cls:'team'},
  other:    {emoji:'\u{1f4cc}', label:'Other',              cls:'other'},
};
const OKR_SECTIONS = [
  {key:'onboard',  title:'1. Onboarded new accounts'},
  {key:'renewal',  title:'2. Renewed successfully'},
  {key:'pitching', title:'3. Others — Pitching & team contribution'},
  {key:'feature',  title:'4. Pilot / New feature enablement'},
  {key:'ai',       title:'5. AI adoption'},
  {key:'team',     title:'6. Functional knowledge & teamwork'},
  {key:'ticket',   title:'7. Issues resolved'},
  {key:'other',    title:'8. Other contributions'},
];
const RISK_LABELS = {mtg:'\u{1f4c5} Meeting Due', ticket:'\u{1f41b} Ticket Blocked', renewal:'⚠️ Renewal Risk', silent:'\u{1f47b} Client Silent', ok:'✅ On Track'};
const PRELOADED_LOG = [
  {id:1,  date:'2026-Q1', quarter:'Q1 2026', category:'onboard',  client:'10/10Hope', description:'AIQUA onboarded (Prizm HK)'},
  {id:2,  date:'2026-Q1', quarter:'Q1 2026', category:'renewal',  client:'Mannings',  description:'Renewed AQ & AX to 2026-06-30'},
  {id:3,  date:'2026-Q1', quarter:'Q1 2026', category:'renewal',  client:'田原香',     description:'Renewed to 2027-02-16'},
  {id:4,  date:'2026-Q1', quarter:'Q1 2026', category:'pitching', client:'Internal',  description:'Genki — AA opportunity pitched'},
  {id:5,  date:'2026-Q1', quarter:'Q1 2026', category:'pitching', client:'Mannings',  description:'AA & AR opportunities pitched'},
  {id:6,  date:'2026-Q1', quarter:'Q1 2026', category:'pitching', client:'Internal',  description:'Partner team pitching — Prizm (City Super)'},
  {id:7,  date:'2026-Q1', quarter:'Q1 2026', category:'pitching', client:'Internal',  description:'Partner team pitching — Ledgerbio (Chinachem)'},
  {id:8,  date:'2026-Q1', quarter:'Q1 2026', category:'team',     client:'SCMP',      description:'Assisted in finding SCMP for panel speaker'},
  {id:9,  date:'2026-Q1', quarter:'Q1 2026', category:'feature',  client:'田原香',     description:'Campaign agent enabled'},
  {id:10, date:'2026-Q1', quarter:'Q1 2026', category:'feature',  client:'Mannings',  description:'AB test with new recommendations filtering rules'},
  {id:11, date:'2026-Q1', quarter:'Q1 2026', category:'ai',       client:'Internal',  description:'Gemini + NotebookLM as first answer-seeking before team'},
  {id:12, date:'2026-Q1', quarter:'Q1 2026', category:'ai',       client:'Internal',  description:'AI video scene generation for AA demo'},
  {id:13, date:'2026-Q1', quarter:'Q1 2026', category:'ai',       client:'Internal',  description:'NotebookLM + Gemini + Canva/Felo.ai for slides'},
  {id:14, date:'2026-Q1', quarter:'Q1 2026', category:'ai',       client:'Mannings',  description:'Gemini for bi-weekly report preparation'},
  {id:15, date:'2026-Q1', quarter:'Q1 2026', category:'team',     client:'Internal',  description:'LON insights shared to Darren, Brian, Eric'},
  {id:16, date:'2026-Q1', quarter:'Q1 2026', category:'team',     client:'Internal',  description:'UX interview with Medet'},
  {id:17, date:'2026-Q1', quarter:'Q1 2026', category:'team',     client:'Internal',  description:'AQ recommendation sharing with Zebbie'},
];
// ── BRIEF STATE ───────────────────────────────────────────────────────────────
let logEntries = [];
// EDIT 1: Live ticket state — populated by loadTickets() from Worker /tickets endpoint
let TICKETS = {};
let ticketsLoaded = false;
let briefNextId = 100;
const BRIEF_LOG_KEY = 'csm_session_log';
function loadLog(){
  try{ return JSON.parse(localStorage.getItem(BRIEF_LOG_KEY)||'null')||[...PRELOADED_LOG]; }
  catch(_){ return [...PRELOADED_LOG]; }
}
function saveLog(){ localStorage.setItem(BRIEF_LOG_KEY, JSON.stringify(logEntries)); }
// ── BRIEF INIT (called once on page load) ─────────────────────────────────────
// ── GITHUB BRIEF AUTO-SYNC ────────────────────────────────────────────────────
// csm-brief.json lives in the repo root → served by GitHub Pages at same origin.
// Claude pushes a new version via GitHub API after every brief generation.
// Dashboard fetches it on every load — zero manual steps.
function fixUtf8(str) {
  if (!str) return str;
  try { return decodeURIComponent(escape(str)); } catch(e) { return str; }
}
function _setSyncUI(state, text) {
  const dot = document.getElementById('syncDot');
  const lbl = document.getElementById('syncLabel');
  if (dot) { dot.className = 'sync-dot' + (state ? ' ' + state : ''); }
  if (lbl) { lbl.textContent = text; }
}
async function loadBriefFromGitHub() {
  _setSyncUI('spin', 'Loading brief from GitHub…');
  try {
    // Cache-bust so we always get the latest commit, not a CDN-cached copy
    const res = await fetch('./csm-brief.json?_=' + Date.now());
    if (!res.ok) throw new Error(res.status === 404 ? 'No brief pushed yet — ask Claude to generate your brief.' : 'HTTP ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data.accounts) || data.accounts.length === 0) throw new Error('Brief is empty — ask Claude to generate your brief.');
    ACCOUNTS = data.accounts.map(function(acct) {
  return Object.assign({}, acct, {
    tickets: (acct.tickets||[]).map(function(t) {
      return Object.assign({}, t, { title: fixUtf8(t.title) });
    }),
    meetings: (acct.meetings||[]).map(function(m) {
      return Object.assign({}, m, { title: fixUtf8(m.title) });
    })
  });
});
    renderBriefCards();
    renderBriefStats();
    briefUpdateTabCounts();
    const ts = data.generatedAt
      ? new Date(data.generatedAt).toLocaleString('en-HK', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', hour12:false, timeZone:'Asia/Hong_Kong' })
      : '?';
    _setSyncUI('ok', 'Brief synced · ' + ts + ' HKT · auto-updated by Claude each morning');
  } catch (e) {
    _setSyncUI('err', e.message || 'Could not load brief');
  }
}
// ── TICKET FLAG SYSTEM ───────────────────────────────────────────────────────
// Flags stored in localStorage as { "TICKET-KEY": "done" | "ignored" }
// The brief panel only surfaces tickets NOT flagged.
const TICKET_FLAGS_KEY = 'csmTicketFlags';
function getTicketFlags() {
  try { return JSON.parse(localStorage.getItem(TICKET_FLAGS_KEY) || '{}'); }
  catch(_) { return {}; }
}
function flagTicket(key, flag) {
  const flags = getTicketFlags();
  flags[key] = flag;
  localStorage.setItem(TICKET_FLAGS_KEY, JSON.stringify(flags));
  _refreshOpenPanel();
  renderBriefCards();
}
function unflagTicket(key) {
  const flags = getTicketFlags();
  delete flags[key];
  localStorage.setItem(TICKET_FLAGS_KEY, JSON.stringify(flags));
  _refreshOpenPanel();
  renderBriefCards();
}
function showFlaggedSection(acctId) {
  const el = document.getElementById('tix-flagged-' + acctId);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}
function _refreshOpenPanel() {
  const sp = document.getElementById('briefSidePanel');
  if (!sp || !sp.classList.contains('open')) return;
  const titleEl = document.getElementById('briefPanelTitle');
  if (!titleEl) return;
  const acct = ACCOUNTS.find(a => a.name === titleEl.textContent);
  if (acct) openBriefPanel(acct.id);
}
function getActiveTix(tickets) {
  const flags = getTicketFlags();
  return (tickets || []).filter(t => flags[t.key] !== 'done' && flags[t.key] !== 'ignored');
}
// EDIT 2: Live ticket helpers — use Worker /tickets if loaded, fall back to brief data
function getAccountTix(acct) {
  return ticketsLoaded ? (TICKETS[acct.id] || []) : (acct.tickets || []);
}
async function loadTickets() {
  try {
    const r = await fetch('https://csm-brief-worker.williamlin12.workers.dev/tickets?_=' + Date.now());
    if (!r.ok) throw new Error('HTTP ' + r.status);
    TICKETS = await r.json();
    ticketsLoaded = true;
    renderBriefCards();
  } catch(e) {
    console.warn('[CSM] live tickets unavailable, using brief data:', e.message);
  }
}
function initBrief(){
  loadBriefFromGitHub();
  // EDIT 3: fetch live tickets in parallel with brief
  loadTickets();
  logEntries = loadLog();
  briefNextId = Math.max(briefNextId, ...logEntries.map(e=>e.id||0)) + 1;
  renderBriefCards();
  renderOKR();
  renderLog();
  renderBriefStats();
  briefUpdateTabCounts();
  // Wire mDesc textarea to enable/disable save button
  const mDesc = document.getElementById('mDesc');
  if(mDesc){
    mDesc.addEventListener('input', function(){
      const btn = document.getElementById('mSaveBtn');
      if(btn) btn.disabled = !this.value.trim();
    });
  }
  // Close add-log modal on overlay click
  const addModal = document.getElementById('addModal');
  if(addModal){
    addModal.addEventListener('click', function(e){
      if(e.target===this) closeModal();
    });
  }
  // Seed mDate with today (YYYY-MM-DD)
  const mDate = document.getElementById('mDate');
  if(mDate && !mDate.value){
    mDate.value = new Date().toISOString().split('T')[0];
  }
}
// ── BRIEF SUB-TAB SWITCH ──────────────────────────────────────────────────────
function briefSwitchTab(name){
  ['brief','okr'].forEach(t=>{
    const btn  = document.getElementById('btab-'+t);
    const pane = document.getElementById('bpane-'+t);
    if(btn)  btn.classList.toggle('active',  t===name);
    if(pane) pane.classList.toggle('active', t===name);
  });
}
// ── BRIEF STATS ───────────────────────────────────────────────────────────────
function renderBriefStats(){
  const crit = ACCOUNTS.filter(a=>a.health==='red').length;
  const risk = ACCOUNTS.filter(a=>a.health==='yellow').length;
  const ok   = ACCOUNTS.filter(a=>a.health==='green').length;
  const mtgs = ACCOUNTS.reduce((s,a)=>s+a.mtgCount,0);
  const setCt = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  setCt('bs-crit', crit); setCt('bs-risk', risk); setCt('bs-ok', ok); setCt('bs-mtg', mtgs);
  // Update main tab count
  const tc = document.getElementById('tc-brief');
  if(tc) tc.textContent = ACCOUNTS.length;
}
function briefUpdateTabCounts(){
  const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  set('btc-brief', ACCOUNTS.length);
  set('btc-okr',   logEntries.length);
  set('tc-brief',  ACCOUNTS.length);
}
// ── ACCOUNT BRIEF RENDER ──────────────────────────────────────────────────────
function renderBriefCards(){
  const grid = document.getElementById('accountGrid');
  if(!grid) return;
  const sorted = [...ACCOUNTS].sort((a,b)=>{
    const order={red:0,yellow:1,green:2,gray:3};
    return (order[a.health]??3)-(order[b.health]??3);
  });
  grid.innerHTML = sorted.map(acct=>{
    const hBadge={red:'\u{1f534} Critical',yellow:'\u{1f7e1} At Risk',green:'\u{1f7e2} On Track',gray:'⚪ Unclear'}[acct.health]||'⚪';
    const diffHTML = acct.diffs.map(d=>`<div class="diff-line diff-${esc(d.type)}"${d.key?` title="${esc(d.key)}"`:''}>${d.type==='new'?'↗':d.type==='close'?'↘':'⚠'} ${esc(d.title||d.text)}</div>`).join('');
    const riskHTML = acct.riskTags.map(t=>`<span class="risk-tag ${esc(t)}">${RISK_LABELS[t]||t}</span>`).join('');
    // EDIT 4: use getAccountTix to get live tickets if available
    return `
    <div class="acct-card health-${esc(acct.health)}" onclick="openBriefPanel('${esc(acct.id)}')">
      <div class="acct-header">
        <div>
          <div class="acct-name">${esc(acct.name)}</div>
          <div class="acct-meta">
            <span>\u{1f3ab} ${getActiveTix(getAccountTix(acct)).length} ticket${getActiveTix(getAccountTix(acct)).length!==1?'s':''}</span>
            <span>\u{1f4c5} ${acct.mtgCount} meeting${acct.mtgCount!==1?'s':''}</span>
          </div>
        </div>
        <div class="health-badge ${esc(acct.health)}">${hBadge}</div>
      </div>
      <div class="acct-insight">
        ${esc(acct.insight)}
        ${diffHTML}
      </div>
      <div class="acct-footer">
        <div class="risk-tags">${riskHTML}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted)">→ Full brief</div>
      </div>
    </div>`;
  }).join('');
}
// ── BRIEF SIDE PANEL ──────────────────────────────────────────────────────────
function openBriefPanel(id){
  const acct = ACCOUNTS.find(a=>a.id===id);
  if(!acct) return;
  const titleEl = document.getElementById('briefPanelTitle');
  const subEl   = document.getElementById('briefPanelSub');
  const bodyEl  = document.getElementById('briefPanelBody');
  if(titleEl) titleEl.textContent = acct.name;
  const hLabel = {red:'\u{1f534} Critical',yellow:'\u{1f7e1} At Risk',green:'\u{1f7e2} On Track',gray:'⚪ Unclear'}[acct.health]||'';
  if(subEl) subEl.textContent = hLabel + ' · Updated today';
  const mtgHTML = acct.meetings.length
    ? acct.meetings.map(m=>`
        <div class="mtg-row">
          <div class="mtg-date">${esc(m.date)}</div>
          <div class="mtg-info">
            <div class="title">${esc(m.title)}</div>
            <div class="meta">${esc(m.meta)}</div>
          </div>
        </div>`).join('')
    : '<div class="brief-empty-state">No meetings in next 14 days</div>';
  // EDIT 5: tickets come pre-filtered per account from Worker /tickets endpoint
  const _allTix = getAccountTix(acct);
const _flags = getTicketFlags();
const _activeTix = _allTix.filter(t => _flags[t.key] !== 'done' && _flags[t.key] !== 'ignored');
const _hiddenTix = _allTix.filter(t => _flags[t.key] === 'done' || _flags[t.key] === 'ignored');
const _renderTixRow = function(t, active) {
  var _f = _flags[t.key];
  var dimStyle  = active ? '' : 'opacity:0.4';
  var strikeStyle = active ? '' : 'opacity:0.4;text-decoration:line-through';
  var statusTxt = active ? esc(t.status.replace('-',' ')) : (_f==='done' ? '✓ done' : '⊘ ignored');
  var pinBadge  = (t.pinned && active) ? '<span class="brief-pinned-badge">pinned</span>' : '';
  var actions;
  if (active) {
    actions = '<button class="tix-flag-btn tix-done" data-k="' + esc(t.key) + '" data-f="done" onclick="flagTicket(this.dataset.k,this.dataset.f)" title="Mark done">✓</button>'
            + '<button class="tix-flag-btn tix-ignore" data-k="' + esc(t.key) + '" data-f="ignored" onclick="flagTicket(this.dataset.k,this.dataset.f)" title="Ignore">⊘</button>';
  } else {
    actions = '<button class="tix-flag-btn tix-restore" data-k="' + esc(t.key) + '" onclick="unflagTicket(this.dataset.k)" title="Restore">↩</button>';
  }
  return '<div class="brief-ticket-row' + (active ? '' : ' tix-hidden') + '">'
    + '<div class="brief-ticket-key" style="' + dimStyle + '">' + esc(t.key) + '</div>'
    + '<div class="brief-ticket-info" style="' + strikeStyle + '">'
    +   '<div class="title">' + esc(t.title) + pinBadge + '</div>'
    +   '<div class="meta">'
    +     '<span class="status-dot ' + esc(t.status) + '">' + statusTxt + '</span>'
    +     '<span>' + esc(t.assignee) + '</span>'
    +   '</div>'
    + '</div>'
    + '<div class="brief-tix-actions">' + actions + '</div>'
    + '</div>';
};
var _buildTickHTML = function() {
if (_allTix.length === 0) return '<div class="brief-empty-state">No active tickets</div>';
var hid = acct.id.replace(/[^a-z0-9]/g, '');
var rows = '', html = '';
_activeTix.forEach(function(t){ html += _renderTixRow(t, true); });
_hiddenTix.forEach(function(t){ rows += _renderTixRow(t, false); });
if (_hiddenTix.length > 0) {
  html += '<div class="brief-flagged-toggle"><button class="brief-flagged-toggle-btn" data-hid="' + hid + '" onclick="showFlaggedSection(this.dataset.hid)">'
        + _hiddenTix.length + ' hidden (done / ignored) &middot; show</button></div>'
        + '<div id="tix-flagged-' + hid + '" style="display:none">' + rows + '</div>';
}
if (_activeTix.length === 0 && _hiddenTix.length > 0) {
  html = '<div class="brief-empty-state">All tickets marked done or ignored. <button class="brief-flagged-toggle-btn" data-hid="' + hid + '" onclick="showFlaggedSection(this.dataset.hid)">Show ' + _hiddenTix.length + ' hidden</button></div>'
       + '<div id="tix-flagged-' + hid + '" style="display:none">' + rows + '</div>';
}
return html;
};
const tickHTML = _buildTickHTML();
  const projHTML = acct.projects.length
    ? acct.projects.map(p=>`
        <div class="project-row">
          <div class="proj-name">${esc(p.name)}</div>
          <div class="proj-status ${esc(p.status)}">${{progress:'\u{1f7e1} In Progress',ok:'\u{1f7e2} On Track',blocked:'\u{1f534} Blocked'}[p.status]||p.status}</div>
        </div>`).join('')
    : '';
  const sugHTML = acct.suggestions.map((s,i)=>`
    <div class="suggestion-row ${esc(s.priority)}">
      <div class="sug-label"><span>${i+1}</span><span>${esc(s.label)}</span></div>
      <div class="sug-text">${esc(s.text)}</div>
    </div>`).join('');
  if(bodyEl) bodyEl.innerHTML = `
    <div class="p-section">
      <div class="p-section-title">\u{1f4c5} Upcoming Meetings</div>
      ${mtgHTML}
    </div>
    <div class="p-section">
      <div class="p-section-title">\u{1f3ab} Active Tickets</div>
      ${tickHTML}
    </div>
    ${acct.projects.length?`
    <div class="p-section">
      <div class="p-section-title">\u{1f5c2} Projects</div>
      ${projHTML}
    </div>`:''}
    <div class="p-section">
      <div class="p-section-title">\u{1f4a1} Suggestions</div>
      ${sugHTML}
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);margin-top:10px">
        Reply in Claude: "Done: [#]" or "Didn't work: [#]" to log outcome
      </div>
    </div>
  `;
  const ov = document.getElementById('briefPanelOverlay');
  const sp = document.getElementById('briefSidePanel');
  if(ov) ov.classList.add('open');
  if(sp) sp.classList.add('open');
}
function closeBriefPanel(){
  const ov = document.getElementById('briefPanelOverlay');
  const sp = document.getElementById('briefSidePanel');
  if(ov) ov.classList.remove('open');
  if(sp) sp.classList.remove('open');
}
// ── OKR TAB ───────────────────────────────────────────────────────────────────
function renderOKR(){
  const qSel = document.getElementById('okrQSel');
  if(!qSel) return;
  const q = qSel.value;
  const filtered = logEntries.filter(e=>e.quarter===q);
  const container = document.getElementById('okrSections');
  if(!container) return;
  container.innerHTML = OKR_SECTIONS.map(sec=>{
    const items = filtered.filter(e=>e.category===sec.key);
    const id = 'okr-'+sec.key;
    return `
    <div class="okr-section">
      <div class="okr-section-head" onclick="toggleOKRSection('${id}')">
        <div class="title">${BRIEF_CAT_META[sec.key]?.emoji||'•'} ${esc(sec.title)}</div>
        <div class="count">${items.length} item${items.length!==1?'s':''}</div>
      </div>
      <div class="okr-body" id="${id}">
        ${items.length
          ? items.map(e=>`
            <div class="okr-item">
              <span class="client-tag">${esc(e.client)}</span>
              <span>${esc(e.description)}</span>
            </div>`).join('')
          : '<div style="font-family:\'DM Mono\',monospace;font-size:11px;color:var(--muted)">None this quarter</div>'}
      </div>
    </div>`;
  }).join('');
  briefUpdateTabCounts();
}
function toggleOKRSection(id){
  const el = document.getElementById(id);
  if(el) el.classList.toggle('open');
}
function copyOKR(){
  const qSel = document.getElementById('okrQSel');
  if(!qSel) return;
  const q = qSel.value;
  const filtered = logEntries.filter(e=>e.quarter===q);
  let txt = `\u{1f4ca} OKR SUMMARY — CSM Brief (${q})\n\n`;
  OKR_SECTIONS.forEach(sec=>{
    const items = filtered.filter(e=>e.category===sec.key);
    txt += sec.title+'\n';
    txt += items.length
      ? items.map(e=>`  • [${e.client}] ${e.description}`).join('\n')+'\n'
      : '  • None this quarter\n';
    txt += '\n';
  });
  navigator.clipboard.writeText(txt).then(()=>{
    const btn = document.getElementById('okrCopyBtn');
    if(btn){ btn.textContent='✓ Copied!'; setTimeout(()=>btn.textContent='Copy Summary', 2000); }
  });
}
// ── SESSION LOG TAB ───────────────────────────────────────────────────────────
function renderLog(){
  const qF   = document.getElementById('logQFilter');
  const catF  = document.getElementById('logCatFilter');
  const cliF  = document.getElementById('logClientFilter');
  if(!qF||!catF||!cliF) return;
  const q      = qF.value;
  const cat    = catF.value;
  const client = cliF.value;
  const filtered = logEntries.filter(e=>{
    if(q!=='all' && e.quarter!==q) return false;
    if(cat!=='all' && e.category!==cat) return false;
    if(client!=='all' && e.client!==client) return false;
    return true;
  });
  const list = document.getElementById('logList');
  if(!list) return;
  if(!filtered.length){
    list.innerHTML='<div class="brief-empty-state">No entries match your filters</div>';
    briefUpdateTabCounts(); return;
  }
  list.innerHTML = filtered.map(e=>`
    <div class="log-entry">
      <span class="log-emoji">${BRIEF_CAT_META[e.category]?.emoji||'\u{1f4cc}'}</span>
      <div class="log-body">
        <div class="log-tags">
          <span class="log-cat ${esc(e.category)}">${esc(BRIEF_CAT_META[e.category]?.label||e.category)}</span>
          <span class="log-client">${esc(e.client)}</span>
          <span class="log-date">${esc(e.date)}</span>
        </div>
        <div class="log-desc">${esc(e.description)}</div>
        <div class="log-qtr">${esc(e.quarter)}</div>
      </div>
      <button class="log-del" onclick="deleteLogEntry(${e.id})" title="Remove">✕</button>
    </div>`).join('');
  briefUpdateTabCounts();
}
function deleteLogEntry(id){
  logEntries = logEntries.filter(e=>e.id!==id);
  saveLog();
  renderLog();
  renderOKR();
  briefUpdateTabCounts();
}
// ── ADD LOG MODAL ─────────────────────────────────────────────────────────────
function openAddModal(){
  const today = new Date().toISOString().split('T')[0];
  const mDate = document.getElementById('mDate');
  const mDesc = document.getElementById('mDesc');
  const mSaveBtn = document.getElementById('mSaveBtn');
  if(mDate) mDate.value = today;
  if(mDesc) mDesc.value = '';
  if(mSaveBtn) mSaveBtn.disabled = true;
  const modal = document.getElementById('addModal');
  if(modal) modal.classList.add('open');
}
function closeModal(){
  const modal = document.getElementById('addModal');
  if(modal) modal.classList.remove('open');
}
function saveEntry(){
  const mDesc = document.getElementById('mDesc');
  const desc = mDesc ? mDesc.value.trim() : '';
  if(!desc) return;
  const entry = {
    id: briefNextId++,
    date:        document.getElementById('mDate')?.value    || new Date().toISOString().split('T')[0],
    quarter:     document.getElementById('mQuarter')?.value || 'Q2 2026',
    category:    document.getElementById('mCat')?.value     || 'other',
    client:      document.getElementById('mClient')?.value  || 'Other',
    description: desc,
  };
  logEntries.push(entry);
  saveLog();
  closeModal();
  renderLog();
  renderOKR();
  briefUpdateTabCounts();
}
// ════════════════════════════════════════════════════════════════════════════
// END CSM BRIEF
// ════════════════════════════════════════════════════════════════════════════


/* ---- CSM brief visibility: owner only ---- */
(function () {
  var BRIEF_OWNER = 'william.wt.lin@appier.com';
  function applyBriefVisibility() {
    var u = null;
    try { u = (typeof getUser === 'function') ? getUser() : (window.getUser ? window.getUser() : null); } catch (e) {}
    var loggedIn = !!(u && u.email);
    var allowed = loggedIn && u.email.toLowerCase() === BRIEF_OWNER;
    ['snav-brief', 'tab-brief'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = (!loggedIn || allowed) ? '' : 'none';
    });
    if (loggedIn && !allowed) {
      var pane = document.getElementById('pane-brief');
      if (pane && pane.classList.contains('active') && window.switchTab) {
        try { window.switchTab('tickets'); } catch (e) {}
      }
    }
  }
  window.applyBriefVisibility = applyBriefVisibility;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyBriefVisibility);
  else applyBriefVisibility();
  setInterval(applyBriefVisibility, 4000);
})();
