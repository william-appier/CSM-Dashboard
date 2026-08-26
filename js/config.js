'use strict';


// \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
// \u2551  CONFIGURATION \u2014 Replace CLIENT_ID after registering your OAuth app  \u2551
// \u2551  See setup guide (click "Setup" on the login screen)                 \u2551
// \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d
const CONFIG = {
  CLIENT_ID: 'xtLaSSXv7eKGXejZjiVFoDpdV9t8XneW',        // \u2190 Paste your Client ID here
  // Must match exactly what is registered in Atlassian OAuth app Callback URL
  REDIRECT_URI: 'https://william-appier.github.io/CSM-Dashboard/',
  AUTH_URL:  'https://auth.atlassian.com/authorize',
  // \u2190 Replace with your Cloudflare Worker URL after deploying it
  TOKEN_URL: 'https://workerfordashboard.williamlin12.workers.dev',
  API_BASE:  'https://api.atlassian.com',
  SCOPES:    'read:jira-work write:jira-work read:jira-user read:me offline_access',
  // Token refresh buffer: refresh if less than 5 min until expiry
  REFRESH_BUFFER_MS: 5 * 60 * 1000,
};

// \u2500\u2500 SESSION STORAGE KEYS (namespace to avoid collisions) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const SK = {
  TOKENS:   'jd_tokens',     // {access_token, refresh_token, expires_at}
  USER:     'jd_user',       // {accountId, displayName, email, cloudId, siteUrl}
  VERIFIER: 'jd_pkce_verif', // PKCE code_verifier (temporary, cleared after use)
  STATE:    'jd_oauth_state',// CSRF state nonce (temporary, cleared after use)
};

// \u2500\u2500 RUNTIME STATE \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const COLORS=['#4f8ef7','#7c5cfa','#34d399','#fbbf24','#f87171','#22d3ee','#fb923c','#a78bfa','#38bdf8','#e879f9'];
let allData=[], selAsn=null;

// == ETS BOARD (single create target, 2026-08-26) =============================
// Every ticket the dashboard CREATES goes to the ETS board as a Service Request.
// Sample / template ticket keys (QGWL-25607, AIR-4473, PHXX-6251, BBT-7539, ...)
// are NOT affected: they stay on their original boards and are only ever READ,
// as the clone source and as the "Sample ticket" reference in the description.
//
// ETS's Service Request screen has THREE required fields:
//   project, summary, customfield_23811 (Related Product)
// Omitting customfield_23811 is what made POST /rest/api/3/issue return 400.
const ETS = {
  PROJECT_KEY: 'ETS',
  ISSUE_TYPE:  'Service Request',
  RP_FIELD:    'customfield_23811',   // "Related Product" (required)
  // Option ids from GET /rest/api/3/issue/createmeta on ETS / Service Request.
  // Send { id: ... } rather than { value: ... }: ids are stable, and one option's
  // value literally ends in a space ("Others "), which makes value-matching
  // fragile.
  RP_OPTIONS: {
    AIRIS:      '28183',
    AIQUA:      '28184',
    AIXON:      '28185',
    AdCreative: '28186',
    Aideal:     '30094',
    AEP:        '28187',   // "Appier Enterprise Platform"
    AGENT:      '30071',
    BotBonnie:  '28188',
    Phoenix:    '28189',
    Others:     '30159',
  },
};

/**
 * Resolve the ETS "Related Product" option for a ticket about to be created.
 *
 * The decision is by PRODUCT MEANING, not by which board the sample ticket
 * lives on. That distinction matters for the two PHXX-sampled features:
 *   OJM feature enablement (PHXX-6251/6252) -> BotBonnie, because OJM is a
 *     BotBonnie surface that merely happens to be tracked on the PHXX board.
 *   Onboard AR to Enterprise Console (PHXX-6293) -> AIRIS, because the request
 *     is about an AIRIS account, not about Phoenix.
 *
 * @param {string} platform  wizard platform id: 'AIQUA' | 'AIRIS' | 'AIXON' |
 *                           'BotBonnie' | 'BB' | 'Segment Agent'
 * @param {object} [feat]    catalog feature ({ id, category, board, ... }) when
 *                           creating a per-feature ticket; omit for the parent
 *                           onboard ticket.
 * @returns {string} an option id from ETS.RP_OPTIONS. Never empty: falls back to
 *                   "Others" so the create call still satisfies the required
 *                   field instead of failing with another 400.
 */
function etsRelatedProduct(platform, feat) {
  const O   = ETS.RP_OPTIONS;
  const cat = String((feat && feat.category) || '').toLowerCase();
  const fid = String((feat && feat.id) || '').toLowerCase();
  const p   = String(platform || '').toLowerCase();

  // Sub-platform categories first: Segment Agent and OJM both live under the
  // AIQUA wizard but are not AIQUA tickets, so their category/id wins over the
  // wizard platform.
  if (cat === 'segment agent' || fid.indexOf('sa_') === 0)  return O.AGENT;
  if (cat === 'ojm'           || fid.indexOf('ojm') === 0)  return O.BotBonnie;

  // AIXON before the id rules: activating the AIXON platform re-labels the
  // AIRIS onboard feature in place (same 'airis_onboard' id, sample PROJ-31693,
  // name "Onboard AIXON" - see the AIXON activation block in js/onboarding.js).
  // Matching on the id there would mis-tag an AIXON ticket as AIRIS.
  if (p === 'aixon' || p === 'ax')                          return O.AIXON;

  if (fid.indexOf('airis') === 0 || fid.indexOf('ar_') === 0) return O.AIRIS;
  if (fid.indexOf('bb_') === 0)                             return O.BotBonnie;

  // Then the wizard platform.
  if (p === 'aiqua')                          return O.AIQUA;
  if (p === 'airis' || p === 'ar')            return O.AIRIS;
  if (p === 'botbonnie' || p === 'bb')        return O.BotBonnie;
  if (p === 'segment agent' || p === 'agent') return O.AGENT;
  if (p === 'phoenix' || p === 'phxx')        return O.Phoenix;

  console.warn('[ETS] No Related Product mapping for platform="' + platform +
               '" feature="' + ((feat && feat.id) || '-') +
               '" - falling back to "Others".');
  return O.Others;
}

/**
 * Build the ETS Related Product field fragment, honouring a per-ticket override.
 * Spread the result into payload.fields.
 *
 * @param {string} platform
 * @param {object} [feat]
 * @param {string} [overrideId] option id the CSM picked on the Review screen
 */
function etsRpField(platform, feat, overrideId) {
  const id = overrideId || etsRelatedProduct(platform, feat);
  const out = {};
  out[ETS.RP_FIELD] = { id: String(id) };
  return out;
}

// Expose for the IIFE-scoped modules (feature-enable.js) that load later.
window.ETS               = ETS;
window.etsRelatedProduct = etsRelatedProduct;
window.etsRpField        = etsRpField;

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
