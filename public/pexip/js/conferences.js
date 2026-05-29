// ══════════════════════════════════════════════════════════════
// CONFERENCES
// ══════════════════════════════════════════════════════════════

let confData = [], confF = 'all', autoOn = true, autoTimer = null, countdown = 30;

function toggleAuto(){
  autoOn = !autoOn;
  document.getElementById('autoBtn').classList.toggle('on', autoOn);
  document.getElementById('autoBtnTxt').textContent = autoOn ? 'Auto ON' : 'Auto OFF';

  if(autoOn){
    SIM_DATA ? loadSimConfs() : fetchConf();
    startAuto();
  }else{
    clearInterval(autoTimer);
    document.getElementById('confCd').textContent = '';
  }
}

function startAuto(){
  clearInterval(autoTimer);
  countdown = CFG.interval || 30;

  autoTimer = setInterval(() => {
    countdown--;
    document.getElementById('confCd').textContent = `Refresh in ${countdown}s`;
    if(countdown <= 0){
      countdown = CFG.interval || 30;
      SIM_DATA ? loadSimConfs() : fetchConf();
    }
  }, 1000);
}

function setConfF(f, el){
  confF = f;
  document.querySelectorAll('#panel-conferences .pill').forEach(b => b.classList.remove('on'));
  el.classList.add('on');
  renderConf();
}

function loadSimConfs(){
  setDot('confDot','sim');
  setNDot('dotConf','sim');
  setNDot('dotMgmt','sim');

  confData = SIM_DATA.vmrs.map(v => ({
    ...v,
    primaryAlias: v.alias,
    aliases: [v.alias]
  }));

  document.getElementById('confMsg').textContent = `Simulation · ${confData.length} VMRs · ${confData.filter(c => c.live).length} active`;
  document.getElementById('s-total').textContent = confData.length;
  document.getElementById('s-live').textContent = confData.filter(c => c.live).length;
  document.getElementById('s-parts').textContent = confData.reduce((s,c) => s + (c.participants || 0), 0);
  document.getElementById('s-pin').textContent = confData.filter(c => c.pin || c.guestPin).length;

  renderConf();
}

function matchLiveConference(v, live){
  const confName = String(v.name || '').toLowerCase();
  const aliases = (v.aliases || []).map(a => String(a.alias || a).toLowerCase());

  return live.find(l => {
    const liveName = String(l.name || '').toLowerCase();
    const liveAlias = String(l.alias || l.conference_alias || '').toLowerCase();

    return (
      (confName && liveName === confName) ||
      (liveAlias && aliases.includes(liveAlias)) ||
      (liveName && aliases.includes(liveName))
    );
  });
}

function countParticipantsForConference(v, participants){
  const confName = String(v.name || '').toLowerCase();
  const primaryAlias = String(v.aliases?.[0]?.alias || '').replace(/^sip:/i,'').split('@')[0].toLowerCase();
  const aliases = (v.aliases || []).map(a => String(a.alias || '').replace(/^sip:/i,'').split('@')[0].toLowerCase());

  return participants.filter(p => {
    const vals = [
      p.conference,
      p.conference_name,
      p.conference_alias,
      p.service_name,
      p.name
    ]
      .map(x => String(x || '').replace(/^sip:/i,'').split('@')[0].toLowerCase())
      .filter(Boolean);

    return (
      (confName && vals.includes(confName)) ||
      (primaryAlias && vals.includes(primaryAlias)) ||
      aliases.some(a => vals.includes(a))
    );
  }).length;
}

async function fetchConf(){
  if(!CFG.confHost || !CFG.mgmtHost){
    setDot('confDot','err');
    document.getElementById('confMsg').textContent = 'Configure node in Settings';
    return;
  }

  setDot('confDot','load');
  setNDot('dotMgmt','load');
  setNDot('dotConf','load');
  document.getElementById('confMsg').textContent = 'Fetching…';

  let vmrs = [], live = [], participants = [];

  try{
    const d = await apiFetch('/mgmt/api/admin/configuration/v1/conference/?limit=500');
    vmrs = d.objects || [];
    setNDot('dotMgmt','ok');
  }catch(e){
    setNDot('dotMgmt','err');
    setDot('confDot','err');
    document.getElementById('confMsg').textContent = 'Error: ' + e.message;
    return;
  }

  try{
    const d = await apiFetch('/mgmt/api/admin/status/v1/conference/?limit=500');
    live = d.objects || [];
  }catch{}

  try{
    const d = await apiFetch('/mgmt/api/admin/status/v1/participant/?limit=500');
    participants = d.objects || d.results || [];
    setNDot('dotConf','ok');
  }catch{
    setNDot('dotConf','ok');
  }

  confData = vmrs.map(v => {
    const lv = matchLiveConference(v, live);
    const participantCountFromConference = lv?.participant_count ?? lv?.participants ?? lv?.participant_total ?? 0;
    const participantCountFromParticipants = countParticipantsForConference(v, participants);
    const participantCount = Math.max(participantCountFromConference, participantCountFromParticipants);

    return {
      id: v.id,
      name: v.name,
      description: v.description || '',
      aliases: (v.aliases || []).map(a => a.alias),
      primaryAlias: v.aliases?.[0]?.alias || '',
      type: v.service_type || 'conference',
      pin: v.pin || '',
      guestPin: v.guest_pin || '',
      allowGuests: v.allow_guests,
      callType: v.call_type || 'video',
      live: participantCount > 0 || !!lv,
      participants: participantCount
    };
  });

  const liveCount = confData.filter(c => c.live).length;
  const totalParticipants = confData.reduce((s,c) => s + (c.participants || 0), 0);

  setDot('confDot','live');
  document.getElementById('confMsg').textContent = `${confData.length} VMRs · ${liveCount} active · ${new Date().toLocaleTimeString()}`;
  document.getElementById('s-total').textContent = confData.length;
  document.getElementById('s-live').textContent = liveCount;
  document.getElementById('s-parts').textContent = totalParticipants || '—';
  document.getElementById('s-pin').textContent = confData.filter(c => c.pin || c.guestPin).length;

  renderConf();
}

function renderConf(){
  const q = document.getElementById('confQ').value.toLowerCase();

  const list = confData
    .filter(c => {
      const ms = !q || c.name.toLowerCase().includes(q) || c.aliases.some(a => a.toLowerCase().includes(q));
      const mf = confF === 'all' ? true : confF === 'live' ? c.live : confF === 'pin' ? (c.pin || c.guestPin) : true;
      return ms && mf;
    })
    .sort((a,b) => (b.live ? 1 : 0) - (a.live ? 1 : 0) || a.name.localeCompare(b.name));

  document.getElementById('confCount').textContent = `${list.length} shown`;

  const body = document.getElementById('confBody');
  if(!list.length){
    body.innerHTML = '<div class="empty-state"><div class="empty-icon">▣</div>No conferences match</div>';
    return;
  }

  body.innerHTML = `<table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Type</th>
        <th>Alias</th>
        <th>Status</th>
        <th>Participants</th>
        <th>Access</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      ${list.map(c => {
        const cls = typeCls(c.type);
        const liveBadge = c.live
          ? `<span class="badge ok"><span class="live-dot"></span>Active</span>`
          : '<span style="font-size:12px;color:var(--text3)">Idle</span>';

        const access = [];
        if(c.pin) access.push('<span class="badge pin">Host PIN</span>');
        if(c.guestPin) access.push('<span class="badge pin">Guest PIN</span>');
        if(!c.pin && !c.guestPin && c.allowGuests) access.push('<span class="badge open">Open</span>');

        return `<tr class="clickable" onclick="${c.live ? `openLiveControlRoom('${esc(c.primaryAlias)}')` : `wizStartWith('${esc(c.primaryAlias)}')`}">
          <td>
            <div class="cell-name">
              <div class="ava ${cls}" style="background:${colorFor(c.name)};color:#fff">${inits(c.name)}</div>
              <div>
                <div class="row-name">${c.name}</div>
                ${c.description ? `<div class="row-sub">${c.description}</div>` : ''}
              </div>
            </div>
          </td>
          <td><span class="badge ${cls}">${typeLabel(c.type)}</span></td>
          <td><span class="row-sub">${c.primaryAlias || '—'}</span></td>
          <td>${liveBadge}</td>
          <td style="font-family:'IBM Plex Mono',monospace;font-size:13px">${c.live ? c.participants : '—'}</td>
          <td><div style="display:flex;gap:4px;flex-wrap:wrap">${access.join('') || '—'}</div></td>
          <td><span style="font-size:12px;color:var(--teal);font-weight:500">${c.live ? 'Manage →' : 'Launch →'}</span></td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}