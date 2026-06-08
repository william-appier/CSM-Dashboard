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
    '.fe-badge-manual{font-size:.7rem;padding:2px 8px;border-radius:4px;background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid rgba(245,158,11,.3);flex-shrink:0;font-family:"DM Mono",monospace}',
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

/* Feature Enable Wizard v4 — CSM Dashboard */
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

  /* ── public API ─────────────────────────────────────── */
  window.openFeatureEnableWizard = function () {
    feW = { step: 0, platform: null, clientName: '', appId: '', sel: {}, extraFields: {} };
    document.getElementById('feOverlay').style.display = 'flex';
    feRender();
  };

  window.closeFeWizard = function () {
    document.getElementById('feOverlay').style.display = 'none';
  };

  window.fePickPlatform = function (p) {
    feW.platform = p;
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
      cb.textContent = feW.sel[id] ? '✓' : '';
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
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Creating...'; }
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
              return ex.label + ': ' + (extras[ex.id] || '—');
            }).join('\n');
            var summary = '[Feature Enable] ' + feW.clientName + ' · ' + feW.platform + ' · ' + f.name;
            var body = {
              fields: {
                project: { key: 'LEG' },
                summary: summary,
                description: {
                  type: 'doc', version: 1,
                  content: [{ type: 'paragraph', content: [{ type: 'text',
                    text: 'Feature enable request.\n\nClient: ' + feW.clientName
                        + '\nApp ID: ' + feW.appId
                        + '\nPlatform: ' + feW.platform
                        + '\nFeature: ' + f.name
                        + (f.sample ? '\nSample ticket: ' + f.sample : '')
                        + (extraLines ? '\n\n' + extraLines : '')
                        + '\n\nRequested via CSM Dashboard.'
                  }] }]
                },
                issuetype: { name: 'Task' }
              }
            };
            return fetch('https://api.atlassian.com/ex/jira/' + cloudId + '/rest/api/3/issue', {
              method: 'POST',
              headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify(body)
            })
            .then(function(r){ return r.json(); })
            .then(function(d){ if (d.key) { created.push(d.key); } else { failed.push(f.name); } })
            .catch(function(){ failed.push(f.name); });
          });
        });
        return chain;
      })
      .then(function(){ feShowResult(created, failed); })
      .catch(function(err){
        document.getElementById('feBody').innerHTML =
          '<div style="text-align:center;padding:20px;color:var(--red)">⚠️ Auth error: ' + esc(err.message) + '</div>';
        document.getElementById('feFooter').innerHTML =
          '<button class="wiz-btn-pri" onclick="closeFeWizard()">Close</button>';
      });
  };

  /* ── private helpers ─────────────────────────────────── */
  function feRender() {
    var pcts   = [12, 37, 63, 88];
    var titles = ['Select Platform', 'Client Details',
                  feW.platform ? feW.platform + ' — Select Features' : 'Select Features',
                  'Preview & Create'];
    var labels = ['Step 1 / 4', 'Step 2 / 4', 'Step 3 / 4', 'Step 4 / 4'];
    document.getElementById('feProgressBar').style.width = pcts[feW.step] + '%';
    document.getElementById('feTitle').textContent       = titles[feW.step];
    document.getElementById('feStepInd').textContent     = labels[feW.step];
    [fePlatformStep, feDetailsStep, feFeaturesStep, fePreviewStep][feW.step]();
  }

  function fePlatformStep() {
    var platforms = [
      ['AIQUA', 'Customer Engagement',   '🎯', false],
      ['AIRIS', 'Customer Data Platform', '🔮', false],
      ['BB',    'BotBonnie',              '🤖', true ]
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
      + '<button class="wiz-btn-pri" onclick="feNext()"' + (feW.platform ? '' : ' disabled') + '>Next →</button>';
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
    document.getElementById('feFooter').innerHTML =
      '<button class="wiz-btn-sec" onclick="feBack()">← Back</button>'
      + '<button class="wiz-btn-pri" onclick="feNext()">Next →</button>';
    setTimeout(function(){ var el = document.getElementById('feClientName'); if(el) el.focus(); }, 50);
  }

  function buildFeatItem(f) {
    var sel      = !!feW.sel[f.id];
    var isManual = f.mode === 'manual' || f.mode === 'manual_clone';
    var badge    = isManual
      ? '<span class="fe-badge-manual">⚠ manual</span>'
      : '<span class="fe-badge-clone">clone</span>';

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
        ? '<p class="fe-hint">⚠️ Manual update required after creation — clone from ' + link + '.</p>'
        : '<p class="fe-hint">📋 Will clone from ' + link + '.</p>';
    }
    if (f.suggestedAssignee) {
      hintHtml += '<p class="fe-hint" style="color:var(--accent)">💡 Suggested assignee: <strong>' + esc(f.suggestedAssignee) + '</strong></p>';
    }

    var hasExtra = !!(extraHtml || hintHtml);

    return '<div class="fe-feat-item' + (sel ? ' fe-row-on' : '') + '" data-id="' + f.id + '">'
      + '<div class="fe-feat-row" onclick="window.feToggleFeat(\'' + f.id + '\')">'
      + '<div class="fe-feat-cb' + (sel ? ' fe-cb-on' : '') + '">' + (sel ? '✓' : '') + '</div>'
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
      + esc(feW.clientName) + '</strong> · App <strong>' + esc(feW.appId) + '</strong></p>'
      + '<div class="fe-feat-list">' + html + '</div>';
    document.getElementById('feFooter').innerHTML =
      '<button class="wiz-btn-sec" onclick="feBack()">← Back</button>'
      + '<button class="wiz-btn-pri" onclick="feNext()">Review & Create →</button>';
  }

  function fePreviewStep() {
    var selected = getSelected(feW.platform);
    var featRows = selected.map(function(f) {
      var extras     = feW.extraFields[f.id] || {};
      var isManual   = f.mode === 'manual' || f.mode === 'manual_clone';
      var badge      = isManual
        ? '<span class="fe-badge-manual" style="font-size:.65rem">⚠ manual</span>'
        : '<span class="fe-badge-clone" style="font-size:.65rem">clone</span>';
      var extraLines = (f.extra || []).filter(function(ex){ return extras[ex.id]; }).map(function(ex){
        return '<div>' + esc(ex.label) + ': <strong>' + esc(extras[ex.id]) + '</strong></div>';
      }).join('');
      return '<div class="fe-preview-feat-row">'
        + '<div class="fe-preview-feat-title">' + esc(f.name) + badge + '</div>'
        + (extraLines ? '<div class="fe-preview-feat-extra">' + extraLines + '</div>' : '')
        + '</div>';
    }).join('');
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
      '<button class="wiz-btn-sec" onclick="feBack()">← Back</button>'
      + '<button class="wiz-btn-pri" id="feCreateBtn" onclick="feCreate()">🎫 Create '
      + selected.length + ' Ticket' + (selected.length !== 1 ? 's' : '') + '</button>';
  }

  function feShowResult(created, failed) {
    document.getElementById('feBody').innerHTML =
      '<div style="text-align:center;padding:24px">'
      + '<div style="font-size:2.5rem;margin-bottom:12px">' + (created.length ? '✅' : '⚠️') + '</div>'
      + '<div style="font-weight:700;font-size:1.05rem;margin-bottom:8px">'
      + created.length + ' ticket' + (created.length !== 1 ? 's' : '') + ' created'
      + (failed.length ? ' · ' + failed.length + ' failed' : '') + '</div>'
      + '<div style="color:var(--accent);font-weight:600;margin-bottom:16px">' + created.join(' · ') + '</div>'
      + (failed.length ? '<div style="color:var(--red);font-size:.8rem;margin-bottom:12px">Failed: ' + failed.join(', ') + '</div>' : '')
      + '<div style="color:var(--muted);font-size:.82rem">Track progress for <strong>'
      + esc(feW.clientName) + '</strong> in the Issue Tracking tab.</div>'
      + '</div>';
    document.getElementById('feFooter').innerHTML =
      '<button class="wiz-btn-sec" onclick="closeFeWizard()">Close</button>'
      + '<button class="wiz-btn-pri" onclick="closeFeWizard();var t=document.getElementById(\'tab-tracking\');if(t)t.click()">📋 Go to Tracking</button>';
    if (window.loadTickets) window.loadTickets();
  }

}());