// ══════════════════════════════════════════════════════════════
// ADDRESS BOOK
// ══════════════════════════════════════════════════════════════

const AB_STORE = 'pexip_address_book_v1';
let abEditId = null;

function makeAbId(){
  return 'ab_' + Math.random().toString(36).slice(2,10);
}

function loadAddressBook(){
  try{
    const raw = JSON.parse(localStorage.getItem(AB_STORE) || '[]');
    return raw.map(normalizeAbEntry).filter(Boolean);
  }catch{
    return [];
  }
}

function saveAddressBook(entries){
  localStorage.setItem(AB_STORE, JSON.stringify(entries.map(normalizeAbEntry).filter(Boolean)));
}

function normalizeAbEntry(entry){
  if(!entry) return null;

  const name = String(entry.name || '').trim();
  const location = String(entry.location || '').trim();
  const uri = String(entry.uri || '').trim();
  const protocol = String(entry.protocol || 'sip').toLowerCase();
  const type = String(entry.type || 'room').toLowerCase();
  const notes = String(entry.notes || '').trim();

  if(!name && !uri) return null;

  return {
    id: entry.id || makeAbId(),
    name,
    location,
    uri,
    protocol,
    type,
    notes
  };
}

function getAddressBook(){
  return loadAddressBook().sort((a,b) => (a.name || '').localeCompare(b.name || ''));
}

function renderAddressBook(){
  const list = getAddressBook();
  const q = (document.getElementById('abQ')?.value || '').trim().toLowerCase();
  const body = document.getElementById('abList');
  const count = document.getElementById('abCount');

  const filtered = list.filter(e => {
    if(!q) return true;
    return (
      (e.name || '').toLowerCase().includes(q) ||
      (e.location || '').toLowerCase().includes(q) ||
      (e.uri || '').toLowerCase().includes(q) ||
      (e.protocol || '').toLowerCase().includes(q) ||
      (e.type || '').toLowerCase().includes(q) ||
      (e.notes || '').toLowerCase().includes(q)
    );
  });

  if(count) count.textContent = `${filtered.length} shown`;

  if(!body) return;

  if(!filtered.length){
    body.innerHTML = '<div class="empty-state"><div class="empty-icon">📒</div>No address book entries</div>';
    return;
  }

  body.innerHTML = `<table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Location</th>
        <th>URI</th>
        <th>Protocol</th>
        <th>Type</th>
        <th>Notes</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      ${filtered.map(e => `
        <tr>
          <td>
            <div class="cell-name">
              <div class="ava" style="background:${colorFor(e.name || e.uri || '?')};color:#fff;width:30px;height:30px;font-size:11px">${inits(e.name || e.uri || '?')}</div>
              <div class="row-name">${e.name || 'Unnamed'}</div>
            </div>
          </td>
          <td><span class="row-sub">${e.location || '—'}</span></td>
          <td style="font-family:'IBM Plex Mono',monospace;font-size:12px">${e.uri || '—'}</td>
          <td><span class="badge">${(e.protocol || 'sip').toUpperCase()}</span></td>
          <td><span class="badge">${e.type || 'room'}</span></td>
          <td style="font-size:12px;color:var(--text2)">${e.notes || '—'}</td>
          <td>
            <div style="display:flex;gap:6px;justify-content:flex-end">
              <button class="btn btn-xs" onclick="editAbEntry('${esc(e.id)}')">Edit</button>
              <button class="btn btn-xs" style="color:var(--red);border-color:var(--red)" onclick="deleteAbEntry('${esc(e.id)}')">Delete</button>
            </div>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>`;
}

function openAbEditor(id = null){
  const entries = getAddressBook();
  const entry = id ? entries.find(e => e.id === id) : null;
  abEditId = entry?.id || null;

  document.getElementById('abEdTitle').textContent = entry ? `Edit: ${entry.name || 'Entry'}` : 'New address book entry';
  document.getElementById('abEdName').value = entry?.name || '';
  document.getElementById('abEdLocation').value = entry?.location || '';
  document.getElementById('abEdUri').value = entry?.uri || '';
  document.getElementById('abEdProtocol').value = entry?.protocol || 'sip';
  document.getElementById('abEdType').value = entry?.type || 'room';
  document.getElementById('abEdNotes').value = entry?.notes || '';
  document.getElementById('abEdMsg').textContent = '';

  document.getElementById('abEditor').style.display = 'block';
  document.getElementById('abEditor').scrollIntoView({ behavior:'smooth', block:'start' });
}

function closeAbEditor(){
  abEditId = null;
  document.getElementById('abEditor').style.display = 'none';
}

function newAbEntry(){
  openAbEditor(null);
}

function editAbEntry(id){
  openAbEditor(id);
}

function saveAbEditor(){
  const msg = document.getElementById('abEdMsg');
  const name = document.getElementById('abEdName').value.trim();
  const location = document.getElementById('abEdLocation').value.trim();
  const uri = document.getElementById('abEdUri').value.trim();
  const protocol = document.getElementById('abEdProtocol').value;
  const type = document.getElementById('abEdType').value;
  const notes = document.getElementById('abEdNotes').value.trim();

  if(!name && !uri){
    msg.textContent = 'Name or URI is required';
    msg.style.color = 'var(--red)';
    return;
  }

  const entries = getAddressBook().filter(e => e.id !== abEditId);

  entries.push(normalizeAbEntry({
    id: abEditId || makeAbId(),
    name,
    location,
    uri,
    protocol,
    type,
    notes
  }));

  saveAddressBook(entries);

  msg.textContent = '✓ Saved';
  msg.style.color = 'var(--teal)';
  toast(`Address book entry saved: ${name || uri}`);

  setTimeout(() => {
    closeAbEditor();
    renderAddressBook();
  }, 400);
}

function deleteAbEntry(id){
  const entries = getAddressBook();
  const entry = entries.find(e => e.id === id);
  if(!entry) return;

  if(!confirm(`Delete address book entry "${entry.name || entry.uri}"?`)) return;

  saveAddressBook(entries.filter(e => e.id !== id));
  renderAddressBook();
  toast(`Deleted: ${entry.name || entry.uri}`);
}

function parseCsvLine(line){
  const out = [];
  let cur = '';
  let inQuotes = false;

  for(let i=0;i<line.length;i++){
    const ch = line[i];
    const next = line[i+1];

    if(ch === '"' && inQuotes && next === '"'){
      cur += '"';
      i++;
      continue;
    }

    if(ch === '"'){
      inQuotes = !inQuotes;
      continue;
    }

    if(ch === ',' && !inQuotes){
      out.push(cur.trim());
      cur = '';
      continue;
    }

    cur += ch;
  }

  out.push(cur.trim());
  return out;
}

function importAddressBookCsvText(text){
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if(lines.length < 2) throw new Error('CSV must include a header row and at least one data row');

  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase());
  const idx = name => headers.indexOf(name);

  const nameIdx = idx('name');
  const locationIdx = idx('location');
  const uriIdx = idx('uri');
  const protocolIdx = idx('protocol');
  const typeIdx = idx('type');
  const notesIdx = idx('notes');

  if(nameIdx === -1 && uriIdx === -1){
    throw new Error('CSV must include at least a "name" or "uri" column');
  }

  const existing = getAddressBook();
  const merged = [...existing];

  let imported = 0;

  for(let i=1;i<lines.length;i++){
    const cols = parseCsvLine(lines[i]);
    const entry = normalizeAbEntry({
      id: makeAbId(),
      name: nameIdx >= 0 ? cols[nameIdx] : '',
      location: locationIdx >= 0 ? cols[locationIdx] : '',
      uri: uriIdx >= 0 ? cols[uriIdx] : '',
      protocol: protocolIdx >= 0 ? cols[protocolIdx] : 'sip',
      type: typeIdx >= 0 ? cols[typeIdx] : 'room',
      notes: notesIdx >= 0 ? cols[notesIdx] : ''
    });

    if(!entry) continue;

    const dupeIx = merged.findIndex(e =>
      (e.name || '').toLowerCase() === (entry.name || '').toLowerCase() &&
      (e.uri || '').toLowerCase() === (entry.uri || '').toLowerCase()
    );

    if(dupeIx >= 0){
      merged[dupeIx] = { ...merged[dupeIx], ...entry, id: merged[dupeIx].id };
    }else{
      merged.push(entry);
    }

    imported++;
  }

  saveAddressBook(merged);
  renderAddressBook();
  toast(`Imported ${imported} address book entr${imported===1?'y':'ies'}`);
}

function onAbCsvFileSelected(input){
  const file = input.files?.[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try{
      importAddressBookCsvText(String(reader.result || ''));
    }catch(e){
      toast('CSV import failed: ' + e.message);
    }
    input.value = '';
  };
  reader.readAsText(file);
}