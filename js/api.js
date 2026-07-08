'use strict';

// SECTION 4 \u2014 JIRA REST API (direct, no Anthropic API needed)
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

async function apiFetch(url, opts={}){
  if(url.includes('/ex/jira//'))
    throw new Error('API URL is malformed \u2014 cloudId is missing. Please log in again.');
  if(/\/\?/.test(url))
    throw new Error(`API URL has an empty path segment (missing ticket key): ${url}`);

  const token  = await getAccessToken();
  const method = opts.method || 'GET';

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
    ...(opts.headers||{}),
  };

  let finalUrl = url;

  // \u2500\u2500 Route write operations through the Cloudflare Worker proxy \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  // The browser converts POST \u2192 GET when following Atlassian's CDN redirects.
  // The Worker makes the request server-side where redirects work correctly.
  if(method !== 'GET' && method !== 'HEAD' && url.includes(CONFIG.API_BASE)){
    // Rewrite: https://api.atlassian.com/ex/jira/{id}/rest/...
    //      to: https://workerfordashboard.../jira-proxy/ex/jira/{id}/rest/...
    finalUrl = url.replace(CONFIG.API_BASE, CONFIG.TOKEN_URL + '/jira-proxy');
  }

  const fetchOpts = { method, headers, redirect:'follow' };
  if(opts.body && method !== 'GET' && method !== 'HEAD')
    fetchOpts.body = opts.body;

  const resp = await fetch(finalUrl, fetchOpts);

  if(resp.status===401){
    clearSession(); showLoginScreen();
    showLoginError('Your session has expired. Please log in again.');
    throw new Error('Session expired');
  }
  if(!resp.ok){
    let body = null;
try{ const _t = await resp.text(); body = _t ? JSON.parse(_t) : null; }catch(_){}
// Jira create-issue 400s put details in body.errors {field: message} — surface them
const _fieldErrs = body?.errors && Object.keys(body.errors).length
? Object.entries(body.errors).map(([k,v])=>k+': '+v).join('; ')
: '';
throw new Error(body?.message || body?.errorMessages?.[0] || _fieldErrs || body?.detail || `HTTP ${resp.status}`);
  }
  if(resp.status===204) return null;
// Some Jira endpoints (e.g. POST /issueLink) return 200/201 with an EMPTY body.
// resp.json() would throw "Unexpected end of JSON input" — parse defensively.
const _text = await resp.text();
if(!_text) return null;
try{ return JSON.parse(_text); }catch(_){ return null; }
}

async function fetchMe(){
  return apiFetch(`${CONFIG.API_BASE}/me`);
}

async function fetchAccessibleResources(){
  return apiFetch(`${CONFIG.API_BASE}/oauth/token/accessible-resources`);
}

// Fetch ALL pages of issues reported by the current user
async function fetchAllIssues(user){
  const {accountId, cloudId, siteUrl}=user;
  const base=`${CONFIG.API_BASE}/ex/jira/${cloudId}`;
  // Date restriction required by Jira Cloud OAuth
  const since = new Date(); since.setFullYear(since.getFullYear() - 1);
  const sinceStr = since.toISOString().slice(0,10).replace(/-/g,'/');
  const jql=`reporter = "${accountId}" AND created >= "${sinceStr}" ORDER BY created DESC`;
  // fields must be an array for POST /search/jql
  // startAt is NOT supported \u2014 pagination uses nextPageToken only
  const fields=['summary','status','assignee','reporter','created','resolutiondate'];
  let issues=[], nextPageToken=null;

  while(true){
    const payload = { jql, fields, maxResults: 100 };
    if(nextPageToken) payload.nextPageToken = nextPageToken;

    const data=await apiFetch(`${base}/rest/api/3/search/jql`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const batch = data.issues || [];
    issues = [...issues, ...batch];
    nextPageToken = data.nextPageToken || null;
    // Stop when no nextPageToken or batch smaller than maxResults
    if(!nextPageToken || batch.length < 100) break;
  }

  return issues.map(i=>{
    const f=i.fields||{};
    return {
      key:            i.key,
      url:            `${siteUrl}/browse/${i.key}`,
      summary:        f.summary||'',
      status:         f.status?.name||'Unknown',
      assignee:       f.assignee?.displayName||'Unassigned',
      reporter:       f.reporter?.displayName||'Unknown',
      created:        (f.created||'').slice(0,10),
      resolutiondate: f.resolutiondate ? f.resolutiondate.slice(0,10) : null,
    };
  });
}

// Mark a ticket as Done via direct Jira REST API
// Fetch issues assigned to the current user that are not done
async function fetchAssignedIssues(user){
  const {accountId, cloudId, siteUrl}=user;
  const base=`${CONFIG.API_BASE}/ex/jira/${cloudId}`;
  const since = new Date(); since.setFullYear(since.getFullYear() - 1);
  const sinceStr = since.toISOString().slice(0,10).replace(/-/g,'/');
  const jql=`assignee = "${accountId}" AND statusCategory != Done AND created >= "${sinceStr}" ORDER BY created ASC`;
  const fields=['summary','status','assignee','reporter','created','resolutiondate'];
  let issues=[], nextPageToken=null;

  while(true){
    const payload={jql, fields, maxResults:100};
    if(nextPageToken) payload.nextPageToken=nextPageToken;
    const data=await apiFetch(`${base}/rest/api/3/search/jql`,{
      method:'POST', body:JSON.stringify(payload),
    });
    const batch=data.issues||[];
    issues=[...issues,...batch];
    nextPageToken=data.nextPageToken||null;
    if(!nextPageToken||batch.length<100) break;
  }

  return issues.map(i=>{
    const f=i.fields||{};
    return {
      key:i.key, url:`${siteUrl}/browse/${i.key}`,
      summary:f.summary||'', status:f.status?.name||'Unknown',
      assignee:f.assignee?.displayName||'Unassigned',
      reporter:f.reporter?.displayName||'Unknown',
      created:(f.created||'').slice(0,10),
      resolutiondate:f.resolutiondate?f.resolutiondate.slice(0,10):null,
    };
  });
}

async function markIssueDone(key){
  const user=getUser();
  const base=`${CONFIG.API_BASE}/ex/jira/${user.cloudId}`;

  // Step 1: get available transitions
  const data=await apiFetch(`${base}/rest/api/3/issue/${key}/transitions`);
  const doneT=(data.transitions||[]).find(t=>
    t.name.toLowerCase()==='done' && t.isAvailable!==false
  );
  if(!doneT) throw new Error(`No "Done" transition available for ${key}`);

  // Step 2: apply the transition
  await apiFetch(`${base}/rest/api/3/issue/${key}/transitions`,{
    method: 'POST',
    body:   JSON.stringify({transition:{id:doneT.id}}),
  });
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
