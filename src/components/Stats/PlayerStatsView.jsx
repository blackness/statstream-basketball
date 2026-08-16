import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabase';
import AppHeader from '../Shared/AppHeader';
import { fmtPct } from '../../utils/statsHelpers';
import { ExternalLink } from 'lucide-react';

const avg = (v, gp) => gp > 0 ? +(v / gp).toFixed(1) : 0;

const formatDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function PlayerStatsView({ user, player, team, onBack, toast }) {
  const navigate        = useNavigate();
  const [games,         setGames]         = useState([]);
  const [allTeamGames,  setAllTeamGames]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState('overview');

  useEffect(() => { loadGames(); }, []);

  const loadGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('team_id', team.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAllTeamGames(data || []);
      setGames((data || []).filter(g => g.stats?.[player.id]));
    } catch (err) {
      console.error(err);
      toast?.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  // ── Aggregations ──────────────────────────────────────────────────────────
  const gp = games.length;

  const totals = games.reduce((acc, g) => {
    const s = g.stats[player.id] || {};
    return {
      pts:  acc.pts  + (s.pts  || 0), fgm:  acc.fgm  + (s.fgm  || 0),
      fga:  acc.fga  + (s.fga  || 0), tpm:  acc.tpm  + (s.tpm  || 0),
      tpa:  acc.tpa  + (s.tpa  || 0), ftm:  acc.ftm  + (s.ftm  || 0),
      fta:  acc.fta  + (s.fta  || 0), oreb: acc.oreb + (s.oreb || 0),
      dreb: acc.dreb + (s.dreb || 0), ast:  acc.ast  + (s.ast  || 0),
      stl:  acc.stl  + (s.stl  || 0), blk:  acc.blk  + (s.blk  || 0),
      to:   acc.to   + (s.to   || 0), pf:   acc.pf   + (s.pf   || 0),
      min:  acc.min  + (s.min  || 0),
    };
  }, { pts:0,fgm:0,fga:0,tpm:0,tpa:0,ftm:0,fta:0,oreb:0,dreb:0,ast:0,stl:0,blk:0,to:0,pf:0,min:0 });

  const reb   = totals.oreb + totals.dreb;
  const avgs  = {
    pts: avg(totals.pts, gp), reb: avg(reb, gp),
    ast: avg(totals.ast, gp), stl: avg(totals.stl, gp),
    blk: avg(totals.blk, gp), to:  avg(totals.to,  gp),
    min: avg(totals.min, gp),
  };

  // Career highs
  const careerHighs = games.reduce((h, g) => {
    const s       = g.stats[player.id] || {};
    const gameReb = (s.oreb || 0) + (s.dreb || 0);
    return {
      pts: h.pts.val >= (s.pts || 0)  ? h.pts : { val: s.pts  || 0, game: g },
      reb: h.reb.val >= gameReb        ? h.reb : { val: gameReb,      game: g },
      ast: h.ast.val >= (s.ast || 0)  ? h.ast : { val: s.ast  || 0, game: g },
      stl: h.stl.val >= (s.stl || 0)  ? h.stl : { val: s.stl  || 0, game: g },
      blk: h.blk.val >= (s.blk || 0)  ? h.blk : { val: s.blk  || 0, game: g },
      min: h.min.val >= (s.min || 0)  ? h.min : { val: s.min  || 0, game: g },
    };
  }, {
    pts: { val:0,game:null }, reb: { val:0,game:null },
    ast: { val:0,game:null }, stl: { val:0,game:null },
    blk: { val:0,game:null }, min: { val:0,game:null },
  });

  // Team rankings
  const roster = team.roster?.filter(p => p.active && p.status === 'rostered') || [];

  const getRank = (key) => {
    const myAvg = key === 'reb' ? avgs.reb : avgs[key];
    const ranked = roster.map(p => {
      const pGames = allTeamGames.filter(g => g.stats?.[p.id]);
      const pGp    = pGames.length;
      if (!pGp) return 0;
      const total  = pGames.reduce((sum, g) => {
        const s = g.stats[p.id] || {};
        return sum + (key === 'reb' ? (s.oreb||0)+(s.dreb||0) : (s[key]||0));
      }, 0);
      return +(total / pGp).toFixed(1);
    }).sort((a, b) => b - a);
    const idx = ranked.findIndex(v => v <= myAvg);
    return idx === -1 ? ranked.length : idx + 1;
  };

  const TABS = [
    { key: 'overview', label: 'Overview'     },
    { key: 'gamelog',  label: 'Game Log'     },
    { key: 'highs',    label: 'Career Highs' },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader
        title="Player Stats"
        isDashboard={false}
        onDashboard={onBack}
        userEmail={user?.email}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 pb-16 space-y-4">

          {/* Player header */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                <span className="text-3xl font-black">#{player.number || '—'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-black truncate">{player.name}</h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {player.position && (
                    <span className="px-2 py-0.5 bg-white/10 rounded-lg text-xs font-bold">
                      {player.position}
                    </span>
                  )}
                  <span className="text-xs text-white/50">{team.name}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <div className="text-center">
                  <p className="text-3xl font-black">{gp}</p>
                  <p className="text-[10px] text-white/40 font-bold uppercase">GP</p>
                </div>
                <button
                  onClick={() => navigate(`/player/${player.id}`)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold transition"
                >
                  <ExternalLink size={10} /> Public Page
                </button>
              </div>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'PPG', value: avgs.pts },
                { label: 'RPG', value: avgs.reb },
                { label: 'APG', value: avgs.ast },
                { label: 'MPG', value: avgs.min },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-xl font-black">{value}</p>
                  <p className="text-[10px] text-white/40 font-bold mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1 gap-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${
                  tab === t.key
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {gp === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <p className="font-black text-gray-400">No stats recorded yet</p>
              <p className="text-xs text-gray-300 mt-1">Stats appear after completed games</p>
            </div>
          )}

          {/* ── Overview ── */}
          {tab === 'overview' && gp > 0 && (
            <div className="space-y-4">

              {/* Averages grid */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-50">
                  <h3 className="font-black text-gray-900 text-sm">Per Game Averages</h3>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-px bg-gray-100">
                  {[
                    { label: 'Points',    value: avgs.pts, accent: true },
                    { label: 'Rebounds',  value: avgs.reb  },
                    { label: 'Assists',   value: avgs.ast  },
                    { label: 'Steals',    value: avgs.stl  },
                    { label: 'Blocks',    value: avgs.blk  },
                    { label: 'Turnovers', value: avgs.to   },
                    { label: 'Minutes',   value: avgs.min  },
                    { label: 'Games',     value: gp        },
                  ].map(({ label, value, accent }) => (
                    <div key={label} className="bg-white p-4 text-center">
                      <p className={`text-2xl font-black ${accent ? 'text-blue-600' : 'text-gray-800'}`}>
                        {value}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shooting */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-50">
                  <h3 className="font-black text-gray-900 text-sm">Shooting Splits</h3>
                </div>
                <div className="grid grid-cols-3 gap-px bg-gray-100">
                  {[
                    {
                      label: 'Field Goals',
                      pct:  fmtPct(totals.fgm + totals.tpm, totals.fga + totals.tpa),
                      made: totals.fgm + totals.tpm,
                      att:  totals.fga + totals.tpa,
                    },
                    {
                      label: '3-Pointers',
                      pct:  fmtPct(totals.tpm, totals.tpa),
                      made: totals.tpm, att: totals.tpa,
                    },
                    {
                      label: 'Free Throws',
                      pct:  fmtPct(totals.ftm, totals.fta),
                      made: totals.ftm, att: totals.fta,
                    },
                  ].map(({ label, pct, made, att }) => (
                    <div key={label} className="bg-white p-4 text-center">
                      <p className="text-2xl font-black text-blue-600">{pct}</p>
                      <p className="text-[10px] text-gray-400 font-bold mt-1">{label}</p>
                      <p className="text-[10px] text-gray-300 mt-0.5 tabular-nums">{made}-{att}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team Rankings */}
              {roster.length > 1 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-50">
                    <h3 className="font-black text-gray-900 text-sm">Team Rankings</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Among active players on {team.name}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-px bg-gray-100">
                    {[
                      { label: 'Points',   key: 'pts', value: avgs.pts },
                      { label: 'Rebounds', key: 'reb', value: avgs.reb },
                      { label: 'Assists',  key: 'ast', value: avgs.ast },
                    ].map(({ label, key, value }) => {
                      const rank   = getRank(key);
                      const suffix = rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th';
                      return (
                        <div key={label} className="bg-white p-4 text-center">
                          <p className={`text-2xl font-black ${rank === 1 ? 'text-yellow-500' : 'text-gray-700'}`}>
                            {rank}{suffix}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5">{label}</p>
                          <p className="text-[10px] text-gray-300 mt-0.5">{value} avg</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Game Log ── */}
          {tab === 'gamelog' && gp > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="text-xs min-w-max w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left py-3 px-4 font-bold text-gray-500 sticky left-0 bg-gray-50 min-w-[130px]">
                        Game
                      </th>
                      {['PTS','REB','AST','STL','BLK','MIN','FG%'].map(h => (
                        <th
                          key={h}
                          className={`py-3 px-3 text-right font-bold ${
                            h === 'PTS' ? 'text-blue-600' : 'text-gray-500'
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {games.map((game, i) => {
                      const s      = game.stats[player.id] || {};
                      const isHome = game.home_team === team.name;
                      const ours   = isHome ? game.home_score : game.away_score;
                      const opp    = isHome ? game.away_score : game.home_score;
                      const isWin  = ours > opp;
                      const isLoss = ours < opp;
                      const gameReb = (s.oreb||0) + (s.dreb||0);
                      const rowBg   = i % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                      return (
                        <tr key={game.id} className={rowBg}>
                          <td className={`py-2.5 px-4 sticky left-0 ${rowBg}`}>
                            <div className="flex items-center gap-2">
                              <span className={`font-black w-4 text-xs flex-shrink-0 ${
                                isWin ? 'text-emerald-500' : isLoss ? 'text-red-500' : 'text-gray-300'
                              }`}>
                                {isWin ? 'W' : isLoss ? 'L' : 'D'}
                              </span>
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 truncate max-w-[85px]">
                                  vs {game.opponent}
                                </p>
                                <p className="text-[10px] text-gray-400">
                                  {formatDate(game.created_at)} · {ours}-{opp}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-blue-600 tabular-nums">{s.pts||0}</td>
                          <td className="py-2.5 px-3 text-right text-gray-700 tabular-nums">{gameReb}</td>
                          <td className="py-2.5 px-3 text-right text-gray-700 tabular-nums">{s.ast||0}</td>
                          <td className="py-2.5 px-3 text-right text-gray-700 tabular-nums">{s.stl||0}</td>
                          <td className="py-2.5 px-3 text-right text-gray-700 tabular-nums">{s.blk||0}</td>
                          <td className="py-2.5 px-3 text-right text-gray-500 tabular-nums">{s.min||0}</td>
                          <td className="py-2.5 px-3 text-right text-gray-400 tabular-nums">
                            {fmtPct((s.fgm||0)+(s.tpm||0),(s.fga||0)+(s.tpa||0))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-100 font-black">
                      <td className="py-2.5 px-4 sticky left-0 bg-gray-100 text-[10px] text-gray-500 uppercase">
                        Avg ({gp} GP)
                      </td>
                      <td className="py-2.5 px-3 text-right text-blue-600 tabular-nums">{avgs.pts}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700 tabular-nums">{avgs.reb}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700 tabular-nums">{avgs.ast}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700 tabular-nums">{avgs.stl}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700 tabular-nums">{avgs.blk}</td>
                      <td className="py-2.5 px-3 text-right text-gray-500 tabular-nums">{avgs.min}</td>
                      <td className="py-2.5 px-3 text-right text-gray-400 tabular-nums">
                        {fmtPct(totals.fgm+totals.tpm, totals.fga+totals.tpa)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ── Career Highs ── */}
          {tab === 'highs' && gp > 0 && (
            <div className="space-y-3">
              {[
                { label: 'Points',   key: 'pts', unit: 'PTS' },
                { label: 'Rebounds', key: 'reb', unit: 'REB' },
                { label: 'Assists',  key: 'ast', unit: 'AST' },
                { label: 'Steals',   key: 'stl', unit: 'STL' },
                { label: 'Blocks',   key: 'blk', unit: 'BLK' },
                { label: 'Minutes',  key: 'min', unit: 'MIN' },
              ].map(({ label, key, unit }) => {
                const high = careerHighs[key];
                if (!high.game || high.val === 0) return null;
                const g      = high.game;
                const isHome = g.home_team === team.name;
                const ours   = isHome ? g.home_score : g.away_score;
                const opp    = isHome ? g.away_score : g.home_score;
                const isWin  = ours > opp;
                return (
                  <div
                    key={key}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-wider">{label}</p>
                      <p className="text-sm font-bold text-gray-600 mt-0.5 truncate">
                        vs {g.opponent}
                        <span className={`ml-1.5 text-xs font-black ${isWin ? 'text-emerald-500' : 'text-red-500'}`}>
                          {isWin ? 'W' : 'L'} {ours}–{opp}
                        </span>
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(g.created_at)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-5xl font-black text-blue-600 tabular-nums leading-none">{high.val}</p>
                      <p className="text-[10px] text-gray-400 font-bold mt-1">{unit}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}