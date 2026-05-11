import React, { useState, useEffect } from 'react';
import { ArrowLeft, Zap } from 'lucide-react';
import { supabase } from '@/supabase';
import PlayByPlay from './PlayByPlay';

// ── Live clock ────────────────────────────────────────────────────────────────
const LiveClock = ({ timeRemaining, updatedAt, timerRunning }) => {
  const calc = () => {
    if (timeRemaining == null) return null;
    if (!timerRunning) return timeRemaining;
    const elapsed = updatedAt ? Math.floor((Date.now() - new Date(updatedAt).getTime()) / 1000) : 0;
    return Math.max(0, timeRemaining - elapsed);
  };
  const [secs, setSecs] = useState(calc);
  useEffect(() => { setSecs(calc()); }, [timeRemaining, updatedAt, timerRunning]);
  useEffect(() => {
    if (!timerRunning || !secs) return;
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [timerRunning, secs]);
  if (secs === null) return null;
  const m = Math.floor(secs / 60);
  const s = (secs % 60).toString().padStart(2, '0');
  return <>{m}:{s}</>;
};

// ── Stat helpers ──────────────────────────────────────────────────────────────
const getPlayerStats = (game, playerId) => {
  const s = game.stats?.[playerId] || {};
  return {
    pts: s.pts || 0,
    fgm: (s.fgm||0)+(s.tpm||0), fga: (s.fga||0)+(s.tpa||0),
    tpm: s.tpm||0, tpa: s.tpa||0,
    ftm: s.ftm||0, fta: s.fta||0,
    reb: (s.oreb||0)+(s.dreb||0),
    ast: s.ast||0, stl: s.stl||0, blk: s.blk||0,
    to: s.to||0, pf: s.pf||0,
    pm: game.plus_minus?.[playerId] || 0,
  };
};

const getTeamTotals = (game) => {
  const t = { pts:0,fgm:0,fga:0,tpm:0,tpa:0,ftm:0,fta:0,oreb:0,dreb:0,ast:0,stl:0,blk:0,to:0,pf:0 };
  Object.values(game.stats || {}).forEach(s => Object.keys(t).forEach(k => { t[k] += s[k]||0; }));
  return {
    pts: t.pts,
    fgm: t.fgm+t.tpm, fga: t.fga+t.tpa,
    tpm: t.tpm, tpa: t.tpa,
    ftm: t.ftm, fta: t.fta,
    reb: t.oreb+t.dreb,
    ast: t.ast, stl: t.stl, blk: t.blk, to: t.to, pf: t.pf,
  };
};

// ── Column definitions ────────────────────────────────────────────────────────
const COLS = [
  { key:'min', label:'MIN', w:34, color:'#94a3b8' },
  { key:'pts', label:'PTS', w:36, bold:true, color:'#60a5fa' },
  { key:'fg',  label:'FG',  w:50 },
  { key:'3pt', label:'3PT', w:50 },
  { key:'ft',  label:'FT',  w:50 },
  { key:'reb', label:'REB', w:34 },
  { key:'ast', label:'AST', w:34 },
  { key:'stl', label:'STL', w:34 },
  { key:'blk', label:'BLK', w:34 },
  { key:'to',  label:'TO',  w:34 },
  { key:'pf',  label:'PF',  w:34 },
  { key:'pm',  label:'+/-', w:38 },
];

const colVal = (s, key, player) => {
  if (key==='min') return player?.mins ?? 0;
  if (key==='fg')  return `${s.fgm}/${s.fga}`;
  if (key==='3pt') return `${s.tpm}/${s.tpa}`;
  if (key==='ft')  return `${s.ftm}/${s.fta}`;
  if (key==='pm')  return s.pm > 0 ? `+${s.pm}` : `${s.pm}`;
  return s[key] ?? 0;
};

const totalsVal = (totals, key) => {
  if (key==='min') return '—';
  if (key==='fg')  return `${totals.fgm}/${totals.fga}`;
  if (key==='3pt') return `${totals.tpm}/${totals.tpa}`;
  if (key==='ft')  return `${totals.ftm}/${totals.fta}`;
  if (key==='pm')  return '—';
  return totals[key] ?? 0;
};

const pmColor  = (pm) => pm > 0 ? '#4ade80' : pm < 0 ? '#f87171' : '#475569';
const isFrac   = (key) => key==='fg'||key==='3pt'||key==='ft';
const NAME_W   = 112;
const ROW_H    = 30;
const HDR_H    = 26;

// ── Score Graph ───────────────────────────────────────────────────────────────
const ScoreGraph = ({ game, isHome, myName, oppName }) => {
  const [normalized, setNormalized] = useState(false);

  const periodLength = (game.game_settings?.periodLength || 8) * 60;
  const totalPeriods = game.game_settings?.totalPeriods || 4;
  const totalTime    = periodLength * totalPeriods;

  const plays = [...(game.play_log || [])].reverse(); // oldest first
  const scoringPlays = plays.filter(p => (p.points || 0) > 0);

  // Convert period + time remaining to absolute seconds elapsed
  const toElapsed = (period, timeStr) => {
    const periodStart = ((period || 1) - 1) * periodLength;
    if (!timeStr) return periodStart;
    const parts = timeStr.toString().split(':');
    const mins = parseInt(parts[0]) || 0;
    const secs = parseInt(parts[1]) || 0;
    const remaining = mins * 60 + secs;
    return periodStart + Math.max(0, periodLength - remaining);
  };

  // Detect if clock was never run — a play is "untimed" if its time
  // equals the full period length (clock never started)
  const isUntimed = (play) => {
    const parts = (play.time || '').split(':');
    const remaining = (parseInt(parts[0])||0)*60 + (parseInt(parts[1])||0);
    return remaining >= periodLength;
  };

  const untimedCount = scoringPlays.filter(isUntimed).length;
  const clockNeverRan = untimedCount === scoringPlays.length;

  // Build data points
  let myRunning  = 0;
  let oppRunning = 0;
  const rawPoints = [{ t: 0, my: 0, opp: 0 }];

  scoringPlays.forEach((play, idx) => {
    let t;
    if (clockNeverRan) {
      // Distribute all plays evenly across total game time
      t = Math.round(((idx + 1) / (scoringPlays.length + 1)) * totalTime);
    } else if (isUntimed(play)) {
      // This specific play has no clock — interpolate between neighbours
      const prev = rawPoints[rawPoints.length - 1]?.t || 0;
      const next = totalTime;
      t = Math.round((prev + next) / 2);
    } else {
      t = toElapsed(play.period || 1, play.time);
    }
    // In play_log, team:'home' always means OUR team's play,
    // team:'away' always means opponent's play — regardless of isHome
    const isMyPlay = play.team === 'home';
    if (isMyPlay) myRunning  += play.points;
    else          oppRunning += play.points;
    rawPoints.push({ t, my: myRunning, opp: oppRunning });
  });

  rawPoints.push({ t: totalTime, my: myRunning, opp: oppRunning });

  // Normalize button — spread all plays evenly regardless
  const points = normalized ? (() => {
    const scored = rawPoints.filter((p,i) => i > 0 && (p.my !== rawPoints[i-1]?.my || p.opp !== rawPoints[i-1]?.opp));
    if (scored.length === 0) return rawPoints;
    const step = totalTime / (scored.length + 1);
    let myR = 0, oppR = 0;
    const norm = [{ t:0, my:0, opp:0 }];
    scored.forEach((p, i) => {
      const prev = i === 0 ? { my:0, opp:0 } : scored[i-1];
      myR  += p.my  - prev.my;
      oppR += p.opp - prev.opp;
      norm.push({ t: step * (i+1), my: myR, opp: oppR });
    });
    norm.push({ t: totalTime, my: myR, opp: oppR });
    return norm;
  })() : rawPoints;

  // SVG dimensions
  const W = 320, H = 160, PAD = 24;
  const maxScore = Math.max(...points.map(p => Math.max(p.my, p.opp)), 10);
  const toX = t  => PAD + (t / totalTime) * (W - PAD * 2);
  const toY = s  => H - PAD - (s / maxScore) * (H - PAD * 2);

  const myPath  = points.map((p,i) => `${i===0?'M':'L'}${toX(p.t).toFixed(1)},${toY(p.my).toFixed(1)}`).join(' ');
  const oppPath = points.map((p,i) => `${i===0?'M':'L'}${toX(p.t).toFixed(1)},${toY(p.opp).toFixed(1)}`).join(' ');

  // Period dividers
  const periods = Array.from({length: totalPeriods - 1}, (_, i) => (i+1) * periodLength);

  return (
    <div style={{ flex:1, overflow:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:12 }}>
      {/* Graph */}
      <div style={{ background:'#0d1526', borderRadius:12, border:'1px solid #1e293b', padding:'12px', overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            <span style={{ fontSize:10, fontWeight:800, color:'#475569', letterSpacing:'0.1em', textTransform:'uppercase' }}>Score Timeline</span>
            {clockNeverRan && !normalized && <span style={{ fontSize:9, color:'#f97316', fontWeight:700 }}>⚠ Clock not used — points distributed evenly</span>}
          </div>
          <button
            onClick={() => setNormalized(n => !n)}
            style={{ padding:'3px 10px', borderRadius:6, border:`1px solid ${normalized?'#f97316':'#334155'}`, background: normalized?'#f9731622':'transparent', color: normalized?'#f97316':'#475569', fontSize:10, fontWeight:700, cursor:'pointer' }}
          >
            {normalized ? '⚡ Normalized' : 'Normalize Clock'}
          </button>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'auto', display:'block' }}>
          {/* Grid lines */}
          {[0.25,0.5,0.75,1].map(f => (
            <line key={f} x1={PAD} x2={W-PAD} y1={toY(maxScore*f)} y2={toY(maxScore*f)} stroke="#1e293b" strokeWidth="1" />
          ))}
          {/* Period dividers */}
          {periods.map(t => (
            <line key={t} x1={toX(t)} x2={toX(t)} y1={PAD} y2={H-PAD} stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />
          ))}
          {/* Opponent line */}
          <path d={oppPath} fill="none" stroke="#f87171" strokeWidth="2" strokeLinejoin="round" />
          {/* My team line */}
          <path d={myPath} fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinejoin="round" />
          {/* Score labels at end */}
          <text x={W-PAD+3} y={toY(myRunning)+4}  fill="#60a5fa" fontSize="9" fontWeight="bold">{myRunning}</text>
          <text x={W-PAD+3} y={toY(oppRunning)+4} fill="#f87171" fontSize="9" fontWeight="bold">{oppRunning}</text>
          {/* Y axis labels */}
          {[0,Math.round(maxScore/2),maxScore].map(v => (
            <text key={v} x={PAD-3} y={toY(v)+3} fill="#334155" fontSize="8" textAnchor="end">{v}</text>
          ))}
          {/* X axis period labels */}
          {Array.from({length:totalPeriods},(_,i)=>(i+0.5)*periodLength).map((t,i) => (
            <text key={i} x={toX(t)} y={H-6} fill="#334155" fontSize="8" textAnchor="middle">Q{i+1}</text>
          ))}
        </svg>
        {/* Legend */}
        <div style={{ display:'flex', gap:16, justifyContent:'center', marginTop:6 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:16, height:2.5, background:'#60a5fa', borderRadius:2 }} />
            <span style={{ fontSize:10, color:'#60a5fa', fontWeight:700 }}>{myName}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:16, height:2.5, background:'#f87171', borderRadius:2 }} />
            <span style={{ fontSize:10, color:'#f87171', fontWeight:700 }}>{oppName}</span>
          </div>
        </div>
      </div>
      {normalized && (
        <div style={{ fontSize:10, color:'#475569', textAlign:'center', padding:'4px 0' }}>
          Points distributed evenly across game time — actual stat values unchanged
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const GameDetail = ({ initialGame, team: initialTeam, onBack, user }) => {
  const [game,      setGame]      = useState(initialGame);
  const [roster,    setRoster]    = useState(initialTeam?.roster || []);
  const [activeTab, setActiveTab] = useState('boxscore');

  const isLive = game.status === 'in-progress';

  // Fetch fresh game data on mount
  useEffect(() => {
    supabase.from('games').select('*').eq('id', initialGame.id).single()
      .then(({ data }) => { if (data) setGame(data); });
  }, [initialGame.id]);

  // Fetch roster
  useEffect(() => {
    const teamId = initialGame.team_id;
    if (!teamId) return;
    supabase.from('players').select('*').eq('team_id', teamId)
      .then(({ data }) => { if (data) setRoster(data); });
  }, [initialGame.team_id]);

  // Realtime subscription for live games
  useEffect(() => {
    if (!isLive) return;
    const channel = supabase.channel(`game-detail-${game.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${game.id}` },
        (payload) => setGame(prev => ({ ...prev, ...payload.new }))
      ).subscribe();
    return () => supabase.removeChannel(channel);
  }, [game.id, isLive]);

  // ── Score logic ─────────────────────────────────────────────────────────────
  const isHome   = game.home_team !== game.opponent;
  const myName   = initialTeam?.name || game.home_team;
  const oppName  = game.opponent;
  const myScore  = isHome ? (game.home_score||0) : (game.away_score||0);
  const oppScore = isHome ? (game.away_score||0) : (game.home_score||0);
  const isWin    = myScore > oppScore;
  const isLoss   = myScore < oppScore;

  // ── Player list ─────────────────────────────────────────────────────────────
  const activePlayers = game.active_players || [];
  const starterIds    = game.starters || [];
  const periodLength  = game.game_settings?.periodLength || 8;
  const totalPeriods  = game.game_settings?.totalPeriods || 4;
  const isCompleted   = game.status === 'completed';
  const periodLenSecs = periodLength * 60;

  // Exact minutes from sub log
  const calcMinutes = (playerId) => {
    const toSecs = (period, timeRemaining) =>
      ((period - 1) * periodLenSecs) + Math.max(0, periodLenSecs - (timeRemaining ?? periodLenSecs));

    const subs = [...(game.play_log || [])].reverse()
      .filter(p => p.isSub && (p.playerInId || p.playerOutId));

    let intervals = [];
    let timeIn = null;

    if (starterIds.includes(playerId)) timeIn = 0;

    subs.forEach(sub => {
      const t = toSecs(sub.period || 1, sub.timeRemaining);

      // Period marker — same player in and out, just a continuation checkpoint
      if (sub.isPeriodMarker && sub.playerInId === sub.playerOutId) {
        if (sub.playerOutId === playerId && timeIn !== null) {
          // End of period — close interval
          intervals.push({ start: timeIn, end: t });
          timeIn = null;
        }
        if (sub.playerInId === playerId && sub.playerOutId === playerId) {
          // Start of next period — reopen interval
          timeIn = t;
        }
        return;
      }

      if (sub.playerInId === playerId) timeIn = t;
      else if (sub.playerOutId === playerId && timeIn !== null) {
        intervals.push({ start: timeIn, end: t });
        timeIn = null;
      }
    });

    // Still on floor at end
    if (timeIn !== null) {
      const endSecs = isCompleted
        ? (game.period || totalPeriods) * periodLenSecs
        : toSecs(game.period || 1, game.time_remaining || 0);
      intervals.push({ start: timeIn, end: endSecs });
    }

    const totalSecs = intervals.reduce((sum, i) => sum + Math.max(0, i.end - i.start), 0);
    if (totalSecs === 0) {
      // No sub data — fall back to estimate
      if (isCompleted) {
        if (activePlayers.includes(playerId) || starterIds.includes(playerId)) return (game.period || totalPeriods) * periodLength;
        if (game.stats?.[playerId]) return Math.round((game.period || totalPeriods) * periodLength * 0.6);
        return 0;
      }
      return 0;
    }
    return Math.round(totalSecs / 60);
  };

  // Build name lookup from play_log as fallback for unmatched UUIDs
  const nameFromPlayLog = {};
  (game.play_log || []).forEach(play => {
    if (play.playerId && play.description) {
      const match = play.description.match(/^([^-]+)\s*-/);
      if (match) nameFromPlayLog[play.playerId] = match[1].trim();
    }
  });

  // Build a name→roster lookup for fuzzy matching
  const rosterByName = {};
  roster.forEach(p => { rosterByName[p.name.toLowerCase()] = p; });

  const statsEntries = Object.entries(game.stats || {})
    .map(([id, stats]) => {
      // Try direct UUID match first
      let rp = roster.find(p => p.id === id);
      // Fall back to name match via play_log or _name
      if (!rp) {
        const fallbackName = stats._name || nameFromPlayLog[id];
        if (fallbackName) rp = rosterByName[fallbackName.toLowerCase()];
      }
      const name   = rp?.name   || stats._name || nameFromPlayLog[id] || `Player ${id.slice(0,4)}`;
      const number = rp?.number ?? stats._number ?? '';
      return {
        id,
        name,
        number,
        onFloor:   activePlayers.includes(id) || (rp && activePlayers.includes(rp.id)),
        isStarter: starterIds.includes(id)    || (rp && starterIds.includes(rp.id)),
        mins: calcMinutes(id),
        hasStats: true, stats,
      };
    })
    .reduce((acc, player) => {
      if (player.name.startsWith('Player ')) return [...acc, player];
      const key = player.name.toLowerCase();
      const ex = acc.find(p => p.name.toLowerCase() === key);
      if (ex) {
        if ((player.stats.pts||0) > (ex.stats.pts||0)) return acc.map(p => p.name.toLowerCase()===key ? player : p);
        return acc;
      }
      return [...acc, player];
    }, []);

  const statsNames = new Set(statsEntries.map(p => p.name.toLowerCase()));
  const rosterOnly = roster
    .filter(p => !statsNames.has(p.name.toLowerCase()))
    .map(p => ({
      id: p.id, name: p.name, number: p.number || '',
      onFloor: activePlayers.includes(p.id),
      isStarter: starterIds.includes(p.id),
      mins: calcMinutes(p.id),
      hasStats: false, stats: {},
    }));

  const allPlayers = [...statsEntries, ...rosterOnly]
    .sort((a, b) => (b.stats.pts||0) - (a.stats.pts||0));

  const totals = getTeamTotals(game);

  // ── Delete play handler ───────────────────────────────────────────────────
  const handleDeletePlay = async (play) => {
    const newPlayLog = (game.play_log || []).filter(p => p.id !== play.id);
    const newRecentPlays = (game.recent_plays || []).filter(p => p.id !== play.id);

    // Reverse stats
    const newStats = JSON.parse(JSON.stringify(game.stats || {}));
    const newPlusMinus = JSON.parse(JSON.stringify(game.plus_minus || {}));
    let newHomeScore = game.home_score || 0;
    let newAwayScore = game.away_score || 0;

    if (play.team === 'home' && play.playerId && play.statType) {
      const ps = newStats[play.playerId];
      if (ps) {
        // Reverse the stat
        const st = play.statType;
        if (st === 'fgm' || st === 'tpm' || st === 'ftm') {
          const attemptKey = st.replace('m', 'a');
          ps[attemptKey] = Math.max(0, (ps[attemptKey] || 0) - 1);
          if (!play.missed) {
            ps[st] = Math.max(0, (ps[st] || 0) - 1);
            ps.pts = Math.max(0, (ps.pts || 0) - (play.points || 0));
          }
        } else {
          ps[st] = Math.max(0, (ps[st] || 0) - 1);
        }
        newStats[play.playerId] = ps;
      }
      // Reverse score
      if (play.points > 0) {
        if (game.home_team !== game.opponent) {
          newHomeScore = Math.max(0, newHomeScore - play.points);
        } else {
          newAwayScore = Math.max(0, newAwayScore - play.points);
        }
        // Reverse plus/minus
        Object.keys(newPlusMinus).forEach(id => {
          newPlusMinus[id] = (newPlusMinus[id] || 0) - play.points;
        });
      }
    } else if (play.team === 'away' && play.points > 0) {
      // Reverse opponent score
      if (game.home_team !== game.opponent) {
        newAwayScore = Math.max(0, newAwayScore - play.points);
      } else {
        newHomeScore = Math.max(0, newHomeScore - play.points);
      }
      // Reverse plus/minus
      Object.keys(newPlusMinus).forEach(id => {
        newPlusMinus[id] = (newPlusMinus[id] || 0) + play.points;
      });
    } else if (play.team === 'home' && play.playerId && !play.statType) {
      // Legacy play without statType — parse from description
      const desc = play.description || '';
      const isHome2 = game.home_team !== game.opponent;
      if (play.points > 0) {
        if (isHome2) newHomeScore = Math.max(0, newHomeScore - play.points);
        else newAwayScore = Math.max(0, newAwayScore - play.points);
        Object.keys(newPlusMinus).forEach(id => { newPlusMinus[id] = (newPlusMinus[id]||0) - play.points; });
      }
    }

    // Save to DB
    const { error } = await supabase.from('games').update({
      stats: newStats,
      play_log: newPlayLog,
      recent_plays: newRecentPlays,
      home_score: newHomeScore,
      away_score: newAwayScore,
      plus_minus: newPlusMinus,
      updated_at: new Date().toISOString(),
    }).eq('id', game.id);

    if (!error) {
      setGame(prev => ({
        ...prev,
        stats: newStats,
        play_log: newPlayLog,
        recent_plays: newRecentPlays,
        home_score: newHomeScore,
        away_score: newAwayScore,
        plus_minus: newPlusMinus,
      }));
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, display:'flex', justifyContent:'center', background:'#030712', zIndex:50 }}>
      <style>{`@media (max-width: 768px) { .gd-inner { max-width: 100% !important; } }`}</style>
      <div className="gd-inner" style={{ width:'100%', maxWidth:'66vw', display:'flex', flexDirection:'column', height:'100dvh', background:'#0b1120', color:'#fff', fontFamily:'system-ui,sans-serif', overflow:'hidden' }}>

        {/* ── SCORE HEADER ──────────────────────────────────────────────────── */}
        <div style={{ flexShrink:0, background:'#0b1120', borderBottom:'2px solid #1e293b' }}>

          {/* Nav */}
          <div style={{ display:'flex', alignItems:'center', padding:'8px 10px 4px' }}>
            <button onClick={onBack} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:700 }}>
              <ArrowLeft size={14} /> Back
            </button>
            <div style={{ flex:1, display:'flex', justifyContent:'center', alignItems:'center', gap:8 }}>
              {isLive ? (
                <div style={{ display:'flex', alignItems:'center', gap:5, padding:'2px 10px', background:'#fbbf2415', borderRadius:999, border:'1px solid #fbbf2430' }}>
                  <Zap size={9} color="#fbbf24" fill="#fbbf24" />
                  <span style={{ fontSize:9, fontWeight:900, color:'#fbbf24', letterSpacing:'0.12em' }}>LIVE</span>
                </div>
              ) : (
                <span style={{ fontSize:9, fontWeight:900, color:'#334155', letterSpacing:'0.12em', textTransform:'uppercase' }}>Final</span>
              )}
            </div>
            <div style={{ width:52 }} />
          </div>

          {/* Score row */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 40px 1fr', alignItems:'center', padding:'2px 14px 8px', gap:6 }}>
            {/* Away (left) */}
            <div>
              <div style={{ fontSize:9, fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {isHome ? oppName : myName}
              </div>
              <div style={{ display:'flex', alignItems:'baseline', gap:5 }}>
                <span style={{ fontSize:30, fontWeight:900, lineHeight:1, color: isHome?(isLoss?'#f1f5f9':'#64748b'):(isWin?'#f1f5f9':'#64748b'), fontVariantNumeric:'tabular-nums' }}>
                  {isHome ? oppScore : myScore}
                </span>
                {!isLive && <span style={{ fontSize:10, fontWeight:800, color: isHome?(isLoss?'#4ade80':isWin?'#f87171':'#64748b'):(isWin?'#4ade80':isLoss?'#f87171':'#64748b') }}>
                  {isHome?(isLoss?'W':isWin?'L':'T'):(isWin?'W':isLoss?'L':'T')}
                </span>}
              </div>
            </div>
            {/* Center */}
            <div style={{ textAlign:'center' }}>
              {isLive ? (
                <>
                  <div style={{ fontSize:9, fontWeight:800, color:'#334155' }}>Q{game.period||1}</div>
                  <div style={{ fontSize:13, fontWeight:900, color: game.timer_running?'#fff':'#475569', fontVariantNumeric:'tabular-nums' }}>
                    <LiveClock timeRemaining={game.time_remaining} updatedAt={game.updated_at} timerRunning={game.timer_running} />
                  </div>
                  <div style={{ width:6, height:6, borderRadius:'50%', background: game.timer_running?'#4ade80':'#1e293b', margin:'2px auto 0', transition:'background 0.3s' }} />
                </>
              ) : (
                <span style={{ fontSize:11, fontWeight:800, color:'#334155' }}>—</span>
              )}
            </div>
            {/* Home (right) */}
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:9, fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {isHome ? myName : oppName}
              </div>
              <div style={{ display:'flex', alignItems:'baseline', gap:5, justifyContent:'flex-end' }}>
                {!isLive && <span style={{ fontSize:10, fontWeight:800, color: isHome?(isWin?'#4ade80':isLoss?'#f87171':'#64748b'):(isLoss?'#4ade80':isWin?'#f87171':'#64748b') }}>
                  {isHome?(isWin?'W':isLoss?'L':'T'):(isLoss?'W':isWin?'L':'T')}
                </span>}
                <span style={{ fontSize:30, fontWeight:900, lineHeight:1, color: isHome?(isWin?'#f1f5f9':'#64748b'):(isLoss?'#f1f5f9':'#64748b'), fontVariantNumeric:'tabular-nums' }}>
                  {isHome ? myScore : oppScore}
                </span>
              </div>
            </div>
          </div>

          {/* Fouls row */}
          {(() => {
            const homeFouls = game.game_settings?.homeFouls || 0;
            const awayFouls = game.game_settings?.awayFouls || 0;
            // homeFouls = home team's fouls, awayFouls = away team's fouls
            // Left side of scoreboard = away team, right side = home team
            const leftFouls  = awayFouls;
            const rightFouls = homeFouls;
            const FoulDots = ({ count, align }) => (
              <div style={{ display:'flex', gap:3, justifyContent: align==='right' ? 'flex-end' : 'flex-start' }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{ width:7, height:7, borderRadius:'50%', background: i<=count ? (count>=4?'#fbbf24':'#ef4444') : '#1e293b', transition:'background 0.2s' }} />
                ))}
              </div>
            );
            return (
              <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', padding:'4px 14px 6px', gap:6, borderTop:'1px solid #1e293b22' }}>
                <div>
                  <div style={{ fontSize:8, color:'#334155', fontWeight:700, letterSpacing:'0.08em', marginBottom:3 }}>FOULS</div>
                  <FoulDots count={leftFouls} align="left" />
                </div>
                <div style={{ width:40 }} />
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:8, color:'#334155', fontWeight:700, letterSpacing:'0.08em', marginBottom:3 }}>FOULS</div>
                  <FoulDots count={rightFouls} align="right" />
                </div>
              </div>
            );
          })()}

          {/* Period scores grid */}
          {(() => {
            const totalPeriods = game.game_settings?.totalPeriods || 4;
            const periodStartScores = game.game_settings?.periodStartScores || {};
            const periods = Array.from({ length: totalPeriods }, (_, i) => i + 1);
            const myTotal  = isHome ? (game.home_score||0) : (game.away_score||0);
            const oppTotal = isHome ? (game.away_score||0) : (game.home_score||0);

            // Calculate per-period score from start scores
            const getPeriodScore = (period) => {
              const start = periodStartScores[period];
              const end   = periodStartScores[period + 1];
              if (!start) {
                // Fall back to play_log for this period
                const plays = (game.play_log || []).filter(p => p.period === period && (p.points||0) > 0);
                const myPts  = plays.filter(p => p.team === 'home').reduce((s,p) => s+p.points, 0);
                const oppPts = plays.filter(p => p.team === 'away').reduce((s,p) => s+p.points, 0);
                return { my: myPts, opp: oppPts };
              }
              // If we have next period's start, the delta is exact
              if (end) {
                const homeDelta = end.home - start.home;
                const awayDelta = end.away - start.away;
                return isHome
                  ? { my: homeDelta, opp: awayDelta }
                  : { my: awayDelta, opp: homeDelta };
              }
              // Last period — delta from start to final score
              const homeDelta = (game.home_score||0) - start.home;
              const awayDelta = (game.away_score||0) - start.away;
              return isHome
                ? { my: homeDelta, opp: awayDelta }
                : { my: awayDelta, opp: homeDelta };
            };

            const cellStyle = (highlight) => ({
              flex:1, textAlign:'center', padding:'4px 2px',
              borderRight:'1px solid #1e293b',
              background: highlight ? '#162032' : 'transparent',
            });

            return (
              <div style={{ borderTop:'1px solid #1e293b', margin:'0 14px' }}>
                {/* Header row */}
                <div style={{ display:'flex', alignItems:'center' }}>
                  <div style={{ width:NAME_W - 28, fontSize:8, color:'#334155', fontWeight:700, paddingRight:6, textAlign:'right', flexShrink:0 }}></div>
                  {periods.map(p => (
                    <div key={p} style={cellStyle(false)}>
                      <span style={{ fontSize:8, fontWeight:900, color:'#334155', letterSpacing:'0.1em' }}>Q{p}</span>
                    </div>
                  ))}
                  <div style={{ ...cellStyle(true), borderRight:'none' }}>
                    <span style={{ fontSize:8, fontWeight:900, color:'#64748b', letterSpacing:'0.1em' }}>T</span>
                  </div>
                </div>
                {/* My team row */}
                <div style={{ display:'flex', alignItems:'center' }}>
                  <div style={{ width:NAME_W - 28, fontSize:9, color:'#60a5fa', fontWeight:800, paddingRight:6, textAlign:'right', flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {myName}
                  </div>
                  {periods.map(p => (
                    <div key={p} style={cellStyle(false)}>
                      <span style={{ fontSize:11, fontWeight:700, color:'#94a3b8', fontVariantNumeric:'tabular-nums' }}>
                        {getPeriodScore(p).my}
                      </span>
                    </div>
                  ))}
                  <div style={{ ...cellStyle(true), borderRight:'none' }}>
                    <span style={{ fontSize:12, fontWeight:900, color:'#60a5fa', fontVariantNumeric:'tabular-nums' }}>{myTotal}</span>
                  </div>
                </div>
                {/* Opponent row */}
                <div style={{ display:'flex', alignItems:'center', marginBottom:4 }}>
                  <div style={{ width:NAME_W - 28, fontSize:9, color:'#f87171', fontWeight:800, paddingRight:6, textAlign:'right', flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {oppName}
                  </div>
                  {periods.map(p => (
                    <div key={p} style={cellStyle(false)}>
                      <span style={{ fontSize:11, fontWeight:700, color:'#94a3b8', fontVariantNumeric:'tabular-nums' }}>
                        {getPeriodScore(p).opp}
                      </span>
                    </div>
                  ))}
                  <div style={{ ...cellStyle(true), borderRight:'none' }}>
                    <span style={{ fontSize:12, fontWeight:900, color:'#f87171', fontVariantNumeric:'tabular-nums' }}>{oppTotal}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Recent plays ticker — live only */}
          {isLive && (game.recent_plays||[]).length > 0 && (
            <div style={{ borderTop:'1px solid #1e293b', padding:'6px 14px', display:'flex', gap:12, overflowX:'auto' }}>
              {(game.recent_plays||[]).slice(0,5).map((play, i) => (
                <div key={play.id||i} style={{ textAlign:'center', flexShrink:0, opacity: i===0?1:i===1?0.6:i===2?0.35:0.2 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background: play.team==='home'?'#60a5fa':'#f87171', margin:'0 auto 3px' }} />
                  <div style={{ fontSize:9, fontWeight:700, color:'#fff', maxWidth:80, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{play.description}</div>
                  <div style={{ fontSize:8, color:'#334155' }}>Q{play.period} {play.time}</div>
                </div>
              ))}
            </div>
          )}

          {/* Column headers — only for boxscore tab */}
          {activeTab === 'boxscore' && (
            <div style={{ display:'flex', background:'#060d1a', borderTop:'1px solid #1e293b' }}>
              <div style={{ width:NAME_W, minWidth:NAME_W, flexShrink:0, height:HDR_H, display:'flex', alignItems:'center', paddingLeft:10, borderRight:'1px solid #1e293b' }}>
                <span style={{ fontSize:8, fontWeight:900, color:'#334155', letterSpacing:'0.15em', textTransform:'uppercase' }}>PLAYER</span>
              </div>
              <div id="gd-hdr-scroll" style={{ flex:1, overflowX:'hidden', display:'flex' }}>
                <div id="gd-hdr-inner" style={{ display:'flex' }}>
                  {COLS.map(col => (
                    <div key={col.key} style={{ width:col.w, minWidth:col.w, height:HDR_H, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span style={{ fontSize:8, fontWeight:900, color:col.color||'#334155', letterSpacing:'0.1em', textTransform:'uppercase' }}>{col.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── TABS ──────────────────────────────────────────────────────────── */}
        <div style={{ display:'flex', borderBottom:'1px solid #1e293b', background:'#060d1a', flexShrink:0 }}>
          {[['boxscore','Box Score'],['playbyplay','Play by Play'],['graph','Score Graph']].map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex:1, padding:'9px 0', border:'none', cursor:'pointer', fontSize:11, fontWeight:800,
              letterSpacing:'0.06em', textTransform:'uppercase', background:'transparent',
              color: activeTab===tab ? '#60a5fa' : '#334155',
              borderBottom: activeTab===tab ? '2px solid #60a5fa' : '2px solid transparent',
            }}>{label}</button>
          ))}
        </div>

        {/* ── PLAY BY PLAY ──────────────────────────────────────────────────── */}
        {activeTab === 'playbyplay' && (
          <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <PlayByPlay game={game} isDark={true} onDeletePlay={user?.id === game.user_id ? handleDeletePlay : undefined} />
          </div>
        )}

        {/* ── SCORE GRAPH ────────────────────────────────────────────────────── */}
        {activeTab === 'graph' && (
          <ScoreGraph game={game} isHome={isHome} myName={myName} oppName={oppName} />
        )}

        {/* ── BOX SCORE ─────────────────────────────────────────────────────── */}
        {activeTab === 'boxscore' && (
          <div style={{ flex:1, overflowY:'auto', overflowX:'auto', WebkitOverflowScrolling:'touch' }}
            onScroll={e => {
              const hdr = document.getElementById('gd-hdr-inner');
              if (hdr) hdr.parentElement.scrollLeft = e.currentTarget.scrollLeft;
            }}
          >
            <div style={{ minWidth: NAME_W + COLS.reduce((s,c)=>s+c.w,0) }}>

              {allPlayers.map((player, i) => {
                const s = getPlayerStats(game, player.id);
                return (
                  <div key={player.id} style={{ display:'flex', height:ROW_H, background: i%2===0?'#0b1120':'#0d1526', borderBottom:'1px solid #ffffff08', opacity: player.hasStats?1:0.4 }}>
                    {/* Fixed name */}
                    <div style={{ width:NAME_W, minWidth:NAME_W, flexShrink:0, height:ROW_H, display:'flex', alignItems:'center', gap:3, paddingLeft:8, paddingRight:4, borderRight:'1px solid #1e293b', background: i%2===0?'#0b1120':'#0d1526', position:'sticky', left:0, zIndex:1, overflow:'hidden' }}>
                      {player.isStarter && <span style={{ color:'#3b82f6', fontSize:9, fontWeight:900, flexShrink:0 }}>*</span>}
                      {player.onFloor && <div style={{ width:6, height:6, borderRadius:'50%', background:'#4ade80', flexShrink:0 }} />}
                      <span style={{ fontSize:9, fontWeight:700, color:'#475569', flexShrink:0, minWidth:14, textAlign:'right' }}>{player.number||'—'}</span>
                      <span style={{ fontSize:11, fontWeight:player.hasStats?700:400, color:player.hasStats?'#e2e8f0':'#334155', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {player.name}
                      </span>
                      {isLive && player.onFloor && (
                        <span style={{ fontSize:8, color:'#4ade80', fontWeight:700, flexShrink:0, marginLeft:2 }}>●</span>
                      )}
                    </div>
                    {/* Stats */}
                    {COLS.map(col => (
                      <div key={col.key} style={{ width:col.w, minWidth:col.w, height:ROW_H, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <span style={{
                          fontSize: isFrac(col.key)?9:11,
                          fontWeight: col.bold?800:500,
                          color: col.key==='pm'?pmColor(s.pm):col.color||(player.hasStats?'#94a3b8':'#1e293b'),
                          fontVariantNumeric:'tabular-nums',
                        }}>
                          {player.hasStats ? colVal(s, col.key, player) : (col.key==='min' ? calcMinutes(player.id) || '—' : isFrac(col.key)?'0/0':col.key==='pm'?'—':'0')}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Totals row */}
              <div style={{ display:'flex', height:ROW_H+2, background:'#162032', borderTop:'2px solid #2d4a6e', position:'sticky', bottom:0 }}>
                <div style={{ width:NAME_W, minWidth:NAME_W, flexShrink:0, display:'flex', alignItems:'center', paddingLeft:10, borderRight:'1px solid #2d4a6e', background:'#162032', position:'sticky', left:0, zIndex:1 }}>
                  <span style={{ fontSize:8, fontWeight:900, color:'#64748b', letterSpacing:'0.15em', textTransform:'uppercase' }}>TOTALS</span>
                </div>
                {COLS.map(col => (
                  <div key={col.key} style={{ width:col.w, minWidth:col.w, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontSize:isFrac(col.key)?9:11, fontWeight:800, color:col.color||'#64748b', fontVariantNumeric:'tabular-nums' }}>
                      {totalsVal(totals, col.key)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Opponent totals — double border */}
              {(() => {
                const opp = game.opponent_stats?.team || {};
                const oppTotals = {
                  min: 0,
                  pts:  opp.pts  || 0,
                  fgm:  (opp.fgm||0)+(opp.tpm||0),
                  fga:  (opp.fga||0)+(opp.tpa||0),
                  tpm:  opp.tpm  || 0, tpa: opp.tpa || 0,
                  ftm:  opp.ftm  || 0, fta: opp.fta || 0,
                  reb:  (opp.oreb||0)+(opp.dreb||0),
                  ast:  opp.ast  || 0,
                  stl:  opp.stl  || 0,
                  blk:  opp.blk  || 0,
                  to:   opp.to   || 0,
                  pf:   opp.pf   || 0,
                  pm:   0,
                };
                const oppColVal = (key) => {
                  if (key === 'min') return '—';
                  if (key === 'pm')  return '—';
                  if (key === 'fg')  return `${oppTotals.fgm}/${oppTotals.fga}`;
                  if (key === '3pt') return `${oppTotals.tpm}/${oppTotals.tpa}`;
                  if (key === 'ft')  return `${oppTotals.ftm}/${oppTotals.fta}`;
                  return oppTotals[key] ?? 0;
                };
                return (
                  <div style={{ display:'flex', height:ROW_H+2, background:'#1a1020', borderTop:'4px double #4a2060' }}>
                    <div style={{ width:NAME_W, minWidth:NAME_W, flexShrink:0, display:'flex', alignItems:'center', paddingLeft:10, borderRight:'1px solid #4a2060', background:'#1a1020', position:'sticky', left:0, zIndex:1, overflow:'hidden' }}>
                      <span style={{ fontSize:8, fontWeight:900, color:'#c084fc', letterSpacing:'0.08em', textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{oppName}</span>
                    </div>
                    {COLS.map(col => (
                      <div key={col.key} style={{ width:col.w, minWidth:col.w, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <span style={{ fontSize:isFrac(col.key)?9:11, fontWeight:800, color: col.key==='pts'?'#f87171':'#94a3b8', fontVariantNumeric:'tabular-nums' }}>
                          {oppColVal(col.key)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}

            </div>
          </div>
        )}

        {/* Legend */}
        <div style={{ flexShrink:0, padding:'5px 12px', background:'#060d1a', borderTop:'1px solid #1e293b', display:'flex', gap:14 }}>
          <span style={{ fontSize:8, color:'#1e3a5f', fontWeight:700 }}>* starter</span>
          {isLive && <span style={{ fontSize:8, color:'#1e3a5f', fontWeight:700 }}>● on floor</span>}
          <span style={{ fontSize:8, color:'#1e3a5f', fontWeight:700 }}>n = Did Not Travel</span>
          <span style={{ fontSize:8, color:'#1e3a5f', fontWeight:700 }}>FG includes 3PT</span>
        </div>

      </div>
    </div>
  );
};

export default GameDetail;
