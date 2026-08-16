import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../supabase';
import {
  Play, Pause, Undo2,
  BarChart2, X, UserPlus, ChevronRight, AlertTriangle
} from 'lucide-react';
import { buildRow, sumRows, fmtPct, STAT_COLS, EMPTY_STATS } from '../../utils/statsHelpers';
import LineupModal from '../Game/LineupModal';
import { teamGradientStyle, isHexColor } from '../../utils/colorUtils';
import ShareButton from '../Shared/ShareButton';

// ─── Orientation hook ─────────────────────────────────────────────────────────
const useOrientation = () => {
  const [ls, setLs] = useState(
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false
  );
  useEffect(() => {
    const u = () => setLs(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', u);
    window.addEventListener('orientationchange', u);
    return () => {
      window.removeEventListener('resize', u);
      window.removeEventListener('orientationchange', u);
    };
  }, []);
  return ls;
};

// ─── Stat definitions ─────────────────────────────────────────────────────────
const SCORING = [
  { key:'fg2m',    label:'2PT ✓', updates:{fgm:1,fga:1,pts:2}, cls:'bg-blue-600   active:bg-blue-700   text-white' },
  { key:'fg2miss', label:'2PT ✗', updates:{fga:1},             cls:'bg-gray-800   active:bg-gray-700   text-blue-400   border border-blue-900' },
  { key:'fg3m',    label:'3PT ✓', updates:{tpm:1,tpa:1,pts:3}, cls:'bg-purple-600 active:bg-purple-700 text-white' },
  { key:'fg3miss', label:'3PT ✗', updates:{tpa:1},             cls:'bg-gray-800   active:bg-gray-700   text-purple-400 border border-purple-900' },
  { key:'ftm',     label:'FT ✓',  updates:{ftm:1,fta:1,pts:1}, cls:'bg-green-600  active:bg-green-700  text-white' },
  { key:'ftmiss',  label:'FT ✗',  updates:{fta:1},             cls:'bg-gray-800   active:bg-gray-700   text-green-400  border border-green-900' },
];
const OTHER = [
  { key:'oreb', label:'OREB', updates:{oreb:1}, cls:'bg-orange-600  active:bg-orange-700  text-white' },
  { key:'dreb', label:'DREB', updates:{dreb:1}, cls:'bg-amber-600   active:bg-amber-700   text-white' },
  { key:'ast',  label:'AST',  updates:{ast:1},  cls:'bg-yellow-500  active:bg-yellow-600  text-white' },
  { key:'stl',  label:'STL',  updates:{stl:1},  cls:'bg-emerald-600 active:bg-emerald-700 text-white' },
  { key:'blk',  label:'BLK',  updates:{blk:1},  cls:'bg-indigo-600  active:bg-indigo-700  text-white' },
  { key:'to',   label:'TO',   updates:{to:1},   cls:'bg-orange-700  active:bg-orange-800  text-white' },
  { key:'pf',   label:'FOUL', updates:{pf:1},   cls:'bg-red-600     active:bg-red-700     text-white' },
];

// ✅ Fixed — no extra $ characters
const genId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const formatTime = (s) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// ─── PlayerCard ───────────────────────────────────────────────────────────────
const PlayerCard = React.memo(({ player, isOpp, isSelected, onSelect, pts }) => {
  const border = isSelected
    ? isOpp ? 'border-red-500 bg-red-950' : 'border-blue-500 bg-blue-950'
    : 'border-gray-700 bg-gray-800 hover:border-gray-600';
  const numCls = isSelected ? (isOpp ? 'text-red-400' : 'text-blue-400') : 'text-gray-600';
  const ptsCls = isSelected ? (isOpp ? 'text-red-300' : 'text-blue-300') : 'text-gray-400';
  return (
    <button
      onClick={onSelect}
      className={`flex-shrink-0 w-[72px] flex flex-col items-center justify-center py-1.5 px-1 rounded-xl border transition-all active:scale-95 ${border}`}
    >
      <span className={`text-[9px] font-bold leading-none ${numCls}`}>#{player.number || '—'}</span>
      <span className="text-[11px] font-black text-white truncate w-full text-center leading-tight mt-0.5">
        {player.name.split(' ')[0]}
      </span>
      <span className={`text-sm font-black leading-none mt-0.5 tabular-nums ${ptsCls}`}>{pts ?? 0}</span>
    </button>
  );
});

// ─── StatGrid ─────────────────────────────────────────────────────────────────
const StatGrid = React.memo(({ onStat, disabled }) => (
  <div className="flex-1 flex flex-col gap-1.5 p-2 overflow-hidden min-h-0">
    <div className="flex-1 flex flex-col gap-0.5 min-h-0">
      <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest flex-shrink-0">Scoring</p>
      <div className="flex-1 grid grid-cols-3 gap-1 min-h-0" style={{ gridTemplateRows: 'repeat(2, 1fr)' }}>
        {SCORING.map(a => (
          <button
            key={a.key}
            onClick={() => onStat(a)}
            disabled={disabled}
            className={`w-full h-full rounded-xl font-black text-sm transition-transform active:scale-95 disabled:opacity-20 ${a.cls}`}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
    <div className="flex-1 flex flex-col gap-0.5 min-h-0">
      <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest flex-shrink-0">Other</p>
      <div className="flex-1 grid grid-cols-4 gap-1 min-h-0" style={{ gridTemplateRows: 'repeat(2, 1fr)' }}>
        {OTHER.map(a => (
          <button
            key={a.key}
            onClick={() => onStat(a)}
            disabled={disabled}
            className={`w-full h-full rounded-xl font-black text-sm transition-transform active:scale-95 disabled:opacity-20 ${a.cls}`}
          >
            {a.label}
          </button>
        ))}
        <div />
      </div>
    </div>
  </div>
));

// ─── BoxScoreModal ────────────────────────────────────────────────────────────
const BoxScoreModal = React.memo(({ team, opponent, ourStats, opponentStats, opponentRoster, onClose }) => {
  const [tab, setTab] = useState('ours');
  const isOurs  = tab === 'ours';
  const roster  = team?.roster || [];
  const ourRows = roster.map(p => buildRow(p, ourStats));
  const oppRows = opponentRoster.map(p => buildRow(p, opponentStats));
  const rows    = isOurs ? ourRows : oppRows;
  const totals  = isOurs ? sumRows(ourRows) : sumRows(oppRows);
  const ptsCls  = isOurs ? 'text-blue-400' : 'text-red-400';

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
        <h2 className="font-black text-white text-sm">Box Score</h2>
        <button onClick={onClose} className="p-1.5 text-gray-600 hover:text-white">
          <X size={18} />
        </button>
      </div>
      <div className="flex p-2 gap-1 flex-shrink-0 border-b border-gray-800">
        <button
          onClick={() => setTab('ours')}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition ${isOurs ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
        >
          {team?.name}
        </button>
        <button
          onClick={() => setTab('opp')}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition ${!isOurs ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}`}
        >
          {opponent}
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {rows.length === 0 ? (
          <p className="text-center text-gray-600 py-12 text-sm">No stats yet</p>
        ) : (
          <table className="text-xs min-w-max w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-2 px-3 font-bold text-gray-500 sticky left-0 bg-gray-950 min-w-[120px]">Player</th>
                {STAT_COLS.map(col => (
                  <th key={col.label} className={`py-2 px-2 text-right font-bold ${col.muted ? 'text-gray-700' : 'text-gray-500'}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...rows].sort((a, b) => b.pts - a.pts).map((row, i) => (
                <tr key={row.id} className={i % 2 === 0 ? 'bg-gray-950' : 'bg-gray-900'}>
                  <td className={`py-2 px-3 sticky left-0 ${i % 2 === 0 ? 'bg-gray-950' : 'bg-gray-900'}`}>
                    <span className="text-gray-600 font-mono text-[10px] mr-1.5">#{row.number}</span>
                    <span className="font-bold text-white">{row.name}</span>
                  </td>
                  {STAT_COLS.map(col => (
                    <td key={col.label} className={`py-2 px-2 text-right tabular-nums ${col.bold ? `font-black ${ptsCls}` : col.muted ? 'text-gray-600' : 'text-gray-400'}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-700 bg-gray-800 font-black">
                <td className="py-2 px-3 sticky left-0 bg-gray-800 text-[10px] text-gray-500 uppercase">Team</td>
                {STAT_COLS.map(col => (
                  <td key={col.label} className={`py-2 px-2 text-right tabular-nums ${col.bold ? ptsCls : col.muted ? 'text-gray-600' : 'text-gray-400'}`}>
                    {col.render(totals)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
});

// ─── EditPlayModal ────────────────────────────────────────────────────────────
const EditPlayModal = React.memo(({ play, onDelete, onClose }) => {
  const [deleting, setDeleting] = useState(false);
  const LABELS = {
    fg2m:'2PT Make', fg2miss:'2PT Miss', fg3m:'3PT Make', fg3miss:'3PT Miss',
    ftm:'FT Make', ftmiss:'FT Miss', oreb:'Off Rebound', dreb:'Def Rebound',
    ast:'Assist', stl:'Steal', blk:'Block', to:'Turnover', pf:'Foul', sub_in:'Substitution',
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center">
      <div className="bg-gray-900 w-full max-w-sm rounded-t-2xl border-t border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-white text-sm">Edit Play</h3>
          <button onClick={onClose} className="p-1.5 text-gray-600 hover:text-white">
            <X size={16} />
          </button>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 mb-5">
          <p className="text-[10px] text-gray-500 mb-1">
            Q{play.period} · {play.clock} · {play.team === 'opponent' ? 'OPP' : 'OUR'}
          </p>
          <p className="font-black text-white">{play.label}</p>
          <p className="text-xs text-blue-400 mt-1">{LABELS[play.action] || play.action}</p>
          {play.pts > 0 && <p className="text-xs text-emerald-400 mt-0.5">+{play.pts} pts</p>}
        </div>
        <button
          onClick={async () => { setDeleting(true); await onDelete(play); }}
          disabled={deleting}
          className="w-full py-3.5 bg-red-900 hover:bg-red-800 text-red-300 rounded-xl font-black text-sm transition disabled:opacity-50"
        >
          {deleting ? 'Removing...' : '✕ Remove This Play'}
        </button>
        <p className="text-center text-[10px] text-gray-700 mt-2">Stats and score will be reversed</p>
      </div>
    </div>
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────
const LiveGameView = ({
  user, team, gameSettings, existingGame = null, onGoHome, toast,
}) => {
  const isLandscape = useOrientation();
  const scoreboardStyle = isHexColor(team.colors)
    ? teamGradientStyle(team.colors)
    : undefined;
  const scoreboardClass = `flex-shrink-0 border-b border-black/20 px-3 py-2 ${
    !isHexColor(team.colors) ? 'bg-gray-900' : ''
  }`;
  // ── Game state ───────────────────────────────────────────────────────────────
  const [currentGameId,  setCurrentGameId]  = useState(existingGame?.id || null);
  const [homeScore,      setHomeScore]      = useState(existingGame?.home_score || 0);
  const [awayScore,      setAwayScore]      = useState(existingGame?.away_score || 0);
  const [currentPeriod,  setCurrentPeriod]  = useState(existingGame?.period || 1);
  const [gameTime,       setGameTime]       = useState(
    existingGame?.time_remaining ?? gameSettings.periodLength * 60
  );
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // ── Roster & stats ───────────────────────────────────────────────────────────
  const [activePlayers,  setActivePlayers]  = useState(
    existingGame?.active_players?.length ? existingGame.active_players : []
  );
  const [opponentRoster, setOpponentRoster] = useState(existingGame?.opponent_roster || []);
  const [ourStats,       setOurStats]       = useState(existingGame?.stats || {});
  const [opponentStats,  setOpponentStats]  = useState(existingGame?.opponent_stats || {});
  const [playLog,        setPlayLog]        = useState(existingGame?.play_log || []);

  // ── Selection ────────────────────────────────────────────────────────────────
  const [ourPlayer,  setOurPlayer]  = useState(null);
  const [oppPlayer,  setOppPlayer]  = useState(null);
  const [lastAction, setLastAction] = useState(null);

  // ── Panels ───────────────────────────────────────────────────────────────────
  const [showLineup,   setShowLineup]   = useState(!existingGame);
  const [showOppPanel, setShowOppPanel] = useState(false);
  const [showSubPanel, setShowSubPanel] = useState(false);
  const [showBoxScore, setShowBoxScore] = useState(false);
  const [showPlays,    setShowPlays]    = useState(false);
  const [editingPlay,  setEditingPlay]  = useState(null);
  const [showNextQ,    setShowNextQ]    = useState(false);
  const [showEndGame,  setShowEndGame]  = useState(false);
  const [showAddOpp,   setShowAddOpp]   = useState(false);
  const [newOppName,   setNewOppName]   = useState('');
  const [newOppNum,    setNewOppNum]    = useState('');
  const [subIncoming,  setSubIncoming]  = useState(null);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const live          = useRef({});
  const creatingGame  = useRef(false);
  const minuteTracker = useRef({ entryTimes: {}, accSeconds: {} });
  const isDirty       = useRef(false); // ✅ dirty flag for auto-save

  // ✅ Single useEffect syncs all refs — replaces 9 individual effects
  useEffect(() => {
    live.current = {
      homeScore, awayScore, currentPeriod, gameTime,
      ourStats, opponentStats, activePlayers, opponentRoster, playLog,
    };
    isDirty.current = true; // mark dirty whenever any value changes
  }, [homeScore, awayScore, currentPeriod, gameTime,
      ourStats, opponentStats, activePlayers, opponentRoster, playLog]);

  // ── Minute helpers ───────────────────────────────────────────────────────────
  const getElapsed = useCallback(() => {
    const r = live.current;
    return (r.currentPeriod - 1) * gameSettings.periodLength * 60 +
           (gameSettings.periodLength * 60 - r.gameTime);
  }, [gameSettings.periodLength]);

  const initMinuteTracking = useCallback((ids, resumedStats = null) => {
    const elapsed = getElapsed();
    minuteTracker.current = {
      entryTimes: Object.fromEntries(ids.map(id => [id, elapsed])),
      accSeconds: Object.fromEntries(ids.map(id => [id, ((resumedStats?.[id]?.min) || 0) * 60])),
    };
  }, [getElapsed]);

  const flushMinutes = useCallback((ids, statsSnap, elapsed) => {
    const { entryTimes, accSeconds } = minuteTracker.current;
    const updated = { ...statsSnap };
    ids.forEach(id => {
      if (entryTimes[id] === undefined) return;
      const stint    = Math.max(0, elapsed - entryTimes[id]);
      const total    = (accSeconds[id] || 0) + stint;
      accSeconds[id] = total;
      updated[id]    = {
        ...(updated[id] || { ...EMPTY_STATS }),
        min: total > 0 ? Math.max(1, Math.round(total / 60)) : 0,
      };
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
      setGameTime(p => {
        if (p <= 1) { setIsTimerRunning(false); toast?.info('Period ended!'); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isTimerRunning]); // eslint-disable-line

  // ✅ Auto-save — only fires when dirty
  useEffect(() => {
    if (!currentGameId) return;
    const id = setInterval(() => {
      if (!isDirty.current) return;
      isDirty.current = false;
      const r = live.current;
      supabase.from('games').update({
        home_score:      r.homeScore,
        away_score:      r.awayScore,
        period:          r.currentPeriod,
        time_remaining:  r.gameTime,
        stats:           r.ourStats,
        opponent_stats:  r.opponentStats,
        opponent_roster: r.opponentRoster,
        active_players:  r.activePlayers,
        play_log:        r.playLog,
        updated_at:      new Date().toISOString(),
      }).eq('id', currentGameId);
    }, 5000);
    return () => clearInterval(id);
  }, [currentGameId]);

  // ── Supabase helpers ─────────────────────────────────────────────────────────
  const createGame = async (starters = []) => {
    try {
      const { data, error } = await supabase.from('games').insert([{
        user_id:         user.id,
        team_id:         team.id,
        opponent:        gameSettings.opponent,
        home_team:       gameSettings.isHome ? team.name : gameSettings.opponent,
        status:          'in_progress',
        period:          1,
        time_remaining:  gameSettings.periodLength * 60,
        home_score:      0,
        away_score:      0,
        stats:           {},
        opponent_stats:  {},
        opponent_roster: [],
        active_players:  starters,
        play_log:        [],
        game_settings:   gameSettings,
        visibility:      'public_view',
      }]).select().single();
      if (error) throw error;
      setCurrentGameId(data.id);
      setActivePlayers(starters);
      minuteTracker.current = {
        entryTimes: Object.fromEntries(starters.map(id => [id, 0])),
        accSeconds: {},
      };
      isDirty.current = false; // fresh game — nothing to save yet
      toast?.success('Game started!');
    } catch (err) {
      console.error(err);
      toast?.error('Failed to start game');
    }
  };

  const persist = async (patch) => {
    if (!currentGameId) return;
    try {
      await supabase.from('games')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', currentGameId);
    } catch (err) {
      console.error('Save error:', err);
    }
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
  const handleStatAction = useCallback(async (action, ctx = 'ours') => {
    const player = ctx === 'ours' ? ourPlayer : oppPlayer;
    if (!player) { toast?.info('Select a player first'); return; }

    const isOurs    = ctx === 'ours';
    const base      = isOurs ? live.current.ourStats : live.current.opponentStats;
    const prev      = base[player.id] || { ...EMPTY_STATS };
    const next      = { ...prev };
    Object.entries(action.updates).forEach(([k, v]) => { next[k] = (next[k] || 0) + v; });
    const nextStats = { ...base, [player.id]: next };

    const pts = action.updates.pts || 0;
    let newHome = live.current.homeScore, newAway = live.current.awayScore;
    if (pts > 0) {
      const ourIsHome = gameSettings.isHome;
      if (isOurs) { ourIsHome ? (newHome += pts) : (newAway += pts); }
      else        { ourIsHome ? (newAway += pts) : (newHome += pts); }
      setHomeScore(newHome);
      setAwayScore(newAway);
    }

    const newPlay = {
      id:        genId(),
      timestamp: new Date().toISOString(),
      period:    live.current.currentPeriod,
      clock:     formatTime(live.current.gameTime),
      team:      ctx,
      player:    { id: player.id, name: player.name, number: player.number || '—' },
      action:    action.key,
      label:     `#${player.number || '—'} ${player.name.split(' ')[0]}`,
      pts,
      updates:   action.updates,
    };
    const newPlayLog = [newPlay, ...live.current.playLog];

    setLastAction({
      isOurs,
      prevStats:   base,
      prevHome:    live.current.homeScore,
      prevAway:    live.current.awayScore,
      prevPlayLog: live.current.playLog,
    });

    if (isOurs) setOurStats(nextStats); else setOpponentStats(nextStats);
    setPlayLog(newPlayLog);

    await persist({
      home_score:     newHome,
      away_score:     newAway,
      stats:          isOurs ? nextStats                  : live.current.ourStats,
      opponent_stats: isOurs ? live.current.opponentStats : nextStats,
      play_log:       newPlayLog,
    });
  }, [ourPlayer, oppPlayer, gameSettings.isHome]); // eslint-disable-line

  // ── Undo ─────────────────────────────────────────────────────────────────────
  const handleUndo = useCallback(async () => {
    if (!lastAction) return;
    const { isOurs, prevStats, prevHome, prevAway, prevPlayLog } = lastAction;
    if (isOurs) setOurStats(prevStats); else setOpponentStats(prevStats);
    setHomeScore(prevHome);
    setAwayScore(prevAway);
    setPlayLog(prevPlayLog);
    setLastAction(null);
    await persist({
      home_score:     prevHome,
      away_score:     prevAway,
      stats:          isOurs ? prevStats                  : live.current.ourStats,
      opponent_stats: isOurs ? live.current.opponentStats : prevStats,
      play_log:       prevPlayLog,
    });
    toast?.info('Undone');
  }, [lastAction]); // eslint-disable-line

  // ── Delete specific play ──────────────────────────────────────────────────────
  const handleDeletePlay = useCallback(async (play) => {
    const isOurs  = play.team === 'ours';
    const base    = isOurs ? live.current.ourStats : live.current.opponentStats;
    const pStat   = { ...(base[play.player.id] || { ...EMPTY_STATS }) };
    Object.entries(play.updates || {}).forEach(([k, v]) => {
      pStat[k] = Math.max(0, (pStat[k] || 0) - v);
    });
    const nextStats = { ...base, [play.player.id]: pStat };

    const pts = play.pts || 0;
    let newHome = live.current.homeScore, newAway = live.current.awayScore;
    if (pts > 0) {
      const ourIsHome = gameSettings.isHome;
      if (isOurs) { ourIsHome ? (newHome -= pts) : (newAway -= pts); }
      else        { ourIsHome ? (newAway -= pts) : (newHome -= pts); }
      setHomeScore(Math.max(0, newHome));
      setAwayScore(Math.max(0, newAway));
    }

    const newPlayLog = live.current.playLog.filter(p => p.id !== play.id);
    if (isOurs) setOurStats(nextStats); else setOpponentStats(nextStats);
    setPlayLog(newPlayLog);
    setEditingPlay(null);

    await persist({
      home_score:     Math.max(0, newHome),
      away_score:     Math.max(0, newAway),
      stats:          isOurs ? nextStats                  : live.current.ourStats,
      opponent_stats: isOurs ? live.current.opponentStats : nextStats,
      play_log:       newPlayLog,
    });
    toast?.info('Play removed');
  }, [gameSettings.isHome]); // eslint-disable-line

  // ── Substitution ──────────────────────────────────────────────────────────────
  const handleSub = useCallback(async (outPlayer) => {
    if (!subIncoming) return;
    const elapsed = getElapsed();
    const { entryTimes, accSeconds } = minuteTracker.current;

    if (entryTimes[outPlayer.id] !== undefined) {
      const stint = Math.max(0, elapsed - entryTimes[outPlayer.id]);
      accSeconds[outPlayer.id] = (accSeconds[outPlayer.id] || 0) + stint;
      delete entryTimes[outPlayer.id];
    }
    entryTimes[subIncoming.id] = elapsed;
    minuteTracker.current = { entryTimes, accSeconds };

    const updatedStats = { ...live.current.ourStats };
    const outS         = { ...(updatedStats[outPlayer.id] || { ...EMPTY_STATS }) };
    const totalSecs    = accSeconds[outPlayer.id] || 0;
    outS.min           = totalSecs > 0 ? Math.max(1, Math.round(totalSecs / 60)) : 0;
    updatedStats[outPlayer.id] = outS;

    const newActive = live.current.activePlayers.map(id =>
      id === outPlayer.id ? subIncoming.id : id
    );

    const subPlay = {
      id:        genId(),
      timestamp: new Date().toISOString(),
      period:    live.current.currentPeriod,
      clock:     formatTime(live.current.gameTime),
      team:      'ours',
      player:    { id: subIncoming.id, name: subIncoming.name, number: subIncoming.number || '—' },
      action:    'sub_in',
      label:     `${subIncoming.name.split(' ')[0]} for ${outPlayer.name.split(' ')[0]}`,
      pts:       0,
      updates:   {},
    };
    const newPlayLog = [subPlay, ...live.current.playLog];

    setOurStats(updatedStats);
    setActivePlayers(newActive);
    setPlayLog(newPlayLog);
    setSubIncoming(null);
    setShowSubPanel(false);
    if (ourPlayer?.id === outPlayer.id) setOurPlayer(null);

    toast?.info(`${subIncoming.name.split(' ')[0]} in for ${outPlayer.name.split(' ')[0]}`);
    await persist({ stats: updatedStats, active_players: newActive, play_log: newPlayLog });
  }, [subIncoming, ourPlayer, getElapsed]); // eslint-disable-line

  // ── Add opponent player ───────────────────────────────────────────────────────
  const handleAddOppPlayer = useCallback(async () => {
    if (!newOppName.trim()) return;
    const player  = { id: `opp-${Date.now()}`, name: newOppName.trim(), number: newOppNum.trim() || '?' };
    const updated = [...opponentRoster, player];
    setOpponentRoster(updated);
    setNewOppName('');
    setNewOppNum('');
    setShowAddOpp(false);
    await persist({ opponent_roster: updated });
  }, [newOppName, newOppNum, opponentRoster]); // eslint-disable-line

  // ── Next period ───────────────────────────────────────────────────────────────
  const handleNextPeriod = useCallback(async () => {
    const r         = live.current;
    const periodEnd = r.currentPeriod * gameSettings.periodLength * 60;
    const flushed   = flushMinutes(r.activePlayers, r.ourStats, periodEnd);
    r.activePlayers.forEach(id => {
      minuteTracker.current.entryTimes[id] = periodEnd;
    });
    const next = r.currentPeriod + 1;
    setOurStats(flushed);
    setCurrentPeriod(next);
    setGameTime(gameSettings.periodLength * 60);
    setIsTimerRunning(false);
    setShowNextQ(false);
    setOurPlayer(null);
    toast?.info(`Q${next} starting`);
    await persist({ stats: flushed });
  }, [gameSettings.periodLength, flushMinutes]); // eslint-disable-line

  // ── Update team record ────────────────────────────────────────────────────────
  const updateTeamRecord = useCallback(async (finalHome, finalAway) => {
    const ourScore = gameSettings.isHome ? finalHome : finalAway;
    const oppScore = gameSettings.isHome ? finalAway : finalHome;
    if (ourScore === oppScore) return;
    try {
      const { error } = await supabase.rpc('increment_team_record', {
        p_team_id:    team.id,
        p_won:        ourScore > oppScore,
        p_is_playoff: gameSettings.game_type === 'playoff',
      });
      if (error) throw error;
    } catch (err) {
      console.error('Failed to update team record:', err);
    }
  }, [gameSettings.isHome, gameSettings.game_type, team.id]);

  // ── End game ──────────────────────────────────────────────────────────────────
  const handleEndGame = useCallback(async () => {
    const r       = live.current;
    const elapsed = getElapsed();
    const flushed = flushMinutes(r.activePlayers, r.ourStats, elapsed);
    try {
      await persist({
        home_score:      r.homeScore,
        away_score:      r.awayScore,
        period:          r.currentPeriod,
        time_remaining:  r.gameTime,
        stats:           flushed,
        opponent_stats:  r.opponentStats,
        opponent_roster: r.opponentRoster,
        active_players:  r.activePlayers,
        play_log:        r.playLog,
        status:          'completed',
      });
      await updateTeamRecord(r.homeScore, r.awayScore);
      toast?.success('Game ended!');
      onGoHome();
    } catch (err) {
      console.error(err);
      toast?.error('Failed to end game');
    }
  }, [getElapsed, flushMinutes, updateTeamRecord, onGoHome]); // eslint-disable-line

  // ── Derived values ────────────────────────────────────────────────────────────
  const courtPlayers = team.roster?.filter(p => activePlayers.includes(p.id)) || [];
  const benchPlayers = team.roster?.filter(p => !activePlayers.includes(p.id)) || [];
  const ourScore     = gameSettings.isHome ? homeScore : awayScore;
  const oppScore     = gameSettings.isHome ? awayScore : homeScore;
  const lastPlay     = playLog[0] || null;
  const ourSel       = ourPlayer;
  const ourSelStats  = ourSel ? (ourStats[ourSel.id] || { ...EMPTY_STATS }) : null;

  // ── Shared panel props (avoids prop drilling repetition) ──────────────────────
  const oppPanelProps = {
    gameSettings, opponentRoster, oppPlayer, setOppPlayer,
    opponentStats, showAddOpp, setShowAddOpp,
    newOppName, setNewOppName, newOppNum, setNewOppNum,
    handleAddOppPlayer, handleStatAction,
    setShowOppPanel,
  };

  const subPanelProps = {
    subIncoming, setSubIncoming,
    benchPlayers, courtPlayers,
    getLiveMin, handleSub,
    setShowSubPanel,
  };

  // ─── PORTRAIT ────────────────────────────────────────────────────────────────
  const Portrait = () => (
    <div className="h-screen w-full bg-gray-950 flex flex-col overflow-hidden text-white">

      {/* Scoreboard */}
      <div className={scoreboardClass} style={scoreboardStyle}>
        <div className="flex items-center justify-between">
          <div className="flex-1 text-center">
            <p className="text-[9px] text-gray-500 font-bold truncate">
              {gameSettings.isHome ? team.name : gameSettings.opponent}
            </p>
            <p className="text-4xl font-black tabular-nums leading-none">{homeScore}</p>
          </div>
          <div className="px-3 text-center flex-shrink-0">
            <p className="text-[9px] text-gray-500 font-bold">Q{currentPeriod}</p>
            <p className="text-lg font-black tabular-nums leading-none">{formatTime(gameTime)}</p>
            <button
              onClick={() => setIsTimerRunning(t => !t)}
              className="mt-0.5 p-1 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              {isTimerRunning ? <Pause size={12} /> : <Play size={12} />}
            </button>
          </div>
          <div className="flex-1 text-center">
            <p className="text-[9px] text-gray-500 font-bold truncate">
              {gameSettings.isHome ? gameSettings.opponent : team.name}
            </p>
            <p className="text-4xl font-black tabular-nums leading-none">{awayScore}</p>
          </div>
        </div>
      </div>

      {/* Selected player strip */}
      <div className="flex-shrink-0 bg-gray-900 border-b border-gray-800 px-3 py-1.5 flex items-center gap-2 min-h-[44px]">
        {ourSel && ourSelStats ? (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-blue-400 truncate">
                #{ourSel.number || '—'} {ourSel.name}
                <span className="ml-2 text-white">{ourSelStats.pts}pts</span>
                <span className="ml-1.5 text-gray-500 text-[10px]">{getLiveMin(ourSel.id)}min</span>
              </p>
              <p className="text-[10px] text-gray-600 leading-tight">
                {ourSelStats.fgm+ourSelStats.tpm}/{ourSelStats.fga+ourSelStats.tpa} FG
                · {ourSelStats.oreb+ourSelStats.dreb}reb
                · {ourSelStats.ast}ast
                · {ourSelStats.stl}stl
              </p>
            </div>
            {lastAction && (
              <button
                onClick={handleUndo}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-[10px] font-black text-gray-400 flex-shrink-0 transition"
              >
                <Undo2 size={10} /> UNDO
              </button>
            )}
          </>
        ) : (
          <p className="text-xs text-gray-700 font-bold italic">← Select a player to log stats</p>
        )}
      </div>

      {/* Court players */}
      <div className="flex-shrink-0 px-2 py-1.5 border-b border-gray-800 bg-gray-900">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {courtPlayers.map(p => (
            <PlayerCard
              key={p.id}
              player={p}
              isOpp={false}
              isSelected={ourPlayer?.id === p.id}
              onSelect={() => {
                setOurPlayer(prev => prev?.id === p.id ? null : p);
                setShowOppPanel(false);
                setShowSubPanel(false);
              }}
              pts={ourStats[p.id]?.pts || 0}
            />
          ))}
          {courtPlayers.length === 0 && (
            <p className="text-xs text-gray-700 py-3 px-2">No active players — set lineup</p>
          )}
        </div>
      </div>

      {/* Stat buttons */}
      <div className="flex-1 min-h-0 bg-gray-950">
        {ourPlayer ? (
          <StatGrid onStat={a => handleStatAction(a, 'ours')} disabled={false} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-700 font-bold text-sm">Select a player above</p>
          </div>
        )}
      </div>

      {/* Last play strip */}
      <div className="flex-shrink-0 bg-gray-900 border-t border-gray-800 px-3 py-1.5 flex items-center gap-2">
        {lastPlay ? (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-500 truncate">
                <span className="text-blue-400 font-bold">{lastPlay.label}</span>
                {' · Q'}{lastPlay.period} {lastPlay.clock}
                {lastPlay.pts > 0 && <span className="text-emerald-500"> +{lastPlay.pts}</span>}
              </p>
            </div>
            <button onClick={() => setEditingPlay(lastPlay)} className="text-[10px] text-gray-600 hover:text-gray-400 font-bold flex-shrink-0 transition">EDIT</button>
            <button onClick={() => setShowPlays(true)} className="text-[10px] text-blue-600 hover:text-blue-400 font-bold flex-shrink-0 transition flex items-center gap-0.5">
              ALL <ChevronRight size={10} />
            </button>
          </>
        ) : (
          <p className="text-[10px] text-gray-700">No plays yet</p>
        )}
      </div>

      {/* Controls bar */}
      <div className="flex-shrink-0 grid grid-cols-4 gap-1 px-2 py-1.5 bg-gray-900 border-t border-gray-800">
        <button
          onClick={() => { setShowOppPanel(v => !v); setShowSubPanel(false); }}
          className={`py-2 rounded-xl text-[11px] font-black transition ${showOppPanel ? 'bg-red-700 text-white' : 'bg-gray-800 text-red-400 hover:bg-gray-700'}`}
        >
          OPP
        </button>
        <button
          onClick={() => { setShowSubPanel(v => !v); setShowOppPanel(false); setSubIncoming(null); }}
          className={`py-2 rounded-xl text-[11px] font-black transition ${showSubPanel ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        >
          SUB {benchPlayers.length > 0 && <span className="opacity-60">({benchPlayers.length})</span>}
        </button>
        <button
          onClick={() => setShowNextQ(true)}
          disabled={currentPeriod >= gameSettings.totalPeriods}
          className="py-2 rounded-xl text-[11px] font-black bg-blue-900 text-blue-300 hover:bg-blue-800 disabled:opacity-30 transition"
        >
          NEXT Q
        </button>
        <button
          onClick={() => setShowEndGame(true)}
          className="py-2 rounded-xl text-[11px] font-black bg-gray-800 text-gray-500 hover:bg-gray-700 transition"
        >
          END
        </button>
      </div>

      {/* Box score link */}
      <button
        onClick={() => setShowBoxScore(true)}
        className="flex-shrink-0 flex items-center justify-center gap-1.5 py-1.5 bg-gray-950 border-t border-gray-900 text-[10px] text-gray-700 hover:text-blue-400 transition font-bold"
      >
        <BarChart2 size={10} /> VIEW BOX SCORE
      </button>

      {/* Opp Panel */}
      <OppPanel {...oppPanelProps} />

      {/* Sub Panel */}
      <SubPanel {...subPanelProps} />

      {/* Confirmations */}
      <NextQModal
        show={showNextQ}
        currentPeriod={currentPeriod}
        ourScore={ourScore}
        oppScore={oppScore}
        teamName={team.name}
        opponent={gameSettings.opponent}
        onCancel={() => setShowNextQ(false)}
        onConfirm={handleNextPeriod}
      />
      <EndGameModal
        show={showEndGame}
        ourScore={ourScore}
        oppScore={oppScore}
        teamName={team.name}
        opponent={gameSettings.opponent}
        onCancel={() => setShowEndGame(false)}
        onConfirm={handleEndGame}
      />

      {/* Plays */}
      <PlaysModal
        show={showPlays}
        playLog={playLog}
        onClose={() => setShowPlays(false)}
        onEditPlay={(play) => { setEditingPlay(play); setShowPlays(false); }}
      />
    </div>
  );

  // ── LANDSCAPE ─────────────────────────────────────────────────────────────────
  const Landscape = () => (
    <div className="h-screen w-full bg-gray-950 flex overflow-hidden text-white">

      {/* Left column */}
      <div className="w-[200px] flex-shrink-0 flex flex-col border-r border-gray-800 bg-gray-900">

        {/* Score */}
        <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b border-black/20" style={scoreboardStyle}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-gray-600 font-bold uppercase">Q{currentPeriod}</span>
            <span className="text-sm font-black tabular-nums">{formatTime(gameTime)}</span>
            <button onClick={() => setIsTimerRunning(t => !t)} className="p-1 bg-gray-800 hover:bg-gray-700 rounded-lg transition">
              {isTimerRunning ? <Pause size={10} /> : <Play size={10} />}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-[9px] text-gray-600 truncate max-w-[60px]">{gameSettings.isHome ? team.name : gameSettings.opponent}</p>
              <p className="text-3xl font-black tabular-nums leading-none">{homeScore}</p>
            </div>
            <span className="text-gray-700 font-black text-sm">—</span>
            <div className="text-center">
              <p className="text-[9px] text-gray-600 truncate max-w-[60px]">{gameSettings.isHome ? gameSettings.opponent : team.name}</p>
              <p className="text-3xl font-black tabular-nums leading-none">{awayScore}</p>
            </div>
          </div>
        </div>

        {/* Court players */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
          <p className="text-[9px] font-black text-gray-700 uppercase tracking-wider px-1">On Court</p>
          {courtPlayers.map(p => {
            const isSel = ourPlayer?.id === p.id;
            return (
              <button key={p.id}
                onClick={() => setOurPlayer(prev => prev?.id === p.id ? null : p)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xl border transition active:scale-95 ${isSel ? 'border-blue-500 bg-blue-950' : 'border-gray-800 hover:border-gray-700 bg-gray-800'}`}
              >
                <span className={`text-[10px] font-bold flex-shrink-0 ${isSel ? 'text-blue-400' : 'text-gray-600'}`}>#{p.number || '—'}</span>
                <span className="text-xs font-black text-white truncate flex-1 text-left">{p.name.split(' ')[0]}</span>
                <span className={`text-sm font-black tabular-nums flex-shrink-0 ${isSel ? 'text-blue-300' : 'text-gray-500'}`}>{ourStats[p.id]?.pts || 0}</span>
              </button>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex-shrink-0 px-2 pb-2 space-y-1.5 border-t border-gray-800 pt-2">
          <div className="grid grid-cols-2 gap-1">
            <button onClick={() => { setShowOppPanel(v => !v); setShowSubPanel(false); }}
              className={`py-2 rounded-xl text-[10px] font-black transition ${showOppPanel ? 'bg-red-700 text-white' : 'bg-gray-800 text-red-400'}`}>
              OPP
            </button>
            <button onClick={() => { setShowSubPanel(v => !v); setShowOppPanel(false); setSubIncoming(null); }}
              className={`py-2 rounded-xl text-[10px] font-black transition ${showSubPanel ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
              SUB
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <button onClick={() => setShowNextQ(true)} disabled={currentPeriod >= gameSettings.totalPeriods}
              className="py-2 rounded-xl text-[10px] font-black bg-blue-900 text-blue-300 disabled:opacity-30 transition">
              NEXT Q
            </button>
            <button onClick={() => setShowEndGame(true)}
              className="py-2 rounded-xl text-[10px] font-black bg-gray-800 text-gray-500 transition">
              END
            </button>
          </div>
          <button onClick={() => setShowBoxScore(true)}
            className="w-full py-1.5 flex items-center justify-center gap-1 text-[10px] text-gray-700 hover:text-blue-400 transition font-bold">
            <BarChart2 size={10} /> Box Score
          </button>
          <div className="flex-shrink-0 flex items-center justify-between px-3 py-1.5 bg-gray-950 border-t border-gray-900">
          <button
            onClick={() => setShowBoxScore(true)}
            className="flex items-center gap-1.5 text-[10px] text-gray-700 hover:text-blue-400 transition font-bold"
          >
            <BarChart2 size={10} /> VIEW BOX SCORE
          </button>
          {currentGameId && (
            <ShareButton
              path={`/game/${currentGameId}`}
              title={`${team.name} vs ${gameSettings.opponent}`}
              toast={toast}
              className="text-[10px] text-gray-700 hover:text-blue-400 transition font-bold flex items-center gap-1"
            />
          )}
        </div>
        </div>
      </div>

      {/* Right column */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Selected player strip */}
        <div className="flex-shrink-0 px-4 py-2 border-b border-gray-800 bg-gray-900 flex items-center gap-3 min-h-[44px]">
          {ourSel && ourSelStats ? (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-blue-400 truncate">
                  #{ourSel.number || '—'} {ourSel.name}
                  <span className="ml-2 text-white">{ourSelStats.pts}pts</span>
                  <span className="ml-1.5 text-gray-600 text-[10px]">{getLiveMin(ourSel.id)}min</span>
                  <span className="ml-1.5 text-gray-600 text-[10px]">
                    {ourSelStats.fgm+ourSelStats.tpm}/{ourSelStats.fga+ourSelStats.tpa} FG
                    · {ourSelStats.oreb+ourSelStats.dreb}reb · {ourSelStats.ast}ast
                  </span>
                </p>
              </div>
              {lastAction && (
                <button onClick={handleUndo}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-[10px] font-black text-gray-400 flex-shrink-0">
                  <Undo2 size={10} /> UNDO
                </button>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-700 font-bold italic">Select a player to log stats</p>
          )}
        </div>

        {/* Stat grid */}
        <div className="flex-1 min-h-0">
          {ourPlayer ? (
            <StatGrid onStat={a => handleStatAction(a, 'ours')} disabled={false} />
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-700 font-bold">Select a player</p>
            </div>
          )}
        </div>

        {/* Last play */}
        <div className="flex-shrink-0 border-t border-gray-800 bg-gray-900 px-4 py-1.5 flex items-center gap-2">
          {lastPlay ? (
            <>
              <p className="flex-1 text-[10px] text-gray-600 truncate">
                <span className="text-blue-400 font-bold">{lastPlay.label}</span>
                {' · Q'}{lastPlay.period} {lastPlay.clock}
                {lastPlay.pts > 0 && <span className="text-emerald-500"> +{lastPlay.pts}</span>}
              </p>
              <button onClick={() => setEditingPlay(lastPlay)} className="text-[10px] text-gray-600 hover:text-gray-400 font-bold">EDIT</button>
              <button onClick={() => setShowPlays(true)} className="text-[10px] text-blue-600 hover:text-blue-400 font-bold flex items-center gap-0.5">
                ALL <ChevronRight size={10} />
              </button>
            </>
          ) : (
            <p className="text-[10px] text-gray-700">No plays yet</p>
          )}
        </div>
      </div>

      {/* Landscape overlays — reuse same panel components */}
      <OppPanel {...oppPanelProps} />
      <SubPanel {...subPanelProps} />
      <NextQModal
        show={showNextQ}
        currentPeriod={currentPeriod}
        ourScore={ourScore}
        oppScore={oppScore}
        teamName={team.name}
        opponent={gameSettings.opponent}
        onCancel={() => setShowNextQ(false)}
        onConfirm={handleNextPeriod}
      />
      <EndGameModal
        show={showEndGame}
        ourScore={ourScore}
        oppScore={oppScore}
        teamName={team.name}
        opponent={gameSettings.opponent}
        onCancel={() => setShowEndGame(false)}
        onConfirm={handleEndGame}
      />
      <PlaysModal
        show={showPlays}
        playLog={playLog}
        onClose={() => setShowPlays(false)}
        onEditPlay={(play) => { setEditingPlay(play); setShowPlays(false); }}
      />
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      {isLandscape ? <Landscape /> : <Portrait />}

      {showLineup && !existingGame && (
        <LineupModal team={team} onConfirm={handleLineupConfirmed} />
      )}

      {showBoxScore && (
        <BoxScoreModal
          team={team}
          opponent={gameSettings.opponent}
          ourStats={ourStats}
          opponentStats={opponentStats}
          opponentRoster={opponentRoster}
          onClose={() => setShowBoxScore(false)}
        />
      )}

      {editingPlay && (
        <EditPlayModal
          play={editingPlay}
          onDelete={handleDeletePlay}
          onClose={() => setEditingPlay(null)}
        />
      )}
    </>
  );
};

// ─── Panel sub-components (outside LiveGameView — stable references) ──────────

const OppPanel = React.memo(({
  gameSettings, opponentRoster, oppPlayer, setOppPlayer,
  opponentStats, showAddOpp, setShowAddOpp,
  newOppName, setNewOppName, newOppNum, setNewOppNum,
  handleAddOppPlayer, handleStatAction, setShowOppPanel,
}) => (
  <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/60">
    <div className="bg-gray-900 rounded-t-2xl border-t border-gray-700 max-h-[80vh] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
        <h3 className="font-black text-sm text-red-400">{gameSettings.opponent}</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAddOpp(v => !v)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-800 text-gray-400 rounded-lg text-[10px] font-bold hover:bg-gray-700 transition">
            <UserPlus size={11} /> Add Player
          </button>
          <button onClick={() => setShowOppPanel(false)} className="p-1 text-gray-600 hover:text-white">
            <X size={16} />
          </button>
        </div>
      </div>
      {showAddOpp && (
        <div className="flex gap-2 px-4 py-2 border-b border-gray-800 flex-shrink-0">
          <input autoFocus type="text" placeholder="Name" value={newOppName}
            onChange={e => setNewOppName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddOppPlayer()}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500"
          />
          <input type="text" placeholder="#" value={newOppNum}
            onChange={e => setNewOppNum(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddOppPlayer()}
            className="w-14 px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500"
          />
          <button onClick={handleAddOppPlayer} className="px-3 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition">Add</button>
        </div>
      )}
      {opponentRoster.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-800 flex-shrink-0">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {opponentRoster.map(p => (
              <PlayerCard key={p.id} player={p} isOpp={true}
                isSelected={oppPlayer?.id === p.id}
                onSelect={() => setOppPlayer(prev => prev?.id === p.id ? null : p)}
                pts={opponentStats[p.id]?.pts || 0}
              />
            ))}
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0">
        {oppPlayer ? (
          <>
            <div className="px-4 py-1.5 border-b border-gray-800 flex-shrink-0">
              <p className="text-xs font-black text-red-400">
                #{oppPlayer.number} {oppPlayer.name}
                <span className="ml-2 text-white">{opponentStats[oppPlayer.id]?.pts || 0}pts</span>
              </p>
            </div>
            <StatGrid onStat={a => handleStatAction(a, 'opponent')} disabled={false} />
          </>
        ) : (
          <div className="flex items-center justify-center h-24">
            <p className="text-gray-600 text-sm font-bold">
              {opponentRoster.length === 0 ? 'Add opponent players above' : 'Select an opponent player'}
            </p>
          </div>
        )}
      </div>
    </div>
  </div>
));

const SubPanel = React.memo(({
  subIncoming, setSubIncoming,
  benchPlayers, courtPlayers,
  getLiveMin, handleSub, setShowSubPanel,
}) => (
  <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/60">
    <div className="bg-gray-900 rounded-t-2xl border-t border-gray-700 max-h-[60vh] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
        <h3 className="font-black text-sm text-white">
          {!subIncoming ? '① Select player coming IN' : '② Select player going OUT'}
        </h3>
        <button onClick={() => { setShowSubPanel(false); setSubIncoming(null); }}>
          <X size={16} className="text-gray-600" />
        </button>
      </div>
      {!subIncoming ? (
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {benchPlayers.length === 0 ? (
            <p className="text-center text-gray-600 py-8 text-sm">No bench players</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {benchPlayers.map(p => (
                <button key={p.id} onClick={() => setSubIncoming(p)}
                  className="p-3 bg-gray-800 hover:bg-blue-900 border border-gray-700 hover:border-blue-500 rounded-xl text-left transition active:scale-95">
                  <p className="text-[10px] text-gray-500">#{p.number || '—'}</p>
                  <p className="text-sm font-black text-white truncate">{p.name.split(' ')[0]}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{getLiveMin(p.id)} min</p>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="flex items-center gap-2 mb-3 p-2 bg-blue-950 rounded-xl">
            <span className="text-[10px] text-blue-400 font-bold">IN:</span>
            <span className="text-xs font-black text-white">#{subIncoming.number || '—'} {subIncoming.name}</span>
            <button onClick={() => setSubIncoming(null)} className="ml-auto text-[10px] text-gray-600 hover:text-white">← back</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {courtPlayers.map(p => (
              <button key={p.id} onClick={() => handleSub(p)}
                className="p-3 bg-orange-950 hover:bg-orange-900 border border-orange-800 rounded-xl text-left transition active:scale-95">
                <p className="text-[10px] text-orange-500">#{p.number || '—'}</p>
                <p className="text-sm font-black text-white truncate">{p.name.split(' ')[0]}</p>
                <p className="text-[10px] text-orange-700 mt-0.5">{getLiveMin(p.id)} min</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
));

const NextQModal = React.memo(({ show, currentPeriod, ourScore, oppScore, teamName, opponent, onCancel, onConfirm }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={20} className="text-yellow-500 flex-shrink-0" />
          <h3 className="font-black text-white">End Q{currentPeriod}?</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4 bg-gray-800 rounded-xl p-3">
          <div className="text-center">
            <p className="text-2xl font-black text-white">{ourScore}</p>
            <p className="text-[10px] text-gray-500 truncate">{teamName}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-white">{oppScore}</p>
            <p className="text-[10px] text-gray-500 truncate">{opponent}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl font-bold text-sm transition">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-3 bg-blue-700 hover:bg-blue-600 text-white rounded-xl font-black text-sm transition">Start Q{currentPeriod + 1}</button>
        </div>
      </div>
    </div>
  );
});

const EndGameModal = React.memo(({ show, ourScore, oppScore, teamName, opponent, onCancel, onConfirm }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
          <h3 className="font-black text-white">End Game?</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4 bg-gray-800 rounded-xl p-3">
          <div className="text-center">
            <p className="text-3xl font-black text-white">{ourScore}</p>
            <p className="text-[10px] text-gray-500 truncate">{teamName}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-white">{oppScore}</p>
            <p className="text-[10px] text-gray-500 truncate">{opponent}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl font-bold text-sm transition">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-3 bg-red-800 hover:bg-red-700 text-white rounded-xl font-black text-sm transition">End Game</button>
        </div>
      </div>
    </div>
  );
});

const PlaysModal = React.memo(({ show, playLog, onClose, onEditPlay }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
        <h2 className="font-black text-white text-sm">All Plays</h2>
        <button onClick={onClose} className="p-1.5 text-gray-600 hover:text-white">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {playLog.map(play => (
          <div key={play.id}
            onClick={() => onEditPlay(play)}
            className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-900 hover:bg-gray-900 cursor-pointer"
          >
            <span className="text-[10px] font-mono text-gray-600 w-14 flex-shrink-0 text-right">Q{play.period} {play.clock}</span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0 ${play.team === 'opponent' ? 'bg-red-950 text-red-400' : 'bg-blue-950 text-blue-400'}`}>
              {play.action.toUpperCase()
                .replace('FG2M','2PT✓').replace('FG2MISS','2PT✗')
                .replace('FG3M','3PT✓').replace('FG3MISS','3PT✗')
                .replace('FTM','FT✓').replace('FTMISS','FT✗')
                .replace('SUB_IN','SUB')}
            </span>
            <span className="flex-1 text-xs text-gray-400 font-semibold truncate">{play.label}</span>
            {play.pts > 0 && (
              <span className={`text-xs font-black flex-shrink-0 ${play.team === 'opponent' ? 'text-red-500' : 'text-emerald-500'}`}>
                +{play.pts}
              </span>
            )}
          </div>
        ))}
        {playLog.length === 0 && <p className="text-center text-gray-700 py-12 text-sm">No plays yet</p>}
      </div>
    </div>
  );
});

export default LiveGameView;