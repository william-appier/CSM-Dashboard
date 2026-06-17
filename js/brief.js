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
      {date:'May 25',title:'10/10 整合'tribution',  cls:'team'},
  other:    {emoji:'📌', label:'Other',              cls:'other'},
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

const RISK_LABELS = {mtg:'📅 Meeting Due', ticket:'🐛 Ticket Blocked', renewal:'⚠️ Renewal Risk', silent:'👻 Client Silent', ok:'✅ On Track'};

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
    const res = await fetch('/csm-brief.json?_=' + Date.now());
    if (!res.ok) throw new Error(res.status === 404 ? 'No brief pushed yet — ask Claude to generate your brief.' : 'HTTP ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data.accounts) || data.accounts.length === 0) throw new Error('Brief is empty — ask Claude to generate your brief.');
    ACCOUNTS = data.accounts;
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

function initBrief(){
  loadBriefFromGitHub();
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

// ── BRIEF SUB-TAB SWITCH ─────────────────────────────────────────────────────
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
    const hBadge={red:'🔴 Critical',yellow:'🟡 At Risk',green:'🟢 On Track',gray:'⚪ Unclear'}[acct.health]||'⚪';
    const diffHTML = acct.diffs.map(d=>`<div class="diff-line diff-${esc(d.type)}">${d.type==='new'?'↗':d.type==='close'?'↘':'⚠'} ${esc(d.text)}</div>`).join('');
    const riskHTML = acct.riskTags.map(t=>`<span class="risk-tag ${esc(t)}">${RISK_LABELS[t]||t}</span>`).join('');
    return `
    <div class="acct-card health-${esc(acct.health)}" onclick="openBriefPanel('${esc(acct.id)}')">
      <div class="acct-header">
        <div>
          <div class="acct-name">${esc(acct.name)}</div>
          <div class="acct-meta">
            <span>🎫 ${acct.ticketCount} ticket${acct.ticketCount!==1?'s':''}</span>
            <span>📅 ${acct.mtgCount} meeting${acct.mtgCount!==1?'s':''}</span>
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
        <div style="font-family:\'DM Mono\',monospace;font-size:10px;color:var(--muted)">→ Full brief</div>
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
  const hLabel = {red:'🔴 Critical',yellow:'🟡 At Risk',green:'🟢 On Track',gray:'⚪ Unclear'}[acct.health]||'';
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

  const tickHTML = acct.tickets.length
    ? acct.tickets.map(t=>`
        <div class="brief-ticket-row">
          <div class="brief-ticket-key">${esc(t.key)}</div>
          <div class="brief-ticket-info">
            <div class="title">${esc(t.title)} ${t.pinned?'<span class="brief-pinned-badge">pinned</span>':''}</div>
            <div class="meta">
              <span class="status-dot ${esc(t.status)}">${esc(t.status.replace('-',' '))}</span>
              <span>${esc(t.assignee)}</span>
            </div>
          </div>
        </div>`).join('')
    : '<div class="brief-empty-state">No active tickets</div>';

  const projHTML = acct.projects.length
    ? acct.projects.map(p=>`
        <div class="project-row">
          <div class="proj-name">${esc(p.name)}</div>
          <div class="proj-status ${esc(p.status)}">${{progress:'🟡 In Progress',ok:'🟢 On Track',blocked:'🔴 Blocked'}[p.status]||p.status}</div>
        </div>`).join('')
    : '';

  const sugHTML = acct.suggestions.map((s,i)=>`
    <div class="suggestion-row ${esc(s.priority)}">
      <div class="sug-label"><span>${i+1}</span><span>${esc(s.label)}</span></div>
      <div class="sug-text">${esc(s.text)}</div>
    </div>`).join('');

  if(bodyEl) bodyEl.innerHTML = `
    <div class="p-section">
      <div class="p-section-title">📅 Upcoming Meetings</div>
      ${mtgHTML}
    </div>
    <div class="p-section">
      <div class="p-section-title">🎫 Active Tickets</div>
      ${tickHTML}
    </div>
    ${acct.projects.length?`
    <div class="p-section">
      <div class="p-section-title">🗂 Projects</div>
      ${projHTML}
    </div>`:''}
    <div class="p-section">
      <div class="p-section-title">💡 Suggestions</div>
      ${sugHTML}
      <div style="font-family:\'DM Mono\',monospace;font-size:10px;color:var(--muted);margin-top:10px">
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
  let txt = `📊 OKR SUMMARY — CSM Brief (${q})\n\n`;
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
      <span class="log-emoji">${BRIEF_CAT_META[e.category]?.emoji||'📌'}</span>
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

