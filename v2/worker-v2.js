// CSM Daily Brief — v2 data-layer helpers (multi-CSM)
// SOURCE ONLY. Not auto-deployed. Fold into Cloudflare Worker after review.
// Two independent axes handled separately (see design doc §4.4 + §6):
//   - contract table  -> read ONE header row per account (end date + CSM owner)
//   - Jira tickets     -> count mode for totals, keys-only pagination for diff, top-N for display

// ---------------------------------------------------------------------------
// 1. OP summary (contract table) parser — header-row only
// ---------------------------------------------------------------------------
// Wide sheet: one account = one block. Account-level fields (name, Contract
// Expiry Date, CSM Email) live on the block's FIRST row only. Following rows
// are per-invoice detail lines with repeated amounts and WRONG dates for our
// purpose. Read only the header row -> reliable end date, tiny read volume.
//
// Column order (0-indexed):
//   0 Account | 1 Opportunity | 2 CSM Email | 3 (blank) | 4 Amount
//   5 AR Status | 6 Expected Sending | 7 Actual Activation | 8 Contract Expiry
const COL = { ACCOUNT: 0, OPP: 1, CSM: 2, EXPIRY: 8 };

function parseContractTable(rows) {
  // rows: array of arrays (CSV parsed). Returns one record per account block.
  const out = [];
  let cur = null;
  for (const r of rows) {
    const account = (r[COL.ACCOUNT] || '').trim();
    if (account) {
      // new block header row -> this row carries the authoritative fields
      cur = {
        account,
        csmOwner: (r[COL.CSM] || '').trim().toLowerCase(),
        endDate: normDate(r[COL.EXPIRY]),
        opportunity: (r[COL.OPP] || '').trim(),
      };
      out.push(cur);
    }
    // detail rows (account blank) -> ignore entirely
  }
  return out.filter(a => a.account && a.csmOwner);
}

function normDate(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const [, mo, da, yr] = m;
  return `${yr}-${String(+mo).padStart(2, '0')}-${String(+da).padStart(2, '0')}`;
}

// group by CSM owner -> { email: [{account,endDate,...}] }
function accountsByCsm(records) {
  const map = {};
  for (const rec of records) (map[rec.csmOwner] ||= []).push(rec);
  return map;
}

// renewal alert: keep the SOONEST end date per account, flag if <= 35 days
function renewalAlerts(records, today = new Date()) {
  today.setHours(0, 0, 0, 0);
  const byAcct = {};
  for (const r of records) {
    if (!r.endDate) continue;
    const daysLeft = Math.round((new Date(r.endDate) - today) / 86400000);
    if (daysLeft > 35) continue;
    const prev = byAcct[r.account];
    if (prev && prev.daysLeft <= daysLeft) continue; // keep more urgent
    byAcct[r.account] = { daysLeft, endDate: r.endDate, csmOwner: r.csmOwner };
  }
  return byAcct;
}

// ---------------------------------------------------------------------------
// 2. Jira — count for totals, keys-only for diff, top-N for display
// ---------------------------------------------------------------------------
// A single busy account can exceed the 50/query cap (佳格, 鮮乳坊 in the PoC).
// Never pull all fields for all tickets. Split by need.

async function jiraCount(jql, fetchJson) {
  const r = await fetchJson('/rest/api/3/search/approximate-count', {
    method: 'POST', body: JSON.stringify({ jql }),
  });
  return r.count;
}

async function jiraKeys(jql, fetchJson) {
  // keys-only, paginate. Keys are tiny -> hundreds are cheap. Used for diff.
  const keys = [];
  let token = null;
  do {
    const r = await fetchJson('/rest/api/3/search/jql', {
      method: 'POST',
      body: JSON.stringify({ jql, fields: ['key'], maxResults: 100, nextPageToken: token }),
    });
    for (const i of (r.issues || [])) keys.push(i.key);
    token = r.nextPageToken;
  } while (token);
  return keys;
}

async function jiraTopN(jql, n, fetchJson) {
  // top-N for the card, ordered by priority then recency
  const r = await fetchJson('/rest/api/3/search/jql', {
    method: 'POST',
    body: JSON.stringify({
      jql: `${jql} ORDER BY priority DESC, updated DESC`,
      fields: ['summary', 'status', 'assignee', 'updated'],
      maxResults: n,
    }),
  });
  return r.issues || [];
}

// diff vs snapshot (keys only)
function diffKeys(prevKeys = [], currKeys = []) {
  const prev = new Set(prevKeys), curr = new Set(currKeys);
  return {
    added: currKeys.filter(k => !prev.has(k)),
    removed: prevKeys.filter(k => !curr.has(k)),
  };
}

// NOTE: client-name JQL matching produces false positives (SOGO venue, Ogilvy
// x Diageo). Replace the name-keyword JQL with a precise App ID / Bot ID clause
// sourced from the jira-ticket-creator client table before production.

export {
  parseContractTable, accountsByCsm, renewalAlerts,
  jiraCount, jiraKeys, jiraTopN, diffKeys, normDate,
};
