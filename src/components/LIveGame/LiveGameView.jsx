// src/components/LIveGame/LiveGameView.jsx
// Drop-in replacement — all Supabase logic preserved, UI redesigned.
// Portrait: scoreboard top → player strip → stat buttons (thumb zone)
// Landscape: left column (opponent + players) / right column (stat buttons)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/supabase';
import AppHeader from '../Shared/AppHeader';
import { Play, Pause } from 'lucide-react';

// ── Stat config ────────────────────────────────────────────
const STAT_GROUPS = [
  {
    label: 'SCORING', cols: 3,
    buttons: [
      { id: 'fgm',    label: 'MADE 2',  color: '#1a8a4a', pts: 2 },
      { id: 'tpm',    label: 'MADE 3',  color: '#157040', pts: 3 },
      { id: 'ftm',    label: 'FT MADE', color: '#0f5830', pts: 1 },
      { id: 'miss2',  label: 'MISS 2',  color: '#4a4a5a', pts: 0 },
      { id: 'miss3',  label: 'MISS 3',  color: '#3e3e4e', pts: 0 },
      { id: 'missft', label: 'FT MISS', color: '#343444', pts: 0 },
    ],
  },
  {
    label: 'BOARDS', cols: 2,
    buttons: [
      { id: 'oreb', label: 'OFF REB', color: '#2255b8' },
      { id: 'dreb', label: 'DEF REB', color: '#1b449a' },
    ],
  },
  {
    label: 'DEFENSE', cols: 2,
    buttons: [
      { id: 'stl', label: 'STEAL', color: '#117a6a' },
      { id: 'blk', label: 'BLOCK', color: '#0d6055' },
    ],
  },
  {
    label: 'PLAY', cols: 2,
    buttons: [
      { id: 'ast', label: 'ASSIST',   color: '#8a5a10' },
      { id: 'to',  label: 'TURNOVER', color: '#9a2a1a' },
    ],
  },
];

const ALL_BTNS = STAT_GROUPS.flatMap(g => g.buttons);
const OPP_BTNS = [{ pts: 1, label: '+1' }, { pts: 2, label: '+2' }, { pts: 3, label: '+3' }];

function fmtTime(s) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

// ── Sub Modal ─────────────────────────────────────────────
function SubModal({ team, activePlayers, onConfirm, onClose }) {
  const roster = team.roster || [];
  const bench  = roster.filter(p => !activePlayers.includes(p.id));
  const active = roster.filter(p =>  activePlayers.includes(p.id));
  const [out, setOut] = useState(null);
  const [inP, setInP] = useState(null);
  const canConfirm = out && inP;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-white rounded-t-2xl p-5 pb-8" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="font-black text-gray-900 text-base">Substitution</span>
          <button onClick={onClose} className="text-gray-400 font-black text-lg w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">✕</button>
        </div>

        <div className="mb-4">
          <div className="text-xs font-black tracking-widest text-red-500 mb-2">COMING OUT</div>
          <div className="flex flex-wrap gap-2">
            {active.map(p => (
              <button
                key={p.id}
                onClick={() => setOut(p.id === out ? null : p.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 font-bold text-sm transition"
                style={{ borderColor: out === p.id ? '#dc2626' : '#e5e7eb', background: out === p.id ? '#fef2f2' : '#f9fafb', color: out === p.id ? '#dc2626' : '#374151' }}
              >
                <span className="font-mono font-black" style={{ color: out === p.id ? '#dc2626' : '#6b7280' }}>
                  #{p.number ?? p.jersey_number ?? p.num ?? '?'}
                </span>
                {(p.name || p.first_name || '').split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <div className="text-xs font-black tracking-widest text-green-600 mb-2">COMING IN</div>
          {bench.length === 0
            ? <p className="text-sm text-gray-400">No bench players available</p>
            : (
              <div className="flex flex-wrap gap-2">
                {bench.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setInP(p.id === inP ? null : p.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 font-bold text-sm transition"
                    style={{ borderColor: inP === p.id ? '#16a34a' : '#e5e7eb', background: inP === p.id ? '#f0fdf4' : '#f9fafb', color: inP === p.id ? '#16a34a' : '#374151' }}
                  >
                    <span className="font-mono font-black" style={{ color: inP === p.id ? '#16a34a' : '#6b7280' }}>
                      #{p.number ?? p.jersey_number ?? p.num ?? '?'}
                    </span>
                    {(p.name || p.first_name || '').split(' ')[0]}
                  </button>
                ))}
              </div>
            )
          }
        </div>

        <button
          onClick={() => canConfirm && onConfirm(out, inP)}
          disabled={!canConfirm}
          className="w-full h-12 rounded-xl font-black text-sm tracking-wide transition"
          style={{ background: canConfirm ? '#2563eb' : '#e5e7eb', color: canConfirm ? '#fff' : '#9ca3af', opacity: canConfirm ? 1 : 0.5 }}
        >
          Confirm Sub
        </button>
      </div>
    </div>
  );
}

function useIsLandscape() {
  const [landscape, setLandscape] = useState(
    () => window.innerWidth > window.innerHeight
  );
  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)');
    const handler = (e) => setLandscape(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return landscape;
}

// ── Sub-components (defined outside to avoid Vite issues) ──

function Scoreboard({ myName, oppName, myScore, oppScore, scoreFlash, gameTime, currentPeriod, isTimerRunning, setIsTimerRunning, currentGameSettings, handleNextPeriod, handleEndGame, oppFlash, handleOpponentScore, compact }) {
  return (
    <div className={`bg-white border-b border-gray-200 flex-shrink-0 ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500" style={{ boxShadow: '0 0 6px rgba(239,68,68,0.8)' }} />
          <span className="font-black text-xs tracking-wide text-gray-800">LIVE · Q{currentPeriod}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-lg tracking-tight text-gray-900">{fmtTime(gameTime)}</span>
          <button
            onClick={() => setIsTimerRunning(r => !r)}
            className={`w-8 h-8 rounded-full flex items-center justify-center border transition ${isTimerRunning ? 'bg-red-50 border-red-200 text-red-500' : 'bg-blue-50 border-blue-200 text-blue-600'}`}
          >
            {isTimerRunning ? <Pause size={14} /> : <Play size={14} />}
          </button>
        </div>
      </div>

      <div className="grid gap-2 items-start" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
        <div>
          <div className="text-[10px] font-bold tracking-widest text-gray-400 mb-0.5">{myName}</div>
          <div
            className={`font-black tabular-nums leading-none tracking-tight ${scoreFlash === 'home' ? 'text-blue-600' : 'text-gray-900'} ${compact ? 'text-4xl' : 'text-5xl'}`}
            style={{ transition: 'color 0.1s', animation: scoreFlash === 'home' ? 'scorePop 0.45s ease' : 'none' }}
          >{myScore}</div>
        </div>

        <div className="flex items-center self-stretch pt-4 px-1">
          <div className="w-px h-8 bg-gray-200" />
        </div>

        <div className="text-right">
          <div className="text-[10px] font-bold tracking-widest text-gray-400 mb-0.5">{oppName}</div>
          <div
            className={`font-black tabular-nums leading-none tracking-tight ${scoreFlash === 'opp' ? 'text-red-500' : 'text-gray-900'} ${compact ? 'text-4xl' : 'text-5xl'}`}
            style={{ transition: 'color 0.1s', animation: scoreFlash === 'opp' ? 'scorePop 0.45s ease' : 'none' }}
          >{oppScore}</div>
          <div className="flex justify-end gap-1 mt-1.5">
            {OPP_BTNS.map(o => (
              <button
                key={o.pts}
                onClick={() => handleOpponentScore(o.pts)}
                className="h-6 px-1.5 rounded text-xs font-black border transition"
                style={{
                  minWidth: 28,
                  background: oppFlash === o.pts ? '#dc2626' : 'rgba(254,242,242,1)',
                  borderColor: oppFlash === o.pts ? '#dc2626' : '#fca5a5',
                  color: oppFlash === o.pts ? '#fff' : '#dc2626',
                  animation: oppFlash === o.pts ? 'flashPop 0.22s ease' : 'none',
                }}
              >{o.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2.5">
        <button
          onClick={handleNextPeriod}
          disabled={currentPeriod >= currentGameSettings.totalPeriods}
          className="h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs tracking-wide disabled:opacity-40"
        >Next Period →</button>
        <button
          onClick={handleEndGame}
          className="h-9 rounded-lg bg-red-50 border border-red-200 text-red-600 font-bold text-xs tracking-wide"
        >End Game</button>
      </div>
    </div>
  );
}

function PlayerStrip({ rosterActive, selectedPlayer, setSelectedPlayer, onSub }) {
  return (
    <div className="flex-shrink-0 bg-white border-b border-gray-200 px-3 py-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-black tracking-widest text-gray-400">ACTIVE PLAYERS</span>
        <button onClick={onSub} className="text-[9px] font-black tracking-wider px-2 py-0.5 rounded bg-blue-600 text-white">SUB</button>
      </div>
      <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {rosterActive.map(p => {
          const on = selectedPlayer?.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedPlayer(p)}
              className="flex-shrink-0 flex flex-col items-center justify-center gap-0.5 rounded-xl border transition"
              style={{
                height: 48, minWidth: 58, paddingInline: 8,
                background: on ? '#eff6ff' : '#f9fafb',
                borderColor: on ? '#3b82f6' : '#e5e7eb',
                borderWidth: on ? 2 : 1.5,
              }}
            >
              <span className="font-mono font-black text-base leading-none" style={{ color: on ? '#2563eb' : '#1f2937' }}>
                {p.number ?? p.jersey_number ?? p.num ?? '#'}
              </span>
              <span className="text-[10px] font-semibold" style={{ color: on ? '#3b82f6' : '#9ca3af' }}>
                {(p.name || p.first_name || '').split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PlayerStatBar({ selectedPlayer, recordFoul }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
      <div className="flex items-baseline gap-2">
        <span className="font-mono font-black text-lg text-blue-600 leading-none">
          #{selectedPlayer?.number ?? selectedPlayer?.jersey_number ?? selectedPlayer?.num ?? '—'}
        </span>
        <span className="font-bold text-sm text-gray-800">
          {selectedPlayer ? (selectedPlayer.name || selectedPlayer.first_name || 'Player') : 'Select a player'}
        </span>
      </div>
      <button
        onClick={recordFoul}
        disabled={!selectedPlayer}
        className="px-3 py-1.5 rounded-lg text-white font-black text-xs tracking-wider disabled:opacity-30"
        style={{ background: '#b91c1c' }}
      >FOUL</button>
    </div>
  );
}

function StatButtonGrid({ groups, selStats, btnFlash, selectedPlayer, onStat, btnH = 50, fs = 12 }) {
  return (
    <div className="flex flex-col gap-2">
      {groups.map(g => (
        <div key={g.label}>
          <div className="font-black text-gray-400 mb-1.5" style={{ fontSize: 8, letterSpacing: '0.14em' }}>{g.label}</div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${g.cols}, 1fr)` }}>
            {g.buttons.map(btn => {
              const count = (selStats || {})[btn.id] || 0;
              const flash = btnFlash === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => selectedPlayer && onStat(selectedPlayer.id, btn.id, btn.pts || 0)}
                  disabled={!selectedPlayer}
                  className="relative overflow-hidden text-white font-black rounded-xl disabled:opacity-30"
                  style={{
                    height: btnH, fontSize: fs,
                    background: flash ? '#d97706' : btn.color,
                    animation: flash ? 'flashPop 0.22s ease' : 'none',
                    transition: 'background 0.08s',
                    fontFamily: 'inherit',
                  }}
                >
                  {btn.label}
                  {count > 0 && (
                    <span className="absolute top-1 right-1.5 font-black opacity-80 font-mono" style={{ fontSize: 9 }}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function PlaysTicker({ plays, lastPlayIdRef, maxHeight = 88 }) {
  if (plays.length === 0) {
    return <div className="px-3 py-2 text-gray-400" style={{ fontSize: 11 }}>No plays yet</div>;
  }
  return (
    <div className="overflow-y-auto bg-gray-50 border-t border-gray-200" style={{ maxHeight, scrollbarWidth: 'none' }}>
      {plays.map((play, i) => (
        <div
          key={play.id}
          className="flex items-center justify-between px-3"
          style={{
            paddingBlock: '6px',
            borderTop: i > 0 ? '1px solid #f3f4f6' : 'none',
            animation: play.id === lastPlayIdRef.current ? 'slideUp 0.18s ease' : 'none',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="rounded-full flex-shrink-0" style={{ width: 6, height: 6, background: play.side === 'opp' ? '#f87171' : '#60a5fa' }} />
            <span style={{ fontSize: 11, color: '#374151' }}>
              <b style={{ color: '#111827' }}>{play.player}</b> · {play.stat}
            </span>
          </div>
          <span className="font-mono" style={{ fontSize: 10, color: '#9ca3af' }}>{play.time} Q{play.period}</span>
        </div>
      ))}
    </div>
  );
}

// ── Portrait layout ────────────────────────────────────────
function Portrait({ scoreboardProps, stripProps, statBarProps, statGridProps, tickerProps }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Scoreboard {...scoreboardProps} />
      <PlayerStrip {...stripProps} />
      <PlayerStatBar {...statBarProps} />
      <div className="flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'none' }}>
        <StatButtonGrid {...statGridProps} />
      </div>
      <PlaysTicker {...tickerProps} maxHeight={88} />
    </div>
  );
}

// ── Landscape layout ───────────────────────────────────────
function Landscape({ scoreboardProps, rosterActive, selectedPlayer, setSelectedPlayer, liveStats, statBarProps, statGridProps, tickerProps }) {
  return (
    <div className="h-full overflow-hidden" style={{ display: 'grid', gridTemplateColumns: '200px 1fr' }}>

      {/* Left column — opponent + players */}
      <div className="flex flex-col border-r border-gray-200 bg-white overflow-hidden">
        <Scoreboard {...scoreboardProps} compact />

        <div className="flex-1 overflow-y-auto px-2 py-2" style={{ scrollbarWidth: 'none' }}>
          <div className="flex items-center justify-between mb-1.5 px-1">
            <div className="font-black text-gray-400" style={{ fontSize: 8, letterSpacing: '0.12em' }}>PLAYERS</div>
            <button onClick={statGridProps.onSub} className="font-black text-white rounded px-2 py-0.5" style={{ fontSize: 9, background: '#2563eb' }}>SUB</button>
          </div>
          <div className="flex flex-col gap-1.5">
            {rosterActive.map(p => {
              const on = selectedPlayer?.id === p.id;
              const ps = liveStats[p.id] || {};
              const pts = ps.pts || 0;
              const reb = (ps.oreb || 0) + (ps.dreb || 0);
              const ast = ps.ast || 0;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlayer(p)}
                  className="w-full flex items-center rounded-xl border transition"
                  style={{
                    height: 40, paddingInline: 8, gap: 8,
                    background: on ? '#eff6ff' : '#f9fafb',
                    borderColor: on ? '#3b82f6' : '#e5e7eb',
                    borderWidth: on ? 2 : 1.5,
                  }}
                >
                  <span className="font-mono font-black text-sm" style={{ minWidth: 18, textAlign: 'right', color: on ? '#2563eb' : '#374151' }}>
                    {p.number ?? p.jersey_number ?? p.num ?? '#'}
                  </span>
                  <span className="font-bold text-xs flex-1 text-left" style={{ color: on ? '#1d4ed8' : '#1f2937' }}>
                    {(p.name || p.first_name || '').split(' ')[0]}
                  </span>
                  <span className="font-mono" style={{ fontSize: 9, color: '#9ca3af' }}>{pts}p {reb}r {ast}a</span>
                </button>
              );
            })}
          </div>
        </div>

        <PlaysTicker {...tickerProps} maxHeight={90} />
      </div>

      {/* Right column — stat buttons */}
      <div className="flex flex-col overflow-hidden">
        <PlayerStatBar {...statBarProps} />
        <div className="flex-1 overflow-y-auto px-3 py-2" style={{ scrollbarWidth: 'none' }}>
          <div className="grid grid-cols-2 gap-3">
            {STAT_GROUPS.map(g => (
              <div key={g.label} className="bg-white rounded-xl border border-gray-200 p-2">
                <div className="font-black text-gray-400 mb-1.5" style={{ fontSize: 8, letterSpacing: '0.14em' }}>{g.label}</div>
                <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(g.cols, g.buttons.length)}, 1fr)` }}>
                  {g.buttons.map(btn => {
                    const count = (statGridProps.selStats || {})[btn.id] || 0;
                    const flash = statGridProps.btnFlash === btn.id;
                    return (
                      <button
                        key={btn.id}
                        onClick={() => statGridProps.selectedPlayer && statGridProps.onStat(statGridProps.selectedPlayer.id, btn.id, btn.pts || 0)}
                        disabled={!statGridProps.selectedPlayer}
                        className="relative overflow-hidden text-white font-black rounded-lg disabled:opacity-30"
                        style={{
                          height: 40, fontSize: 11,
                          background: flash ? '#d97706' : btn.color,
                          animation: flash ? 'flashPop 0.22s ease' : 'none',
                          transition: 'background 0.08s',
                          fontFamily: 'inherit',
                        }}
                      >
                        {btn.label}
                        {count > 0 && (
                          <span className="absolute top-0.5 right-1 font-black opacity-80 font-mono" style={{ fontSize: 9 }}>{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────
const LiveGameView = ({ user, team, gameSettings, existingGame = null, onEndGame, onGoHome, toast }) => {
  const [currentGameId, setCurrentGameId]   = useState(existingGame?.id || null);
  const [homeScore,     setHomeScore]        = useState(existingGame?.home_score || 0);
  const [awayScore,     setAwayScore]        = useState(existingGame?.away_score || 0);
  const [currentPeriod, setCurrentPeriod]   = useState(existingGame?.period || 1);
  const [gameTime,      setGameTime]         = useState(existingGame?.time_remaining || (gameSettings.periodLength * 60));
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [liveStats,     setLiveStats]        = useState(existingGame?.stats || {});
  const [opponentStats, setOpponentStats]   = useState(existingGame?.opponent_stats || {});
  const creatingGame = useRef(false);

  const [activePlayers, setActivePlayers] = useState(
    existingGame?.active_players?.length > 0 ? existingGame.active_players : []
  );

  const rosterActive = team.roster?.filter(p => activePlayers.includes(p.id)) || [];
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [btnFlash,   setBtnFlash]   = useState(null);
  const [oppFlash,   setOppFlash]   = useState(null);
  const [scoreFlash, setScoreFlash] = useState(null);
  const [plays,      setPlays]      = useState([]);
  const [showSub,    setShowSub]    = useState(false);
  const lastPlayIdRef = useRef(null);
  const isLandscape = useIsLandscape();

  useEffect(() => {
    if (!existingGame) {
      if (!creatingGame.current && !currentGameId) {
        creatingGame.current = true;
        createGame();
      }
      if (team.roster?.length > 0 && activePlayers.length === 0) {
        setActivePlayers(team.roster.slice(0, 5).map(p => p.id));
      }
    } else {
      toast?.success('Game resumed!');
    }
  }, []);

  useEffect(() => {
    if (!selectedPlayer && rosterActive.length > 0) setSelectedPlayer(rosterActive[0]);
  }, [activePlayers, team.roster]);

  useEffect(() => {
    if (!isTimerRunning || gameTime <= 0) return;
    const id = setInterval(() => {
      setGameTime(prev => {
        if (prev <= 1) { setIsTimerRunning(false); toast?.info('Period ended!'); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isTimerRunning, gameTime]);

  useEffect(() => {
    if (!currentGameId) return;
    const id = setInterval(saveGame, 5000);
    return () => clearInterval(id);
  }, [currentGameId, homeScore, awayScore, currentPeriod, gameTime, liveStats, opponentStats, activePlayers]);

  const createGame = async () => {
    try {
      const { data, error } = await supabase.from('games').insert([{
        user_id: user.id, team_id: team.id,
        opponent: gameSettings.opponent,
        home_team: gameSettings.isHome ? team.name : gameSettings.opponent,
        status: 'in-progress', period: currentPeriod, time_remaining: gameTime,
        home_score: 0, away_score: 0, stats: {}, opponent_stats: {},
        active_players: activePlayers, game_settings: gameSettings, visibility: 'private',
      }]).select().single();
      if (error) throw error;
      setCurrentGameId(data.id);
      toast?.success('Game started!');
    } catch (err) { console.error('Error creating game:', err); toast?.error('Failed to start game'); }
  };

  const saveGame = async () => {
    if (!currentGameId) return;
    try {
      const { error } = await supabase.from('games').update({
        home_score: homeScore, away_score: awayScore, period: currentPeriod,
        time_remaining: gameTime, stats: liveStats, opponent_stats: opponentStats,
        active_players: activePlayers, updated_at: new Date().toISOString(),
      }).eq('id', currentGameId);
      if (error) throw error;
    } catch (err) { console.error('Error saving:', err); }
  };

  const handleQuickStat = useCallback(async (playerId, statType, points = 0) => {
    setBtnFlash(statType); setTimeout(() => setBtnFlash(null), 220);
    const updatedStats = {
      ...liveStats,
      [playerId]: {
        ...(liveStats[playerId] || { pts:0,fgm:0,fga:0,tpm:0,tpa:0,ftm:0,fta:0,oreb:0,dreb:0,ast:0,stl:0,blk:0,to:0,pf:0,miss2:0,miss3:0,missft:0 }),
        [statType]: ((liveStats[playerId]?.[statType] || 0) + 1),
        pts: (liveStats[playerId]?.pts || 0) + points,
      },
    };
    setLiveStats(updatedStats);
    const playerName = team.roster?.find(p => p.id === playerId)?.name || '';
    const btn = ALL_BTNS.find(b => b.id === statType);
    const pid = Date.now();
    lastPlayIdRef.current = pid;
    setPlays(prev => [{ id: pid, player: playerName, stat: btn?.label || statType, time: fmtTime(gameTime), period: currentPeriod, side: 'home' }, ...prev].slice(0, 12));
    let nh = homeScore, na = awayScore;
    if (points > 0) {
      setScoreFlash('home'); setTimeout(() => setScoreFlash(null), 500);
      if (gameSettings.isHome) { nh = homeScore + points; setHomeScore(nh); }
      else { na = awayScore + points; setAwayScore(na); }
      toast?.success(`+${points} points!`, 'success', 500);
    }
    if (currentGameId) {
      try { await supabase.from('games').update({ home_score: nh, away_score: na, period: currentPeriod, time_remaining: gameTime, stats: updatedStats, opponent_stats: opponentStats, active_players: activePlayers, updated_at: new Date().toISOString() }).eq('id', currentGameId); }
      catch (err) { console.error('Error saving:', err); }
    }
  }, [liveStats, homeScore, awayScore, currentPeriod, gameTime, gameSettings, currentGameId, opponentStats, activePlayers, team.roster]);

  const handleOpponentScore = useCallback(async (points) => {
    setOppFlash(points); setTimeout(() => setOppFlash(null), 220);
    setScoreFlash('opp'); setTimeout(() => setScoreFlash(null), 500);
    const pid = Date.now();
    lastPlayIdRef.current = pid;
    setPlays(prev => [{ id: pid, player: gameSettings.opponent, stat: `+${points}`, time: fmtTime(gameTime), period: currentPeriod, side: 'opp' }, ...prev].slice(0, 12));
    let nh = homeScore, na = awayScore;
    if (gameSettings.isHome) { na = awayScore + points; setAwayScore(na); }
    else { nh = homeScore + points; setHomeScore(nh); }
    toast?.info(`Opponent +${points}`, 'info', 500);
    if (currentGameId) {
      try { await supabase.from('games').update({ home_score: nh, away_score: na, period: currentPeriod, time_remaining: gameTime, stats: liveStats, opponent_stats: opponentStats, active_players: activePlayers, updated_at: new Date().toISOString() }).eq('id', currentGameId); }
      catch (err) { console.error('Error saving:', err); }
    }
  }, [homeScore, awayScore, currentPeriod, gameTime, gameSettings, currentGameId, liveStats, opponentStats, activePlayers]);

  const handleEndGame = async () => {
    if (!confirm('End this game?')) return;
    try {
      await saveGame();
      const { error } = await supabase.from('games').update({ status: 'completed' }).eq('id', currentGameId);
      if (error) throw error;
      toast?.success('Game ended!'); onGoHome();
    } catch (err) { console.error('Error ending game:', err); toast?.error('Failed to end game'); }
  };

  const handleSub = useCallback(async (outId, inId) => {
    const newActive = activePlayers.filter(id => id !== outId).concat(inId);
    setActivePlayers(newActive);
    // If subbed-out player was selected, switch to new player
    if (selectedPlayer?.id === outId) {
      const inPlayer = team.roster?.find(p => p.id === inId);
      if (inPlayer) setSelectedPlayer(inPlayer);
    }
    setShowSub(false);
    toast?.success('Substitution made!');
    if (currentGameId) {
      try {
        await supabase.from('games').update({ active_players: newActive, updated_at: new Date().toISOString() }).eq('id', currentGameId);
      } catch (err) { console.error('Error saving sub:', err); }
    }
  }, [activePlayers, selectedPlayer, currentGameId, team.roster]);

  const handleNextPeriod = () => {
    if (currentPeriod >= gameSettings.totalPeriods) return;
    setCurrentPeriod(p => p + 1);
    setGameTime(gameSettings.periodLength * 60);
    setIsTimerRunning(false);
    toast?.info(`Starting Q${currentPeriod + 1}`);
  };

  const myScore  = gameSettings.isHome ? homeScore : awayScore;
  const oppScore = gameSettings.isHome ? awayScore : homeScore;
  const myName   = gameSettings.isHome ? team.name : gameSettings.opponent;
  const oppName  = gameSettings.isHome ? gameSettings.opponent : team.name;
  const selStats = selectedPlayer ? (liveStats[selectedPlayer.id] || {}) : {};

  const onSub = () => setShowSub(true);

  const scoreboardProps = { myName, oppName, myScore, oppScore, scoreFlash, gameTime, currentPeriod, isTimerRunning, setIsTimerRunning, currentGameSettings: gameSettings, handleNextPeriod, handleEndGame, oppFlash, handleOpponentScore };
  const stripProps      = { rosterActive, selectedPlayer, setSelectedPlayer, onSub };
  const statBarProps    = { selectedPlayer, recordFoul: () => selectedPlayer && handleQuickStat(selectedPlayer.id, 'pf', 0) };
  const statGridProps   = { groups: STAT_GROUPS, selStats, btnFlash, selectedPlayer, onStat: handleQuickStat, onSub };
  const tickerProps     = { plays, lastPlayIdRef };

  return (
    <>
      <style>{`
        @keyframes flashPop { 0%{transform:scale(1)} 30%{transform:scale(0.88)} 65%{transform:scale(1.06)} 100%{transform:scale(1)} }
        @keyframes scorePop { 0%,100%{transform:scale(1)} 40%{transform:scale(1.15)} }
        @keyframes slideUp  { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
      <div className="h-screen w-full flex flex-col overflow-hidden bg-gray-100">
        <AppHeader
          title={existingGame ? 'Resume Game' : 'Live Game'}
          isDashboard={false}
          onDashboard={onGoHome}
          userEmail={user?.email}
        />
        <div className="flex-1 overflow-hidden">
          {isLandscape
            ? <Landscape scoreboardProps={scoreboardProps} rosterActive={rosterActive} selectedPlayer={selectedPlayer} setSelectedPlayer={setSelectedPlayer} liveStats={liveStats} statBarProps={statBarProps} statGridProps={statGridProps} tickerProps={tickerProps} />
            : <Portrait  scoreboardProps={scoreboardProps} stripProps={stripProps} statBarProps={statBarProps} statGridProps={statGridProps} tickerProps={tickerProps} />
          }
        </div>
        {showSub && <SubModal team={team} activePlayers={activePlayers} onConfirm={handleSub} onClose={() => setShowSub(false)} />}
      </div>
    </>
  );
};

export default LiveGameView;
