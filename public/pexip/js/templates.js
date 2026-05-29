// ══════════════════════════════════════════════════════════════
// TEMPLATE MANAGER
// ══════════════════════════════════════════════════════════════

const TPL_STORE = 'pexip_templates_v1';

let tplEdSiteData = [], tplEdOrigName = null;

function loadCustomTemplates(){
  try{
    return JSON.parse(localStorage.getItem(TPL_STORE) || '[]');
  }catch{
    return [];
  }
}

function saveCustomTemplates(arr){
  localStorage.setItem(TPL_STORE, JSON.stringify(arr));
}

function normalizeTemplateSite(site){
  return {
    name: String(site?.name || '').trim(),
    location: String(site?.location || '').trim(),
    uri: String(site?.uri || '').trim(),
    protocol: String(site?.protocol || 'sip').toLowerCase(),
    type: String(site?.type || 'room').toLowerCase()
  };
}

function normalizeTemplateSites(sites){
  return (sites || [])
    .map(normalizeTemplateSite)
    .filter(s => s.name || s.uri);
}

// Merge built-in + custom — custom overrides built-in by name
function getAllTemplates(){
  const custom = loadCustomTemplates();
  const merged = { ...TEMPLATES };

  custom.forEach(t => {
    merged[t.name] = {
      desc: t.desc,
      sites: normalizeTemplateSites(t.sites),
      custom: true
    };
  });

  return merged;
}

function saveSitesAsTemplate(name, desc, sites){
  const tplName = String(name || '').trim();
  if(!tplName) throw new Error('Template name is required');

  const cleanSites = normalizeTemplateSites(sites);
  const custom = loadCustomTemplates().filter(t => t.name !== tplName);

  custom.push({
    name: tplName,
    desc: String(desc || 'Custom template').trim() || 'Custom template',
    sites: cleanSites
  });

  saveCustomTemplates(custom);
  renderTplManager();
  return { name: tplName, desc, sites: cleanSites };
}

function renderTplManager(){
  const all = getAllTemplates();
  const custom = loadCustomTemplates();
  const el = document.getElementById('tplManagerList');
  const names = Object.keys(all).sort((a,b) => a.localeCompare(b));

  if(!names.length){
    el.innerHTML = '<p style="font-size:13px;color:var(--text3)">No templates yet.</p>';
    return;
  }

  el.innerHTML = names.map(name => {
    const t = all[name];
    const isCustom = !!(t.custom || custom.find(c => c.name === name));
    const siteSummary = t.sites.slice(0,3).map(s => s.name || s.uri || 'Unnamed').join(', ') + (t.sites.length > 3 ? ` +${t.sites.length-3} more` : '');

    return `<div style="display:flex;align-items:center;gap:12px;padding:11px 14px;border-bottom:1px solid var(--border);background:var(--surface)">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-size:13.5px;font-weight:500">${name}</span>
          ${isCustom
            ? '<span style="font-size:10px;font-weight:600;padding:1px 7px;border-radius:20px;background:var(--teal-bg);color:var(--teal-dark)">Custom</span>'
            : '<span style="font-size:10px;font-weight:600;padding:1px 7px;border-radius:20px;background:var(--surface2);color:var(--text3);border:1px solid var(--border)">Built-in</span>'
          }
        </div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px">${t.desc || 'No description'}</div>
        <div style="font-size:11.5px;color:var(--text2);margin-top:3px;font-family:'IBM Plex Mono',monospace">${t.sites.length} site${t.sites.length!==1?'s':''} · ${siteSummary || 'Empty'}</div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap">
        <button class="btn btn-sm" onclick="editTemplate('${esc(name)}')">Edit</button>
        <button class="btn btn-sm" onclick="duplicateTemplate('${esc(name)}')">Duplicate</button>
        ${isCustom ? `<button class="btn btn-sm" style="color:var(--red);border-color:var(--red)" onclick="deleteTemplate('${esc(name)}')">Delete</button>` : ''}
      </div>
    </div>`;
  }).join('');

  el.style.border = '1px solid var(--border)';
  el.style.borderRadius = 'var(--r)';
  el.style.overflow = 'hidden';
}

function populateTplAddressBookSelect(){
  const sel = document.getElementById('tplAbSel');
  if(!sel) return;

  const entries = typeof getAddressBook === 'function' ? getAddressBook() : [];
  sel.innerHTML =
    '<option value="">— Add from Address Book —</option>' +
    entries.map(e => `
      <option value="${esc(e.id)}">
        ${e.name || e.uri}${e.location ? ' · ' + e.location : ''}${e.uri ? ' · ' + e.uri : ''}
      </option>
    `).join('');
}

function addTplSiteFromAddressBook(){
  const sel = document.getElementById('tplAbSel');
  if(!sel || !sel.value){
    toast('Select an address book entry first');
    return;
  }

  const entries = typeof getAddressBook === 'function' ? getAddressBook() : [];
  const entry = entries.find(e => e.id === sel.value);
  if(!entry){
    toast('Address book entry not found');
    return;
  }

  tplEdSiteData.push({
    name: entry.name || '',
    location: entry.location || '',
    uri: entry.uri || '',
    protocol: entry.protocol || 'sip',
    type: entry.type || 'room'
  });

  renderTplEdSites();
  sel.value = '';
  toast(`Added "${entry.name || entry.uri}" to template`);
}

function openTplEditor(name){
  tplEdOrigName = name || null;
  const all = getAllTemplates();
  const tpl = name ? all[name] : null;

  document.getElementById('tplEdName').value = tpl ? name : '';
  document.getElementById('tplEdDesc').value = tpl ? (tpl.desc || '') : '';
  document.getElementById('tplEditorTitle').textContent = name ? `Edit: ${name}` : 'New template';
  document.getElementById('tplEdMsg').textContent = '';

  tplEdSiteData = tpl ? normalizeTemplateSites(tpl.sites).map(s => ({ ...s })) : [];

  document.getElementById('tplEditor').style.display = 'block';
  document.getElementById('tplEditor').scrollIntoView({ behavior:'smooth', block:'start' });

  renderTplEdSites();
  populateTplAddressBookSelect();
}

function closeTplEditor(){
  document.getElementById('tplEditor').style.display = 'none';
  tplEdSiteData = [];
  tplEdOrigName = null;
}

function newTemplate(){
  openTplEditor(null);
}

function editTemplate(name){
  openTplEditor(name);
}

function duplicateTemplate(name){
  const all = getAllTemplates();
  const tpl = all[name];
  if(!tpl) return;

  let newName = name + ' (copy)';
  const existing = new Set(Object.keys(getAllTemplates()));
  let n = 2;
  while(existing.has(newName)){
    newName = `${name} (copy ${n})`;
    n++;
  }

  saveSitesAsTemplate(newName, tpl.desc || 'Custom template', tpl.sites.map(s => ({ ...s })));
  renderTplManager();
  toast('Duplicated: ' + newName);
}

function deleteTemplate(name){
  if(!confirm(`Delete template "${name}"? This cannot be undone.`)) return;
  saveCustomTemplates(loadCustomTemplates().filter(t => t.name !== name));
  renderTplManager();
  toast('Deleted: ' + name);
}

function addTplSite(){
  tplEdSiteData.push({
    name:'',
    location:'',
    uri:'',
    protocol:'sip',
    type:'room'
  });

  renderTplEdSites();

  const inputs = document.querySelectorAll('.tpl-site-name');
  if(inputs.length) inputs[inputs.length-1].focus();
}

function removeTplSite(i){
  tplEdSiteData.splice(i,1);
  renderTplEdSites();
}

function renderTplEdSites(){
  const body = document.getElementById('tplEdSites');
  const empty = document.getElementById('tplEdEmpty');

  if(!tplEdSiteData.length){
    body.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  body.innerHTML = tplEdSiteData.map((s,i) => `
    <tr style="border-bottom:1px solid var(--border)">
      <td style="padding:7px 10px">
        <input class="tpl-site-name" value="${esc(s.name)}" placeholder="Site name" oninput="tplEdSiteData[${i}].name=this.value" style="width:100%;padding:5px 8px;border:1px solid var(--border);border-radius:var(--r-sm);font-size:12px;font-family:'IBM Plex Sans',sans-serif"/>
      </td>
      <td style="padding:7px 8px">
        <input value="${esc(s.location)}" placeholder="e.g. Calgary" oninput="tplEdSiteData[${i}].location=this.value" style="width:100%;padding:5px 8px;border:1px solid var(--border);border-radius:var(--r-sm);font-size:12px;font-family:'IBM Plex Sans',sans-serif"/>
      </td>
      <td style="padding:7px 8px">
        <input value="${esc(s.uri)}" placeholder="user@domain.com" oninput="tplEdSiteData[${i}].uri=this.value" style="width:100%;padding:5px 8px;border:1px solid var(--border);border-radius:var(--r-sm);font-size:12px;font-family:'IBM Plex Mono',monospace"/>
      </td>
      <td style="padding:7px 8px">
        <select onchange="tplEdSiteData[${i}].protocol=this.value" style="padding:5px 8px;border:1px solid var(--border);border-radius:var(--r-sm);font-size:12px;font-family:'IBM Plex Sans',sans-serif;background:var(--surface)">
          <option value="sip" ${s.protocol==='sip'?'selected':''}>SIP</option>
          <option value="h323" ${s.protocol==='h323'?'selected':''}>H.323</option>
          <option value="mssip" ${s.protocol==='mssip'?'selected':''}>MS-SIP</option>
          <option value="rtmp" ${s.protocol==='rtmp'?'selected':''}>RTMP</option>
        </select>
      </td>
      <td style="padding:7px 8px">
        <select onchange="tplEdSiteData[${i}].type=this.value" style="padding:5px 8px;border:1px solid var(--border);border-radius:var(--r-sm);font-size:12px;font-family:'IBM Plex Sans',sans-serif;background:var(--surface)">
          <option value="room" ${s.type==='room'?'selected':''}>Room</option>
          <option value="personal" ${s.type==='personal'?'selected':''}>Personal</option>
          <option value="external" ${s.type==='external'?'selected':''}>External</option>
        </select>
      </td>
      <td style="padding:7px 10px;text-align:center">
        <button class="btn btn-xs" style="color:var(--red);border-color:var(--red)" onclick="removeTplSite(${i})">✕</button>
      </td>
    </tr>
  `).join('');
}

function saveTplEditor(){
  const name = document.getElementById('tplEdName').value.trim();
  const desc = document.getElementById('tplEdDesc').value.trim();
  const msg = document.getElementById('tplEdMsg');

  if(!name){
    msg.textContent = 'Template name is required';
    msg.style.color = 'var(--red)';
    return;
  }

  try{
    const cleanSites = normalizeTemplateSites(tplEdSiteData);

    const custom = loadCustomTemplates().filter(t => t.name !== tplEdOrigName && t.name !== name);

    custom.push({
      name,
      desc: desc || 'Custom template',
      sites: cleanSites
    });

    saveCustomTemplates(custom);

    msg.textContent = '✓ Saved';
    msg.style.color = 'var(--teal)';
    toast('Template saved: ' + name);

    tplEdOrigName = name;

    setTimeout(() => {
      closeTplEditor();
      renderTplManager();
    }, 500);
  }catch(e){
    msg.textContent = e.message || 'Save failed';
    msg.style.color = 'var(--red)';
  }
}