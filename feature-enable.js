/* Runtime CSS injector */
(function(){
  var s = document.createElement('style');
  s.textContent = [
    '.fe-feat-list{display:flex;flex-direction:column;gap:0;max-height:380px;overflow-y:auto;padding-right:4px}',
    '.fe-feat-list-preview{max-height:220px}',
    '.fe-cat-header{font-size:.7rem;font-weight:700;letter-spacing:.08em;color:var(--muted);padding:10px 0 4px;border-bottom:1px solid var(--border);margin-bottom:4px;text-transform:uppercase}',
    '.fe-feat-item{border:1px solid var(--border)!important;border-radius:8px!important;margin-bottom:4px;transition:border-color .15s;padding:0!important;background:var(--surface)!important;flex-shrink:0}',
    '.fe-feat-item.fe-row-on{border-color:var(--accent)}',
    '.fe-feat-row{display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;user-select:none;transition:background .15s}',
    '.fe-feat-row:hover{background:rgba(99,102,241,.06)}',
    '.fe-feat-item.fe-row-on .fe-feat-row{background:rgba(99,102,241,.1)}',
    '.fe-feat-cb{width:16px;height:16px;border-radius:4px;border:2px solid var(--muted);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;transition:all .15s}',
    '.fe-feat-cb.fe-cb-on{background:var(--accent);border-color:var(--accent)}',
    '.fe-feat-name{flex:1;font-size:.88rem;font-weight:500;color:var(--text)}',
    '.fe-badge-clone{font-size:.7rem;padding:2px 8px;border-radius:4px;border:1px solid var(--border);color:var(--muted);flex-shrink:0;font-family:"DM Mono",monospace}',
    '.fe-badge-manual{font-size:.7rem;padding:2px 8px;border-radius:4px;background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid rgba(245,158,11,.3);flex-shrink:0;font-family:"DM Mono",monospace}.fe-badge-mat{font-size:.62rem;padding:2px 6px;border-radius:8px;background:rgba(245,158,11,.15);color:#b45309;margin-left:4px;white-space:nowrap}.fe-badge-pm{font-size:.62rem;padding:2px 6px;border-radius:8px;background:rgba(239,68,68,.12);color:#dc2626;margin-left:4px;white-space:nowrap}.fe-badge-paid{font-size:.62rem;padding:2px 6px;border-radius:8px;background:rgba(99,102,241,.12);color:#818cf8;margin-left:4px;white-space:nowrap}.fe-warn-box{margin:8px 0;padding:8px 12px;border:1px solid rgba(245,158,11,.4);border-radius:8px;background:rgba(245,158,11,.08);font-size:.72rem;line-height:1.6}',
    '.fe-feat-extra{display:none;flex-direction:column;gap:10px;padding:2px 14px 14px 42px}',
    '.fe-feat-item.fe-row-on .fe-feat-extra{display:flex}',
    '.fe-hint{font-size:.75rem;color:var(--muted);line-height:1.5;margin:0}',
    '.fe-hint a{color:var(--accent);text-decoration:none}',
    '.fe-hint a:hover{text-decoration:underline}',
    '.fe-preview-feat-row{display:flex;flex-direction:column;padding:10px 14px;border-radius:8px;border:1px solid var(--border);margin-bottom:5px;gap:4px}',
    '.fe-preview-feat-title{display:flex;align-items:center;gap:8px;font-size:.88rem;font-weight:600;color:var(--text)}',
    '.fe-preview-feat-extra{font-size:.76rem;color:var(--muted);display:flex;flex-direction:column;gap:3px;padding-top:6px;border-top:1px solid var(--border);margin-top:2px}'
  ].join('');
  document.head.appendChild(s);
}());

/* Feature Enable Wizard v4 \u2014 CSM Dashboard */
(function () {
  'use strict';

  var FE_CATALOG = {
    AIQUA: [
      { cat: 'Channels', items: [
        { id: 'sms',          name: 'Enable SMS',              mode: 'clone',  sample: 'QGWL-25618',
          extra: [
            { id: 'smsQuantity',    label: 'SMS Quantity',   placeholder: 'e.g. 100000', type: 'number' },
            { id: 'smsValidPeriod', label: 'Valid Period',   placeholder: 'e.g. 12 months' }
          ]
        },
        { id: 'edm',          name: 'Enable EDM Channel',      mode: 'clone',  sample: 'QGWL-25619',
          extra: [
            { id: 'email', label: 'Email / Domain', placeholder: 'e.g. noreply@client.com' }
          ]
        },
        { id: 'onsite',       name: 'On-site Experience',      mode: 'clone',  sample: 'QGWL-25620', extra: [] },
        { id: 'product_feed', name: 'Onboard Product Feed',    mode: 'manual', sample: 'QGWL-25675',
          extra: [
            { id: 'productFeedUrl', label: 'Product Feed URL', placeholder: 'https://example.com/feed.xml' }
          ]
        }
      ]},
      { cat: 'Audience', items: [
        { id: 'seg_split', name: 'Segment Split',  mode: 'clone', sample: 'QGWL-25620', extra: [] },
        { id: 'new_seg',   name: 'New Segment UI', mode: 'clone', sample: 'QGWL-25621', extra: [] }
      ]},
      { cat: 'Campaign', items: [
        { id: 'creative',     name: 'Creative Studio',        mode: 'clone',  sample: 'QGWL-25620', extra: [] },
        { id: 'inapp',        name: 'In-app Creative Studio', mode: 'clone',  sample: 'QGWL-25620', extra: [] },
        { id: 'content_asst', name: 'Content Assistant',      mode: 'clone',  sample: 'QGWL-25620', extra: [] },
        { id: 'feed_trigger', name: 'Feed Trigger',           mode: 'manual', sample: 'QGWL-25674', extra: [] }
      ]},
      { cat: 'Segment Agent', items: [
        { id: 'sa_onboard', name: 'Agent Onboard Ticket', mode: 'clone',  sample: 'PROJ-33300', board: 'PROJ', suggestedAssignee: 'Meh-Chi Yeh',
          extra: [
            { id: 'arName',         label: 'AIRIS Name',     placeholder: 'e.g. Mannings_AIRIS' },
            { id: 'arId',           label: 'AIRIS ID',       placeholder: 'e.g. ar-xxx' },
            { id: 'axId',           label: 'Aixon ID',       placeholder: 'e.g. ax-xxx' },
            { id: 'eam_project_id', label: 'EAM Project ID', placeholder: 'e.g. eam-xxx' }
          ]
        },
        { id: 'sa_credit', name: 'Credit System', mode: 'clone', sample: 'AEP-6694', board: 'AEP', suggestedAssignee: 'Mark Chu',
          extra: [
            { id: 'salesforceId',   label: 'Salesforce ID',    placeholder: 'e.g. sf-xxx' },
            { id: 'agentStartDate', label: 'Agent Start Date', placeholder: 'YYYY-MM-DD' },
            { id: 'agentEndDate',   label: 'Agent End Date',   placeholder: 'YYYY-MM-DD' },
            { id: 'agent',          label: 'Agent Name(s)',    placeholder: 'e.g. AgentA, AgentB' },
            { id: 'agentCredit',    label: 'Agent Credit',     placeholder: 'e.g. 1000', type: 'number' }
          ]
        },
        { id: 'sa_config', name: 'Agent Config',   mode: 'manual', sample: 'AGNT-814', board: 'AGNT', suggestedAssignee: 'Mark Chu',  extra: [] },
        { id: 'sa_agent',  name: 'Onboard Agent',  mode: 'clone',  sample: 'AGNT-815', board: 'AGNT', suggestedAssignee: 'Susan Huang',
          extra: [
            { id: 'domain', label: 'Client Domain', placeholder: 'e.g. client.com' }
          ]
        }
      ]},
      { cat: 'OJM', items: [
        { id: 'ojm_enable', name: 'Enable OJM',             mode: 'manual', sample: 'PHXX-6251', board: 'PHXX', suggestedAssignee: 'Shiv',
          extra: [
            { id: 'botId', label: 'Bot ID', placeholder: 'Provided by client' }
          ]
        },
        { id: 'ojm_feat',   name: 'OJM Feature Enablement', mode: 'clone',  sample: 'PHXX-6252', board: 'PHXX', extra: [] }
      ]}
    ],
    BB: [
      { cat: 'Compulsory', items: [
        { id: 'bb_onboard', name: 'BotBonnie Onboard Ticket', mode: 'manual_clone', sample: 'BBT-7539', extra: [
          { id: 'organizationId', label: 'Organization ID', placeholder: 'e.g. org-xxx' },
          { id: 'botId', label: 'Bot ID', placeholder: 'e.g. bot-xxx' }
        ] }
      ] }
    ],
    AIRIS: [
      { cat: 'Compulsory', items: [
        { id: 'airis_onboard', name: 'Onboard AIRIS', mode: 'manual', sample: 'AR-1000', extra: [] }
      ]},
      { cat: 'Platform Link', items: [
        { id: 'airis_enterprise', name: 'Onboard AR to Enterprise Console', mode: 'clone', sample: 'AR-1001', extra: [] }
      ]}
    ]
  };

  var feW = {};
  /* ---- Repo-managed catalog: AIQUA is loaded from feature-catalog.json ---- */
  var FE_CATALOG_SOURCE = 'built-in';
  fetch('feature-catalog.json?v=' + Date.now())
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (cat) {
      if (cat) {
        Object.keys(cat).forEach(function (pk) {
          if (pk === '_meta' || !Array.isArray(cat[pk]) || !cat[pk].length) return;
          var byId = {};
          cat[pk].forEach(function (c) { (c.items || []).forEach(function (f) { byId[f.id] = 1; }); });
          var keepCats = (FE_CATALOG[pk] || []).map(function (c) {
            return { cat: c.cat, items: (c.items || []).filter(function (f) { return !byId[f.id]; }) };
          }).filter(function (c) { return c.items.length; });
          FE_CATALOG[pk] = cat[pk].concat(keepCats);
          FE_CATALOG_SOURCE = 'feature-catalog.json';
          console.log('[feature-enable] ' + pk + ' catalog loaded (' + cat[pk].reduce(function (t, c) { return t + (c.items || []).length; }, 0) + ' features)');
        });
      }
    })
    .catch(function (e) { console.warn('[feature-enable] catalog json not loaded, using built-in:', e.message); });
  var feAsnUsers = null;
  window.feAsnEnsure = function () {
    if (feAsnUsers) return;
    var list = document.getElementById('feAsnList');
    if (list) list.innerHTML = '<div style="font-size:.75rem;color:var(--muted);padding:4px;">Loading users\u2026</div>';
    Promise.resolve()
      .then(function () { return window.getAccessToken(); })
      .then(function (tok) { return window.fetchAccessibleResources(tok).then(function (res) { return { tok: tok, cloudId: res[0].id }; }); })
      .then(function (auth) {
        return fetch('https://api.atlassian.com/ex/jira/' + auth.cloudId + '/rest/api/3/user/search?query=&maxResults=100', { headers: { Authorization: 'Bearer ' + auth.tok, Accept: 'application/json' } }).then(function (r) { return r.json(); });
      })
      .then(function (data) {
        feAsnUsers = (Array.isArray(data) ? data : []).filter(function (u) { return u.accountType === 'atlassian' && u.active !== false; });
        window.feAsnFilter((document.getElementById('feAsnSearch') || {}).value || '');
      })
      .catch(function (e) {
        var l2 = document.getElementById('feAsnList');
        if (l2) l2.innerHTML = '<div style="font-size:.75rem;color:#dc2626;padding:4px;">' + esc(e.message) + '</div>';
      });
  };
  var feAsnTimer = null;
  function feAsnAuth() {
    return Promise.resolve()
      .then(function () { return window.getAccessToken(); })
      .then(function (tok) { return window.fetchAccessibleResources(tok).then(function (res) { return { tok: tok, cloudId: res[0].id }; }); });
  }
  function feAsnRender(users, q) {
    var list = document.getElementById('feAsnList');
    if (!list) return;
    var ql = (q || '').toLowerCase();
    var m = users.filter(function (u) { return !ql || (u.displayName || '').toLowerCase().indexOf(ql) > -1; }).slice(0, 15);
    list.innerHTML = m.map(function (u) {
      var on = feW.assignee && feW.assignee.accountId === u.accountId;
      return '<div style="padding:5px 8px;cursor:pointer;border-radius:6px;font-size:.8rem;' + (on ? 'background:rgba(99,102,241,.18);' : '') + '" data-aid="' + esc(u.accountId) + '" onclick="feAsnPick(this.dataset.aid)">' + esc(u.displayName) + '</div>';
    }).join('') || '<div style="font-size:.75rem;color:var(--muted);padding:4px;">No match</div>';
  }
  function feAsnServerSearch(q) {
    var list = document.getElementById('feAsnList');
    if (list) list.innerHTML = '<div style="font-size:.75rem;color:var(--muted);padding:4px;">Searching\u2026</div>';
    feAsnAuth()
      .then(function (auth) {
        return fetch('https://api.atlassian.com/ex/jira/' + auth.cloudId + '/rest/api/3/user/search?query=' + encodeURIComponent(q) + '&maxResults=50', { headers: { Authorization: 'Bearer ' + auth.tok, Accept: 'application/json' } }).then(function (r) { return r.json(); });
      })
      .then(function (data) {
        var users = (Array.isArray(data) ? data : []).filter(function (u) { return u.accountType === 'atlassian' && u.active !== false; });
        feAsnUsers = feAsnUsers || [];
        users.forEach(function (u) { if (!feAsnUsers.some(function (x) { return x.accountId === u.accountId; })) feAsnUsers.push(u); });
        feAsnRender(users, '');
      })
      .catch(function (e) { var l2 = document.getElementById('feAsnList'); if (l2) l2.innerHTML = '<div style="font-size:.75rem;color:#dc2626;padding:4px;">' + esc(e.message) + '</div>'; });
  }
  window.feAsnFilter = function (q) {
    q = (q || '').trim();
    if (q.length >= 2) {
      clearTimeout(feAsnTimer);
      feAsnTimer = setTimeout(function () { feAsnServerSearch(q); }, 250);
      return;
    }
    clearTimeout(feAsnTimer);
    feAsnRender(feAsnUsers || [], q);
  };
    window.feAsnPick = function (aid) {
    var u = (feAsnUsers || []).filter(function (x) { return x.accountId === aid; })[0];
    feW.assignee = u ? { accountId: u.accountId, displayName: u.displayName } : null;
    var selEl = document.getElementById('feAsnSel');
    if (selEl) selEl.textContent = u ? '\u2713 Assignee: ' + u.displayName : '';
    var inpEl = document.getElementById('feAsnSearch');
    if (inpEl && u) inpEl.value = u.displayName;
    var listEl = document.getElementById('feAsnList');
    if (listEl && u) listEl.innerHTML = '';
  };



  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getAllItems(platform) {
    var result = [];
    (FE_CATALOG[platform] || []).forEach(function(c){ c.items.forEach(function(f){ result.push(f); }); });
    return result;
  }

  function getSelected(platform) {
    return getAllItems(platform).filter(function(f){ return feW.sel[f.id]; });
  }

  /* \u2500\u2500 public API \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  window.openFeatureEnableWizard = function () {
    feW = { step: 0, platform: null, clientName: '', appId: '', sel: {}, extraFields: {} };
    document.getElementById('feOverlay').style.display = 'flex';
    feRender();
  };

  window.closeFeWizard = function () {
    document.getElementById('feOverlay').style.display = 'none';
  };
  window.closeFEWizard = window.closeFeWizard; // alias — some markup used the FE casing

  window.fePickPlatform = function (p) {
    feW.platform = p;
    feW.assignee = null; feAsnUsers = null;
    document.querySelectorAll('.fe-platform-card').forEach(function(c){
      c.classList.toggle('fe-selected', c.dataset.p === p);
    });
    var nxt = document.querySelector('#feFooter .wiz-btn-pri');
    if (nxt) nxt.removeAttribute('disabled');
  };

  window.feSetClientName = function (v) { feW.clientName = v; };
  window.feSetAppId      = function (v) { feW.appId      = v; };

  window.feToggleFeat = function (id) {
    feW.sel[id] = !feW.sel[id];
    var item = document.querySelector('.fe-feat-item[data-id="' + id + '"]');
    if (!item) return;
    item.classList.toggle('fe-row-on', !!feW.sel[id]);
    var cb = item.querySelector('.fe-feat-cb');
    if (cb) {
      cb.classList.toggle('fe-cb-on', !!feW.sel[id]);
      cb.textContent = '';
    }
  };

  window.setFeatExtra = function (fid, eid, val) {
    if (!feW.extraFields[fid]) feW.extraFields[fid] = {};
    feW.extraFields[fid][eid] = val;
  };

  window.feNext = function () {
    if (feW.step === 1 && (!feW.clientName.trim() || !feW.appId.trim())) {
      alert('Please fill in Client Name and App ID.');
      return;
    }
    if (feW.step === 2 && !getSelected(feW.platform).length) {
      alert('Please select at least one feature.');
      return;
    }
    feW.step++;
    feRender();
  };

  window.feBack = function () {
    feW.step--;
    feRender();
  };

  window.feCreate = function () {
    var selected = getSelected(feW.platform);
    if (!selected.length) { alert('No features selected.'); return; }
    var btn = document.getElementById('feCreateBtn');
    if (btn) { btn.disabled = true; btn.textContent = '\u23f3 Creating...'; }
    var created = [], failed = [];
    Promise.resolve()
      .then(function () { return window.getAccessToken(); })
      .then(function (tok) {
        return window.fetchAccessibleResources(tok).then(function (res) {
          return { tok: tok, cloudId: res[0].id };
        });
      })
      .then(function (auth) {
        var tok = auth.tok, cloudId = auth.cloudId;
        var chain = Promise.resolve();
        selected.forEach(function (f) {
          chain = chain.then(function () {
            var extras = feW.extraFields[f.id] || {};
            var extraLines = (f.extra || []).map(function(ex){
              return ex.label + ': ' + (extras[ex.id] || '\u2014');
            }).join('\n');
            var summary = '[Feature Enable] ' + feW.clientName + ' \u00b7 ' + feW.platform + ' \u00b7 ' + f.name;
            var body = {
              fields: {
                project: { key: 'ETS' },
                summary: summary,
                description: {
                  type: 'doc', version: 1,
                  content: [{ type: 'paragraph', content: [{ type: 'text',
                    text: 'Feature enable request.\n\nClient: ' + feW.clientName
                        + '\nApp ID: ' + feW.appId
                        + '\nPlatform: ' + feW.platform
                        + '\nFeature: ' + f.name
                        + (f.sample ? '\nSample ticket: ' + f.sample : '')
                        +
                  (f.maturity ? '\nMaturity: ' + f.maturity : '') +
                  (f.pmApproval ? '\nPM approval: required (get PM sign-off)' : '') +
                  (f.paid ? '\nPaid module: confirm contract scope' : '') + (extraLines ? '\n\n' + extraLines : '')
                        + '\n\nRequested via CSM Dashboard.'
                  }] }]
                },
                issuetype: { name: 'Service Request' }
              }
            };
            if (feW.assignee) { body.fields.assignee = { accountId: feW.assignee.accountId }; }
            return fetch('https://api.atlassian.com/ex/jira/' + cloudId + '/rest/api/3/issue', {
              method: 'POST',
              headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify(body)
            })
            .then(function(r){ return r.json(); })
            .then(function(d){ if (d.key) { created.push(d.key); f._ticketKey = d.key; } else { failed.push(f.name); } })
            .catch(function(){ failed.push(f.name); });
          });
        });
        return chain;
      })
      .then(function () {
        if (created.length && window.addOnboarding) {
          try {
            window.addOnboarding({
              id: 'fe_' + Date.now(),
              platform: feW.platform,
              clientName: feW.clientName,
              type: 'feature-enable',
              onboardTicketKey: created[0],
              createdAt: new Date().toISOString().slice(0, 10),
              appId: feW.appId,
              features: selected.filter(function (f) { return f._ticketKey; }).map(function (f) {
                return { name: f.name, featureId: f.id, ticketKey: f._ticketKey, board: 'ETS', mode: f.mode || 'clone', manual: (f.mode === 'manual' || f.mode === 'manual_clone'), status: 'Backlog' };
              })
            });
            if (window.renderOnboardingProgress) window.renderOnboardingProgress();
            if (window.loadTickets) window.loadTickets();
          } catch (e) { console.warn('[feature-enable] tracking record failed:', e.message); }
        }
        feShowResult(created, failed);
      })
      .catch(function(err){
        document.getElementById('feBody').innerHTML =
          '<div style="text-align:center;padding:20px;color:var(--red)">\u26a0\ufe0f Auth error: ' + esc(err.message) + '</div>';
        document.getElementById('feFooter').innerHTML =
          '<button class="wiz-btn-pri" onclick="closeFeWizard()">Close</button>';
      });
  };

  /* \u2500\u2500 private helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  function feRender() {
    var pcts   = [12, 37, 63, 88];
    var titles = ['Select Platform', 'Client Details',
                  feW.platform ? feW.platform + ' \u2014 Select Features' : 'Select Features',
                  'Preview & Create'];
    var labels = ['Step 1 / 4', 'Step 2 / 4', 'Step 3 / 4', 'Step 4 / 4'];
    document.getElementById('feProgressBar').style.width = pcts[feW.step] + '%';
    document.getElementById('feTitle').textContent       = titles[feW.step];
    document.getElementById('feStepInd').textContent     = labels[feW.step];
    [fePlatformStep, feDetailsStep, feFeaturesStep, fePreviewStep][feW.step]();
  }

  function fePlatformStep() {
    var platforms = [
      ['AIQUA', 'Customer Engagement',   '\u{1f3af}', false],
      ['AIRIS', 'Customer Data Platform', '\u{1f52e}', false],
      ['BB', 'BotBonnie', '\u{1f916}', false],
      ['AIXON', 'Enterprise AI', '\ud83e\udde0', true]
    ];
    var cards = platforms.map(function(p) {
      var dis = p[3];
      var sel = feW.platform === p[0] ? ' fe-selected' : '';
      return '<div class="fe-platform-card' + sel + (dis ? ' fe-disabled' : '') + '" data-p="' + p[0] + '"'
        + (dis ? '' : ' onclick="window.fePickPlatform(\'' + p[0] + '\')"') + '>'
        + '<div style="font-size:1.8rem;margin-bottom:8px">' + p[2] + '</div>'
        + '<div style="font-weight:700">' + p[0] + '</div>'
        + '<div style="font-size:.75rem;color:var(--muted);margin-top:4px">' + p[1] + '</div>'
        + (dis ? '<div style="font-size:.7rem;color:var(--muted);margin-top:6px;font-weight:600">Coming soon</div>' : '')
        + '</div>';
    }).join('');
    document.getElementById('feBody').innerHTML =
      '<p style="color:var(--muted);font-size:.87rem;margin-bottom:16px">Select the platform to enable features for.</p>'
      + '<div class="fe-platform-grid">' + cards + '</div>';
    document.getElementById('feFooter').innerHTML =
      '<button class="wiz-btn-sec" onclick="closeFeWizard()">Cancel</button>'
      + '<button class="wiz-btn-pri" onclick="feNext()"' + (feW.platform ? '' : ' disabled') + '>Next \u2192</button>';
  }

  function feDetailsStep() {
    document.getElementById('feBody').innerHTML =
      '<div class="wiz-field-group" style="margin-bottom:18px">'
      + '<label class="wiz-label">Client Name <span style="color:var(--red)">*</span></label>'
      + '<input class="wiz-input" id="feClientName" placeholder="e.g. Mannings HK" value="' + esc(feW.clientName) + '" oninput="window.feSetClientName(this.value)">'
      + '</div>'
      + '<div class="wiz-field-group">'
      + '<label class="wiz-label">App ID <span style="color:var(--red)">*</span></label>'
      + '<input class="wiz-input" id="feAppId" placeholder="e.g. 12345" value="' + esc(feW.appId) + '" oninput="window.feSetAppId(this.value)">'
      + '</div>';
    document.getElementById('feBody').innerHTML += '' +
      '<label class="wiz-label" style="display:block;margin-top:14px;">Assignee (optional)</label>' +
      '<input class="wiz-input" type="text" id="feAsnSearch" placeholder="Search assignee\u2026" autocomplete="off" oninput="feAsnFilter(this.value)" onfocus="feAsnEnsure()">' +
      '<div id="feAsnList" style="max-height:150px;overflow-y:auto;margin-top:4px;"></div>' +
      '<div id="feAsnSel" style="font-size:.75rem;margin-top:4px;color:var(--accent);">' + (feW.assignee ? '\u2713 Assignee: ' + esc(feW.assignee.displayName) : '') + '</div>';
    document.getElementById('feFooter').innerHTML =
      '<button class="wiz-btn-sec" onclick="feBack()">\u2190 Back</button>'
      + '<button class="wiz-btn-pri" onclick="feNext()">Next \u2192</button>';
    setTimeout(function(){ var el = document.getElementById('feClientName'); if(el) el.focus(); }, 50);
  }

  function buildFeatItem(f) {
    var sel      = !!feW.sel[f.id];
    var isManual = f.mode === 'manual' || f.mode === 'manual_clone';
    var badge    = isManual
      ? '<span class="fe-badge-manual">\u26a0 manual</span>'
      : '<span class="fe-badge-clone">clone</span>';
    if (f.maturity && !/^production$/i.test(f.maturity)) badge += '<span class="fe-badge-mat">' + esc(f.maturity) + '</span>';
    if (f.pmApproval) badge += '<span class="fe-badge-pm">PM</span>';
    if (f.paid) badge += '<span class="fe-badge-paid">$</span>';

    var extraHtml = '';
    if (f.extra && f.extra.length) {
      extraHtml = f.extra.map(function(ex) {
        var val = ((feW.extraFields[f.id] || {})[ex.id] || '');
        return '<div>'
          + '<label class="wiz-label" style="font-size:.72rem;margin-bottom:3px">' + esc(ex.label) + '</label>'
          + '<input class="wiz-input" type="' + (ex.type || 'text') + '"'
          + ' placeholder="' + esc(ex.placeholder || '') + '"'
          + ' value="' + esc(val) + '"'
          + ' oninput="window.setFeatExtra(\'' + f.id + '\',\'' + ex.id + '\',this.value)"'
          + (ex.type === 'number' ? ' min="0"' : '')
          + '></div>';
      }).join('');
    }

    var hintHtml = '';
    if (f.sample) {
      var link = '<a href="https://appier.atlassian.net/browse/' + f.sample + '" target="_blank">' + f.sample + '</a>';
      hintHtml += isManual
        ? '<p class="fe-hint">\u26a0\ufe0f Manual update required after creation \u2014 clone from ' + link + '.</p>'
        : '<p class="fe-hint">\u{1f4cb} Will clone from ' + link + '.</p>';
    }
    if (f.suggestedAssignee) {
      hintHtml += '<p class="fe-hint" style="color:var(--accent)">\u{1f4a1} Suggested assignee: <strong>' + esc(f.suggestedAssignee) + '</strong></p>';
    }
    if (f.maturity && !/^production$/i.test(f.maturity)) hintHtml += '<p class="fe-hint" style="color:#b45309;">\u26a0 ' + esc(f.maturity) + ' \u2014 \u63d0\u9192\uff1a\u5efa\u7968\u524d\u5148\u53d6\u5f97 PM \u540c\u610f</p>';
    else if (f.pmApproval) hintHtml += '<p class="fe-hint" style="color:#b45309;">\u26a0 \u9700 PM \u6838\u51c6 \u2014 \u63d0\u9192\uff1a\u5efa\u7968\u524d\u5148\u77e5\u6703 PM</p>';
    if (f.paid) hintHtml += '<p class="fe-hint" style="color:#818cf8;">$ \u4ed8\u8cbb\u6a21\u7d44 \u2014 \u63d0\u9192\uff1a\u78ba\u8a8d\u5408\u7d04\u7bc4\u570d\u5305\u542b\u6b64\u529f\u80fd</p>';

    var hasExtra = !!(extraHtml || hintHtml);

    return '<div class="fe-feat-item' + (sel ? ' fe-row-on' : '') + '" data-id="' + f.id + '">'
      + '<div class="fe-feat-row" onclick="window.feToggleFeat(\'' + f.id + '\')">'
      + '<div class="fe-feat-cb' + (sel ? ' fe-cb-on' : '') + '">' + '' + '</div>'
      + '<span class="fe-feat-name">' + esc(f.name) + '</span>'
      + badge
      + '</div>'
      + (hasExtra ? '<div class="fe-feat-extra">' + extraHtml + hintHtml + '</div>' : '')
      + '</div>';
  }

  function feFeaturesStep() {
    var cats = FE_CATALOG[feW.platform] || [];
    var html = cats.map(function(cat) {
      return '<div class="fe-cat-header">' + esc(cat.cat) + '</div>'
        + cat.items.map(buildFeatItem).join('');
    }).join('');
    document.getElementById('feBody').innerHTML =
      '<p style="color:var(--muted);font-size:.82rem;margin-bottom:10px">Enabling for <strong>'
      + esc(feW.clientName) + '</strong> \u00b7 App <strong>' + esc(feW.appId) + '</strong></p>'
      + '<div class="fe-feat-list">' + html + '</div>';
    document.getElementById('feFooter').innerHTML =
      '<button class="wiz-btn-sec" onclick="feBack()">\u2190 Back</button>'
      + '<button class="wiz-btn-pri" onclick="feNext()">Review & Create \u2192</button>';
  }

  function fePreviewStep() {
    var selected = getSelected(feW.platform);
    var featRows = selected.map(function(f) {
      var extras     = feW.extraFields[f.id] || {};
      var isManual   = f.mode === 'manual' || f.mode === 'manual_clone';
      var badge      = isManual
        ? '<span class="fe-badge-manual" style="font-size:.65rem">\u26a0 manual</span>'
        : '<span class="fe-badge-clone" style="font-size:.65rem">clone</span>';
      var extraLines = (f.extra || []).filter(function(ex){ return extras[ex.id]; }).map(function(ex){
        return '<div>' + esc(ex.label) + ': <strong>' + esc(extras[ex.id]) + '</strong></div>';
      }).join('');
      return '<div class="fe-preview-feat-row">'
        + '<div class="fe-preview-feat-title">' + esc(f.name) + badge + '</div>'
        + (extraLines ? '<div class="fe-preview-feat-extra">' + extraLines + '</div>' : '')
        + '</div>';
    }).join('');
  var warnItems = selected.filter(function (f) { return f.pmApproval || f.paid || (f.maturity && !/^production$/i.test(f.maturity)); });
  if (warnItems.length) {
    featRows = '<div class="fe-warn-box">\u26a0 \u5efa\u7968\u524d\u63d0\u9192\uff1a' + warnItems.map(function (f) {
      var tags = [];
      if (f.maturity && !/^production$/i.test(f.maturity)) tags.push(f.maturity);
      if (f.pmApproval) tags.push('\u9700 PM \u6838\u51c6');
      if (f.paid) tags.push('\u4ed8\u8cbb\u6a21\u7d44\uff0c\u78ba\u8a8d\u5408\u7d04');
      return esc(f.name) + '\uff08' + tags.join('\u3001') + '\uff09';
    }).join('\uff1b') + '</div>' + featRows;
  }
    document.getElementById('feBody').innerHTML =
      '<div class="fe-preview-card">'
      + '<div class="fe-preview-row"><span class="fe-preview-label">Platform</span><span class="fe-preview-val">' + esc(feW.platform) + '</span></div>'
      + '<div class="fe-preview-row"><span class="fe-preview-label">Client</span><span class="fe-preview-val">' + esc(feW.clientName) + '</span></div>'
      + '<div class="fe-preview-row"><span class="fe-preview-label">App ID</span><span class="fe-preview-val">' + esc(feW.appId) + '</span></div>'
      + '</div>'
      + '<p style="color:var(--muted);font-size:.76rem;margin:14px 0 8px"><strong>' + selected.length
      + ' feature' + (selected.length !== 1 ? 's' : '') + '</strong> selected:</p>'
      + '<div class="fe-feat-list fe-feat-list-preview">' + featRows + '</div>'
      + '<p style="color:var(--muted);font-size:.76rem;margin-top:12px">One Jira ticket per feature. Track in the Issue Tracking tab.</p>';
    document.getElementById('feFooter').innerHTML =
      '<button class="wiz-btn-sec" onclick="feBack()">\u2190 Back</button>'
      + '<button class="wiz-btn-pri" id="feCreateBtn" onclick="feCreate()">\u{1f3ab} Create '
      + selected.length + ' Ticket' + (selected.length !== 1 ? 's' : '') + '</button>';
  }

  function feShowResult(created, failed) {
    document.getElementById('feBody').innerHTML =
      '<div style="text-align:center;padding:24px">'
      + '<div style="font-size:2.5rem;margin-bottom:12px">' + (created.length ? '\u2705' : '\u26a0\ufe0f') + '</div>'
      + '<div style="font-weight:700;font-size:1.05rem;margin-bottom:8px">'
      + created.length + ' ticket' + (created.length !== 1 ? 's' : '') + ' created'
      + (failed.length ? ' \u00b7 ' + failed.length + ' failed' : '') + '</div>'
      + '<div style="color:var(--accent);font-weight:600;margin-bottom:16px">' + created.map(function (k) { return '<a href="https://appier.atlassian.net/browse/' + k + '" target="_blank" style="color:inherit;">' + k + '</a>'; }).join(' \u00b7 ') + '</div>'
      + (failed.length ? '<div style="color:var(--red);font-size:.8rem;margin-bottom:12px">Failed: ' + failed.join(', ') + '</div>' : '')
      + '<div style="color:var(--muted);font-size:.82rem">Track progress for <strong>'
      + esc(feW.clientName) + '</strong> in the Issue Tracking tab.</div>'
      + '</div>';
    document.getElementById('feFooter').innerHTML =
      '<button class="wiz-btn-sec" onclick="closeFeWizard()">Close</button>'
      + '<button class="wiz-btn-pri" onclick="closeFeWizard();if(window.switchTab)window.switchTab(\'tracking\');if(window.renderOnboardingProgress)window.renderOnboardingProgress()">\u{1f4cb} Go to Tracking</button>';
    if (window.loadTickets) window.loadTickets();
  }

}());
