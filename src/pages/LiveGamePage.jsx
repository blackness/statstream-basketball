import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { buildRow, sumRows, fmtPct, STAT_COLS } from '../utils/statsHelpers';
import ActivityFeed from '../components/Shared/ActivityFeed';
import { ArrowLeft, LogIn } from 'lucide-react';

const formatTime = (s = 0) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function LiveGamePage() {
  const { id }        = useParams();
  const navigate      = useNavigate();
  const [game,   setGame]   = useState(null);
  const [team,   setTeam]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(game?.status === 'completed' ? 'box' : 'score');

  useEffect(() => {
    loadGame();

    const ch = supabase
      .channel(`live-game-${id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${id}` },
        ({ new: n }) => setGame(n)
      ).subscribe();

    return () => supabase.removeChannel(ch);
  }, [id]);

  const loadGame = async () => {
    try {
      const { data: g, error: ge } = await supabase
        .from('games').select('*').eq('id', id).single();
      if (ge) throw ge;
      setGame(g);
      setActiveTab(g.status === 'completed' ? 'box' : 'score');
      
      const { data: t } = await supabase
        .from('teams')
        .select('*, players:players(*)')
        .eq('id', g.team_id)
        .single();
      setTeam(t ? { ...t, roster: t.players || [] } : null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!game) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="font-black text-gray-400 text-lg">Game not found</p>
        <button onClick={() => navigate('/')} className="mt-4 text-blue-600 font-bold text-sm">
          ← Home
        </button>
      </div>
    </div>
  );

  const teamName  = team?.name || 'Home';
  const isHome    = game.home_team === teamName;
  const ourScore  = isHome ? game.home_score : game.away_score;
  const oppScore  = isHome ? game.away_score : game.home_score;
  const isLive    = game.status === 'in_progress';
  const isFinal   = game.status === 'completed';
  const isWin     = isFinal && ourScore > oppScore;
  const isLoss    = isFinal && ourScore < oppScore;

  // Box score
  const roster   = team?.roster || [];
  const oppRoster = game.opponent_roster || [];
  const ourRows  = roster.map(p => buildRow(p, game.stats || {}));
  const oppRows  = oppRoster.map(p => buildRow(p, game.opponent_stats || {}));
  const ourTot   = sumRows(ourRows);
  const oppTot   = sumRows(oppRows);

  const TABS = [
    { key: 'score', label: 'Scoreboard' },
    { key: 'box',   label: 'Box Score'  },
    { key: 'feed',  label: `Plays (${game.play_log?.length || 0})` },
  ];

  const headerBg = isLive ? 'from-gray-900 to-gray-800'
    : isWin  ? 'from-emerald-700 to-emerald-900'
    : isLoss ? 'from-red-800    to-red-900'
    : 'from-gray-700 to-gray-900';

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(team?.slug ? `/team/${team.slug}` : '/')}
            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition"
          >
            <ArrowLeft size={16} />
            {team?.name || 'Back'}
          </button>
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition"
          >
            <LogIn size={14} /> Sign In
          </button>
        </div>
      </header>

      {/* Scoreboard hero */}
      <div className={`bg-gradient-to-br ${headerBg} text-white`}>
        <div className="max-w-3xl mx-auto px-5 pt-6 pb-5">

          {/* Status badge */}
          <div className="flex items-center justify-between mb-5">
            {isLive ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-black rounded-xl">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                LIVE · Q{game.period || 1} · {formatTime(game.time_remaining)}
              </span>
            ) : (
              <span className={`px-3 py-1.5 text-xs font-black rounded-xl ${
                isWin  ? 'bg-emerald-500/30 text-emerald-200' :
                isLoss ? 'bg-red-500/30    text-red-200'     :
                         'bg-white/10       text-white/60'
              }`}>
                {isWin ? '🏆 WIN' : isLoss ? 'LOSS' : 'FINAL'}
              </span>
            )}
            {game.game_type && game.game_type !== 'regular' && (
              <span className="text-xs text-white/40 capitalize font-medium">{game.game_type}</span>
            )}
          </div>

          {/* Score */}
          <div className="flex items-center justify-center gap-6 mb-2">
            <div className="flex-1 text-center">
              <p className="text-xs font-bold text-white/50 mb-3 truncate">{teamName}</p>
              <p className="text-7xl font-black tabular-nums leading-none">{ourScore}</p>
            </div>
            <div className="text-white/20 font-black text-3xl flex-shrink-0">—</div>
            <div className="flex-1 text-center">
              <p className="text-xs font-bold text-white/50 mb-3 truncate">{game.opponent}</p>
              <p className="text-7xl font-black tabular-nums leading-none">{oppScore}</p>
            </div>
          </div>

          {/* Team summary bar */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/10">
            {[
              { label: 'FG%', our: fmtPct(ourTot.fgm, ourTot.fga), opp: fmtPct(oppTot.fgm, oppTot.fga) },
              { label: 'REB', our: ourTot.reb, opp: oppTot.reb },
              { label: 'AST', our: ourTot.ast, opp: oppTot.ast },
            ].map(({ label, our, opp }) => (
              <div key={label} className="text-center">
                <div className="flex items-center justify-between text-sm font-black mb-1">
                  <span>{our}</span>
                  <span>{opp}</span>
                </div>
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 sticky top-[57px] z-20">
        <div className="max-w-3xl mx-auto flex">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3.5 text-xs font-black transition border-b-2 ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 pb-16 space-y-4">

        {/* Score tab — just show the feed preview + team summary */}
        {activeTab === 'score' && (
          <div className="space-y-4">
            {/* Last plays */}
            {game.play_log?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="font-black text-gray-900 text-sm">Recent Plays</h3>
                  <button
                    onClick={() => setActiveTab('feed')}
                    className="text-xs text-blue-500 font-bold"
                  >
                    See All →
                  </button>
                </div>
                <div className="py-2">
                  <ActivityFeed plays={game.play_log} maxShown={5} />
                </div>
              </div>
            )}

            {/* Roster strips */}
            {[
              { label: teamName, rows: ourRows, ptsCls: 'text-blue-600' },
              ...(oppRows.length > 0
                ? [{ label: game.opponent, rows: oppRows, ptsCls: 'text-red-600' }]
                : []),
            ].map(({ label, rows, ptsCls }) => {
              const sorted = [...rows].sort((a, b) => b.pts - a.pts).slice(0, 5);
              if (!sorted.some(r => r.pts > 0)) return null;
              return (
                <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <h3 className="font-black text-gray-900 text-sm">{label}</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {sorted.filter(r => r.pts > 0).map(row => (
                      <div key={row.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="text-[10px] text-gray-400 font-mono w-7">#{row.number}</span>
                        <span className="flex-1 font-bold text-gray-900 text-sm truncate">{row.name}</span>
                        <span className={`font-black text-lg tabular-nums ${ptsCls}`}>{row.pts}</span>
                        <span className="text-xs text-gray-400 w-16 text-right tabular-nums">
                          {row.fgm}-{row.fga} FG
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Box score tab */}
        {activeTab === 'box' && (
          <div className="space-y-4">
            {[
              { label: teamName, rows: ourRows, ptsCls: 'text-blue-600' },
              ...(oppRows.length > 0
                ? [{ label: game.opponent, rows: oppRows, ptsCls: 'text-red-600' }]
                : []),
            ].map(({ label, rows, ptsCls }) => (
              <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="font-black text-gray-900 text-sm">{label}</h3>
                </div>
                {rows.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-8">No stats recorded</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="text-xs min-w-max w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-2 px-3 font-bold text-gray-400 sticky left-0 bg-white min-w-[130px]">
                            Player
                          </th>
                          {STAT_COLS.map(col => (
                            <th key={col.label} className={`py-2 px-2 text-right font-bold ${
                              col.muted ? 'text-gray-300' : 'text-gray-500'
                            }`}>
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...rows].sort((a, b) => b.pts - a.pts).map((row, i) => (
                          <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className={`py-2 px-3 sticky left-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                              <span className="text-gray-400 font-mono mr-2 text-[10px]">#{row.number}</span>
                              <span className="font-bold text-gray-900">{row.name}</span>
                            </td>
                            {STAT_COLS.map(col => (
                              <td key={col.label} className={`py-2 px-2 text-right tabular-nums ${
                                col.bold  ? `font-black ${ptsCls}` :
                                col.muted ? 'text-gray-400' : 'text-gray-700'
                              }`}>
                                {col.render(row)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 bg-gray-100 font-black">
                          <td className="py-2 px-3 sticky left-0 bg-gray-100 text-[10px] text-gray-400 uppercase">Team</td>
                          {STAT_COLS.map(col => {
                            const tot = label === teamName ? ourTot : oppTot;
                            return (
                              <td key={col.label} className={`py-2 px-2 text-right tabular-nums ${
                                col.bold ? ptsCls : col.muted ? 'text-gray-400' : 'text-gray-700'
                              }`}>
                                {col.render(tot)}
                              </td>
                            );
                          })}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Feed tab */}
        {activeTab === 'feed' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-gray-900 text-sm">All Plays</h3>
              <span className="text-xs text-gray-400">{game.play_log?.length || 0} entries</span>
            </div>
            <div className="py-2">
              <ActivityFeed plays={game.play_log || []} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}