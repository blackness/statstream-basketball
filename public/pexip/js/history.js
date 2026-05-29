// ══════════════════════════════════════════════════════════════
// CALL HISTORY
// ══════════════════════════════════════════════════════════════

let histData = [], histLoaded = false;

async function fetchHist(){
  histLoaded = true;
  setDot('histDot', 'load');
  document.getElementById('histMsg').textContent = 'Fetching…';

  if(SIM_DATA){
    histData = SIM_DATA.history.map(h => ({
      ...h,
      service_type: h.type,
      start_time: h.start,
      end_time: h.end,
      participant_count: h.participants
    }));

    histData.sort((a,b) => new Date(b.start_time) - new Date(a.start_time));
    setDot('histDot', 'sim');
    document.getElementById('histMsg').textContent = `${histData.length} records · simulated`;
    document.getElementById('histCount').textContent = histData.length + ' total';
    renderHist();
    return;
  }

  try{
    histData = await fetchAll('/mgmt/api/admin/history/v1/conference/');
    histData.sort((a,b) => new Date(b.start_time) - new Date(a.start_time));
    setDot('histDot', 'live');
    document.getElementById('histMsg').textContent = `${histData.length} records`;
    document.getElementById('histCount').textContent = histData.length + ' total';
  }catch(e){
    setDot('histDot', 'err');
    document.getElementById('histMsg').textContent = 'Error: ' + e.message;
  }

  renderHist();
}

function renderHist(){
  const q = document.getElementById('histQ').value.toLowerCase();
  const list = histData.filter(h => !q || (h.name || '').toLowerCase().includes(q));

  document.getElementById('histTableCount').textContent = `${list.length} shown`;

  const body = document.getElementById('histBody');
  if(!list.length){
    body.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div>No records match</div>';
    return;
  }

  body.innerHTML = `<table>
    <thead>
      <tr>
        <th>Conference</th>
        <th>Started</th>
        <th>Duration</th>
        <th>Participants</th>
        <th>Type</th>
      </tr>
    </thead>
    <tbody>
      ${list.map(h => {
        const t = h.service_type || 'conference';
        const cls = typeCls(t);
        const dur = h.duration
          ? fmtDur(h.duration)
          : (h.end_time && h.start_time
              ? fmtDur(Math.round((new Date(h.end_time) - new Date(h.start_time)) / 1000))
              : 'Active');

        return `<tr>
          <td>
            <div class="cell-name">
              <div class="ava ${cls}" style="background:${colorFor(h.name || '')};color:#fff;width:30px;height:30px;font-size:11px">${inits(h.name || '?')}</div>
              <div class="row-name">${h.name || 'Unknown'}</div>
            </div>
          </td>
          <td style="font-size:12px;color:var(--text2)">${fmtDt(h.start_time)}</td>
          <td style="font-family:'IBM Plex Mono',monospace;font-size:12px">${dur}</td>
          <td style="font-family:'IBM Plex Mono',monospace;font-size:13px">${h.participant_count ?? '—'}</td>
          <td><span class="badge ${cls}">${typeLabel(t)}</span></td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}