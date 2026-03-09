import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Zap } from 'lucide-react';
import { supabase } from '../../../supabase';

// ── Live clock that counts down locally, re-syncs on DB updates ──────────────
const LiveClock = ({ timeRemaining, updatedAt, timerRunning }) => {
  const calc = () => {
    if (timeRemaining == null) return null;
    if (!timerRunning) return timeRemaining;
    const elapsed = updatedAt
      ? Math.floor((Date.now() - new Date(updatedAt).getTime()) / 1000)
      : 0;
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
const pct = (m, a) => a > 0 ? ((m / a) * 100).toFixed(1) : '—';

const calcPlayerStats = (game, playerId) => {
  const s = game.stats?.[playerId] || {};
  const fgm = (s.fgm || 0) + (s.tpm || 0);
  const fga = (s.fga || 0) + (s.tpa || 0);
  const reb = (s.oreb || 0) + (s.dreb || 0);
  return { ...s, fgm, fga, reb, fgPct: pct(fgm, fga), tpPct: pct(s.tpm, s.tpa), ftPct: pct(s.ftm, s.fta), pm: game.plus_minus?.[playerId] || 0 };
};

const calcTeamTotals = (game) => {
  const t = { pts:0,fgm:0,fga:0,tpm:0,tpa:0,ftm:0,fta:0,oreb:0,dreb:0,ast:0,stl:0,blk:0,to:0,pf:0 };
  Object.values(game.stats || {}).forEach(s => Object.keys(t).forEach(k => { t[k] += s[k] || 0; }));
  const fgm = t.fgm + t.tpm, fga = t.fga + t.tpa, reb = t.oreb + t.dreb;
  return { ...t, fgm, fga, reb, fgPct: pct(fgm, fga), tpPct: pct(t.tpm, t.tpa), ftPct: pct(t.ftm, t.fta) };
};

const calcOpponentTotals = (game) => {
  const s = game.opponent_stats?.team || {};
  const fgm = (s.fgm||0)+(s.tpm||0), fga = (s.fga||0)+(s.tpa||0), reb = (s.oreb||0)+(s.dreb||0);
  return { ...s, fgm, fga, reb, fgPct: pct(fgm,fga), tpPct: pct(s.tpm,s.tpa), ftPct: pct(s.ftm,s.fta) };
};

// ── Main Component ────────────────────────────────────────────────────────────
const LiveGameDetail = ({ initialGame, team: initialTeam, onBack }) => {
  const [game, setGame] = useState(initialGame);
  const [roster, setRoster] = useState(initialTeam?.roster || []);
  const isLive = game.status === 'in-progress';

  // Fetch fresh game data on mount — dashboard may not have full stats
  useEffect(() => {
    const fetchGame = async () => {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', initialGame.id)
        .single();
      if (data && !error) setGame(data);
    };
    fetchGame();
  }, [initialGame.id]);

  // Fetch roster if not provided — team passed from dashboard may have empty roster
  useEffect(() => {
    if (roster.length > 0) return;
    const teamId = initialGame.team_id;
    if (!teamId) return;
    const fetchRoster = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamId);
      if (data && !error) setRoster(data);
    };
    fetchRoster();
  }, [initialGame.team_id]);
  const isHome = game.game_settings?.isHome;
  const myScore  = isHome ? game.home_score : game.away_score;
  const oppScore = isHome ? game.away_score : game.home_score;
  const gradient = isLive ? 'from-gray-950 via-gray-900 to-gray-800' : 'from-gray-900 to-gray-800';

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isLive) return;
    const channel = supabase
      .channel(`game-detail-${game.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${game.id}` },
        (payload) => setGame(prev => ({ ...prev, ...payload.new }))
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [game.id, isLive]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const plays = game.recent_plays || [];
  const teamTotals = calcTeamTotals(game);
  const oppTotals  = calcOpponentTotals(game);

  const players = roster
    .filter(p => game.stats?.[p.id] != null)
    .sort((a, b) => (game.stats[b.id]?.pts || 0) - (game.stats[a.id]?.pts || 0));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-gray-950 overflow-y-auto">

      {/* ── SCOREBOARD ─────────────────────────────────────────────────────── */}
      <div className={`bg-gradient-to-br ${gradient} px-4 pt-4 pb-6`}>

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-white/60 hover:text-white transition text-sm font-bold"
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>
          {isLive && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-400/15 rounded-full border border-yellow-400/30">
              <Zap size={10} className="text-yellow-400 fill-yellow-400" />
              <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Live</span>
            </div>
          )}
          {!isLive && (
            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Final</span>
          )}
          <div className="w-20" />
        </div>

        {/* Score block */}
        <div className="max-w-lg mx-auto">
          <div className="grid grid-cols-3 gap-4 items-center mb-3">

            {/* Away team */}
            <div className="text-center">
              <div className="text-xs font-black text-white/40 uppercase tracking-wide mb-1 truncate">
                {isHome ? game.opponent : initialTeam?.name}
              </div>
              <div className="text-6xl font-black text-white tabular-nums leading-none">
                {oppScore}
              </div>
            </div>

            {/* Clock / period */}
            <div className="text-center">
              <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">
                Q{game.period || 1}
              </div>
              <div className={`text-2xl font-black tabular-nums leading-none ${isLive && game.timer_running ? 'text-white' : 'text-white/40'}`}>
                <LiveClock
                  timeRemaining={game.time_remaining}
                  updatedAt={game.updated_at}
                  timerRunning={game.timer_running}
                />
              </div>
              {isLive && (
                <div className={`mt-2 w-1.5 h-1.5 rounded-full mx-auto ${game.timer_running ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
              )}
            </div>

            {/* Home team */}
            <div className="text-center">
              <div className="text-xs font-black text-white/40 uppercase tracking-wide mb-1 truncate">
                {isHome ? initialTeam?.name : game.opponent}
              </div>
              <div className="text-6xl font-black text-white tabular-nums leading-none">
                {myScore}
              </div>
            </div>
          </div>

          {/* Play ticker — 5 columns, 1 row */}
          {(() => {
            const ticker = (game.recent_plays || []).slice(0, 5);
            if (!ticker.length) return null;
            return (
              <div className="mt-4 border-t border-white/10 pt-3 grid grid-cols-5 gap-1">
                {ticker.map((play, i) => (
                  <div key={play.id || i} className={`text-center px-1 ${i === 0 ? 'opacity-100' : i === 1 ? 'opacity-60' : i === 2 ? 'opacity-35' : 'opacity-20'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full mx-auto mb-1 ${play.team === 'home' ? 'bg-blue-400' : 'bg-red-400'}`} />
                    <div className="text-[9px] font-bold text-white leading-tight truncate">{play.description}</div>
                    <div className="text-[8px] text-white/30 tabular-nums mt-0.5">Q{play.period} {play.time}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Team box score */}
        <div className="bg-gray-900 rounded-xl overflow-hidden border border-white/5">
          <div className="px-4 py-3 border-b border-white/5">
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{initialTeam?.name} — Box Score</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[9px] font-black text-white/25 uppercase tracking-wide border-b border-white/5">
                  <th className="px-4 py-2 text-left">Player</th>
                  <th className="px-2 py-2 text-center">PTS</th>
                  <th className="px-2 py-2 text-center">FG</th>
                  <th className="px-2 py-2 text-center">3PT</th>
                  <th className="px-2 py-2 text-center">FT</th>
                  <th className="px-2 py-2 text-center">REB</th>
                  <th className="px-2 py-2 text-center">AST</th>
                  <th className="px-2 py-2 text-center">STL</th>
                  <th className="px-2 py-2 text-center">BLK</th>
                  <th className="px-2 py-2 text-center">TO</th>
                  <th className="px-2 py-2 text-center">PF</th>
                  <th className="px-2 py-2 text-center">+/-</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {players.length > 0 ? players.map(player => {
                  const s = calcPlayerStats(game, player.id);
                  return (
                    <tr key={player.id} className="hover:bg-white/3">
                      <td className="px-4 py-2.5 font-bold text-white/80 whitespace-nowrap">
                        #{player.number} {player.name.split(' ')[0]} {player.name.split(' ').slice(1).join(' ')}
                      </td>
                      <td className="px-2 py-2.5 text-center font-black text-blue-400 tabular-nums">{s.pts||0}</td>
                      <td className="px-2 py-2.5 text-center text-white/40 tabular-nums">{s.fgm}/{s.fga}</td>
                      <td className="px-2 py-2.5 text-center text-white/40 tabular-nums">{s.tpm||0}/{s.tpa||0}</td>
                      <td className="px-2 py-2.5 text-center text-white/40 tabular-nums">{s.ftm||0}/{s.fta||0}</td>
                      <td className="px-2 py-2.5 text-center text-white/60 tabular-nums">{s.reb}</td>
                      <td className="px-2 py-2.5 text-center text-white/60 tabular-nums">{s.ast||0}</td>
                      <td className="px-2 py-2.5 text-center text-white/60 tabular-nums">{s.stl||0}</td>
                      <td className="px-2 py-2.5 text-center text-white/60 tabular-nums">{s.blk||0}</td>
                      <td className="px-2 py-2.5 text-center text-white/60 tabular-nums">{s.to||0}</td>
                      <td className="px-2 py-2.5 text-center text-white/60 tabular-nums">{s.pf||0}</td>
                      <td className={`px-2 py-2.5 text-center font-bold tabular-nums ${s.pm > 0 ? 'text-green-400' : s.pm < 0 ? 'text-red-400' : 'text-white/25'}`}>
                        {s.pm > 0 ? '+' : ''}{s.pm}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="12" className="px-4 py-8 text-center text-white/20 text-sm">No stats yet</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="border-t-2 border-white/10 bg-white/3">
                <tr className="font-black text-[9px] uppercase text-white/40">
                  <td className="px-4 py-2.5">Totals</td>
                  <td className="px-2 py-2.5 text-center text-blue-400 tabular-nums">{teamTotals.pts}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums">{teamTotals.fgm}/{teamTotals.fga}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums">{teamTotals.tpm}/{teamTotals.tpa}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums">{teamTotals.ftm}/{teamTotals.fta}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums">{teamTotals.reb}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums">{teamTotals.ast}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums">{teamTotals.stl}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums">{teamTotals.blk}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums">{teamTotals.to}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums">{teamTotals.pf}</td>
                  <td className="px-2 py-2.5 text-center text-white/20">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Opponent totals */}
        <div className="bg-gray-900 rounded-xl overflow-hidden border border-white/5">
          <div className="px-4 py-3 border-b border-white/5">
            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">{game.opponent} — Team Stats</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[9px] font-black text-white/25 uppercase tracking-wide border-b border-white/5">
                  <th className="px-4 py-2 text-left">Team</th>
                  <th className="px-2 py-2 text-center">PTS</th>
                  <th className="px-2 py-2 text-center">FG</th>
                  <th className="px-2 py-2 text-center">FG%</th>
                  <th className="px-2 py-2 text-center">3PT</th>
                  <th className="px-2 py-2 text-center">3P%</th>
                  <th className="px-2 py-2 text-center">FT</th>
                  <th className="px-2 py-2 text-center">FT%</th>
                  <th className="px-2 py-2 text-center">REB</th>
                  <th className="px-2 py-2 text-center">AST</th>
                  <th className="px-2 py-2 text-center">STL</th>
                  <th className="px-2 py-2 text-center">BLK</th>
                  <th className="px-2 py-2 text-center">TO</th>
                  <th className="px-2 py-2 text-center">PF</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-2.5 font-bold text-white/80">{game.opponent}</td>
                  <td className="px-2 py-2.5 text-center font-black text-red-400 tabular-nums">{oppTotals.pts||0}</td>
                  <td className="px-2 py-2.5 text-center text-white/40 tabular-nums">{oppTotals.fgm}/{oppTotals.fga}</td>
                  <td className="px-2 py-2.5 text-center text-white/40 tabular-nums">{oppTotals.fgPct}%</td>
                  <td className="px-2 py-2.5 text-center text-white/40 tabular-nums">{oppTotals.tpm||0}/{oppTotals.tpa||0}</td>
                  <td className="px-2 py-2.5 text-center text-white/40 tabular-nums">{oppTotals.tpPct}%</td>
                  <td className="px-2 py-2.5 text-center text-white/40 tabular-nums">{oppTotals.ftm||0}/{oppTotals.fta||0}</td>
                  <td className="px-2 py-2.5 text-center text-white/40 tabular-nums">{oppTotals.ftPct}%</td>
                  <td className="px-2 py-2.5 text-center text-white/60 tabular-nums">{oppTotals.reb||0}</td>
                  <td className="px-2 py-2.5 text-center text-white/60 tabular-nums">{oppTotals.ast||0}</td>
                  <td className="px-2 py-2.5 text-center text-white/60 tabular-nums">{oppTotals.stl||0}</td>
                  <td className="px-2 py-2.5 text-center text-white/60 tabular-nums">{oppTotals.blk||0}</td>
                  <td className="px-2 py-2.5 text-center text-white/60 tabular-nums">{oppTotals.to||0}</td>
                  <td className="px-2 py-2.5 text-center text-white/60 tabular-nums">{oppTotals.pf||0}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
};

export default LiveGameDetail;
