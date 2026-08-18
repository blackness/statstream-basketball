import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../supabase';
import {
  Sun, Moon, Undo2, BarChart2, X, ChevronRight,
  AlertTriangle, Play, Pause, ArrowLeftRight
} from 'lucide-react';
import { isHexColor, teamGradientStyle } from '../../utils/colorUtils';
import ShareButton from '../Shared/ShareButton';
import LineupModal from '../Game/LineupModal';
import { buildRow, sumRows, fmtPct, STAT_COLS, EMPTY_STATS } from '../../utils/statsHelpers';

const haptic  = () => navigator.vibrate?.(8);
const genId   = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const useOrientation = () => {
  const [ls, setLs] = useState(
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false
  );
  useEffect(() => {
    const u = () => setLs(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', u);
    window.addEventListener('orientationchange', u);
    return () => { window.removeEventListener('resize', u); window.removeEventListener('orientationchange', u); };
  }, []);
  return ls;
};

const STAT_DEFS = [
  { key:'fg2m',    label:'2PT ✓', updates:{fgm:1,fga:1,pts:2},
    light:'bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-100',
    dark: 'bg-blue-600 hover:bg-blue-500 text-white' },
  { key:'fg2miss', label:'2PT ✗', updates:{fga:1},
    light:'bg-white border border-blue-300 text-blue-600 hover:bg-blue-50',
    dark: 'bg-gray-800 border border-blue-800 text-blue-400 hover:bg-gray-700' },
  { key:'fg3m',    label:'3PT ✓', updates:{tpm:1,tpa:1,pts:3},
    light:'bg-violet-500 hover:bg-violet-600 text-white shadow-sm shadow-violet-100',
    dark: 'bg-violet-600 hover:bg-violet-500 text-white' },
  { key:'fg3miss', label:'3PT ✗', updates:{tpa:1},
    light:'bg-white border border-violet-300 text-violet-600 hover:bg-violet-50',
    dark: 'bg-gray-800 border border-violet-800 text-violet-400 hover:bg-gray-700' },
  { key:'ftm',     label:'FT ✓',  updates:{ftm:1,fta:1,pts:1},
    light:'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-100',
    dark: 'bg-emerald-600 hover:bg-emerald-500 text-white' },
  { key:'ftmiss',  label:'FT ✗',  updates:{fta:1},
    light:'bg-white border border-emerald-300 text-emerald-600 hover:bg-emerald-50',
    dark: 'bg-gray-800 border border-emerald-800 text-emerald-400 hover:bg-gray-700' },
  { key:'dreb',    label:'D-REB', updates:{dreb:1},
    light:'bg-slate-600 hover:bg-slate-700 text-white shadow-sm',
    dark: 'bg-slate-700 hover:bg-slate-600 text-white' },
  { key:'oreb',    label:'O-REB', updates:{oreb:1},
    light:'bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-100',
    dark: 'bg-orange-600 hover:bg-orange-500 text-white' },
  { key:'ast',     label:'AST',   updates:{ast:1},
    light:'bg-amber-400 hover:bg-amber-500 text-white shadow-sm shadow-amber-100',
    dark: 'bg-amber-500 hover:bg-amber-400 text-white' },
  { key:'stl',     label:'STL',   updates:{stl:1},
    light:'bg-teal-500 hover:bg-teal-600 text-white shadow-sm shadow-teal-100',
    dark: 'bg-teal-600 hover:bg-teal-500 text-white' },
  { key:'blk',     label:'BLK',   updates:{blk:1},
    light:'bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm shadow-indigo-100',
    dark: 'bg-indigo-600 hover:bg-indigo-500 text-white' },
  { key:'to',      label:'TO',    updates:{to:1},
    light:'bg-rose-500 hover:bg-rose-600 text-white shadow-sm shadow-rose-100',
    dark: 'bg-rose-600 hover:bg-rose-500 text-white' },
  { key:'pf',      label:'FOUL',  updates:{pf:1},
    light:'bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-100',
    dark: 'bg-red-600 hover:bg-red-500 text-white' },
];
const STAT_MAP = Object.fromEntries(STAT_DEFS.map(s => [s.key, s]));

const PORTRAIT_ROWS = [
  ['fg2m',    'fg3m',    'ftm',    'dreb'],
  ['fg2miss', 'fg3miss', 'ftmiss', 'oreb'],
  ['ast',     'stl',     'blk',    'to'  ],
  ['pf',      '__d1',    '__d2',   '__d3'],
];

const LANDSCAPE_ROWS = [
  ['fg2m',  'fg2miss'],
  ['fg3m',  'fg3miss'],
  ['ftm',   'ftmiss' ],
  ['dreb',  'oreb'   ],
  ['ast',   'stl'    ],
  ['blk',   'to'     ],
  ['pf',    '__undo' ],
];

// ─── FoulDots ─────────────────────────────────────────────────────────────────
const FoulDots = React.memo(({ count = 0, limit = 5, className = '' }) => (
  <div className={`flex gap-[3px] ${className}`}>
    {Array.from({ length: Math.min(limit, 6) }, (_, i) => (
      <div key={i} className={`rounded-full w-2 h-2 transition-colors ${
        i < count ? count >= limit ? 'bg-red-500' : 'bg-yellow-400' : 'bg-white/20'
      }`} />
    ))}
  </div>
));

// ─── PlayerCard ───────────────────────────────────────────────────────────────
const PlayerCard = React.memo(({
  player, stats, isSelected, isOpp, isDark,
  foulLimit, teamColor, onSelect, onHold, onDoubleClick,
}) => {
  const holdTimer = useRef(null);
  const didHold   = useRef(false);
  const s   = stats || EMPTY_STATS;
  const reb = (s.oreb || 0) + (s.dreb || 0);

  const borderColor = isSelected
    ? isOpp ? '#ef4444' : (isHexColor(teamColor) ? teamColor : '#3b82f6')
    : isDark ? '#374151' : '#e5e7eb';

  const bgCls = isSelected
    ? isDark ? 'bg-gray-800' : 'bg-white shadow-md'
    : isDark ? 'bg-gray-800/50' : 'bg-gray-50';

  const onDown = useCallback(() => {
    didHold.current = false;
    holdTimer.current = setTimeout(() => {
      didHold.current = true;
      haptic(); haptic();
      onHold?.(player);
    }, 550);
  }, [player, onHold]);

  const onUp = useCallback(() => {
    clearTimeout(holdTimer.current);
    if (!didHold.current) onSelect(player);
    didHold.current = false;
  }, [player, onSelect]);
  
  return (
    <button
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerLeave={() => clearTimeout(holdTimer.current)}
      onDoubleClick={() => onDoubleClick?.(player)}
      className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl border-2 transition-all duration-150 select-none min-w-0 overflow-hidden ${bgCls}`}
      style={{
        borderColor,
        boxShadow: isSelected ? `0 0 0 2px ${borderColor}30, 0 4px 12px ${borderColor}20` : undefined,
      }}
    >
      <span className="text-[9px] font-black leading-none" style={{ color: isSelected ? borderColor : isDark ? '#6b7280' : '#9ca3af' }}>
        #{player.number || '—'}
      </span>
      <span className={`text-[11px] font-black truncate w-full text-center leading-tight mt-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {player.name.split(' ')[0]}
      </span>
      <span className="text-lg font-black leading-none mt-1 tabular-nums" style={{ color: isSelected ? borderColor : isDark ? '#d1d5db' : '#111827' }}>
        {s.pts || 0}
      </span>
      <span className={`text-[9px] font-semibold leading-none mt-0.5 tabular-nums ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
        {reb}/{s.ast || 0}
      </span>
      <div className="flex gap-[2px] mt-1">
        {Array.from({ length: Math.min(foulLimit, 5) }, (_, i) => (
          <div key={i} className={`rounded-full w-1.5 h-1.5 ${
            i < (s.pf || 0)
              ? (s.pf || 0) >= foulLimit ? 'bg-red-500' : 'bg-yellow-400'
              : isDark ? 'bg-gray-700' : 'bg-gray-200'
          }`} />
        ))}
      </div>
    </button>
  );
});

// ─── OppTile ──────────────────────────────────────────────────────────────────
const OppTile = React.memo(({ isActive, isDark, oppScore, onPress }) => (
  <button
    onClick={onPress}
    className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl border-2 transition-all duration-150 select-none min-w-0 ${
      isActive
        ? isDark ? 'border-red-500 bg-red-950' : 'border-red-400 bg-red-50 shadow-md'
        : isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
    }`}
    style={{ boxShadow: isActive ? `0 0 0 2px #ef444430, 0 4px 12px #ef444420` : undefined }}
  >
    <span className={`text-[9px] font-black ${isActive ? 'text-red-400' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>OPP</span>
    <span className={`text-lg font-black tabular-nums leading-none mt-1 ${isActive ? 'text-red-500' : isDark ? 'text-gray-300' : 'text-gray-600'}`}>{oppScore}</span>
    <span className={`text-[9px] font-semibold mt-0.5 ${isActive ? 'text-red-400' : isDark ? 'text-gray-600' : 'text-gray-400'}`}>{isActive ? 'ACTIVE' : 'STATS'}</span>
    <div className="w-4 h-1.5 mt-1" />
  </button>
));

// ─── StatButton ───────────────────────────────────────────────────────────────
const StatButton = React.memo(({ statKey, isDark, onStat, disabled }) => {
  const [pressed, setPressed] = useState(false);
  const def = STAT_MAP[statKey];
  if (!def) return <div />;
  return (
    <button
      onPointerDown={() => { setPressed(true); haptic(); }}
      onPointerUp={() => { setPressed(false); if (!disabled) onStat(def); }}
      onPointerLeave={() => setPressed(false)}
      disabled={disabled}
      className={`w-full h-full rounded-xl font-black text-sm select-none transition-all duration-100 disabled:opacity-20 disabled:cursor-not-allowed ${isDark ? def.dark : def.light} ${pressed ? 'scale-90 brightness-90' : 'scale-100'}`}
    >
      {def.label}
    </button>
  );
});

// ─── SubModal ─────────────────────────────────────────────────────────────────
// ✅ Receives going/setGoing/coming/setComing from parent — no internal state
const SubModal = React.memo(({
  courtPlayers, benchPlayers, ourStats, getLiveMin, isDark,
  going, setGoing, coming, setComing,
  onConfirm, onClose
}) => {
  const toggle = (arr, setArr, id) =>
    setArr(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const canConfirm = going.length > 0 && coming.length > 0 && going.length === coming.length;

  const root = isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200';
  const hdr  = isDark ? 'border-gray-800' : 'border-gray-100';
  const txt  = isDark ? 'text-white' : 'text-gray-900';
  const mut  = isDark ? 'text-gray-400' : 'text-gray-500';
  const fnt  = isDark ? 'text-gray-600' : 'text-gray-400';

  const cardCls = (selected, side) => `
    flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-left w-full
    ${selected
      ? side === 'out'
        ? isDark ? 'border-orange-500 bg-orange-950' : 'border-orange-400 bg-orange-50'
        : isDark ? 'border-blue-500 bg-blue-950' : 'border-blue-400 bg-blue-50'
      : isDark ? 'border-gray-800 bg-gray-800' : 'border-gray-100 bg-gray-50'}
  `;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center">
      <div className={`w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border-t sm:border overflow-hidden flex flex-col max-h-[85vh] ${root}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${hdr} flex-shrink-0`}>
          <div>
            <h3 className={`font-black text-sm ${txt}`}>Substitutions</h3>
            <p className={`text-[11px] mt-0.5 ${mut}`}>
              {going.length === 0
                ? 'Select players going OUT'
                : coming.length === 0
                ? `${going.length} going out — select coming IN`
                : going.length === coming.length
                ? `✓ ${going.length} sub${going.length > 1 ? 's' : ''} ready`
                : `${going.length} out · ${coming.length} in — must match`}
            </p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-400'}`}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-px">
            <div className={`p-3 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>Going OUT</p>
              <div className="space-y-1.5">
                {courtPlayers.map(p => (
                  <button key={p.id} onClick={() => toggle(going, setGoing, p.id)} className={cardCls(going.includes(p.id), 'out')}>
                    <span className={`text-[9px] font-bold flex-shrink-0 ${mut}`}>#{p.number || '—'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-black truncate ${txt}`}>{p.name.split(' ')[0]}</p>
                      <p className={`text-[9px] ${fnt}`}>{getLiveMin(p.id)} min · {ourStats[p.id]?.pts || 0} pts</p>
                    </div>
                    {going.includes(p.id) && <span className="text-orange-500 font-black text-xs flex-shrink-0">✓</span>}
                  </button>
                ))}
              </div>
            </div>
            <div className={`p-3 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Coming IN</p>
              <div className="space-y-1.5">
                {benchPlayers.length === 0 ? (
                  <p className={`text-xs text-center py-6 ${fnt}`}>No bench players</p>
                ) : benchPlayers.map(p => (
                  <button key={p.id} onClick={() => toggle(coming, setComing, p.id)} className={cardCls(coming.includes(p.id), 'in')}>
                    <span className={`text-[9px] font-bold flex-shrink-0 ${mut}`}>#{p.number || '—'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-black truncate ${txt}`}>{p.name.split(' ')[0]}</p>
                      <p className={`text-[9px] ${fnt}`}>{getLiveMin(p.id)} min</p>
                    </div>
                    {coming.includes(p.id) && <span className="text-blue-500 font-black text-xs flex-shrink-0">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={`px-5 py-4 border-t ${hdr} flex gap-3 flex-shrink-0`}>
          <button onClick={onClose} className={`flex-1 py-3 rounded-xl font-bold text-sm ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>Cancel</button>
          <button
            onClick={() => canConfirm && onConfirm(going, coming)}
            disabled={!canConfirm}
            className="flex-1 py-3 rounded-xl font-black text-sm bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-40 transition"
          >
            Sub {going.length > 0 ? `(${going.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
});

// ─── BoxScoreModal ────────────────────────────────────────────────────────────
const BoxScoreModal = React.memo(({
  team, opponent, ourStats, opponentStats,
  opponentRoster, isQuick, isDark, tab, setTab, onClose
}) => {
  
  const isOurs = tab === 'ours';

  const roster  = team?.roster || [];
  const ourRows = roster.map(p => buildRow(p, ourStats));

  const oppStats_   = opponentStats || {};
  const oppRoster_  = opponentRoster || [];
  const isQuickMode = oppRoster_.length === 0 && !!oppStats_['opp-team'];
  const oppRows     = isQuickMode
    ? [buildRow({ id: 'opp-team', name: opponent, number: '—' }, oppStats_)]
    : oppRoster_.map(p => buildRow(p, oppStats_));

  const rows   = isOurs ? ourRows : oppRows;
  const totals = isOurs ? sumRows(ourRows) : sumRows(oppRows);
  const ourTot = sumRows(ourRows);
  const oppTot = sumRows(oppRows);
  const ptsCls = isOurs ? 'text-blue-500' : 'text-red-500';

  const bg   = isDark ? 'bg-gray-950' : 'bg-white';
  const hdr  = isDark ? 'border-gray-800' : 'border-gray-100';
  const txt  = isDark ? 'text-white'  : 'text-gray-900';
  const mut  = isDark ? 'text-gray-500' : 'text-gray-400';
  const rowA = isDark ? 'bg-gray-950' : 'bg-white';
  const rowB = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const cmp  = isDark ? 'bg-gray-800' : 'bg-gray-50';

  const COMPARE_STATS = [
    { label: 'PTS',  our: ourTot.pts,  opp: oppTot.pts,  bold: true },
    { label: 'FG%',  our: fmtPct(ourTot.fgm + ourTot.tpm, ourTot.fga + ourTot.tpa), opp: fmtPct(oppTot.fgm + oppTot.tpm, oppTot.fga + oppTot.tpa) },
    { label: '3P%',  our: fmtPct(ourTot.tpm, ourTot.tpa), opp: fmtPct(oppTot.tpm, oppTot.tpa) },
    { label: 'FT%',  our: fmtPct(ourTot.ftm, ourTot.fta), opp: fmtPct(oppTot.ftm, oppTot.fta) },
    { label: 'REB',  our: ourTot.reb,  opp: oppTot.reb  },
    { label: 'OREB', our: ourTot.oreb, opp: oppTot.oreb },
    { label: 'DREB', our: ourTot.dreb, opp: oppTot.dreb },
    { label: 'AST',  our: ourTot.ast,  opp: oppTot.ast  },
    { label: 'STL',  our: ourTot.stl,  opp: oppTot.stl  },
    { label: 'BLK',  our: ourTot.blk,  opp: oppTot.blk  },
    { label: 'TO',   our: ourTot.to,   opp: oppTot.to,   lowerBetter: true },
    { label: 'PF',   our: ourTot.pf,   opp: oppTot.pf,   lowerBetter: true },
  ];

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${bg}`}>
      <div className={`flex items-center justify-between px-4 py-3 border-b ${hdr} flex-shrink-0`}>
        <h2 className={`font-black text-sm ${txt}`}>Box Score</h2>
        <button onClick={onClose} className={`p-1.5 rounded-lg ${mut}`}><X size={18} /></button>
      </div>

      <div className={`flex p-2 gap-1 border-b ${hdr} flex-shrink-0`}>
        <button onClick={() => setTab('ours')} className={`flex-1 py-2 rounded-xl text-xs font-black transition ${isOurs ? 'bg-blue-500 text-white' : isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>{team?.name}</button>
        <button onClick={() => setTab('opp')} className={`flex-1 py-2 rounded-xl text-xs font-black transition ${tab === 'opp' ? 'bg-red-500 text-white' : isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>{opponent}</button>
        <button onClick={() => setTab('compare')} className={`flex-1 py-2 rounded-xl text-xs font-black transition ${tab === 'compare' ? isDark ? 'bg-gray-600 text-white' : 'bg-gray-800 text-white' : isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>Compare</button>
      </div>

      <div className="flex-1 overflow-auto">
        {(tab === 'ours' || tab === 'opp') && (
          rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className={`text-sm font-bold ${mut}`}>No stats recorded</p>
              {tab === 'opp' && isQuick && <p className={`text-xs mt-1 ${mut}`}>Stats logged via OPP tile appear here</p>}
            </div>
          ) : (
            <table className="text-xs min-w-max w-full">
              <thead>
                <tr className={`border-b ${hdr}`}>
                  <th className={`text-left py-2 px-3 font-bold sticky left-0 min-w-[120px] ${isDark ? 'text-gray-500 bg-gray-950' : 'text-gray-400 bg-white'}`}>Player</th>
                  {STAT_COLS.map(col => (
                    <th key={col.label} className={`py-2 px-2 text-right font-bold ${col.muted ? isDark ? 'text-gray-700' : 'text-gray-300' : mut}`}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...rows].sort((a, b) => b.pts - a.pts).map((row, i) => (
                  <tr key={row.id} className={i % 2 === 0 ? rowA : rowB}>
                    <td className={`py-2 px-3 sticky left-0 ${i % 2 === 0 ? rowA : rowB}`}>
                      <span className={`font-mono text-[10px] mr-1.5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>#{row.number}</span>
                      <span className={`font-bold ${txt}`}>{row.name}</span>
                    </td>
                    {STAT_COLS.map(col => (
                      <td key={col.label} className={`py-2 px-2 text-right tabular-nums ${col.bold ? `font-black ${ptsCls}` : col.muted ? isDark ? 'text-gray-700' : 'text-gray-400' : isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={`border-t-2 font-black ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100'}`}>
                  <td className={`py-2 px-3 sticky left-0 text-[10px] uppercase ${isDark ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>Team</td>
                  {STAT_COLS.map(col => (
                    <td key={col.label} className={`py-2 px-2 text-right tabular-nums ${col.bold ? ptsCls : col.muted ? isDark ? 'text-gray-700' : 'text-gray-400' : isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {col.render(totals)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          )
        )}

        {tab === 'compare' && (
          <div className="p-4 space-y-2">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${cmp}`}>
              <span className={`flex-1 text-[10px] font-black uppercase tracking-wider ${mut}`}>Stat</span>
              <span className="w-16 text-center text-[10px] font-black text-blue-500 uppercase truncate">{team?.name}</span>
              <span className="w-4" />
              <span className="w-16 text-center text-[10px] font-black text-red-500 uppercase truncate">{opponent}</span>
            </div>
            {COMPARE_STATS.map(({ label, our, opp, bold, lowerBetter }) => {
              const ourN = typeof our === 'number' ? our : parseInt(our) || 0;
              const oppN = typeof opp === 'number' ? opp : parseInt(opp) || 0;
              const tie  = our === opp || (our === '—' && opp === '—');
              const ourW = !tie && (lowerBetter ? ourN < oppN : ourN > oppN);
              const oppW = !tie && !ourW;
              return (
                <div key={label} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-white'}`}>
                  <div className="w-16 text-center">
                    <span className={`text-sm tabular-nums font-black ${ourW ? 'text-emerald-500' : bold ? isDark ? 'text-white' : 'text-gray-900' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>{our ?? '—'}</span>
                    {ourW && <span className="block text-[8px] text-emerald-500 font-bold leading-none mt-0.5">▲</span>}
                  </div>
                  <div className="flex-1 text-center">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${mut}`}>{label}</span>
                    {!tie && typeof our === 'number' && typeof opp === 'number' && our + opp > 0 && (
                      <div className={`flex h-1 rounded-full overflow-hidden mt-1 mx-2 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <div className="bg-blue-500 rounded-full" style={{ width: `${(our / (our + opp)) * 100}%` }} />
                        <div className="bg-red-500 rounded-full" style={{ width: `${(opp / (our + opp)) * 100}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="w-16 text-center">
                    <span className={`text-sm tabular-nums font-black ${oppW ? 'text-emerald-500' : bold ? isDark ? 'text-white' : 'text-gray-900' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>{opp ?? '—'}</span>
                    {oppW && <span className="block text-[8px] text-emerald-500 font-bold leading-none mt-0.5">▲</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

// ─── EditPlayModal ────────────────────────────────────────────────────────────
const EditPlayModal = React.memo(({ play, isDark, onDelete, onClose }) => {
  const [deleting, setDeleting] = useState(false);
  const LABELS = { fg2m:'2PT Make', fg2miss:'2PT Miss', fg3m:'3PT Make', fg3miss:'3PT Miss', ftm:'FT Make', ftmiss:'FT Miss', oreb:'Off Reb', dreb:'Def Reb', ast:'Assist', stl:'Steal', blk:'Block', to:'Turnover', pf:'Foul', sub_in:'Sub', score:'Score' };
  const root  = isDark ? 'bg-gray-900 border-t border-gray-700' : 'bg-white border-t border-gray-200';
  const txt   = isDark ? 'text-white' : 'text-gray-900';
  const mut   = isDark ? 'text-gray-500' : 'text-gray-400';
  const inner = isDark ? 'bg-gray-800' : 'bg-gray-50 border border-gray-100';
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center">
      <div className={`w-full max-w-sm rounded-t-2xl p-5 ${root}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-black text-sm ${txt}`}>Remove Play</h3>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${mut}`}><X size={16} /></button>
        </div>
        <div className={`rounded-xl p-4 mb-5 ${inner}`}>
          <p className={`text-[10px] mb-1 ${mut}`}>Q{play.period} · {play.clock} · {play.team === 'opponent' ? 'OPP' : 'OUR'}</p>
          <p className={`font-black ${txt}`}>{play.label}</p>
          <p className="text-xs text-blue-500 mt-1">{LABELS[play.action] || play.action}</p>
          {play.pts > 0 && <p className="text-xs text-emerald-500 mt-0.5">+{play.pts} pts</p>}
        </div>
        <button
          onClick={async () => { setDeleting(true); await onDelete(play); }}
          disabled={deleting}
          className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black text-sm transition disabled:opacity-50"
        >
          {deleting ? 'Removing...' : '✕ Remove This Play'}
        </button>
        <p className={`text-center text-[10px] mt-2 ${isDark ? 'text-gray-700' : 'text-gray-400'}`}>Stats and score will be reversed</p>
      </div>
    </div>
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────
const LiveGameView = ({ user, team, gameSettings, existingGame = null, onGoHome, toast }) => {
  const isLandscape = useOrientation();

  // ── Theme ────────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => localStorage.getItem('ss_theme') || 'light');
  const isDark = theme === 'dark';
  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('ss_theme', next);
  };

  const isQuick   = (gameSettings.trackingMode || 'quick') === 'quick';
  const foulLimit = gameSettings.foulLimit || 5;

  // ── Game state ───────────────────────────────────────────────────────────────
  const [currentGameId,  setCurrentGameId]  = useState(existingGame?.id || null);
  const [homeScore,      setHomeScore]      = useState(existingGame?.home_score || 0);
  const [awayScore,      setAwayScore]      = useState(existingGame?.away_score || 0);
  const [currentPeriod,  setCurrentPeriod]  = useState(existingGame?.period || 1);
  const [gameTime,       setGameTime]       = useState(existingGame?.time_remaining ?? gameSettings.periodLength * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [activePlayers,  setActivePlayers]  = useState(existingGame?.active_players?.length ? existingGame.active_players : []);
  const [opponentRoster, setOpponentRoster] = useState(existingGame?.opponent_roster || []);
  const [ourStats,       setOurStats]       = useState(existingGame?.stats || {});
  const [opponentStats,  setOpponentStats]  = useState(existingGame?.opponent_stats || {});
  const [playLog,        setPlayLog]        = useState(existingGame?.play_log || []);
  const [periodFouls,    setPeriodFouls]    = useState(existingGame?.game_settings?.period_fouls || { ours: 0, opp: 0 });

  // ── Selection & UI ───────────────────────────────────────────────────────────
  const [activeTeam,     setActiveTeam]     = useState('ours');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedOpp,    setSelectedOpp]    = useState(null);
  const [lastAction,     setLastAction]     = useState(null);
  const [showLineup,     setShowLineup]     = useState(!existingGame);
  const [showBoxScore,   setShowBoxScore]   = useState(false);
  const [showSubModal,   setShowSubModal]   = useState(false);
  const [showPlays,      setShowPlays]      = useState(false);
  const [editingPlay,    setEditingPlay]    = useState(null);
  const [showNextQ,      setShowNextQ]      = useState(false);
  const [showEndGame,    setShowEndGame]    = useState(false);
  const [quickSubTarget, setQuickSubTarget] = useState(null);

  // ✅ Sub selection state lives here — survives re-renders
  const [subGoing,  setSubGoing]  = useState([]);
  const [subComing, setSubComing] = useState([]);
  const [boxScoreTab, setBoxScoreTab] = useState('ours');

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const live          = useRef({});
  const creatingGame  = useRef(false);
  const minuteTracker = useRef({ entryTimes: {}, accSeconds: {} });
  const isDirty       = useRef(false);

  useEffect(() => {
    live.current = { homeScore, awayScore, currentPeriod, gameTime, ourStats, opponentStats, activePlayers, opponentRoster, playLog, periodFouls };
    isDirty.current = true;
  }, [homeScore, awayScore, currentPeriod, gameTime, ourStats, opponentStats, activePlayers, opponentRoster, playLog, periodFouls]);

  // ── Minute helpers ───────────────────────────────────────────────────────────
  const getElapsed = useCallback(() => {
    const r = live.current;
    return (r.currentPeriod - 1) * gameSettings.periodLength * 60 + (gameSettings.periodLength * 60 - r.gameTime);
  }, [gameSettings.periodLength]);

  const initMinuteTracking = useCallback((ids, resumedStats = null) => {
  const period        = existingGame?.period || 1;
  const timeRemaining = existingGame?.time_remaining ?? gameSettings.periodLength * 60;
  const periodSecs    = gameSettings.periodLength * 60;
  const elapsed       = (period - 1) * periodSecs + (periodSecs - timeRemaining);
  minuteTracker.current = {
    entryTimes: Object.fromEntries(ids.map(id => [id, elapsed])),
    accSeconds: Object.fromEntries(ids.map(id => [id, ((resumedStats?.[id]?.min) || 0) * 60])),
  };
}, [existingGame, gameSettings.periodLength]); // eslint-disable-line
  const flushMinutes = useCallback((ids, statsSnap, elapsed) => {
    const { entryTimes, accSeconds } = minuteTracker.current;
    const updated = { ...statsSnap };
    ids.forEach(id => {
      if (entryTimes[id] === undefined) return;
      const stint    = Math.max(0, elapsed - entryTimes[id]);
      const total    = (accSeconds[id] || 0) + stint;
      accSeconds[id] = total;
      updated[id]    = { ...(updated[id] || { ...EMPTY_STATS }), min: total > 0 ? Math.ceil(total / 60) : 0 };
    });
    minuteTracker.current.accSeconds = accSeconds;
    return updated;
  }, []);

  const getLiveMin = useCallback((id) => {
    const { entryTimes, accSeconds } = minuteTracker.current;
    const acc   = accSeconds[id] || 0;
    const entry = entryTimes[id];
    if (entry === undefined) return Math.round(acc / 60);
    const total = acc + Math.max(0, getElapsed() - entry);
    return total > 0 ? Math.max(1, Math.round(total / 60)) : 0;
  }, [getElapsed]);

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (existingGame) {
      initMinuteTracking(existingGame.active_players || [], existingGame.stats || {});
      toast?.success('Game resumed!');
    }
  }, []); // eslint-disable-line

  // ── Timer ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTimerRunning) return;
    const id = setInterval(() => {
      setGameTime(p => { if (p <= 1) { setIsTimerRunning(false); toast?.info('Period ended!'); return 0; } return p - 1; });
    }, 1000);
    return () => clearInterval(id);
  }, [isTimerRunning]); // eslint-disable-line

  // ── Auto-save ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentGameId) return;
    const id = setInterval(() => {
      if (!isDirty.current) return;
      isDirty.current = false;
      const r = live.current;
      supabase.from('games').update({
        home_score: r.homeScore, away_score: r.awayScore,
        period: r.currentPeriod, time_remaining: r.gameTime,
        stats: r.ourStats, opponent_stats: r.opponentStats,
        opponent_roster: r.opponentRoster, active_players: r.activePlayers,
        play_log: r.playLog,
        game_settings: { ...gameSettings, period_fouls: r.periodFouls },
        updated_at: new Date().toISOString(),
      }).eq('id', currentGameId);
    }, 5000);
    return () => clearInterval(id);
  }, [currentGameId]); // eslint-disable-line

  // ── Supabase helpers ─────────────────────────────────────────────────────────
  const createGame = async (starters = []) => {
    try {
      const { data, error } = await supabase.from('games').insert([{
        user_id: user.id, team_id: team.id,
        opponent: gameSettings.opponent,
        home_team: gameSettings.isHome ? team.name : gameSettings.opponent,
        status: 'in_progress', period: 1,
        time_remaining: gameSettings.periodLength * 60,
        home_score: 0, away_score: 0,
        stats: {}, opponent_stats: {}, opponent_roster: [],
        active_players: starters, play_log: [],
        game_settings: { ...gameSettings, period_fouls: { ours: 0, opp: 0 } },
        visibility: 'public_view',
      }]).select().single();
      if (error) throw error;
      setCurrentGameId(data.id);
      setActivePlayers(starters);
      minuteTracker.current = { entryTimes: Object.fromEntries(starters.map(id => [id, 0])), accSeconds: {} };
      isDirty.current = false;
      toast?.success('Game started!');
    } catch (err) { console.error(err); toast?.error('Failed to start game'); }
  };

  const persist = async (patch) => {
    if (!currentGameId) return;
    try {
      await supabase.from('games').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', currentGameId);
    } catch (err) { console.error('Save error:', err); }
  };

  const handleLineupConfirmed = useCallback((starters) => {
    setShowLineup(false);
    setActivePlayers(starters);
    if (!creatingGame.current && !currentGameId) {
      creatingGame.current = true;
      createGame(starters);
    }
  }, [currentGameId]); // eslint-disable-line

  // ── Stat action ──────────────────────────────────────────────────────────────
  const handleStatAction = useCallback(async (statDef) => {
    const isOurs = activeTeam === 'ours';
    const player = isOurs
      ? selectedPlayer
      : (isQuick ? { id: 'opp-team', name: gameSettings.opponent, number: '' } : selectedOpp);

    if (!player) { toast?.info('Select a player'); return; }

    const base      = isOurs ? live.current.ourStats : live.current.opponentStats;
    const prev      = base[player.id] || { ...EMPTY_STATS };
    const next      = { ...prev };
    Object.entries(statDef.updates).forEach(([k, v]) => { next[k] = (next[k] || 0) + v; });
    const nextStats = { ...base, [player.id]: next };

    const pts = statDef.updates.pts || 0;
    let newHome = live.current.homeScore;
    let newAway = live.current.awayScore;
    if (pts > 0) {
      const ourIsHome = gameSettings.isHome;
      if (isOurs) { ourIsHome ? (newHome += pts) : (newAway += pts); }
      else        { ourIsHome ? (newAway += pts) : (newHome += pts); }
      setHomeScore(newHome);
      setAwayScore(newAway);
    }

    if (statDef.key === 'pf') {
      const side = isOurs ? 'ours' : 'opp';
      setPeriodFouls(prev => ({ ...prev, [side]: Math.min((prev[side] || 0) + 1, foulLimit + 2) }));
    }

    const newPlay = {
      id: genId(), timestamp: new Date().toISOString(),
      period: live.current.currentPeriod, clock: fmtTime(live.current.gameTime),
      team: activeTeam,
      player: { id: player.id, name: player.name, number: player.number || '' },
      action: statDef.key,
      label: player.id === 'opp-team' ? gameSettings.opponent : `#${player.number || '—'} ${player.name.split(' ')[0]}`,
      pts, updates: statDef.updates,
    };
    const newPlayLog = [newPlay, ...live.current.playLog];

    setLastAction({ isOurs, prevStats: base, prevHome: live.current.homeScore, prevAway: live.current.awayScore, prevPlayLog: live.current.playLog });
    if (isOurs) setOurStats(nextStats); else setOpponentStats(nextStats);
    setPlayLog(newPlayLog);

    await persist({
      home_score:     newHome,
      away_score:     newAway,
      time_remaining: live.current.gameTime,   // ✅ add
      period:         live.current.currentPeriod, // ✅ add
      stats:          isOurs ? nextStats                  : live.current.ourStats,
      opponent_stats: isOurs ? live.current.opponentStats : nextStats,
      play_log:       newPlayLog,
    });
  }, [activeTeam, selectedPlayer, selectedOpp, gameSettings.isHome, gameSettings.opponent, foulLimit, isQuick]); // eslint-disable-line

  const handleOppScore = useCallback(async (pts) => {
    const ourIsHome = gameSettings.isHome;
    let newHome = live.current.homeScore, newAway = live.current.awayScore;
    ourIsHome ? (newAway += pts) : (newHome += pts);
    setHomeScore(newHome); setAwayScore(newAway);
    const newPlay = {
      id: genId(), timestamp: new Date().toISOString(),
      period: live.current.currentPeriod, clock: fmtTime(live.current.gameTime),
      team: 'opponent', player: { id: 'team', name: 'Team', number: '' },
      action: 'score', label: gameSettings.opponent, pts, updates: { pts },
    };
    const newPlayLog = [newPlay, ...live.current.playLog];
    setLastAction({ isOurs: false, prevStats: live.current.opponentStats, prevHome: live.current.homeScore, prevAway: live.current.awayScore, prevPlayLog: live.current.playLog });
    setPlayLog(newPlayLog);
    await persist({ home_score: newHome, away_score: newAway, time_remaining: live.current.gameTime, play_log: newPlayLog });
  }, [gameSettings.isHome, gameSettings.opponent]); // eslint-disable-line
const handleGoHome = useCallback(async () => {
  const r = live.current;
  if (currentGameId) {
    await persist({
      home_score:     r.homeScore,
      away_score:     r.awayScore,
      period:         r.currentPeriod,
      time_remaining: r.gameTime,           // ✅ save current clock
      stats:          r.ourStats,
      opponent_stats: r.opponentStats,
      active_players: r.activePlayers,
      play_log:       r.playLog,
      game_settings:  { ...gameSettings, period_fouls: r.periodFouls },
    });
  }
  handleGoHome();
}, [currentGameId, gameSettings, onGoHome]); // eslint-disable-line

  const handleUndo = useCallback(async () => {
    if (!lastAction) return;
    const { isOurs, prevStats, prevHome, prevAway, prevPlayLog } = lastAction;
    if (isOurs) setOurStats(prevStats); else setOpponentStats(prevStats);
    setHomeScore(prevHome); setAwayScore(prevAway);
    setPlayLog(prevPlayLog); setLastAction(null);
    await persist({ home_score: prevHome, away_score: prevAway, stats: isOurs ? prevStats : live.current.ourStats, opponent_stats: isOurs ? live.current.opponentStats : prevStats, play_log: prevPlayLog });
    toast?.info('Undone');
  }, [lastAction]); // eslint-disable-line

  const handleDeletePlay = useCallback(async (play) => {
    const isOurs  = play.team === 'ours';
    const base    = isOurs ? live.current.ourStats : live.current.opponentStats;
    const pStat   = { ...(base[play.player?.id] || { ...EMPTY_STATS }) };
    Object.entries(play.updates || {}).forEach(([k, v]) => { pStat[k] = Math.max(0, (pStat[k] || 0) - v); });
    const nextStats = { ...base, [play.player?.id]: pStat };
    const pts = play.pts || 0;
    let newHome = live.current.homeScore, newAway = live.current.awayScore;
    if (pts > 0) {
      const ourIsHome = gameSettings.isHome;
      if (isOurs) { ourIsHome ? (newHome -= pts) : (newAway -= pts); }
      else        { ourIsHome ? (newAway -= pts) : (newHome -= pts); }
      setHomeScore(Math.max(0, newHome)); setAwayScore(Math.max(0, newAway));
    }
    const newPlayLog = live.current.playLog.filter(p => p.id !== play.id);
    if (isOurs) setOurStats(nextStats); else setOpponentStats(nextStats);
    setPlayLog(newPlayLog); setEditingPlay(null);
    await persist({ home_score: Math.max(0, newHome), away_score: Math.max(0, newAway), stats: isOurs ? nextStats : live.current.ourStats, opponent_stats: isOurs ? live.current.opponentStats : nextStats, play_log: newPlayLog });
    toast?.info('Play removed');
  }, [gameSettings.isHome]); // eslint-disable-line

  const handleSubConfirm = useCallback(async (outIds, inIds) => {
    const elapsed = getElapsed();
    const { entryTimes, accSeconds } = minuteTracker.current;
    const updatedStats = { ...live.current.ourStats };
    const subPlays = [];
    const pairs = outIds.map((id, i) => [id, inIds[i]]).filter(([, b]) => b);

    pairs.forEach(([outId, inId]) => {
      if (entryTimes[outId] !== undefined) {
        const stint = Math.max(0, elapsed - entryTimes[outId]);
        accSeconds[outId] = (accSeconds[outId] || 0) + stint;
        delete entryTimes[outId];
        const outS = { ...(updatedStats[outId] || { ...EMPTY_STATS }) };
        outS.min = Math.max(1, Math.round((accSeconds[outId] || 0) / 60));
        updatedStats[outId] = outS;
      }
      entryTimes[inId] = elapsed;
      const inP  = team.roster?.find(p => p.id === inId);
      const outP = team.roster?.find(p => p.id === outId);
      subPlays.push({
        id: genId(), timestamp: new Date().toISOString(),
        period: live.current.currentPeriod, clock: fmtTime(live.current.gameTime),
        team: 'ours', player: { id: inId, name: inP?.name || '?', number: inP?.number || '' },
        action: 'sub_in',
        label: `${inP?.name?.split(' ')[0] || '?'} for ${outP?.name?.split(' ')[0] || '?'}`,
        pts: 0, updates: {},
      });
    });

    minuteTracker.current = { entryTimes, accSeconds };
    let newActive = [...live.current.activePlayers];
    outIds.forEach((outId, i) => {
      const inId = inIds[i]; if (!inId) return;
      const idx = newActive.indexOf(outId); if (idx !== -1) newActive[idx] = inId;
    });

    const newPlayLog = [...subPlays, ...live.current.playLog];
    setOurStats(updatedStats); setActivePlayers(newActive); setPlayLog(newPlayLog);
    setShowSubModal(false); setSelectedPlayer(null);
    setSubGoing([]);   // ✅ reset
    setSubComing([]);  // ✅ reset
    toast?.info(`${pairs.length} sub${pairs.length > 1 ? 's' : ''} complete`);
    await persist({ stats: updatedStats, active_players: newActive, play_log: newPlayLog });
  }, [getElapsed, team.roster]); // eslint-disable-line

const handleNextPeriod = useCallback(async () => {
  const r       = live.current;
  const elapsed = getElapsed();                              // ✅ actual not theoretical
  const flushed = flushMinutes(r.activePlayers, r.ourStats, elapsed);
  r.activePlayers.forEach(id => {
    minuteTracker.current.entryTimes[id] = elapsed;          // ✅ continuous clock
  });
  const next = r.currentPeriod + 1;
  setOurStats(flushed); setCurrentPeriod(next);
  setGameTime(gameSettings.periodLength * 60);
  setIsTimerRunning(false); setShowNextQ(false);
  setSelectedPlayer(null); setSelectedOpp(null);
  setPeriodFouls({ ours: 0, opp: 0 });
  toast?.info(`Q${next} starting`);
  await persist({ stats: flushed, game_settings: { ...gameSettings, period_fouls: { ours: 0, opp: 0 } } });
}, [gameSettings, flushMinutes, getElapsed]); // eslint-disable-line

  const updateTeamRecord = useCallback(async (fH, fA) => {
    const ourS = gameSettings.isHome ? fH : fA;
    const oppS = gameSettings.isHome ? fA : fH;
    if (ourS === oppS) return;
    try {
      const { error } = await supabase.rpc('increment_team_record', { p_team_id: team.id, p_won: ourS > oppS, p_is_playoff: gameSettings.game_type === 'playoff' });
      if (error) throw error;
    } catch (err) { console.error(err); }
  }, [gameSettings, team.id]);

  const handleEndGame = useCallback(async () => {
    const r = live.current;
    const flushed = flushMinutes(r.activePlayers, r.ourStats, getElapsed());
    try {
      await persist({ home_score: r.homeScore, away_score: r.awayScore, period: r.currentPeriod, time_remaining: r.gameTime, stats: flushed, opponent_stats: r.opponentStats, opponent_roster: r.opponentRoster, active_players: r.activePlayers, play_log: r.playLog, status: 'completed', game_settings: { ...gameSettings, period_fouls: r.periodFouls } });
      await updateTeamRecord(r.homeScore, r.awayScore);
      toast?.success('Game ended!'); handleGoHome();
    } catch (err) { console.error(err); toast?.error('Failed to end game'); }
  }, [getElapsed, flushMinutes, updateTeamRecord, onGoHome, gameSettings]); // eslint-disable-line

  // ── Derived ───────────────────────────────────────────────────────────────────
  const courtPlayers    = team.roster?.filter(p => activePlayers.includes(p.id)) || [];
  const benchPlayers    = team.roster?.filter(p => !activePlayers.includes(p.id)) || [];
  const ourScore        = gameSettings.isHome ? homeScore : awayScore;
  const oppScore        = gameSettings.isHome ? awayScore : homeScore;
  const lastPlay        = playLog[0] || null;
  const activePlayer    = activeTeam === 'ours' ? selectedPlayer : selectedOpp;
  const activeStats     = activePlayer ? ((activeTeam === 'ours' ? ourStats : opponentStats)[activePlayer.id] || { ...EMPTY_STATS }) : null;

  // ✅ scoreboardStyle inside component after all hooks
  const scoreboardStyle = isHexColor(team.colors) ? teamGradientStyle(team.colors) : undefined;

  const bg  = isDark ? 'bg-gray-950' : 'bg-gray-50';
  const crd = isDark ? 'bg-gray-900' : 'bg-white';
  const txt = isDark ? 'text-white'  : 'text-gray-900';
  const mut = isDark ? 'text-gray-400' : 'text-gray-500';
  const fnt = isDark ? 'text-gray-600' : 'text-gray-400';
  const div = isDark ? 'border-gray-800' : 'border-gray-100';

  // ── Portrait stat grid ────────────────────────────────────────────────────────
  const renderPortraitGrid = () => {
    const rows = PORTRAIT_ROWS.map((row, ri) => {
      if (ri < 3) return row;
      if (isQuick) return ['pf', 'opp+1', 'opp+2', 'opp+3'];
      return ['pf', '__undo', null, null];
    });

    return (
      <div className="flex-1 min-h-0 p-2" style={{ display: 'grid', gridTemplateRows: 'repeat(4, 1fr)', gap: '6px' }}>
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {row.map((key, ci) => {
              if (!key) return <div key={ci} />;
              if (key === '__undo') return (
                <button key={ci} onPointerDown={() => haptic()} onClick={handleUndo} disabled={!lastAction}
                  className={`w-full h-full rounded-xl font-black text-sm transition-all duration-100 disabled:opacity-20 ${isDark ? 'bg-gray-800 border border-gray-700 text-gray-400' : 'bg-gray-100 border border-gray-200 text-gray-500'}`}>
                  UNDO
                </button>
              );
              if (key.startsWith('opp+')) {
                const pts = parseInt(key.replace('opp+', ''));
                return (
                  <button key={ci} onPointerDown={() => haptic()} onClick={() => handleOppScore(pts)}
                    className={`w-full h-full rounded-xl font-black text-sm transition-all duration-100 ${isDark ? 'bg-red-950 border border-red-900 text-red-400 hover:bg-red-900' : 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100'}`}>
                    +{pts}
                  </button>
                );
              }
              const disabled = !(activePlayer || (isQuick && activeTeam === 'opponent'));
              return <StatButton key={ci} statKey={key} isDark={isDark} onStat={handleStatAction} disabled={disabled} />;
            })}
          </div>
        ))}
      </div>
    );
  };

  // ── Landscape stat grid ───────────────────────────────────────────────────────
  const renderLandscapeGrid = () => (
    <div className="flex-1 min-h-0 p-2" style={{ display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gap: '5px' }}>
      {LANDSCAPE_ROWS.map((row, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '5px' }}>
          {row.map((key, ci) => {
            if (key === '__undo') return (
              <button key={ci} onPointerDown={() => haptic()} onClick={handleUndo} disabled={!lastAction}
                className={`w-full h-full rounded-xl font-black text-sm transition-all duration-100 disabled:opacity-20 ${isDark ? 'bg-gray-800 border border-gray-700 text-gray-400' : 'bg-gray-100 border border-gray-200 text-gray-500'}`}>
                UNDO
              </button>
            );
            return <StatButton key={ci} statKey={key} isDark={isDark} onStat={handleStatAction}
              disabled={!(activePlayer || (isQuick && activeTeam === 'opponent'))} />;
          })}
        </div>
      ))}
    </div>
  );

  // ── Shared modals ─────────────────────────────────────────────────────────────
  const Modals = () => (
    <>
      {showLineup && !existingGame && <LineupModal team={team} onConfirm={handleLineupConfirmed} />}

      {showSubModal && (
        <SubModal
          courtPlayers={courtPlayers}
          benchPlayers={benchPlayers}
          ourStats={ourStats}
          getLiveMin={getLiveMin}
          isDark={isDark}
          going={subGoing}
          setGoing={setSubGoing}
          coming={subComing}
          setComing={setSubComing}
          onConfirm={handleSubConfirm}
          onClose={() => {
            setShowSubModal(false);
            setSubGoing([]);
            setSubComing([]);
            setBoxScoreTab('ours');
          }}
        />
      )}

      {showBoxScore && (
        <BoxScoreModal team={team} opponent={gameSettings.opponent}
          ourStats={ourStats} opponentStats={opponentStats}
          opponentRoster={opponentRoster} isQuick={isQuick}
          isDark={isDark} onClose={() => setShowBoxScore(false)}
          tab={boxScoreTab} 
          setTab={setBoxScoreTab} />
      )}

      {editingPlay && (
        <EditPlayModal play={editingPlay} isDark={isDark} onDelete={handleDeletePlay} onClose={() => setEditingPlay(null)} />
      )}

      {showPlays && (
        <div className={`fixed inset-0 z-50 flex flex-col ${isDark ? 'bg-gray-950' : 'bg-white'}`}>
          <div className={`flex items-center justify-between px-4 py-3 border-b ${div} flex-shrink-0`}>
            <h2 className={`font-black text-sm ${txt}`}>All Plays</h2>
            <button onClick={() => setShowPlays(false)} className={`p-1.5 ${mut}`}><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {playLog.map(play => (
              <div key={play.id} onClick={() => { setEditingPlay(play); setShowPlays(false); }}
                className={`flex items-center gap-3 px-4 py-2.5 border-b cursor-pointer ${div} ${isDark ? 'hover:bg-gray-900' : 'hover:bg-gray-50'}`}>
                <span className={`text-[10px] font-mono w-14 flex-shrink-0 text-right ${fnt}`}>Q{play.period} {play.clock}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0 ${play.team === 'opponent' ? isDark ? 'bg-red-950 text-red-400' : 'bg-red-100 text-red-600' : isDark ? 'bg-blue-950 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                  {play.action.toUpperCase().replace('FG2M','2PT✓').replace('FG2MISS','2PT✗').replace('FG3M','3PT✓').replace('FG3MISS','3PT✗').replace('FTM','FT✓').replace('FTMISS','FT✗').replace('SUB_IN','SUB').replace('SCORE','SCR')}
                </span>
                <span className={`flex-1 text-xs font-semibold truncate ${txt}`}>{play.label}</span>
                {play.pts > 0 && <span className={`text-xs font-black flex-shrink-0 ${play.team === 'opponent' ? 'text-red-500' : 'text-emerald-500'}`}>+{play.pts}</span>}
              </div>
            ))}
            {playLog.length === 0 && <p className={`text-center py-12 text-sm ${fnt}`}>No plays yet</p>}
          </div>
        </div>
      )}

      {showNextQ && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl p-6 ${isDark ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200 shadow-2xl'}`}>
            <div className="flex items-center gap-3 mb-5">
              <AlertTriangle size={20} className="text-yellow-500 flex-shrink-0" />
              <div>
                <h3 className={`font-black ${txt}`}>End Q{currentPeriod}?</h3>
                <p className={`text-xs mt-0.5 ${mut}`}>Team fouls will reset</p>
              </div>
            </div>
            <div className={`grid grid-cols-2 gap-3 mb-5 rounded-2xl p-4 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="text-center">
                <p className={`text-4xl font-black tabular-nums ${txt}`}>{ourScore}</p>
                <p className={`text-[10px] mt-1 ${mut} truncate`}>{team.name}</p>
              </div>
              <div className="text-center">
                <p className={`text-4xl font-black tabular-nums ${txt}`}>{oppScore}</p>
                <p className={`text-[10px] mt-1 ${mut} truncate`}>{gameSettings.opponent}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowNextQ(false)} className={`flex-1 py-3 rounded-xl font-bold text-sm ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>Cancel</button>
              <button onClick={handleNextPeriod} className="flex-1 py-3 rounded-xl font-black text-sm bg-blue-500 hover:bg-blue-600 text-white transition">Start Q{currentPeriod + 1}</button>
            </div>
          </div>
        </div>
      )}

      {showEndGame && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl p-6 ${isDark ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200 shadow-2xl'}`}>
            <div className="flex items-center gap-3 mb-5">
              <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
              <h3 className={`font-black ${txt}`}>End Game?</h3>
            </div>
            <div className={`grid grid-cols-2 gap-3 mb-5 rounded-2xl p-4 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="text-center">
                <p className={`text-5xl font-black tabular-nums ${txt}`}>{ourScore}</p>
                <p className={`text-[10px] mt-1 ${mut} truncate`}>{team.name}</p>
              </div>
              <div className="text-center">
                <p className={`text-5xl font-black tabular-nums ${txt}`}>{oppScore}</p>
                <p className={`text-[10px] mt-1 ${mut} truncate`}>{gameSettings.opponent}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowEndGame(false)} className={`flex-1 py-3 rounded-xl font-bold text-sm ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>Cancel</button>
              <button onClick={handleEndGame} className="flex-1 py-3 rounded-xl font-black text-sm bg-red-500 hover:bg-red-600 text-white transition">End Game</button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // ── PORTRAIT ─────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────

  if (!isLandscape) return (
    <>
      <div className={`h-screen w-full flex flex-col overflow-hidden ${bg}`}>

        {/* Scoreboard */}
        <div className="flex-shrink-0 text-white" style={scoreboardStyle || { background: '#111827' }}>
          <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Q{currentPeriod}</span>
              <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-2.5 py-1">
                <button onClick={() => setIsTimerRunning(t => !t)} className="text-white/70 hover:text-white transition">
                  {isTimerRunning ? <Pause size={11} /> : <Play size={11} />}
                </button>
                <span className="text-sm font-black tabular-nums">{fmtTime(gameTime)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {currentGameId && (
                <ShareButton path={`/game/${currentGameId}`} title={`${team.name} vs ${gameSettings.opponent}`} toast={toast} compact className="p-1.5 text-white/30 hover:text-white/60 transition" />
              )}
              <button onClick={toggleTheme} className="p-1.5 text-white/30 hover:text-white/60 transition">
                {isDark ? <Sun size={13} /> : <Moon size={13} />}
              </button>
            </div>
          </div>

          <div className="flex items-end px-4 pb-3 gap-2">
            <div className="flex-1">
              <p className="text-[9px] font-bold text-white/40 truncate mb-1">{gameSettings.isHome ? team.name : gameSettings.opponent}</p>
              <p className="text-5xl font-black tabular-nums leading-none">{homeScore}</p>
              <FoulDots count={periodFouls[gameSettings.isHome ? 'ours' : 'opp']} limit={foulLimit} className="mt-1.5" />
            </div>
            <div className="flex-shrink-0 text-center bg-white/10 rounded-2xl px-3 py-2 min-w-[80px]">
              {activePlayer && activeStats ? (
                <>
                  <p className="text-[9px] text-white/40 font-bold truncate">#{activePlayer.number} {activePlayer.name.split(' ')[0]}</p>
                  <p className="text-2xl font-black leading-none text-white">{activeStats.pts || 0}</p>
                  <p className="text-[9px] text-white/40 mt-0.5 tabular-nums">{(activeStats.oreb||0)+(activeStats.dreb||0)} / {activeStats.ast||0}</p>
                </>
              ) : isQuick && activeTeam === 'opponent' ? (
                <>
                  <p className="text-[9px] text-white/40 font-bold">OPP</p>
                  <p className="text-[9px] text-white/30 mt-1">Team</p>
                </>
              ) : (
                <p className="text-[9px] text-white/20 py-2">—</p>
              )}
            </div>
            <div className="flex-1 text-right">
              <p className="text-[9px] font-bold text-white/40 truncate mb-1">{gameSettings.isHome ? gameSettings.opponent : team.name}</p>
              <p className="text-5xl font-black tabular-nums leading-none">{awayScore}</p>
              <div className="flex justify-end mt-1.5">
                <FoulDots count={periodFouls[gameSettings.isHome ? 'opp' : 'ours']} limit={foulLimit} />
              </div>
            </div>
          </div>
        </div>

        {/* Player row */}
        <div className={`flex-shrink-0 px-2 pt-2 pb-1 border-b ${div} ${crd}`}>
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className={`text-[9px] font-black uppercase tracking-wider ${mut}`}>On Court</span>
            <button
              onClick={() => { setShowSubModal(true); setQuickSubTarget(null); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition ${isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900'}`}
            >
              <ArrowLeftRight size={10} /> SUB
            </button>
          </div>

          <div className="flex gap-1.5 h-[88px]">
            {courtPlayers.slice(0, 5).map(p => (
              <PlayerCard key={p.id} player={p} stats={ourStats[p.id]}
                isSelected={selectedPlayer?.id === p.id && activeTeam === 'ours'}
                isOpp={false} isDark={isDark} foulLimit={foulLimit} teamColor={team.colors}
                onSelect={(pl) => { setQuickSubTarget(null); setSelectedPlayer(prev => prev?.id === pl.id && activeTeam === 'ours' ? null : pl); setActiveTeam('ours'); }}
                onHold={() => setShowSubModal(true)}
                onDoubleClick={(pl) => { setSelectedPlayer(null); setQuickSubTarget(prev => prev?.id === pl.id ? null : pl); }}
              />
            ))}
            {isQuick && (
              <OppTile isActive={activeTeam === 'opponent'} isDark={isDark}
                oppScore={gameSettings.isHome ? awayScore : homeScore}
                onPress={() => { setQuickSubTarget(null); setActiveTeam(prev => prev === 'opponent' ? 'ours' : 'opponent'); }} />
            )}
          </div>

          {quickSubTarget && benchPlayers.length > 0 && (
            <div className={`mt-2 rounded-xl border p-2 ${isDark ? 'border-orange-900 bg-orange-950/50' : 'border-orange-200 bg-orange-50'}`}>
              <div className="flex items-center justify-between mb-2 px-1">
                <p className={`text-[10px] font-black ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                  Replacing #{quickSubTarget.number} {quickSubTarget.name.split(' ')[0]} — tap bench player
                </p>
                <button onClick={() => setQuickSubTarget(null)} className={`text-[10px] font-bold ${isDark ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}>Cancel</button>
              </div>
              <div className="flex gap-1.5">
                {benchPlayers.map(p => (
                  <button key={p.id}
                    onClick={async () => { await handleSubConfirm([quickSubTarget.id], [p.id]); setQuickSubTarget(null); }}
                    className={`flex-1 flex flex-col items-center py-1.5 px-1 rounded-xl border-2 transition active:scale-95 ${isDark ? 'border-blue-700 bg-blue-950 hover:border-blue-500' : 'border-blue-300 bg-blue-50 hover:border-blue-500 hover:bg-blue-100'}`}
                  >
                    <span className={`text-[9px] font-bold ${isDark ? 'text-blue-400' : 'text-blue-500'}`}>#{p.number || '—'}</span>
                    <span className={`text-[11px] font-black truncate w-full text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>{p.name.split(' ')[0]}</span>
                    <span className={`text-[9px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{getLiveMin(p.id)}m</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isQuick && opponentRoster.length > 0 && (
            <div className="flex gap-1.5 h-[70px] mt-1.5">
              {opponentRoster.slice(0, 6).map(p => (
                <PlayerCard key={p.id} player={p} stats={opponentStats[p.id]}
                  isSelected={selectedOpp?.id === p.id && activeTeam === 'opponent'}
                  isOpp isDark={isDark} foulLimit={foulLimit} teamColor="#ef4444"
                  onSelect={(pl) => { setQuickSubTarget(null); setSelectedOpp(prev => prev?.id === pl.id && activeTeam === 'opponent' ? null : pl); setActiveTeam('opponent'); }}
                  onHold={() => {}} onDoubleClick={() => {}} />
              ))}
            </div>
          )}
        </div>

        {/* Selected player stat line */}
        <div className={`flex-shrink-0 px-3 py-1.5 flex items-center gap-2 border-b ${div} min-h-[36px] ${crd}`}>
          {activePlayer && activeStats ? (
            <>
              <p className={`text-xs font-black truncate flex-1 ${txt}`}>
                #{activePlayer.number} {activePlayer.name}
                <span className={`ml-2 font-normal text-[10px] ${mut}`}>
                  {activeStats.pts||0}pts · {(activeStats.oreb||0)+(activeStats.dreb||0)}reb · {activeStats.ast||0}ast
                </span>
              </p>
              {lastAction && (
                <button onClick={handleUndo} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black flex-shrink-0 ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                  <Undo2 size={10} /> UNDO
                </button>
              )}
            </>
          ) : isQuick && activeTeam === 'opponent' ? (
            <p className={`text-[10px] font-bold ${txt}`}>
              {gameSettings.opponent}
              <span className={`ml-2 font-normal italic ${fnt}`}>logging team stats</span>
            </p>
          ) : (
            <p className={`text-[10px] italic ${fnt}`}>Tap a player · Double-click to sub · Hold for multi-sub</p>
          )}
        </div>

        {renderPortraitGrid()}

        {/* Last play */}
        <div className={`flex-shrink-0 px-3 py-1.5 flex items-center gap-2 border-t ${div} ${crd}`}>
          {lastPlay ? (
            <>
              <p className={`flex-1 text-[10px] truncate ${mut}`}>
                <span className={`font-bold ${txt}`}>{lastPlay.label}</span>
                {' · '}{lastPlay.action.replace('fg2m','2PT✓').replace('fg2miss','2PT✗').replace('fg3m','3PT✓').replace('fg3miss','3PT✗').replace('ftm','FT✓').replace('ftmiss','FT✗').replace('dreb','DREB').replace('oreb','OREB').replace('sub_in','SUB').replace('score','SCR')}
                {' · Q'}{lastPlay.period} {lastPlay.clock}
              </p>
              <button onClick={() => setEditingPlay(lastPlay)} className={`text-[10px] font-bold flex-shrink-0 ${fnt} transition`}>EDIT</button>
              <button onClick={() => setShowPlays(true)} className="text-[10px] font-bold flex-shrink-0 text-blue-500 flex items-center gap-0.5">ALL <ChevronRight size={10} /></button>
            </>
          ) : (
            <p className={`text-[10px] ${fnt}`}>No plays yet</p>
          )}
        </div>

        {/* Controls */}
        <div className={`flex-shrink-0 grid grid-cols-3 gap-2 px-3 py-2 border-t ${div} ${crd}`}>
          <button onClick={() => setShowBoxScore(true)} className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            <BarChart2 size={13} /> Box Score
          </button>
          <button onClick={() => setShowNextQ(true)} disabled={currentPeriod >= gameSettings.totalPeriods} className="py-2.5 rounded-xl text-xs font-black bg-blue-500 hover:bg-blue-600 text-white transition disabled:opacity-30">
            Next Q →
          </button>
          <button onClick={() => setShowEndGame(true)} className={`py-2.5 rounded-xl text-xs font-bold transition ${isDark ? 'bg-gray-800 text-gray-500 hover:bg-red-900 hover:text-red-400' : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500'}`}>
            End Game
          </button>
        </div>
      </div>
      <Modals />
    </>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // ── LANDSCAPE ────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className={`h-screen w-full flex overflow-hidden ${bg}`}>

        {/* Column 1: Players */}
        <div className={`w-[165px] flex-shrink-0 flex flex-col border-r ${div} ${crd} overflow-hidden`}>
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 flex-shrink-0">
            <span className={`text-[9px] font-black uppercase tracking-wider ${mut}`}>Players</span>
            <button
              onClick={() => { setShowSubModal(true); setQuickSubTarget(null); }}
              className={`p-1.5 rounded-lg transition flex items-center gap-1 text-[9px] font-black ${isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              <ArrowLeftRight size={11} /> SUB
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5">
            {courtPlayers.map(p => {
              const s    = ourStats[p.id] || EMPTY_STATS;
              const isSel = selectedPlayer?.id === p.id && activeTeam === 'ours';
              const reb   = (s.oreb||0) + (s.dreb||0);
              return (
                <button key={p.id}
                  onClick={() => { setQuickSubTarget(null); setSelectedPlayer(prev => prev?.id === p.id && activeTeam === 'ours' ? null : p); setActiveTeam('ours'); }}
                  onDoubleClick={() => { setSelectedPlayer(null); setQuickSubTarget(prev => prev?.id === p.id ? null : p); }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xl border-2 transition ${
                    isSel
                      ? isDark ? 'border-blue-500 bg-blue-950' : 'border-blue-400 bg-blue-50 shadow-sm'
                      : isDark ? 'border-gray-800 bg-gray-800/50 hover:border-gray-700' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <span className={`text-[10px] font-bold flex-shrink-0 ${isSel ? 'text-blue-400' : mut}`}>#{p.number||'—'}</span>
                  <div className="flex-1 min-w-0 text-left">
                    <p className={`text-[11px] font-black truncate leading-tight ${txt}`}>{p.name.split(' ')[0]}</p>
                    <p className={`text-[9px] tabular-nums ${fnt}`}>{s.pts||0} · {reb}/{s.ast||0}</p>
                  </div>
                  <div className="flex gap-[2px] flex-shrink-0">
                    {Array.from({length: Math.min(foulLimit, 4)}, (_, i) => (
                      <div key={i} className={`w-1 h-1 rounded-full ${i < (s.pf||0) ? 'bg-yellow-400' : isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                </button>
              );
            })}

            {isQuick && (
              <button
                onClick={() => setActiveTeam(prev => prev === 'opponent' ? 'ours' : 'opponent')}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xl border-2 transition mt-1 ${
                  activeTeam === 'opponent'
                    ? isDark ? 'border-red-500 bg-red-950' : 'border-red-400 bg-red-50'
                    : isDark ? 'border-gray-800 bg-gray-800/50' : 'border-gray-100 bg-gray-50'
                }`}
              >
                <span className={`text-[9px] font-black ${activeTeam === 'opponent' ? 'text-red-400' : mut}`}>OPP</span>
                <span className={`text-sm font-black tabular-nums ${activeTeam === 'opponent' ? 'text-red-500' : mut}`}>
                  {gameSettings.isHome ? awayScore : homeScore}
                </span>
              </button>
            )}

            {!isQuick && opponentRoster.length > 0 && (
              <>
                <div className={`my-1.5 border-t ${div}`} />
                <p className={`text-[9px] font-black uppercase tracking-wider px-1 ${isDark ? 'text-red-800' : 'text-red-400'}`}>OPP</p>
                {opponentRoster.map(p => {
                  const s    = opponentStats[p.id] || EMPTY_STATS;
                  const isSel = selectedOpp?.id === p.id && activeTeam === 'opponent';
                  return (
                    <button key={p.id}
                      onClick={() => { setSelectedOpp(prev => prev?.id === p.id && activeTeam === 'opponent' ? null : p); setActiveTeam('opponent'); }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xl border-2 transition ${
                        isSel
                          ? isDark ? 'border-red-500 bg-red-950' : 'border-red-400 bg-red-50 shadow-sm'
                          : isDark ? 'border-gray-800 bg-gray-800/50 hover:border-gray-700' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                      }`}
                    >
                      <span className={`text-[10px] font-bold flex-shrink-0 ${isSel ? 'text-red-400' : mut}`}>#{p.number||'—'}</span>
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-[11px] font-black truncate leading-tight ${txt}`}>{p.name.split(' ')[0]}</p>
                        <p className={`text-[9px] tabular-nums ${fnt}`}>{s.pts||0}</p>
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {quickSubTarget && benchPlayers.length > 0 && (
            <div className={`mx-2 mb-2 rounded-xl border p-2 flex-shrink-0 ${isDark ? 'border-orange-900 bg-orange-950/50' : 'border-orange-200 bg-orange-50'}`}>
              <p className={`text-[9px] font-black mb-1.5 px-1 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                {quickSubTarget.name.split(' ')[0]} OUT → tap IN
              </p>
              <div className="space-y-1">
                {benchPlayers.map(p => (
                  <button key={p.id}
                    onClick={async () => { await handleSubConfirm([quickSubTarget.id], [p.id]); setQuickSubTarget(null); }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border transition ${isDark ? 'border-blue-800 bg-blue-950 hover:border-blue-500 text-white' : 'border-blue-200 bg-blue-50 hover:border-blue-400 text-gray-900'}`}
                  >
                    <span className={`text-[9px] font-bold ${isDark ? 'text-blue-400' : 'text-blue-500'}`}>#{p.number||'—'}</span>
                    <span className="text-[11px] font-black truncate flex-1 text-left">{p.name.split(' ')[0]}</span>
                    <span className={`text-[9px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{getLiveMin(p.id)}m</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setQuickSubTarget(null)} className={`w-full mt-1.5 py-1 text-[9px] font-bold rounded-lg ${isDark ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}>
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Column 2: Stats */}
        <div className={`flex-1 flex flex-col border-r ${div} ${crd} min-w-0`}>
          <div className={`flex-shrink-0 px-3 py-2 border-b ${div} flex items-center gap-2 min-h-[38px]`}>
            {activePlayer && activeStats ? (
              <>
                <p className={`text-xs font-black flex-1 truncate ${txt}`}>
                  #{activePlayer.number} {activePlayer.name}
                  <span className={`font-normal text-[10px] ml-1.5 ${mut}`}>
                    {activeStats.pts||0}pts · {(activeStats.oreb||0)+(activeStats.dreb||0)}reb · {activeStats.ast||0}ast
                  </span>
                </p>
                {lastAction && (
                  <button onClick={handleUndo} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black flex-shrink-0 ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                    <Undo2 size={10} /> UNDO
                  </button>
                )}
              </>
            ) : isQuick && activeTeam === 'opponent' ? (
              <p className={`text-[10px] font-bold ${txt}`}>
                {gameSettings.opponent}
                <span className={`ml-2 font-normal italic ${fnt}`}>logging team stats</span>
              </p>
            ) : (
              <p className={`text-[10px] italic ${fnt}`}>Tap a player · Double-click to sub</p>
            )}
          </div>

          {renderLandscapeGrid()}

          <div className={`flex-shrink-0 px-3 py-1.5 border-t ${div} flex items-center gap-2 min-h-[32px]`}>
            {lastPlay ? (
              <>
                <p className={`flex-1 text-[10px] truncate ${mut}`}>
                  <span className={`font-bold ${txt}`}>{lastPlay.label}</span>
                  {' · Q'}{lastPlay.period} {lastPlay.clock}
                </p>
                <button onClick={() => setEditingPlay(lastPlay)} className={`text-[10px] font-bold flex-shrink-0 ${fnt}`}>EDIT</button>
                <button onClick={() => setShowPlays(true)} className="text-[10px] font-bold flex-shrink-0 text-blue-500 flex items-center gap-0.5">ALL <ChevronRight size={10} /></button>
              </>
            ) : (
              <p className={`text-[10px] ${fnt}`}>No plays yet</p>
            )}
          </div>
        </div>

        {/* Column 3: Score + Controls */}
        <div className="w-[160px] flex-shrink-0 flex flex-col text-white" style={scoreboardStyle || { background: '#111827' }}>
          <div className="flex-1 flex flex-col justify-center px-4 py-3 space-y-3">
            <div>
              <p className="text-[9px] font-bold text-white/40 truncate mb-0.5">{gameSettings.isHome ? team.name : gameSettings.opponent}</p>
              <p className="text-5xl font-black tabular-nums leading-none">{homeScore}</p>
              <FoulDots count={periodFouls[gameSettings.isHome ? 'ours' : 'opp']} limit={foulLimit} className="mt-1" />
            </div>
            <div className="w-full h-px bg-white/10" />
            <div>
              <p className="text-[9px] font-bold text-white/40 truncate mb-0.5">{gameSettings.isHome ? gameSettings.opponent : team.name}</p>
              <p className="text-5xl font-black tabular-nums leading-none">{awayScore}</p>
              <FoulDots count={periodFouls[gameSettings.isHome ? 'opp' : 'ours']} limit={foulLimit} className="mt-1" />
            </div>
            <div className="w-full h-px bg-white/10" />
            <div className="flex items-center gap-2">
              <button onClick={() => setIsTimerRunning(t => !t)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition">
                {isTimerRunning ? <Pause size={13} /> : <Play size={13} />}
              </button>
              <div>
                <p className="text-[9px] text-white/40 font-bold">Q{currentPeriod}</p>
                <p className="text-lg font-black tabular-nums leading-none">{fmtTime(gameTime)}</p>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 p-3 space-y-2 border-t border-white/10">
            <button onClick={() => setShowNextQ(true)} disabled={currentPeriod >= gameSettings.totalPeriods}
              className="w-full py-2.5 rounded-xl text-xs font-black bg-white/15 hover:bg-white/25 text-white transition disabled:opacity-30">
              Next Q →
            </button>
            <button onClick={() => setShowEndGame(true)}
              className="w-full py-2.5 rounded-xl text-xs font-black bg-red-500/20 hover:bg-red-500/30 text-red-300 transition">
              End Game
            </button>
            <div className="flex gap-2">
              <button onClick={() => setShowBoxScore(true)}
                className="flex-1 py-2 rounded-xl text-[10px] font-bold bg-white/10 hover:bg-white/15 text-white/60 flex items-center justify-center gap-1 transition">
                <BarChart2 size={10} /> Box
              </button>
              {currentGameId && (
                <ShareButton path={`/game/${currentGameId}`} title={`${team.name} vs ${gameSettings.opponent}`}
                  toast={toast} compact className="flex-1 py-2 rounded-xl text-[10px] font-bold bg-white/10 hover:bg-white/15 text-white/60 flex items-center justify-center transition" />
              )}
              <button onClick={toggleTheme} className="py-2 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/60 transition">
                {isDark ? <Sun size={12} /> : <Moon size={12} />}
              </button>
            </div>
          </div>
        </div>
      </div>
      <Modals />
    </>
  );
};

export default LiveGameView;