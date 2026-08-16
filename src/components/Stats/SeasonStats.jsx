import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import AppHeader from '../Shared/AppHeader';
import { aggregateSeasonStats, fmtPct } from '../../utils/statsHelpers';
import { Trophy, BarChart2, Target } from 'lucide-react';

const RANK_TABS = [
  { key: 'pts', label: 'Points',   unit: 'PPG', source: 'avg' },
  { key: 'reb', label: 'Rebounds', unit: 'RPG', source: 'avg' },
  { key: 'ast', label: 'Assists',  unit: 'APG', source: 'avg' },
  { key: 'stl', label: 'Steals',   unit: 'SPG', source: 'avg' },
  { key: 'blk', label: 'Blocks',   unit: 'BPG', source: 'avg' },
];

export default function SeasonStats({ user, team, onBack, onViewPlayer }) {
  const [games,   setGames]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('leaders');
  const [rankKey, setRankKey] = useState('pts');
  

  useEffect(() => { loadGames(); }, [team.id]);

  const loadGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('team_id', team.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setGames(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const roster      = team.roster?.filter(p => p.active && p.status === 'rostered') || [];
  const seasonStats = aggregateSeasonStats(games, roster);

  // Team totals across all games
  const teamTotals = seasonStats.reduce((acc, s) => ({
    pts:  acc.pts  + s.totals.pts,
    fgm:  acc.fgm  + s.totals.fgm,  fga: acc.fga + s.totals.fga,
    tpm:  acc.tpm  + s.totals.tpm,  tpa: acc.tpa + s.totals.tpa,
    ftm:  acc.ftm  + s.totals.ftm,  fta: acc.fta + s.totals.fta,
    reb:  acc.reb  + s.totals.reb,
    ast:  acc.ast  + s.totals.ast,
    stl:  acc.stl  + s.totals.stl,
    blk:  acc.blk  + s.totals.blk,
  }), { pts:0,fgm:0,fga:0,tpm:0,tpa:0,ftm:0,fta:0,reb:0,ast:0,stl:0,blk:0 });

  const gp = games.length;
  const teamAvg = k => gp > 0 ? +(teamTotals[k] / gp).toFixed(1) : 0;

  // Ranked list for selected key
  const ranked = [...seasonStats].sort((a, b) => b.avg[rankKey] - a.avg[rankKey]);

  const TABS = [
    { key: 'leaders', label: 'Leaders'  },
    { key: 'table',   label: 'All Stats' },
    { key: 'team',    label: 'Team'     },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader
        title="Season Stats"
        isDashboard={false}
        onDashboard={onBack}
        userEmail={user?.email}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 pb-16 space-y-5">

          {/* Team header */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl font-black">
                {team.name[0]?.toUpperCase()}
              </div>
              <div>
                <h1 className="font-black text-xl">{team.name}</h1>
                <p className="text-sm text-white/50 mt-0.5">
                  {gp} game{gp !== 1 ? 's' : ''} · {team.wins || 0}W–{team.losses || 0}L
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'PPG', value: teamAvg('pts')  },
                { label: 'RPG', value: teamAvg('reb')  },
                { label: 'APG', value: teamAvg('ast')  },
                { label: 'FG%', value: fmtPct(teamTotals.fgm, teamTotals.fga) },
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

          {/* No stats state */}
          {seasonStats.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <BarChart2 size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="font-black text-gray-400">No stats yet</p>
              <p className="text-xs text-gray-300 mt-1">Complete a game with player stats to see this</p>
            </div>
          )}

          {/* ── Leaders Tab ── */}
          {tab === 'leaders' && seasonStats.length > 0 && (
            <div className="space-y-4">

              {/* Stat category picker */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {RANK_TABS.map(rt => (
                  <button
                    key={rt.key}
                    onClick={() => setRankKey(rt.key)}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black transition ${
                      rankKey === rt.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-500 border border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    {rt.label}
                  </button>
                ))}
              </div>

              {/* Rankings list */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {ranked.map((entry, i) => {
                    const rt      = RANK_TABS.find(r => r.key === rankKey);
                    const value   = entry.avg[rankKey];
                    const isFirst = i === 0;
                    return (
                      <div key={entry.player.id} className={`flex items-center gap-4 px-5 py-4 ${
                        isFirst ? 'bg-blue-50' : ''
                      }`}>
                        <span className={`w-7 text-center font-black text-sm flex-shrink-0 ${
                          i === 0 ? 'text-yellow-500' :
                          i === 1 ? 'text-gray-400'   :
                          i === 2 ? 'text-orange-500'  : 'text-gray-300'
                        }`}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => onViewPlayer?.(entry.player)}
                            className={`font-black text-sm truncate text-left hover:underline hover:text-blue-600 transition ${
                              isFirst ? 'text-blue-900' : 'text-gray-900'
                            }`}
                          >
                            {entry.player.name}
                          </button>
                          <p className="text-xs text-gray-400">
                            #{entry.player.number || '—'} · {entry.gp} GP
                            {entry.player.position && ` · ${entry.player.position}`}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-3xl font-black tabular-nums leading-none ${
                            isFirst ? 'text-blue-600' : 'text-gray-700'
                          }`}>
                            {value}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5">{rt?.unit}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shooting leaders */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'FG%', key: 'fg', minFga: 20 },
                  { label: '3P%', key: 'tp', minFga: 10 },
                  { label: 'FT%', key: 'ft', minFga: 5  },
                ].map(({ label, key, minFga }) => {
                  const eligible = seasonStats.filter(s =>
                    s.totals.fga >= minFga || key === 'ft'
                  );
                  const best = [...eligible].sort((a, b) => {
                    const parse = v => v === '—' ? 0 : parseInt(v);
                    return parse(b[key]) - parse(a[key]);
                  })[0];

                  return (
                    <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-wider">{label}</p>
                      {best ? (
                        <>
                          <p className="text-3xl font-black text-blue-600 mt-2 leading-none">{best[key]}</p>
                          <p className="text-xs font-bold text-gray-900 mt-2 truncate">{best.player.name.split(' ')[0]}</p>
                          <p className="text-[10px] text-gray-400">{best.gp} GP</p>
                        </>
                      ) : (
                        <p className="text-2xl text-gray-200 font-bold mt-3">—</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── All Stats Table Tab ── */}
          {tab === 'table' && seasonStats.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="text-xs min-w-max w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left py-3 px-4 font-bold text-gray-500 sticky left-0 bg-gray-50 min-w-[140px]">
                        Player
                      </th>
                      {[
                        { l:'GP'  }, { l:'MIN' }, { l:'PPG', bold:true },
                        { l:'RPG' }, { l:'APG' }, { l:'SPG' }, { l:'BPG' },
                        { l:'TO'  }, { l:'FG%', muted:true },
                        { l:'3P%', muted:true }, { l:'FT%', muted:true },
                      ].map(({ l, bold, muted }) => (
                        <th key={l} className={`py-3 px-3 text-right font-bold ${
                          bold ? 'text-blue-600' : muted ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                          {l}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...seasonStats].sort((a, b) => b.avg.pts - a.avg.pts).map((entry, i) => (
                      <tr key={entry.player.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className={`py-2.5 px-4 sticky left-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <span className="text-[10px] text-gray-400 font-mono mr-1.5">#{entry.player.number || '—'}</span>
                          <button
                            onClick={() => onViewPlayer?.(entry.player)}
                            className="font-bold text-gray-900 hover:text-blue-600 hover:underline transition"
                          >
                            {entry.player.name}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-500 tabular-nums">{entry.gp}</td>
                        <td className="py-2.5 px-3 text-right text-gray-500 tabular-nums">{entry.avg.min}</td>
                        <td className="py-2.5 px-3 text-right font-black text-blue-600 tabular-nums">{entry.avg.pts}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700 tabular-nums">{entry.avg.reb}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700 tabular-nums">{entry.avg.ast}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700 tabular-nums">{entry.avg.stl}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700 tabular-nums">{entry.avg.blk}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700 tabular-nums">{entry.avg.to}</td>
                        <td className="py-2.5 px-3 text-right text-gray-400 tabular-nums">{entry.fg}</td>
                        <td className="py-2.5 px-3 text-right text-gray-400 tabular-nums">{entry.tp}</td>
                        <td className="py-2.5 px-3 text-right text-gray-400 tabular-nums">{entry.ft}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Team Tab ── */}
          {tab === 'team' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h3 className="font-black text-gray-900">Team Averages Per Game</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Over {gp} game{gp !== 1 ? 's' : ''}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-gray-100">
                  {[
                    { label: 'Points',    value: teamAvg('pts'), accent: true  },
                    { label: 'Rebounds',  value: teamAvg('reb')                },
                    { label: 'Assists',   value: teamAvg('ast')                },
                    { label: 'Steals',    value: teamAvg('stl')                },
                    { label: 'Blocks',    value: teamAvg('blk')                },
                    { label: 'Turnovers', value: teamAvg('to')                 },
                  ].map(({ label, value, accent }) => (
                    <div key={label} className="bg-white p-5 text-center">
                      <p className={`text-3xl font-black ${accent ? 'text-blue-600' : 'text-gray-800'}`}>
                        {value}
                      </p>
                      <p className="text-xs text-gray-400 font-bold mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shooting */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h3 className="font-black text-gray-900">Team Shooting</h3>
                </div>
                <div className="grid grid-cols-3 gap-px bg-gray-100">
                  {[
                    { label: 'Field Goals', made: teamTotals.fgm, att: teamTotals.fga },
                    { label: '3-Pointers',  made: teamTotals.tpm, att: teamTotals.tpa },
                    { label: 'Free Throws', made: teamTotals.ftm, att: teamTotals.fta },
                  ].map(({ label, made, att }) => (
                    <div key={label} className="bg-white p-4 text-center">
                      <p className="text-2xl font-black text-blue-600">{fmtPct(made, att)}</p>
                      <p className="text-xs text-gray-400 font-bold mt-1">{label}</p>
                      <p className="text-[10px] text-gray-300 mt-0.5 tabular-nums">
                        {made}-{att}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Game log */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h3 className="font-black text-gray-900">Game Log</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {games.map(game => {
                    const isHome  = game.home_team === team.name;
                    const ours    = isHome ? game.home_score : game.away_score;
                    const opp     = isHome ? game.away_score : game.home_score;
                    const isWin   = ours > opp;
                    const isLoss  = ours < opp;
                    return (
                      <div key={game.id} className="flex items-center gap-4 px-5 py-3">
                        <span className={`w-6 font-black text-sm flex-shrink-0 ${
                          isWin ? 'text-emerald-500' : isLoss ? 'text-red-500' : 'text-gray-300'
                        }`}>
                          {isWin ? 'W' : isLoss ? 'L' : 'D'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">vs {game.opponent}</p>
                          <p className="text-[10px] text-gray-400">
                            {new Date(game.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric' })}
                          </p>
                        </div>
                        <p className={`font-black tabular-nums text-sm flex-shrink-0 ${
                          isWin ? 'text-emerald-600' : isLoss ? 'text-red-500' : 'text-gray-600'
                        }`}>
                          {ours}–{opp}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}