// ══════════════════════════════════════════════════════════════
// SIMULATION DATA
// ══════════════════════════════════════════════════════════════
const SIM_PROFILES = {
  'Calgary HQ': {
    confHost:'pex-yyc.smithvcs.ca', mgmtHost:'mgmt-yyc.smithvcs.ca',
    user:'admin', pass:'Calgary2024!', proxy:'localhost:3000', proxyProto:'http',
    sysLoc:'YYC-MAIN', interval:30, label:'Calgary HQ', sim:true,
    vmrs:[
      {name:'Executive Boardroom',alias:'exec.board',type:'conference',pin:'9911',guestPin:'',allowGuests:false,callType:'video',description:'C-suite meetings',live:true,participants:5},
      {name:'All Hands',alias:'allhands',type:'conference',pin:'',guestPin:'',allowGuests:true,callType:'video',description:'Company-wide meetings',live:true,participants:47},
      {name:'IT Support Room',alias:'it.support',type:'conference',pin:'',guestPin:'',allowGuests:true,callType:'video',description:'IT helpdesk VMR',live:true,participants:2},
      {name:'Training Room A',alias:'training.a',type:'lecture',pin:'1234',guestPin:'5678',allowGuests:true,callType:'video',description:'Webinar & training',live:false,participants:0},
      {name:'Sales Team',alias:'sales.team',type:'conference',pin:'',guestPin:'',allowGuests:false,callType:'video',description:'Sales department VMR',live:false,participants:0},
      {name:'Test Call Service',alias:'test.call',type:'test_call',pin:'',guestPin:'',allowGuests:true,callType:'video',description:'Pexip Test Call Service',live:false,participants:0},
      {name:'HR Confidential',alias:'hr.conf',type:'conference',pin:'7777',guestPin:'8888',allowGuests:true,callType:'video',description:'HR private meetings',live:false,participants:0},
      {name:'Reception',alias:'reception',type:'conference',pin:'',guestPin:'',allowGuests:true,callType:'video',description:'Virtual reception desk',live:false,participants:0},
    ],
    liveParticipants:{
      'exec.board':[
        {name:'Dr. Sarah Chen',role:'host',protocol:'SIP',uri:'schen@cisco.yyc.ca',duration:1842,audioMuted:false,videoMuted:false},
        {name:'Marcus Webb',role:'guest',protocol:'H.323',uri:'mwebb@poly.yyc.ca',duration:1720,audioMuted:false,videoMuted:false},
        {name:'Priya Nair',role:'guest',protocol:'WebRTC',uri:'pnair@smithvcs.ca',duration:1680,audioMuted:true,videoMuted:false},
        {name:'Tom Okafor',role:'guest',protocol:'SIP',uri:'tokafor@cisco.yyc.ca',duration:900,audioMuted:false,videoMuted:false},
        {name:'Lisa Park',role:'guest',protocol:'SIP',uri:'lpark@cisco.yyc.ca',duration:600,audioMuted:false,videoMuted:true}
      ],
      'allhands':[
        {name:'James Liu',role:'host',protocol:'SIP',uri:'jliu@cisco.yyc.ca',duration:3600,audioMuted:false,videoMuted:false},
        {name:'Alice Tremblay',role:'guest',protocol:'WebRTC',uri:'atremblay@smithvcs.ca',duration:3580,audioMuted:true,videoMuted:false},
        {name:'Bob Singh',role:'guest',protocol:'H.323',uri:'bsingh@poly.yyc.ca',duration:3400,audioMuted:true,videoMuted:false}
      ],
      'it.support':[
        {name:'Mike Torres',role:'host',protocol:'SIP',uri:'mtorres@smithvcs.ca',duration:420,audioMuted:false,videoMuted:false},
        {name:'Jane Doe',role:'guest',protocol:'WebRTC',uri:'jdoe@smithvcs.ca',duration:380,audioMuted:false,videoMuted:false}
      ],
    },
    history:[
      {name:'Executive Boardroom',type:'conference',start:'2026-05-07T14:00:00',end:'2026-05-07T15:30:00',duration:5400,participants:6},
      {name:'All Hands',type:'conference',start:'2026-05-07T10:00:00',end:'2026-05-07T11:00:00',duration:3600,participants:89},
      {name:'Training Room A',type:'lecture',start:'2026-05-06T13:00:00',end:'2026-05-06T14:30:00',duration:5400,participants:32},
      {name:'Sales Team',type:'conference',start:'2026-05-05T15:00:00',end:'2026-05-05T16:00:00',duration:3600,participants:8},
      {name:'IT Support Room',type:'conference',start:'2026-05-05T11:30:00',end:'2026-05-05T12:00:00',duration:1800,participants:2},
    ],
  },

  'Toronto Cloud': {
    confHost:'pex-yyz.smithvcs.ca', mgmtHost:'mgmt-yyz.smithvcs.ca',
    user:'admin', pass:'Toronto2024!', proxy:'localhost:3000', proxyProto:'http',
    sysLoc:'YYZ-CLOUD', interval:30, label:'Toronto Cloud', sim:true,
    vmrs:[
      {name:'Main Conference',alias:'main.conf',type:'conference',pin:'',guestPin:'',allowGuests:true,callType:'video',description:'Primary conference room',live:true,participants:8},
      {name:'Product Demo',alias:'product.demo',type:'conference',pin:'2468',guestPin:'1357',allowGuests:true,callType:'video',description:'Customer product demos',live:true,participants:6},
      {name:'Engineering',alias:'engineering',type:'conference',pin:'',guestPin:'',allowGuests:false,callType:'video',description:'Engineering team VMR',live:true,participants:11},
      {name:'Customer Success',alias:'cs.room',type:'conference',pin:'',guestPin:'',allowGuests:true,callType:'video',description:'Customer onboarding',live:true,participants:4},
      {name:'Webinar Stage',alias:'webinar',type:'lecture',pin:'3030',guestPin:'',allowGuests:true,callType:'video',description:'Public webinar VMR',live:true,participants:142},
      {name:'Finance Team',alias:'finance',type:'conference',pin:'6543',guestPin:'',allowGuests:false,callType:'video',description:'Finance department',live:false,participants:0},
      {name:'Partner Portal',alias:'partner',type:'conference',pin:'',guestPin:'9999',allowGuests:true,callType:'video',description:'Partner meetings',live:false,participants:0},
      {name:'Board Room',alias:'board',type:'conference',pin:'1111',guestPin:'',allowGuests:false,callType:'video',description:'Executive board room',live:false,participants:0},
      {name:'Marketing Hub',alias:'marketing',type:'conference',pin:'',guestPin:'',allowGuests:false,callType:'video',description:'Marketing team VMR',live:false,participants:0},
      {name:'Dev Standup',alias:'dev.standup',type:'conference',pin:'',guestPin:'',allowGuests:false,callType:'audio',description:'Daily dev standups',live:false,participants:0},
      {name:'Test Call Service',alias:'test.call',type:'test_call',pin:'',guestPin:'',allowGuests:true,callType:'video',description:'Pexip Test Call Service',live:false,participants:0},
      {name:'Lobby',alias:'lobby',type:'conference',pin:'',guestPin:'',allowGuests:true,callType:'video',description:'Virtual lobby',live:false,participants:0},
    ],
    liveParticipants:{
      'main.conf':[
        {name:'Aisha Okonkwo',role:'host',protocol:'SIP',uri:'aokonkwo@poly.yyz.ca',duration:2100,audioMuted:false,videoMuted:false},
        {name:'Carlos Mendez',role:'guest',protocol:'H.323',uri:'cmendez@cisco.yyz.ca',duration:1980,audioMuted:false,videoMuted:false},
        {name:'Jenny Wu',role:'guest',protocol:'WebRTC',uri:'jwu@smithvcs.ca',duration:1800,audioMuted:true,videoMuted:false},
        {name:'David Park',role:'guest',protocol:'SIP',uri:'dpark@poly.yyz.ca',duration:1650,audioMuted:false,videoMuted:true}
      ],
      'engineering':[
        {name:'Raj Patel',role:'host',protocol:'WebRTC',uri:'rpatel@smithvcs.ca',duration:5400,audioMuted:false,videoMuted:false},
        {name:'Ana Lima',role:'guest',protocol:'WebRTC',uri:'alima@smithvcs.ca',duration:5200,audioMuted:false,videoMuted:false},
        {name:'Chris Kim',role:'guest',protocol:'WebRTC',uri:'ckim@smithvcs.ca',duration:5100,audioMuted:false,videoMuted:false}
      ],
    },
    history:[
      {name:'Main Conference',type:'conference',start:'2026-05-07T09:00:00',end:'2026-05-07T10:30:00',duration:5400,participants:12},
      {name:'Webinar Stage',type:'lecture',start:'2026-05-07T14:00:00',end:'2026-05-07T15:00:00',duration:3600,participants:187},
      {name:'Engineering',type:'conference',start:'2026-05-06T10:00:00',end:'2026-05-06T11:00:00',duration:3600,participants:9},
      {name:'Product Demo',type:'conference',start:'2026-05-06T14:00:00',end:'2026-05-06T15:00:00',duration:3600,participants:5},
    ],
  }
};

// ══════════════════════════════════════════════════════════════
// BUILT-IN CONFERENCE TEMPLATES
// ══════════════════════════════════════════════════════════════
const TEMPLATES = {
  'Executive': {
    desc:'C-suite and board meeting participants',
    sites:[
      {name:'Calgary HQ Boardroom',location:'Calgary',uri:'boardroom.yyc@cisco.smithvcs.ca',protocol:'sip',type:'room'},
      {name:'Toronto Executive Suite',location:'Toronto',uri:'exec.yyz@poly.smithvcs.ca',protocol:'h323',type:'room'},
      {name:'Vancouver Office',location:'Vancouver',uri:'board.yvr@cisco.smithvcs.ca',protocol:'sip',type:'room'},
      {name:'CEO – Mobile',location:'Remote',uri:'ceo@webrtc.smithvcs.ca',protocol:'sip',type:'personal'},
      {name:'CFO – Office',location:'Calgary',uri:'cfo.yyc@cisco.smithvcs.ca',protocol:'sip',type:'personal'},
    ]
  },
  'All Hands': {
    desc:'Company-wide all-staff meeting — all offices',
    sites:[
      {name:'Calgary Main Hall',location:'Calgary',uri:'mainhall.yyc@cisco.smithvcs.ca',protocol:'sip',type:'room'},
      {name:'Calgary Overflow A',location:'Calgary',uri:'overflow-a.yyc@cisco.smithvcs.ca',protocol:'sip',type:'room'},
      {name:'Calgary Overflow B',location:'Calgary',uri:'overflow-b.yyc@cisco.smithvcs.ca',protocol:'sip',type:'room'},
      {name:'Toronto Conference Centre',location:'Toronto',uri:'confcentre.yyz@poly.smithvcs.ca',protocol:'h323',type:'room'},
      {name:'Toronto Atrium',location:'Toronto',uri:'atrium.yyz@poly.smithvcs.ca',protocol:'h323',type:'room'},
      {name:'Vancouver All-Staff',location:'Vancouver',uri:'allstaff.yvr@cisco.smithvcs.ca',protocol:'sip',type:'room'},
      {name:'Montreal Office',location:'Montreal',uri:'allhands.yul@cisco.smithvcs.ca',protocol:'sip',type:'room'},
      {name:'Ottawa Government Centre',location:'Ottawa',uri:'gov.yow@poly.smithvcs.ca',protocol:'h323',type:'room'},
    ]
  },
  'Training': {
    desc:'Instructor + student sites for webinars and training sessions',
    sites:[
      {name:'Instructor Station',location:'Calgary',uri:'instructor.yyc@cisco.smithvcs.ca',protocol:'sip',type:'room'},
      {name:'Calgary Training Lab',location:'Calgary',uri:'training-lab.yyc@cisco.smithvcs.ca',protocol:'sip',type:'room'},
      {name:'Toronto Training Room',location:'Toronto',uri:'training.yyz@poly.smithvcs.ca',protocol:'h323',type:'room'},
      {name:'Vancouver Training',location:'Vancouver',uri:'training.yvr@cisco.smithvcs.ca',protocol:'sip',type:'room'},
    ]
  },
  'IT Incident': {
    desc:'Rapid response — IT and operations teams',
    sites:[
      {name:'IT NOC – Calgary',location:'Calgary',uri:'noc.yyc@cisco.smithvcs.ca',protocol:'sip',type:'room'},
      {name:'IT Operations – Toronto',location:'Toronto',uri:'ops.yyz@poly.smithvcs.ca',protocol:'h323',type:'room'},
      {name:'CTO – Direct',location:'Remote',uri:'cto@smithvcs.ca',protocol:'sip',type:'personal'},
      {name:'On-Call Engineer',location:'Remote',uri:'oncall@smithvcs.ca',protocol:'sip',type:'personal'},
    ]
  },
  'Sales Call': {
    desc:'Sales team + client endpoint',
    sites:[
      {name:'Sales Lead – Calgary',location:'Calgary',uri:'sales.lead.yyc@cisco.smithvcs.ca',protocol:'sip',type:'personal'},
      {name:'Account Manager',location:'Toronto',uri:'am.yyz@poly.smithvcs.ca',protocol:'sip',type:'personal'},
      {name:'Client Endpoint',location:'External',uri:'client@external.com',protocol:'sip',type:'external'},
    ]
  },
  'Empty': {
    desc:'Start with no pre-loaded sites — add endpoints manually',
    sites:[]
  },
};

// ══════════════════════════════════════════════════════════════
// SHARED CONFIG GLOBALS
// ══════════════════════════════════════════════════════════════
const STORE = 'pexip_cfg_v3', PROF_STORE = 'pexip_prof_v3';
let CFG = {
  confHost:'',
  mgmtHost:'',
  user:'',
  pass:'',
  proxy:'localhost:3000',
  proxyProto:'http',
  sysLoc:'DEV',
  interval:30,
  label:'',
  sim:false
};
let SIM_DATA = null;

// ══════════════════════════════════════════════════════════════
// API
// ══════════════════════════════════════════════════════════════
function proxyBase(){
  return `${CFG.proxyProto}://${CFG.proxy || 'localhost:3000'}`;
}

function apiHdrs(){
  return {
    'Authorization':'Basic ' + btoa(`${CFG.user}:${CFG.pass}`),
    'Content-Type':'application/json'
  };
}

async function apiFetch(path, method='GET', body=null){
  const opts = { method, headers: apiHdrs() };
  if(body) opts.body = JSON.stringify(body);

  const r = await fetch(proxyBase() + path, opts);

  const txt = await r.text();
  let data = null;

  try{
    data = txt ? JSON.parse(txt) : null;
  }catch{
    data = txt || null;
  }

  if(!r.ok){
    const msg =
      (data && typeof data === 'object' && (data.detail || data.error || data.message)) ||
      (typeof data === 'string' && data) ||
      ('HTTP ' + r.status);

    throw new Error(msg);
  }

  return data;
}

async function clientPost(path, body){
  const r = await fetch(proxyBase() + path, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body:JSON.stringify(body)
  });
  return r.json();
}

async function fetchAll(path){
  let all = [], url = path + '?limit=500&offset=0';
  while(url){
    const d = await apiFetch(url);
    all.push(...(d.objects || d.results || []));
    url = d.meta?.next ? '/mgmt' + d.meta.next : null;
  }
  return all;
}

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
const COLORS = ['#00B894','#2D7DD2','#7B5EA7','#E05252','#F5A623','#16A085','#8E44AD','#E67E22','#C0392B','#2980B9'];

function colorFor(s){
  let h = 0;
  for(const c of s || '') h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return COLORS[h % COLORS.length];
}

function inits(n){
  return (n || '?')
    .split(/\s+/)
    .slice(0,2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('') || '?';
}

function setDot(id, t){
  const el = document.getElementById(id);
  if(el) el.className = 'dot ' + t;
}

function setNDot(id, t){
  const el = document.getElementById(id);
  if(el) el.className = 'ndot ' + t;
}

function esc(s){
  return (s || '').replace(/'/g,"\\'").replace(/"/g,'&quot;');
}

function fmtDur(s){
  if(!s) return '—';
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  return h ? `${h}h ${m}m` : m ? `${m}m ${sec}s` : `${sec}s`;
}

function fmtDt(iso){
  if(!iso) return '—';
  return new Date(iso).toLocaleString(undefined,{
    month:'short',
    day:'numeric',
    hour:'2-digit',
    minute:'2-digit'
  });
}

function typeLabel(t){
  return t === 'test_call' ? 'Test Call' : t === 'lecture' ? 'Lecture' : 'Conference';
}

function typeCls(t){
  return t === 'test_call' ? 'test' : t === 'lecture' ? 'lecture' : 'conf';
}

function toast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

function copyTxt(txt, msg){
  navigator.clipboard
    .writeText(txt)
    .then(() => toast((msg || 'Copied') + ': ' + txt))
    .catch(() => toast(txt));
}

// ══════════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════════
const PANELS = ['conferences','launch','templates','addressbook','history','settings'];
const PAGES = {
  conferences:['Conferences','Live VMR status'],
  launch:['Launch Conference','Select VMR → template → control room'],
  templates:['Templates','Create and manage conference site templates'],
  addressbook:['Address Book','Manage reusable endpoint directory'],
  history:['Call History','All call records'],
  settings:['Settings','Connection and environments']
};

let activePanel = 'conferences';

function showPanel(id){
  
  if(typeof stopCtrlAutoRefresh === 'function' && id !== 'launch'){
    stopCtrlAutoRefresh();
  }
if(id === 'addressbook'){
  closeAbEditor();
  renderAddressBook();
}
  activePanel = id;

  PANELS.forEach(k => {
    document.getElementById('panel-' + k).classList.toggle('show', k === id);
    const nb = document.getElementById('nav-' + k);
    if(nb) nb.classList.toggle('active', k === id);
  });

  document.getElementById('pageTitle').textContent = PAGES[id][0];
  document.getElementById('pageSub').textContent = PAGES[id][1];
  document.getElementById('autoBtn').style.display = id === 'conferences' ? 'inline-flex' : 'none';

  if(id === 'launch') resetWizard();
  if(id === 'history' && !histLoaded) fetchHist();
  if(id === 'settings'){
    renderProfiles();
    applyFields();
  }
  if(id === 'templates'){
    closeTplEditor();
    renderTplManager();
  }
}

// ══════════════════════════════════════════════════════════════
// WIZARD (STEP 1 / STEP 2)
// ══════════════════════════════════════════════════════════════
let wizVmr = null, wizTemplate = null;

function resetWizard(){
  wizVmr = null;
  wizTemplate = null;
  setWizStep(1);
  buildVmrPicker();
  document.getElementById('wizNext1').disabled = true;
}

function setWizStep(n){
  [1,2,3].forEach(i => {
    const s = document.getElementById(`ws${i}`);
    const l = document.getElementById(`wl${i}`);
    s.className = 'wstep' + (i < n ? ' done' : i === n ? ' active' : '');
    if(l) l.className = 'wstep-line' + (i < n ? ' done' : '');
  });

  [1,2,3].forEach(i => {
    document.getElementById(`wiz-step${i}`).style.display = i === n ? 'block' : 'none';
  });
}

function wizStartWith(alias){
  showPanel('launch');
  const conf = confData.find(c => c.primaryAlias === alias);
  if(conf){
    wizVmr = conf;
    buildVmrPicker();
    document.getElementById('wizNext1').disabled = false;
    wizGoStep2();
  }
}

function buildVmrPicker(){
  const grid = document.getElementById('vmrPickerGrid');

  if(!confData.length){
    grid.innerHTML = '<p style="font-size:13px;color:var(--text3)">No VMRs loaded — go to Conferences first.</p>';
    return;
  }

  grid.innerHTML = confData.map(c => {
    const cls = typeCls(c.type);
    const sel = wizVmr && wizVmr.primaryAlias === c.primaryAlias ? 'selected' : '';
    const statusHtml = c.live
      ? `<span style="color:var(--teal);font-size:11px"><span class="live-dot"></span>Active · ${c.participants} participants</span>`
      : `<span style="color:var(--text3);font-size:11px">Idle</span>`;

    return `<div class="vmr-card ${sel}" onclick="pickVmr('${esc(c.primaryAlias)}')">
      <div class="vmr-card-icon" style="background:${colorFor(c.name)}">${inits(c.name)}</div>
      <div class="vmr-card-name">${c.name}</div>
      <div class="vmr-card-alias">${c.primaryAlias}</div>
      <div style="margin-bottom:6px"><span class="badge ${cls}" style="font-size:10px">${typeLabel(c.type)}</span></div>
      <div class="vmr-card-status">${statusHtml}</div>
    </div>`;
  }).join('');
}

function pickVmr(alias){
  wizVmr = confData.find(c => c.primaryAlias === alias);
  document.querySelectorAll('.vmr-card').forEach(el => el.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
  document.getElementById('wizNext1').disabled = false;
}

function wizGoStep2(){
  if(!wizVmr) return;

  setWizStep(2);
  const grid = document.getElementById('tplPickerGrid');

  grid.innerHTML = Object.entries(getAllTemplates()).map(([name, tpl]) => {
    const sel = wizTemplate && wizTemplate.name === name ? 'selected' : '';
    return `<div class="tpl-card ${sel}" onclick="pickTemplate('${esc(name)}')">
      <div class="tpl-card-name">${name}</div>
      <div class="tpl-card-desc">${tpl.desc}</div>
      <div class="tpl-card-sites">${tpl.sites.length} site${tpl.sites.length!==1?'s':''} pre-loaded</div>
    </div>`;
  }).join('');

  document.getElementById('wizNext2').disabled = !wizTemplate;
}

function pickTemplate(name){
  wizTemplate = { name, data:getAllTemplates()[name] };
  document.querySelectorAll('.tpl-card').forEach(el => el.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
  document.getElementById('wizNext2').disabled = false;
}

function wizGoStep1(){
  setWizStep(1);
}

// ══════════════════════════════════════════════════════════════
// SHARED REFRESH DISPATCH
// ══════════════════════════════════════════════════════════════
function onRefresh(){
  if(activePanel === 'conferences'){
    SIM_DATA ? loadSimConfs() : fetchConf();
    if(autoOn) startAuto();
  }

  if(activePanel === 'history'){
    fetchHist();
  }
}