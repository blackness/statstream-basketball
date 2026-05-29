// ══════════════════════════════════════════════════════════════
// SETTINGS / PROFILES
// ══════════════════════════════════════════════════════════════

function loadCfg(){
  try{
    const s = localStorage.getItem(STORE);
    if(s) CFG = JSON.parse(s);
  }catch{}
  applyFields();
  updateSidebar();
}

function saveCfg(){
  localStorage.setItem(STORE, JSON.stringify(CFG));
}

function applyFields(){
  document.getElementById('cfgConfHost').value = CFG.confHost || '';
  document.getElementById('cfgMgmtHost').value = CFG.mgmtHost || '';
  document.getElementById('cfgUser').value = CFG.user || '';
  document.getElementById('cfgProxy').value = CFG.proxy || 'localhost:3000';
  document.getElementById('cfgProxyProto').value = CFG.proxyProto || 'http';
  document.getElementById('cfgSysLoc').value = CFG.sysLoc || 'DEV';
  document.getElementById('cfgInterval').value = CFG.interval || 30;
  document.getElementById('cfgLabel').value = CFG.label || '';
}

function updateSidebar(){
  document.getElementById('sbConfHost').textContent = CFG.confHost || 'Not configured';
  document.getElementById('sbMgmtHost').textContent = CFG.mgmtHost || 'Not configured';
  document.getElementById('sbVersion').textContent = CFG.label || 'Dashboard';
  document.getElementById('simBanner').style.display = CFG.sim && SIM_DATA ? 'flex' : 'none';

  const d = document.getElementById('dotConf');
  const m = document.getElementById('dotMgmt');

  if(CFG.sim && SIM_DATA){
    d.className = 'ndot sim';
    m.className = 'ndot sim';
  }
}

function saveSettings(){
  CFG.confHost = document.getElementById('cfgConfHost').value.trim();
  CFG.mgmtHost = document.getElementById('cfgMgmtHost').value.trim();
  CFG.user = document.getElementById('cfgUser').value.trim();
  CFG.pass = document.getElementById('cfgPass').value;
  CFG.proxy = document.getElementById('cfgProxy').value.trim() || 'localhost:3000';
  CFG.proxyProto = document.getElementById('cfgProxyProto').value;
  CFG.sysLoc = document.getElementById('cfgSysLoc').value.trim() || 'DEV';
  CFG.interval = parseInt(document.getElementById('cfgInterval').value) || 30;
  CFG.label = document.getElementById('cfgLabel').value.trim();
  CFG.sim = false;
  SIM_DATA = null;

  saveCfg();
  updateSidebar();
  histLoaded = false;
  toast('Saved — reconnecting…');

  setTimeout(() => {
    showPanel('conferences');
    fetchConf();
    if(autoOn) startAuto();
  }, 300);
}

async function testConn(){
  if(CFG.sim){
    showCTM('⚡ Simulation mode', 'var(--violet)');
    return;
  }

  showCTM('Testing…', 'var(--text3)');

  const h = {
    'Authorization':'Basic ' + btoa(`${CFG.user}:${CFG.pass}`),
    'Content-Type':'application/json'
  };

  try{
    const r = await fetch(`${proxyBase()}/mgmt/api/admin/configuration/v1/conference/?limit=1`, { headers:h });
    showCTM(r.ok ? '✓ Connected' : '✗ HTTP ' + r.status, r.ok ? 'var(--teal)' : 'var(--amber)');
  }catch(e){
    showCTM('✗ ' + e.message, 'var(--red)');
  }
}

function showCTM(msg, color){
  const el = document.getElementById('connTestMsg');
  el.textContent = msg;
  el.style.color = color;
  setTimeout(() => {
    el.textContent = '';
  }, 5000);
}

function loadProfiles(){
  try{
    return JSON.parse(localStorage.getItem(PROF_STORE) || '[]');
  }catch{
    return [];
  }
}

function saveProfiles(p){
  localStorage.setItem(PROF_STORE, JSON.stringify(p));
}

function saveAsProfile(){
  const label = CFG.label || CFG.confHost || ('Profile ' + (loadProfiles().length + 1));
  const p = loadProfiles().filter(x => x.label !== label);
  p.push({ ...CFG, label });
  saveProfiles(p);
  renderProfiles();
  toast('Saved: ' + label);
}

function loadProfile(label){
  const p = loadProfiles().find(x => x.label === label);
  if(!p) return;

  CFG = { ...p };
  SIM_DATA = null;
  saveCfg();
  applyFields();
  updateSidebar();
  histLoaded = false;
  toast('Switched to: ' + label);

  setTimeout(() => {
    showPanel('conferences');
    fetchConf();
    if(autoOn) startAuto();
  }, 300);
}

function deleteProfile(label){
  saveProfiles(loadProfiles().filter(x => x.label !== label));
  renderProfiles();
  toast('Deleted: ' + label);
}

function renderProfiles(){
  const profiles = loadProfiles();
  const el = document.getElementById('profileList');

  if(!profiles.length){
    el.innerHTML = '<p style="font-size:13px;color:var(--text3)">No saved profiles yet.</p>';
    return;
  }

  el.innerHTML = profiles.map(p => `
    <div class="profile-item ${p.label===CFG.label?'active-profile':''}" onclick="loadProfile('${esc(p.label)}')">
      <div class="profile-dot ${p.label===CFG.label?'active':''}"></div>
      <div style="flex:1;min-width:0">
        <div class="profile-name">${p.label}</div>
        <div class="profile-host">${p.confHost || '—'}</div>
      </div>
      <button class="btn btn-xs" onclick="event.stopPropagation();loadProfile('${esc(p.label)}')" style="border-color:var(--teal);color:var(--teal)">Use</button>
      <button class="btn btn-xs" onclick="event.stopPropagation();deleteProfile('${esc(p.label)}')" style="color:var(--red);border-color:var(--red)">✕</button>
    </div>
  `).join('');
}

function loadSim(name){
  const p = SIM_PROFILES[name];
  if(!p) return;

  CFG = { ...p };
  SIM_DATA = p;
  saveCfg();
  applyFields();
  updateSidebar();
  histLoaded = false;
  toast('Simulation: ' + name);

  setTimeout(() => {
    showPanel('conferences');
    loadSimConfs();
    if(autoOn) startAuto();
  }, 300);
}