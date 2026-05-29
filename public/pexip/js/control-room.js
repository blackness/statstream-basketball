// ══════════════════════════════════════════════════════════════
// CONTROL ROOM
// ══════════════════════════════════════════════════════════════

const CTRL_DEBUG = false;

let ctrlSites = [],
    ctrlLaunched = false,
    ctrlSysLocations = [],
    ctrlConferenceAlias = '',
    ctrlCallType = 'video',
    ctrlRefreshTimer = null,
    ctrlRefreshing = false,
    ctrlLastSyncAt = null,
    ctrlSyncState = 'idle',   // idle | syncing | live | error
    ctrlSyncError = '',
    ctrlActivity = [],
    ctrlSelected = new Set();

function ctrlNowTime(){
  return new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
}

function addCtrlActivity(msg, kind = 'info'){
  ctrlActivity.unshift({
    ts: ctrlNowTime(),
    msg,
    kind
  });
  ctrlActivity = ctrlActivity.slice(0, 60);
  renderCtrlActivity();
}

function renderCtrlActivity(){
  const el = document.getElementById('ctrlActivityLog');
  if(!el) return;

  if(!ctrlActivity.length){
    el.innerHTML = `<div style="font-size:12px;color:var(--text3)">No activity yet.</div>`;
    return;
  }

  el.innerHTML = ctrlActivity.map(a => `
    <div style="display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:11px;color:var(--text3);font-family:'IBM Plex Mono',monospace;min-width:64px">${a.ts}</div>
      <div style="font-size:12.5px;color:${a.kind==='error'?'var(--red)':a.kind==='success'?'var(--teal)':'var(--text)'}">${a.msg}</div>
    </div>
  `).join('');
}

function selectedCtrlIndexes(){
  return Array.from(ctrlSelected).filter(i => i >= 0 && i < ctrlSites.length);
}

function isCtrlSelected(i){
  return ctrlSelected.has(i);
}

function toggleCtrlSelection(i, checked){
  if(checked) ctrlSelected.add(i);
  else ctrlSelected.delete(i);
}

function syncCtrlSelectedAfterRender(){
  const valid = new Set();
  Array.from(ctrlSelected).forEach(i => {
    if(i >= 0 && i < ctrlSites.length) valid.add(i);
  });
  ctrlSelected = valid;
}

function ctrlOriginBadge(site){
  const origin = site.origin || (site.type === 'live' ? 'live' : 'manual');

  if(origin === 'live'){
    return `<span style="font-size:10px;font-weight:700;letter-spacing:.04em;padding:1px 7px;border-radius:20px;background:var(--teal-bg);color:var(--teal-dark)">LIVE</span>`;
  }
  if(origin === 'template'){
    return `<span style="font-size:10px;font-weight:700;letter-spacing:.04em;padding:1px 7px;border-radius:20px;background:#EEF4FF;color:#275DAD;border:1px solid #D6E4FF">TEMPLATE</span>`;
  }
  return `<span style="font-size:10px;font-weight:700;letter-spacing:.04em;padding:1px 7px;border-radius:20px;background:var(--surface2);color:var(--text3);border:1px solid var(--border)">MANUAL</span>`;
}

function renderCtrlSyncStrip(){
  const el = document.getElementById('ctrlSyncStrip');
  if(!el) return;

  const conn = ctrlSites.filter(s => s.status === 'connected').length;
  const total = ctrlSites.length;

  const stateMap = {
    idle: {txt:'Idle', color:'var(--text3)', bg:'var(--surface2)'},
    syncing: {txt:'Refreshing…', color:'var(--blue)', bg:'#EEF4FF'},
    live: {txt:'Live sync active', color:'var(--teal-dark)', bg:'var(--teal-bg)'},
    error: {txt:'Sync error', color:'var(--red)', bg:'#FDECEC'}
  };

  const st = stateMap[ctrlSyncState] || stateMap.idle;
  const last = ctrlLastSyncAt ? `Last updated ${ctrlLastSyncAt}` : 'Not synced yet';

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:10px 12px;border:1px solid var(--border);border-radius:var(--r);background:var(--surface);margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;background:${st.bg};color:${st.color}">
          <span style="width:7px;height:7px;border-radius:999px;background:${st.color};display:inline-block"></span>
          ${st.txt}
        </span>
        <span style="font-size:12px;color:var(--text2)">${last}</span>
        ${ctrlSyncError ? `<span style="font-size:12px;color:var(--red)">${esc(ctrlSyncError)}</span>` : ''}
      </div>
      <div style="font-size:12px;color:var(--text2)">
        <strong style="color:var(--text)">${conn}</strong> connected ·
        <strong style="color:var(--text)">${total}</strong> total
      </div>
    </div>
  `;
}

function startCtrlAutoRefresh(){
  stopCtrlAutoRefresh();

  if(SIM_DATA) return;

  ctrlRefreshTimer = setInterval(() => {
    if(activePanel === 'launch'){
      refreshCtrl(true);
    }
  }, 4000);
}

function stopCtrlAutoRefresh(){
  if(ctrlRefreshTimer){
    clearInterval(ctrlRefreshTimer);
    ctrlRefreshTimer = null;
  }
}

function wizGoStep3(){
  if(!wizVmr || !wizTemplate) return;
  setWizStep(3);
  ctrlSites = [];
  ctrlActivity = [];
  ctrlSelected = new Set();
  ctrlLastSyncAt = null;
  ctrlSyncState = 'idle';
  ctrlSyncError = '';
  buildControlRoom();
}

async function openLiveControlRoom(alias){
  const conf = confData.find(c => c.primaryAlias === alias);
  if(!conf) return;

  wizVmr = conf;
  ctrlConferenceAlias = conf.primaryAlias.replace(/^sip:/i,'').split('@')[0];
  ctrlCallType = conf.callType || 'video';
  wizTemplate = { name:'Live', data:{ sites:[], desc:'Live conference' } };

  showPanel('launch');
  setWizStep(3);

  ctrlSites = [];
  ctrlActivity = [];
  ctrlSelected = new Set();
  ctrlLastSyncAt = null;
  ctrlSyncState = 'idle';
  ctrlSyncError = '';

  try{
    const d = await apiFetch('/mgmt/api/admin/status/v1/participant/?limit=500');
    const parts = (d.objects || d.results || []).filter(p =>
      (p.conference_name || p.conference || '').toLowerCase() === conf.name.toLowerCase()
    );

    ctrlSites = parts.map(p => ({
      name: p.display_name || p.participant_alias || 'Unknown',
      location: p.system_location || p.signalling_node || '',
      uri: p.destination_alias || p.source_alias || p.participant_alias || '',
      protocol: (p.protocol || 'sip').toLowerCase(),
      type: 'live',
      origin: 'live',
      status: 'connected',
      audioMuted: !!(p.is_muted || p.is_client_muted),
      videoMuted: false,
      participantId: p.id || p.call_uuid || null,
      resourceUri: p.resource_uri || null,
      wasConnected: true,
      lastError: ''
    }));
  }catch{
    if(SIM_DATA){
      ctrlSites = (SIM_DATA.liveParticipants[alias] || []).map(p => ({
        name: p.name,
        location: p.uri?.split('@')[1] || '',
        uri: p.uri,
        protocol: (p.protocol || 'sip').toLowerCase(),
        type: 'live',
        origin: 'live',
        status: 'connected',
        audioMuted: p.audioMuted,
        videoMuted: p.videoMuted,
        participantId: 'live-' + Math.random().toString(36).slice(2,8),
        resourceUri: null,
        wasConnected: true,
        lastError: ''
      }));
    }
  }

  buildControlRoom();

  document.getElementById('pageTitle').textContent = `Conference — ${conf.name}`;
  document.getElementById('pageSub').textContent = `${ctrlSites.length} site${ctrlSites.length!==1?'s':''} · ${ctrlSites.filter(s=>s.status==='connected').length} connected`;

  addCtrlActivity(`Opened control room for ${conf.name}`, 'success');
  toast(`Control room: ${conf.name} · ${ctrlSites.length} participant${ctrlSites.length!==1?'s':''}`);
}

async function loadCtrlSysLocations(){
  ctrlSysLocations = [];
  if(!SIM_DATA){
    try{
      const d = await apiFetch('/mgmt/api/admin/configuration/v1/system_location/?limit=100');
      ctrlSysLocations = (d.objects || []).map(l => l.name);
    }catch{}
  }
  if(!ctrlSysLocations.length) ctrlSysLocations = [CFG.sysLoc || 'DEV'];

  const sel = document.getElementById('ctrlSysLocSel');
  if(sel){
    sel.innerHTML = ctrlSysLocations.map(l =>
      `<option value="${esc(l)}"${l === (CFG.sysLoc || 'DEV') ? ' selected' : ''}>${l}</option>`
    ).join('');
  }
}

function getSelectedSysLoc(){
  const sel = document.getElementById('ctrlSysLocSel');
  return (sel && sel.value) ? sel.value : (CFG.sysLoc || 'DEV');
}

function buildControlRoom(){
  ctrlLaunched = false;
  ctrlConferenceAlias = (wizVmr?.primaryAlias || ctrlConferenceAlias).replace(/^sip:/i,'').split('@')[0];
  ctrlCallType = wizVmr?.callType || 'video';

  if(!ctrlSites.length){
    const tplSites = (wizTemplate?.data?.sites || []).map(s => ({
      ...s,
      status: 'idle',
      audioMuted: false,
      videoMuted: false,
      participantId: null,
      resourceUri: null,
      wasConnected: false,
      lastError: '',
      editing: false,
      origin: 'template'
    }));

    const liveParts = SIM_DATA && wizVmr?.live
      ? (SIM_DATA.liveParticipants[wizVmr.primaryAlias] || []).map(p => ({
          name: p.name,
          location: p.uri?.split('@')[1] || 'Unknown',
          uri: p.uri,
          protocol: (p.protocol || 'sip').toLowerCase(),
          type: 'live',
          origin: 'live',
          status: 'connected',
          audioMuted: p.audioMuted,
          videoMuted: p.videoMuted,
          participantId: 'live-' + Math.random().toString(36).slice(2,8),
          resourceUri: null,
          wasConnected: true,
          lastError: ''
        }))
      : [];

    ctrlSites = [...liveParts, ...tplSites];
  }

  const vmr = wizVmr || { name:'Conference', primaryAlias:'', live:false, callType:'video' };
  const col = colorFor(vmr.name);
  const liveBadge = vmr.live
    ? `<span class="badge ok"><span class="live-dot"></span>Active</span>`
    : `<span style="font-size:12px;color:var(--text3)">Idle</span>`;

  document.getElementById('wiz-step3').innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:10px 16px;margin-bottom:12px;box-shadow:var(--shadow);display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div style="width:32px;height:32px;border-radius:8px;background:${col};color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0">${inits(vmr.name)}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-size:15px;font-weight:600">${vmr.name}</span>
          ${liveBadge}
          <span style="font-size:12px;color:var(--text3)" id="ctrlHeaderMeta">— sites · — connected</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;flex-wrap:wrap">
        <span style="font-size:11px;color:var(--text3)">Location</span>
        <select id="ctrlSysLocSel" style="padding:4px 8px;border:1px solid var(--border);border-radius:var(--r-sm);font-size:12px;font-family:'IBM Plex Sans',sans-serif;background:var(--surface);color:var(--text)">
          <option value="${esc(CFG.sysLoc || 'DEV')}">${CFG.sysLoc || 'DEV'}</option>
        </select>
        <span style="font-size:11px;color:var(--text3)">Host PIN</span>
        <input id="ctrlHostPin" type="password" placeholder="optional" value="${esc(vmr.pin || '')}" style="width:90px;padding:4px 8px;border:1px solid var(--border);border-radius:var(--r-sm);font-size:12px;font-family:'IBM Plex Sans',sans-serif;background:var(--surface)"/>
        <button class="btn btn-sm" onclick="muteAllAudio()">🔇 Mute all</button>
        <button class="btn btn-sm" onclick="unmuteAllAudio()">🔊 Unmute all</button>
        <button class="btn btn-sm" onclick="refreshCtrl(false)">↺</button>
        <span id="ctrlPrimaryAction"></span>
      </div>
    </div>

    <div id="ctrlSyncStrip"></div>

    <div class="ctrl-table-wrap">
      <div class="ctrl-table-head" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap">
        <div>
          <h3 style="margin:0 0 4px 0">Participant sites</h3>
          <div style="font-size:12px;color:var(--text3)">Live participants update automatically while this control room is open.</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <select id="addTplSel" style="padding:5px 8px;border:1px solid var(--border);border-radius:var(--r-sm);font-size:12px;font-family:'IBM Plex Sans',sans-serif;background:var(--surface);color:var(--text)">
            <option value="">— Add from template —</option>
          </select>
          <button class="btn btn-sm" onclick="addFromTemplate()">Add sites</button>
          <button class="btn btn-sm btn-primary" onclick="addSiteRow()">+ Add site</button>
        </div>
      </div>

      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px 0 12px 0;border-bottom:1px solid var(--border);margin-bottom:6px">
        <span style="font-size:11px;color:var(--text3);font-weight:600;letter-spacing:.04em">BULK ACTIONS</span>
        <button class="btn btn-xs" onclick="dialSelectedSites()">Dial selected</button>
        <button class="btn btn-xs" onclick="hangupSelectedSites()">Hang up selected</button>
        <button class="btn btn-xs" onclick="muteSelectedSites()">Mute selected</button>
        <button class="btn btn-xs" style="color:var(--red);border-color:var(--red)" onclick="removeSelectedSites()">Remove selected</button>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:28px"><input type="checkbox" id="selectAllChk" onchange="toggleSelectAll(this)" title="Select all"/></th>
            <th>Site / Endpoint</th>
            <th>Status</th>
            <th class="center">🔇 Audio</th>
            <th class="center">📷 Video</th>
            <th class="center">Actions</th>
          </tr>
        </thead>
        <tbody id="ctrlTableBody"></tbody>
      </table>
    </div>

    <div style="margin-top:14px;border:1px solid var(--border);border-radius:var(--r);background:var(--surface);padding:12px 14px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px">
        <h3 style="margin:0;font-size:14px">Activity log</h3>
        <button class="btn btn-xs" onclick="ctrlActivity=[];renderCtrlActivity()">Clear</button>
      </div>
      <div id="ctrlActivityLog"></div>
    </div>
  `;

  renderCtrlTable();
  updateCtrlStats();
  loadCtrlSysLocations();
  setTimeout(populateAddTplSel, 50);
  renderCtrlSyncStrip();
  renderCtrlActivity();
  startCtrlAutoRefresh();
}

function renderCtrlPrimaryAction(){
  const el = document.getElementById('ctrlPrimaryAction');
  if(!el) return;

  const hasConnected = ctrlSites.some(s => s.status === 'connected');
  const hasDialable = ctrlSites.some(s => s.uri && (s.status === 'idle' || s.status === 'failed'));

  if(hasConnected){
    el.innerHTML = `<button class="btn btn-danger btn-sm" onclick="endConference()">End conference</button>`;
    return;
  }

  el.innerHTML = `<button class="btn btn-primary btn-sm" id="launchBtn" onclick="launchConference()" ${hasDialable ? '' : 'disabled'}>
    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
    Dial all
  </button>`;
}

function sortCtrlSites(){
  const rank = s => (
    s.status === 'connected' ? 0 :
    s.status === 'connecting' ? 1 :
    s.status === 'failed' ? 2 : 3
  );

  ctrlSites.sort((a,b) =>
    rank(a) - rank(b) ||
    (a.origin === 'live' ? -1 : 0) - (b.origin === 'live' ? -1 : 0) ||
    String(a.name || '').localeCompare(String(b.name || ''))
  );
}

function renderCtrlTable(){
  const body = document.getElementById('ctrlTableBody');
  if(!body) return;

  sortCtrlSites();
  syncCtrlSelectedAfterRender();

  const inpStyle = 'width:100%;padding:4px 7px;border:1px solid var(--border);border-radius:var(--r-sm);font-size:12px;font-family:"IBM Plex Sans",sans-serif;background:var(--surface)';

  body.innerHTML = ctrlSites.map((s,i) => {
    const statusHtml = statusPill(s.status);
    const audioClass = s.audioMuted ? 'muted-audio' : '';
    const videoClass = s.videoMuted ? 'muted-video' : '';
    const isEditing = !!(s.editing && s.status !== 'connected' && s.type !== 'live');

    let actionBtn = '';
    if(s.status === 'connected'){
      actionBtn = `<button class="btn btn-xs btn-danger" onclick="hangupSite(${i})">Hang up</button>`;
    }else if(s.status === 'connecting'){
      actionBtn = `<button class="btn btn-xs" disabled>Connecting...</button>`;
    }else{
      actionBtn = `<button class="btn btn-xs ${s.status==='failed' || s.wasConnected ? '' : 'btn-primary'}" onclick="dialSite(${i})">${s.status==='failed' || s.wasConnected ? 'Redial' : 'Dial'}</button>`;
    }

    if(isEditing){
      return `<tr class="site-row" style="background:#FAFDF8">
        <td><input type="checkbox" class="site-chk" data-idx="${i}" ${isCtrlSelected(i) ? 'checked' : ''} onchange="toggleCtrlSelection(${i}, this.checked)"></td>
        <td><input class="ctrl-edit-name" value="${esc(s.name)}" placeholder="Site name" oninput="ctrlSites[${i}].name=this.value" style="${inpStyle}"/></td>
        <td><input value="${esc(s.uri)}" placeholder="SIP URI (user@domain.com)" oninput="ctrlSites[${i}].uri=this.value" style="${inpStyle};font-family:'IBM Plex Mono',monospace"/></td>
        <td>${statusHtml}</td>
        <td class="center"><button class="ctrl-toggle" disabled>🔊</button></td>
        <td class="center"><button class="ctrl-toggle" disabled>📷</button></td>
        <td class="center">
          <div style="display:flex;gap:4px;justify-content:center">
            <button class="btn btn-xs btn-primary" onclick="confirmSiteEdit(${i})">✓ Done</button>
            <button class="btn btn-xs" onclick="removeSite(${i})">✕</button>
          </div>
        </td>
      </tr>`;
    }

    return `<tr class="site-row" id="srow-${i}">
      <td>
        <input
          type="checkbox"
          class="site-chk"
          data-idx="${i}"
          ${isCtrlSelected(i) || (s.type==='live' && s.status==='connected') ? 'checked' : ''}
          ${s.type==='live' && s.status==='connected' ? 'disabled' : ''}
          onchange="toggleCtrlSelection(${i}, this.checked)"
        >
      </td>
      <td>
        <div class="cell-name">
          <div class="ava" style="background:${s.type==='external' ? '#E67E22' : s.type==='personal' ? 'var(--blue)' : s.type==='live' && s.status==='connected' ? 'var(--teal)' : colorFor(s.name||'?')};color:#fff;width:30px;height:30px;font-size:11px">
            ${inits(s.name||'?')}
          </div>
          <div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <div class="row-name" style="font-size:13px">${s.name || '—'}</div>
              ${ctrlOriginBadge(s)}
            </div>
            <div style="font-size:10.5px;color:var(--text3)">
              ${(s.protocol || 'sip').toUpperCase()} · ${s.uri || 'No address'}${s.location ? ' · ' + s.location : ''}
            </div>
            ${s.status === 'failed' && s.lastError ? `<div style="font-size:10px;color:var(--red);margin-top:2px">${esc(s.lastError)}</div>` : ''}
          </div>
        </div>
      </td>
      <td>${statusHtml}</td>
      <td class="center">
        <button class="ctrl-toggle ${audioClass}" title="${s.audioMuted ? 'Unmute audio' : 'Mute audio'}" onclick="toggleAudio(${i})" ${s.status !== 'connected' ? 'disabled' : ''}>
          ${s.audioMuted ? '🔇' : '🔊'}
        </button>
      </td>
      <td class="center">
        <button class="ctrl-toggle ${videoClass}" title="${s.videoMuted ? 'Enable video' : 'Mute video'}" onclick="toggleVideo(${i})" ${s.status !== 'connected' ? 'disabled' : ''}>
          ${s.videoMuted ? '📵' : '📷'}
        </button>
      </td>
      <td class="center">
        <div style="display:flex;gap:4px;justify-content:center">
          ${actionBtn}
          ${s.type !== 'live' ? `<button class="btn btn-xs" onclick="editSiteRow(${i})" title="Edit">✎</button>` : ''}
          ${s.type !== 'live' ? `<button class="btn btn-xs" onclick="removeSite(${i})" title="Remove">✕</button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');

  updateCtrlStats();
  populateAddTplSel();
}

function confirmSiteEdit(i){
  ctrlSites[i].editing = false;
  addCtrlActivity(`Updated site ${ctrlSites[i].name || 'Unnamed site'}`);
  renderCtrlTable();
}

function editSiteRow(i){
  ctrlSites[i].editing = true;
  renderCtrlTable();
  setTimeout(() => {
    const inputs = document.querySelectorAll('.ctrl-edit-name');
    if(inputs[i]) inputs[i].focus();
  }, 50);
}

function statusPill(status){
  const map = {
    connected:'<div class="status-pill connected"><div class="status-dot"></div>Connected</div>',
    connecting:'<div class="status-pill connecting"><div class="status-dot"></div>Connecting…</div>',
    idle:'<div class="status-pill idle"><div class="status-dot"></div>Idle</div>',
    failed:'<div class="status-pill failed"><div class="status-dot"></div>Failed</div>'
  };
  return map[status] || map.idle;
}

function updateCtrlStats(){
  const total = ctrlSites.length;
  const conn = ctrlSites.filter(s => s.status === 'connected').length;
  const meta = document.getElementById('ctrlHeaderMeta');

  if(meta){
    meta.textContent = `${total} site${total!==1?'s':''} · ${conn} connected`;
  }

  if(wizVmr){
    document.getElementById('pageSub').textContent = `${total} site${total!==1?'s':''} · ${conn} connected`;
  }

  renderCtrlPrimaryAction();
  renderCtrlSyncStrip();
}

function toggleAudio(i){
  ctrlSites[i].audioMuted = !ctrlSites[i].audioMuted;
  const muted = ctrlSites[i].audioMuted;
  if(SIM_DATA) toast(`[SIM] ${muted ? 'Muted' : 'Unmuted'} audio: ${ctrlSites[i].name}`);
  else simMuteApi(i, 'audio', muted);
  addCtrlActivity(`${muted ? 'Muted' : 'Unmuted'} audio for ${ctrlSites[i].name}`, 'info');
  renderCtrlTable();
}

function toggleVideo(i){
  ctrlSites[i].videoMuted = !ctrlSites[i].videoMuted;
  const muted = ctrlSites[i].videoMuted;
  if(SIM_DATA) toast(`[SIM] ${muted ? 'Muted video' : 'Enabled video'}: ${ctrlSites[i].name}`);
  else simMuteApi(i, 'video', muted);
  addCtrlActivity(`${muted ? 'Muted' : 'Enabled'} video for ${ctrlSites[i].name}`, 'info');
  renderCtrlTable();
}

async function simMuteApi(i, type, muted){
  const s = ctrlSites[i];
  const pid = s.participantId || (s.resourceUri?.match(/([a-f0-9-]{36})/)?.[1]);
  if(!pid) return;

  const action = type === 'audio'
    ? (muted ? 'mute_audio' : 'unmute_audio')
    : (muted ? 'mute_video' : 'unmute_video');

  try{
    await apiFetch(`/mgmt/api/admin/command/v1/participant/${action}/`, 'POST', { participant_id: pid });
    toast(`${muted ? 'Muted' : 'Unmuted'} ${type}: ${s.name}`);
  }catch(e){
    toast('API error: ' + e.message);
  }
}

function muteAllAudio(){
  ctrlSites.forEach(s => {
    if(s.status === 'connected') s.audioMuted = true;
  });
  addCtrlActivity('Muted audio for all connected sites', 'info');
  renderCtrlTable();
  toast(SIM_DATA ? '[SIM] All audio muted' : 'Muting all audio…');
}

function unmuteAllAudio(){
  ctrlSites.forEach(s => s.audioMuted = false);
  addCtrlActivity('Unmuted audio for all sites', 'info');
  renderCtrlTable();
  toast(SIM_DATA ? '[SIM] All audio unmuted' : 'Unmuting all audio…');
}

function toggleSelectAll(chk){
  document.querySelectorAll('.site-chk:not([disabled])').forEach(c => {
    c.checked = chk.checked;
    const i = parseInt(c.dataset.idx, 10);
    if(!Number.isNaN(i)){
      toggleCtrlSelection(i, chk.checked);
    }
  });
}

function isParticipantReallyConnected(p){
  if(!p) return false;

  const disconnectReason = p.disconnect_reason || p.disconnect_reason_text || '';
  const disconnectTime = p.disconnect_time || '';
  const connectTime = p.connect_time || p.connect_timestamp || '';
  const callStatus = String(p.call_status || p.status || '').toLowerCase();

  if(disconnectReason) return false;
  if(disconnectTime) return false;

  if(callStatus){
    if(['failed', 'disconnected', 'disconnecting', 'busy', 'rejected'].includes(callStatus)) return false;
    if(['connected', 'active', 'ok'].includes(callStatus)) return true;
  }

  if(connectTime) return true;

  return false;
}

async function debugParticipantStatus(siteNameOrUri){
  try{
    const pd = await apiFetch('/mgmt/api/admin/status/v1/participant/?limit=500');
    const all = pd.objects || pd.results || [];

    const q = String(siteNameOrUri || '').toLowerCase();
    const matches = all.filter(p =>
      (p.display_name || '').toLowerCase().includes(q) ||
      (p.destination_alias || '').toLowerCase().includes(q) ||
      (p.source_alias || '').toLowerCase().includes(q) ||
      (p.participant_alias || '').toLowerCase().includes(q)
    );

    if(CTRL_DEBUG) console.log('Participant status matches for', siteNameOrUri, matches);
    return matches;
  }catch(e){
    if(CTRL_DEBUG) console.warn('debugParticipantStatus failed', e);
    return [];
  }
}

function getConferenceParticipants(all){
  const alias = String(ctrlConferenceAlias || '').toLowerCase();
  const confName = String(wizVmr?.name || '').toLowerCase();
  const primaryAlias = String(wizVmr?.primaryAlias || '').replace(/^sip:/i,'').split('@')[0].toLowerCase();

  return all.filter(p => {
    const vals = [
      p.conference,
      p.conference_name,
      p.conference_alias,
      p.service_name,
      p.name
    ]
      .map(v => String(v || '').toLowerCase())
      .filter(Boolean);

    return (
      (alias && vals.includes(alias)) ||
      (primaryAlias && vals.includes(primaryAlias)) ||
      (confName && vals.includes(confName))
    );
  });
}

function matchParticipantToSite(site, participant){
  if(!site || !participant) return false;

  const sitePid = String(site.participantId || '').toLowerCase();
  const partId = String(participant.id || participant.call_uuid || participant.conversation_id || '').toLowerCase();
  if(sitePid && partId && sitePid === partId) return true;

  const siteRes = String(site.resourceUri || '').toLowerCase();
  const partRes = String(participant.resource_uri || '').toLowerCase();
  if(siteRes && partRes && siteRes === partRes) return true;

  const siteUri = String(site.uri || '').toLowerCase();
  const candUris = [
    participant.destination_alias,
    participant.source_alias,
    participant.participant_alias
  ].map(v => String(v || '').toLowerCase()).filter(Boolean);
  if(siteUri && candUris.includes(siteUri)) return true;

  const siteName = String(site.name || '').toLowerCase();
  const partName = String(participant.display_name || '').toLowerCase();
  if(siteName && partName && siteName === partName) return true;

  return false;
}

async function waitForParticipantConnection(site, dialId, attempts = 12, delay = 1500){
  for(let n = 0; n < attempts; n++){
    try{
      const pd = await apiFetch('/mgmt/api/admin/status/v1/participant/?limit=500');
      const all = pd.objects || pd.results || [];
      const liveParts = getConferenceParticipants(all);

      let match = liveParts.find(p =>
        p.conversation_id === dialId ||
        p.call_uuid === dialId ||
        p.id === dialId
      );

      if(!match){
        const siteUri = String(site.uri || '').toLowerCase();
        match = liveParts.find(p => {
          const candUris = [
            p.destination_alias,
            p.source_alias,
            p.participant_alias
          ].map(v => String(v || '').toLowerCase()).filter(Boolean);

          return siteUri && candUris.includes(siteUri);
        });
      }

      if(!match){
        const siteName = String(site.name || '').toLowerCase();
        match = liveParts.find(p =>
          siteName &&
          String(p.display_name || p.participant_alias || '').toLowerCase() === siteName
        );
      }

      if(match){
        if(CTRL_DEBUG) console.log('Matched participant status', match);

        if(isParticipantReallyConnected(match)){
          return {
            connected: true,
            participantId: match.id || match.call_uuid || dialId,
            resourceUri: match.resource_uri || null,
            raw: match
          };
        }

        const failedState =
          match.disconnect_reason ||
          match.disconnect_time ||
          ['failed', 'disconnected', 'busy', 'rejected'].includes(String(match.call_status || match.status || '').toLowerCase());

        if(failedState){
          return {
            connected: false,
            failed: true,
            participantId: match.id || match.call_uuid || dialId,
            resourceUri: match.resource_uri || null,
            raw: match
          };
        }
      }
    }catch(e){
      if(CTRL_DEBUG) console.warn('participant poll failed', e);
    }

    await new Promise(r => setTimeout(r, delay));
  }

  return { connected: false, failed: true };
}

async function dialSite(i){
  const s = ctrlSites[i];
  if(!s) return;

  s.status = 'connecting';
  s.audioMuted = false;
  s.videoMuted = false;
  s.participantId = null;
  s.resourceUri = null;
  s.lastError = '';
  renderCtrlTable();

  addCtrlActivity(`Dialing ${s.name}`, 'info');

  if(SIM_DATA){
    await new Promise(r => setTimeout(r, Math.random()*800 + 400));
    s.status = 'connected';
    s.wasConnected = true;
    s.participantId = 'sim-' + Math.random().toString(36).slice(2,8);
    s.lastError = '';
    addCtrlActivity(`Connected ${s.name}`, 'success');
    toast(`[SIM] Connected: ${s.name}`);
    renderCtrlTable();
    return;
  }

  try{
    const pin = document.getElementById('ctrlHostPin')?.value || '';
    const body = {
      conference_alias: ctrlConferenceAlias,
      destination: s.uri,
      protocol: (s.protocol || 'sip').toLowerCase(),
      system_location: getSelectedSysLoc(),
      call_type: ctrlCallType,
      display_name: s.name
    };

    if(pin) body.pin = pin;

    if(CTRL_DEBUG) console.log('Dial request', body);
    toast(`Dialing ${s.name} via ${body.protocol} to ${body.destination}`);

    const d = await apiFetch('/mgmt/api/admin/command/v1/participant/dial/','POST', body);

    if(d.status !== 'success'){
      s.status = 'failed';
      s.participantId = null;
      s.resourceUri = null;
      s.lastError = 'Dial request failed';
      addCtrlActivity(`Dial request failed for ${s.name}`, 'error');
      renderCtrlTable();
      toast('Dial request failed: ' + JSON.stringify(d.dial || d));
      return;
    }

    const dialId = d.data?.participant_id || null;

    await debugParticipantStatus(s.name);
    await debugParticipantStatus(s.uri);

    const result = await waitForParticipantConnection(s, dialId, 12, 1500);

    if(CTRL_DEBUG) console.log('waitForParticipantConnection result', result);

    if(result && result.connected){
      s.status = 'connected';
      s.wasConnected = true;
      s.participantId = result.participantId || null;
      s.resourceUri = result.resourceUri || null;
      s.lastError = '';
      addCtrlActivity(`Connected ${s.name}`, 'success');
      toast('Connected: ' + s.name);
      setTimeout(() => refreshCtrl(true), 800);
    }else{
      s.status = 'failed';
      s.participantId = null;
      s.resourceUri = null;
      s.lastError = 'Call failed or was not established';
      addCtrlActivity(`Failed to connect ${s.name}`, 'error');
      toast('Call failed or was not established: ' + s.name);
    }
  }catch(e){
    s.status = 'failed';
    s.participantId = null;
    s.resourceUri = null;
    s.lastError = e.message || 'Dial failed';
    addCtrlActivity(`Dial failed for ${s.name}: ${e.message}`, 'error');
    toast('Dial failed: ' + e.message);
    if(CTRL_DEBUG) console.warn('Dial error', e);
  }

  renderCtrlTable();
}

async function hangupSite(i){
  const s = ctrlSites[i];
  if(!s) return;

  s.status = 'idle';
  s.audioMuted = false;
  s.videoMuted = false;
  s.wasConnected = true;
  s.lastError = '';
  renderCtrlTable();

  addCtrlActivity(`Disconnecting ${s.name}`, 'info');

  if(SIM_DATA){
    s.participantId = null;
    s.resourceUri = null;
    addCtrlActivity(`Disconnected ${s.name}`, 'success');
    toast(`[SIM] Hung up: ${s.name}`);
    renderCtrlTable();
    return;
  }

  try{
    const pid = s.participantId || (s.resourceUri?.match(/([a-f0-9-]{36})/)?.[1]);
    if(pid){
      await apiFetch('/mgmt/api/admin/command/v1/participant/disconnect/','POST',{ participant_id: pid });
    }

    s.participantId = null;
    s.resourceUri = null;
    s.status = 'idle';
    s.audioMuted = false;
    s.videoMuted = false;
    s.wasConnected = true;
    s.lastError = '';

    addCtrlActivity(`Disconnected ${s.name}`, 'success');
    toast('Disconnected: ' + s.name);
    setTimeout(() => refreshCtrl(true), 800);
  }catch(e){
    addCtrlActivity(`Failed to disconnect ${s.name}: ${e.message}`, 'error');
    toast('Error: ' + e.message);
  }

  renderCtrlTable();
}

function removeSite(i){
  ctrlSelected.delete(i);
  addCtrlActivity(`Removed site ${ctrlSites[i]?.name || 'Unknown'}`, 'info');
  ctrlSites.splice(i,1);
  renderCtrlTable();
}

function addSiteRow(){
  ctrlSites.push({
    name:'',
    location:'',
    uri:'',
    protocol:'sip',
    type:'room',
    origin:'manual',
    status:'idle',
    audioMuted:false,
    videoMuted:false,
    participantId:null,
    resourceUri:null,
    wasConnected:false,
    lastError:'',
    editing:true
  });

  addCtrlActivity('Added manual site row', 'info');
  renderCtrlTable();

  const inputs = document.querySelectorAll('.ctrl-edit-name');
  if(inputs.length) inputs[inputs.length-1].focus();
}

function addFromTemplate(){
  const sel = document.getElementById('addTplSel');
  const name = sel.value;
  if(!name){
    toast('Select a template first');
    return;
  }

  const tpl = getAllTemplates()[name];
  if(!tpl){
    toast('Template not found');
    return;
  }

  const newSites = tpl.sites.map(s => ({
    ...s,
    status:'idle',
    audioMuted:false,
    videoMuted:false,
    wasConnected:false,
    participantId:null,
    resourceUri:null,
    lastError:'',
    editing:false,
    origin:'template'
  }));

  ctrlSites.push(...newSites);
  addCtrlActivity(`Added ${newSites.length} site${newSites.length!==1?'s':''} from template "${name}"`, 'success');
  renderCtrlTable();
  sel.value = '';
  toast(`Added ${newSites.length} site${newSites.length!==1?'s':''} from "${name}"`);
}

function populateAddTplSel(){
  const sel = document.getElementById('addTplSel');
  if(!sel) return;
  const names = Object.keys(getAllTemplates());
  sel.innerHTML = '<option value="">— Add from template —</option>' + names.map(n => `<option value="${esc(n)}">${n}</option>`).join('');
}

async function dialSelectedSites(){
  const ids = selectedCtrlIndexes();
  if(!ids.length){
    toast('No sites selected');
    return;
  }

  for(const i of ids){
    const s = ctrlSites[i];
    if(s && (s.status === 'idle' || s.status === 'failed') && s.uri){
      await dialSite(i);
      await new Promise(r => setTimeout(r, 250));
    }
  }
}

async function hangupSelectedSites(){
  const ids = selectedCtrlIndexes();
  if(!ids.length){
    toast('No sites selected');
    return;
  }

  for(const i of ids){
    const s = ctrlSites[i];
    if(s && s.status === 'connected'){
      await hangupSite(i);
      await new Promise(r => setTimeout(r, 150));
    }
  }
}

function muteSelectedSites(){
  const ids = selectedCtrlIndexes();
  if(!ids.length){
    toast('No sites selected');
    return;
  }

  ids.forEach(i => {
    const s = ctrlSites[i];
    if(s && s.status === 'connected'){
      s.audioMuted = true;
    }
  });

  addCtrlActivity(`Muted ${ids.length} selected site${ids.length!==1?'s':''}`, 'info');
  renderCtrlTable();
}

function removeSelectedSites(){
  const ids = selectedCtrlIndexes().sort((a,b) => b-a);
  if(!ids.length){
    toast('No sites selected');
    return;
  }

  const removable = ids.filter(i => ctrlSites[i] && ctrlSites[i].type !== 'live');
  if(!removable.length){
    toast('No removable sites selected');
    return;
  }

  removable.forEach(i => {
    ctrlSelected.delete(i);
    ctrlSites.splice(i,1);
  });

  addCtrlActivity(`Removed ${removable.length} selected site${removable.length!==1?'s':''}`, 'info');
  renderCtrlTable();
}

async function launchConference(){
  const btn = document.getElementById('launchBtn');
  const toCall = ctrlSites.filter(s => s.status === 'idle' && s.uri);
  if(!toCall.length){
    toast('No idle sites to dial — all are already connected or have no URI');
    return;
  }

  ctrlLaunched = true;
  if(btn){
    btn.textContent = 'Dialing…';
    btn.disabled = true;
  }

  addCtrlActivity(`Dial all started (${toCall.length} site${toCall.length!==1?'s':''})`, 'info');

  for(let i=0;i<ctrlSites.length;i++){
    if(ctrlSites[i].status === 'idle' && ctrlSites[i].uri){
      await dialSite(i);
      await new Promise(r => setTimeout(r,300));
    }
  }

  if(btn){
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Dialed';
    btn.disabled = false;
  }

  addCtrlActivity('Dial all completed', 'success');
  toast(SIM_DATA ? '[SIM] All sites dialled' : 'All sites dialled');
}

async function endConference(){
  if(!ctrlConferenceAlias) return;
  if(!confirm(`End conference "${ctrlConferenceAlias}"? This will disconnect all participants.`)) return;

  addCtrlActivity(`End conference requested for ${ctrlConferenceAlias}`, 'error');

  if(SIM_DATA){
    ctrlSites.forEach(s => {
      s.status = 'idle';
      s.participantId = null;
      s.resourceUri = null;
      s.audioMuted = false;
      s.videoMuted = false;
      s.lastError = '';
      if(s.type === 'live') s.wasConnected = true;
    });
    renderCtrlTable();
    addCtrlActivity('Conference ended', 'success');
    toast('[SIM] Conference ended');
    return;
  }

  try{
    const connected = ctrlSites.filter(s => s.status === 'connected' && (s.participantId || s.resourceUri));
    for(const s of connected){
      const pid = s.participantId || (s.resourceUri?.match(/([a-f0-9-]{36})/)?.[1]);
      try{
        await apiFetch('/mgmt/api/admin/command/v1/participant/disconnect/','POST',{ participant_id: pid });
        s.status = 'idle';
        s.audioMuted = false;
        s.videoMuted = false;
        s.participantId = null;
        s.resourceUri = null;
        s.wasConnected = true;
        s.lastError = '';
      }catch{}
    }
    renderCtrlTable();
    addCtrlActivity(`Conference ended · ${connected.length} participant${connected.length!==1?'s':''} disconnected`, 'success');
    toast(`Conference ended · ${connected.length} participant${connected.length!==1?'s':''} disconnected`);
    setTimeout(() => refreshCtrl(true), 800);
  }catch(e){
    addCtrlActivity(`Error ending conference: ${e.message}`, 'error');
    toast('Error ending conference: ' + e.message);
  }
}

async function refreshCtrl(silent = false){
  if(ctrlRefreshing) return;
  ctrlRefreshing = true;

  if(!silent){
    ctrlSyncState = 'syncing';
    ctrlSyncError = '';
    renderCtrlSyncStrip();
  }

  try{
    if(SIM_DATA){
      ctrlLastSyncAt = ctrlNowTime();
      ctrlSyncState = 'live';
      if(!silent) toast('[SIM] Participant list refreshed');
      renderCtrlTable();
      return;
    }

    if(!ctrlConferenceAlias){
      ctrlSyncState = 'idle';
      if(!silent) toast('No active control room to refresh');
      return;
    }

    if(!silent) toast('Refreshing participant status…');

    const pd = await apiFetch('/mgmt/api/admin/status/v1/participant/?limit=500');
    const all = pd.objects || pd.results || [];
    const liveParts = getConferenceParticipants(all);

    const matchedParticipantKeys = new Set();
    const matchedSiteIndexes = new Set();

    ctrlSites.forEach((site, idx) => {
      const match = liveParts.find(p => {
        const key = String(p.id || p.call_uuid || p.conversation_id || '');
        return !matchedParticipantKeys.has(key) && matchParticipantToSite(site, p);
      });

      if(match){
        const key = String(match.id || match.call_uuid || match.conversation_id || '');
        if(key) matchedParticipantKeys.add(key);
        matchedSiteIndexes.add(idx);

        const wasConnectedBefore = site.status === 'connected';

        site.status = 'connected';
        site.participantId = match.id || match.call_uuid || site.participantId || null;
        site.resourceUri = match.resource_uri || null;
        site.audioMuted = !!(match.is_muted || match.is_client_muted);
        site.protocol = (match.protocol || site.protocol || 'sip').toLowerCase();
        site.lastError = '';

        if(!site.uri){
          site.uri = match.destination_alias || match.source_alias || match.participant_alias || site.uri;
        }
        if(!site.location){
          site.location = match.system_location || match.signalling_node || site.location;
        }
        if(!site.name || site.name === '—'){
          site.name = match.display_name || match.participant_alias || site.name;
        }

        if(!wasConnectedBefore && !silent){
          addCtrlActivity(`${site.name} is live in conference`, 'success');
        }
      }
    });

    ctrlSites.forEach((site, idx) => {
      if(matchedSiteIndexes.has(idx)) return;

      if(site.status === 'connecting'){
        site.status = 'failed';
        if(!site.lastError) site.lastError = 'No active participant found';
      }else if(site.status === 'connected'){
        site.status = 'idle';
        site.lastError = '';
        if(!silent) addCtrlActivity(`${site.name} is no longer live`, 'info');
      }

      if(site.type === 'live'){
        site.status = 'idle';
      }

      site.participantId = null;
      site.resourceUri = null;
      site.audioMuted = false;
      site.videoMuted = false;
    });

    liveParts.forEach(p => {
      const key = String(p.id || p.call_uuid || p.conversation_id || '');
      if(key && matchedParticipantKeys.has(key)) return;

      const newSite = {
        name: p.display_name || p.participant_alias || 'Unknown',
        location: p.system_location || p.signalling_node || '',
        uri: p.destination_alias || p.source_alias || p.participant_alias || '',
        protocol: (p.protocol || 'sip').toLowerCase(),
        type: 'live',
        origin: 'live',
        status: 'connected',
        audioMuted: !!(p.is_muted || p.is_client_muted),
        videoMuted: false,
        participantId: p.id || p.call_uuid || null,
        resourceUri: p.resource_uri || null,
        wasConnected: true,
        lastError: '',
        editing: false
      };

      ctrlSites.push(newSite);
      if(key) matchedParticipantKeys.add(key);
      addCtrlActivity(`${newSite.name} joined live`, 'success');
    });

    ctrlLastSyncAt = ctrlNowTime();
    ctrlSyncState = 'live';
    ctrlSyncError = '';
    renderCtrlTable();

    try{
      await fetchConf();
    }catch{}

    if(!silent){
      toast(`Refreshed · ${liveParts.length} live participant${liveParts.length!==1?'s':''}`);
    }
  }catch(e){
    ctrlSyncState = 'error';
    ctrlSyncError = e.message || 'Refresh failed';
    if(!silent){
      addCtrlActivity(`Refresh failed: ${e.message}`, 'error');
      toast('Refresh failed: ' + e.message);
    }
  }finally{
    ctrlRefreshing = false;
    renderCtrlSyncStrip();
  }
}