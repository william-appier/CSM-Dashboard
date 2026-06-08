/* Feature Enable Wizard — CSM Dashboard */
(function () {
  'use strict';

  var FE_FEATS = {
    AIQUA: [
      { id: 'push',      label: '📲 Push Notification', desc: 'Mobile & web push campaigns' },
      { id: 'inapp',     label: '💬 In-App Message',    desc: 'In-app banners and overlays' },
      { id: 'email',     label: '📧 Email Campaign',    desc: 'Automated email flows' },
      { id: 'sms',       label: '📱 SMS',               desc: 'Text message campaigns' },
      { id: 'webpush',   label: '🌐 Web Push',          desc: 'Browser push notifications' },
      { id: 'line',      label: '💚 LINE Message',       desc: 'LINE channel integration' },
      { id: 'segment',   label: '🎯 Segment Builder',   desc: 'Advanced audience segmentation' },
      { id: 'journey',   label: '🗺️ Journey Builder',   desc: 'Multi-step automation flows' },
      { id: 'abt',       label: '🧪 A/B Testing',       desc: 'Campaign variant testing' },
      { id: 'recommend', label: '✨ Recommendations',   desc: 'AI-powered product suggestions' }
    ],
    AIRIS: [
      { id: 'datasrc',  label: '🔌 Data Source Connect', desc: 'Connect external data sources' },
      { id: 'segment',  label: '🎯 Audience Segmentation', desc: 'CDP-powered audience building' },
      { id: 'c360',     label: '👤 Customer 360',        desc: 'Unified customer profile view' },
      { id: 'analytics',label: '📊 Analytics Dashboard', desc: 'Reporting and insights' },
      { id: 'export',   label: '📤 Data Export API',     desc: 'Programmatic data access' },
      { id: 'tracking', label: '🔍 Behavioral Tracking', desc: 'Event and action tracking' }
    ]
  };

  var feW = {};

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  window.openFeatureEnableWizard = function () {
    feW = { step: 0, platform: null, clientName: '', appId: '', selectedFeatures: {} };
    document.getElementById('feOverlay').style.display = 'flex';
    feRender();
  };
  window.closeFeWizard = function () { document.getElementById('feOverlay').style.display = 'none'; };
  window.fePickPlatform = function (p) { feW.platform = p; fePlatformStep(); };
  window.feToggleFeat = function (id) {
    feW.selectedFeatures[id] = !feW.selectedFeatures[id];
    var el = document.querySelector('.fe-feat-item[data-id="' + id + '"]');
    if (el) { el.classList.toggle('fe-active', !!feW.selectedFeatures[id]); }
  };
  window.feNext = function () {
    if (feW.step === 1 && (!feW.clientName.trim() || !feW.appId.trim())) { alert('Please fill in Client Name and App ID.'); return; }
    if (feW.step === 2 && !Object.keys(feW.selectedFeatures).some(function (k) { return feW.selectedFeatures[k]; })) { alert('Please select at least one feature.'); return; }
    if (feW.step < 3) { feW.step++; feRender(); }
  };
  window.feBack = function () { if (feW.step > 0) { feW.step--; feRender(); } };
  window.feCreate = function () {
    var feats = FE_FEATS[feW.platform] || [];
    var selected = feats.filter(function (f) { return feW.selectedFeatures[f.id]; });
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
        var tok = auth.tok;
        var cloudId = auth.cloudId;
        var chain = Promise.resolve();
        selected.forEach(function (f) {
          chain = chain.then(function () {
            var cleanLabel = f.label.replace(/^\S+\s/, '');
            var summary = '[Feature Enable] ' + feW.clientName + ' \u00b7 ' + feW.platform + ' \u00b7 ' + cleanLabel;
            var body = { fields: { project: { key: 'LEG' }, summary: summary,
              description: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{
                type: 'text',
                text: 'Feature enable request for ' + feW.clientName + ' (App ID: ' + feW.appId + ').\n\nPlatform: ' + feW.platform + '\nFeature: ' + f.label + '\n' + f.desc + '\n\nRequested via CSM Dashboard Feature Enable wizard.'
              }] }] },
              issuetype: { name: 'Task' } } };
            return fetch('https://api.atlassian.com/ex/jira/' + cloudId + '/rest/api/3/issue', {
              method: 'POST',
              headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify(body)
            }).then(function (r) { return r.json(); })
              .then(function (d) { if (d.key) { created.push(d.key); } else { failed.push(f.label); } })
              .catch(function () { failed.push(f.label); });
          });
        });
        return chain;
      })
      .then(function () { feShowResult(created, failed); })
      .catch(function (err) {
        document.getElementById('feBody').innerHTML = '<div style="text-align:center;padding:20px;color:var(--red)">⚠️ Auth error: ' + esc(err.message) + '</div>';
        document.getElementById('feFooter').innerHTML = '<button class="wiz-btn-pri" onclick="closeFeWizard()">Close</button>';
      });
  };

  function feRender() {
    var steps = [fePlatformStep, feDetailsStep, feFeaturesStep, fePreviewStep];
    var pct   = [12, 37, 63, 88];
    var titles = ['Select Platform', 'Client Details', 'Select Features', 'Preview & Create'];
    var labels = ['Step 1 / 4', 'Step 2 / 4', 'Step 3 / 4', 'Step 4 / 4'];
    document.getElementById('feProgressBar').style.width = pct[feW.step] + '%';
    document.getElementById('feTitle').textContent = titles[feW.step];
    document.getElementById('feStepInd').textContent = labels[feW.step];
    steps[feW.step]();
  }

  function mkPlatformCard(id, name, sub, emoji, disabled) {
    var sel = feW.platform === id ? ' fe-selected' : '';
    var dis = disabled ? ' fe-disabled' : '';
    var click = disabled ? '' : 'onclick="fePickPlatform(\'' + id + '\')"';
    return '<div class="fe-platform-card' + sel + dis + '" ' + click + '>' +
      '<div style="font-size:1.8rem;margin-bottom:8px">' + emoji + '</div>' +
      '<div style="font-weight:700">' + name + '</div>' +
      '<div style="font-size:.75rem;color:var(--muted);margin-top:4px">' + sub + '</div>' +
      (disabled ? '<div style="font-size:.7rem;color:var(--muted);margin-top:6px;font-weight:600">Coming soon</div>' : '') +
      '</div>';
  }

  function fePlatformStep() {
    document.getElementById('feBody').innerHTML =
      '<p style="color:var(--muted);font-size:.87rem;margin-bottom:4px">Select the platform to enable features for.</p>' +
      '<div class="fe-platform-grid">' +
        mkPlatformCard('AIQUA', 'AIQUA', 'Customer Engagement', '🎯', false) +
        mkPlatformCard('AIRIS', 'AIRIS', 'Customer Data Platform', '🔮', false) +
        mkPlatformCard('BB', 'BotBonnie', 'Conversational AI', '🤖', true) +
      '</div>';
    document.getElementById('feFooter').innerHTML =
      '<button class="wiz-btn-sec" onclick="closeFeWizard()">Cancel</button>' +
      '<button class="wiz-btn-pri" onclick="feNext()"' + (feW.platform ? '' : ' disabled') + '>Next →</button>';
  }

  function feDetailsStep() {
    document.getElementById('feBody').innerHTML =
      '<div class="wiz-field-group" style="margin-bottom:18px">' +
        '<label class="wiz-label">Client Name <span style="color:var(--red)">*</span></label>' +
        '<input class="wiz-input" id="feClientName" placeholder="e.g. Mannings HK" value="' + esc(feW.clientName) + '" oninput="feW.clientName=this.value">' +
      '</div>' +
      '<div class="wiz-field-group">' +
        '<label class="wiz-label">App ID <span style="color:var(--red)">*</span></label>' +
        '<input class="wiz-input" id="feAppId" placeholder="e.g. 12345" value="' + esc(feW.appId) + '" oninput="feW.appId=this.value">' +
      '</div>';
    document.getElementById('feFooter').innerHTML =
      '<button class="wiz-btn-sec" onclick="feBack()">← Back</button>' +
      '<button class="wiz-btn-pri" onclick="feNext()">Next →</button>';
    setTimeout(function () { var el = document.getElementById('feClientName'); if (el) { el.focus(); } }, 50);
  }

  function feFeaturesStep() {
    var feats = FE_FEATS[feW.platform] || [];
    var cards = feats.map(function (f) {
      return '<div class="fe-feat-item' + (feW.selectedFeatures[f.id] ? ' fe-active' : '') +
        '" data-id="' + f.id + '" onclick="feToggleFeat(\'' + f.id + '\')">' +
        '<div style="font-weight:600;font-size:.88rem">' + f.label + '</div>' +
        '<div style="font-size:.74rem;color:var(--muted);margin-top:3px">' + f.desc + '</div>' +
        '</div>';
    }).join('');
    document.getElementById('feBody').innerHTML =
      '<p style="color:var(--muted);font-size:.82rem;margin-bottom:12px">Enabling for <strong>' +
      esc(feW.clientName) + '</strong> · ' + feW.platform + ' · App <strong>' + esc(feW.appId) + '</strong></p>' +
      '<div class="fe-feat-grid">' + cards + '</div>';
    document.getElementById('feFooter').innerHTML =
      '<button class="wiz-btn-sec" onclick="feBack()">← Back</button>' +
      '<button class="wiz-btn-pri" onclick="feNext()">Preview →</button>';
  }

  function fePreviewStep() {
    var feats = FE_FEATS[feW.platform] || [];
    var selected = feats.filter(function (f) { return feW.selectedFeatures[f.id]; });
    document.getElementById('feBody').innerHTML =
      '<div class="fe-preview-card">' +
        '<div class="fe-preview-row"><span class="fe-preview-label">Platform</span><span class="fe-preview-val">' + feW.platform + '</span></div>' +
        '<div class="fe-preview-row"><span class="fe-preview-label">Client</span><span class="fe-preview-val">' + esc(feW.clientName) + '</span></div>' +
        '<div class="fe-preview-row"><span class="fe-preview-label">App ID</span><span class="fe-preview-val">' + esc(feW.appId) + '</span></div>' +
        '<div class="fe-preview-row"><span class="fe-preview-label">Features (' + selected.length + ')</span>' +
          '<span class="fe-preview-val" style="font-size:.82rem">' + (selected.map(function (f) { return f.label; }).join(', ') || '—') + '</span></div>' +
      '</div>' +
      '<p style="color:var(--muted);font-size:.8rem;margin-top:14px">One Jira ticket per feature linked to <strong>' +
      esc(feW.clientName) + '</strong>. Track in the Issue Tracking tab.</p>';
    document.getElementById('feFooter').innerHTML =
      '<button class="wiz-btn-sec" onclick="feBack()">← Back</button>' +
      '<button class="wiz-btn-pri" id="feCreateBtn" onclick="feCreate()">' +
      '🎫 Create ' + selected.length + ' Ticket' + (selected.length !== 1 ? 's' : '') + '</button>';
  }

  function feShowResult(created, failed) {
    document.getElementById('feBody').innerHTML =
      '<div style="text-align:center;padding:24px">' +
        '<div style="font-size:2.5rem;margin-bottom:12px">' + (created.length ? '✅' : '⚠️') + '</div>' +
        '<div style="font-weight:700;font-size:1.05rem;margin-bottom:8px">' +
          created.length + ' ticket' + (created.length !== 1 ? 's' : '') + ' created' +
          (failed.length ? ' · ' + failed.length + ' failed' : '') +
        '</div>' +
        '<div style="color:var(--accent);font-weight:600;margin-bottom:16px">' + created.join(' · ') + '</div>' +
        (failed.length ? '<div style="color:var(--red);font-size:.8rem;margin-bottom:12px">Failed: ' + failed.join(', ') + '</div>' : '') +
        '<div style="color:var(--muted);font-size:.82rem">Track progress for <strong>' +
          esc(feW.clientName) + '</strong> in the Issue Tracking tab.</div>' +
      '</div>';
    document.getElementById('feFooter').innerHTML =
      '<button class="wiz-btn-sec" onclick="closeFeWizard()">Close</button>' +
      '<button class="wiz-btn-pri" onclick="closeFeWizard();var t=document.getElementById(\'tab-tracking\');if(t)t.click()">' +
      '📋 Go to Tracking</button>';
    if (window.loadTickets) { window.loadTickets(); }
  }
}());
