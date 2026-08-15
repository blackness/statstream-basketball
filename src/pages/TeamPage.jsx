import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { aggregateSeasonStats, fmtPct } from '../utils/statsHelpers';
import ActivityFeed from '../components/Shared/ActivityFeed';
import { ArrowLeft, LogIn, Trophy, Calendar, Users } from 'lucide-react';

const STAT_RANKINGS = [
  { key: 'pts', label: 'Points',   unit: 'PPG',  source: 'avg' },
  { key: 'reb', label: 'Rebounds', unit: 'RPG',  source: 'avg' },
  { key: 'ast', label: 'Assists',  unit: 'APG',  source: 'avg' },
  { key: 'pts', label: 'PTS Tot',  unit: 'PTS',  source: 'totals' },
  { key: 'fg',  label: 'FG%',      unit: 'FG%',  source: 'pct'  },
  { key: 'tp',  label: '3PT%',     unit: '3P%',  source: 'pct'  },
];

const formatDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function TeamPage() {
  const { slug }    = useParams();
  const navigate    = useNavigate();
  const [team,      setTeam]      = useState(null);
  const [games,     setGames]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('leaders');
  const [liveGame,  setLiveGame]  = useState(null);

  useEffect(() => {
    loadTeam();
  }, [slug]);

  useEffect(() => {
    if (!team) return;

    const ch = supabase
      .channel(`team-page-${team.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `team_id=eq.${team.id}` },
        ({ new: n }) => {
          setGames(prev => prev.map(g => g.id === n.id ? n : g));
          if (n.status === 'in_progress') setLiveGame(n);
          else if (liveGame?.id === n.id)  setLiveGame(null);
        }
      ).subscribe();

    return () => supabase.removeChannel(ch);
  }, [team]);

  const loadTeam = async () => {
    try {
      // Support both slug and UUID id as fallback
      const isUUID = /^[0-9a-f-]{36}$/i.test(slug);
      const q      = supabase.from('teams').select('*, players:players(*)');
      const { data: teamData, error: te } = await (isUUID
        ? q.eq('id', slug) : q.eq('slug', slug)).single();

      if (te) throw te;

      const team = { ...teamData, roster: teamData.players || [] };
      setTeam(team);

      const { data: gamesData, error: ge } = await supabase
        .from('games')
        .select('*')
        .eq('team_id', team.id)
        .order('created_at', { ascending: false });

      if (ge) throw ge;
      setGames(gamesData || []);
      setLiveGame(gamesData?.find(g => g.status === 'in_progress') || null);
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

  if (!team) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="font-black text-gray-400 text-lg">Team not found</p>
        <button onClick={() => navigate('/')} className="mt-4 text-blue-600 font-bold text-sm">
          ← Back to home
        </button>
      </div>
    </div>
  );

  const completedGames = games.filter(g => g.status === 'completed');
  const isHome         = (game) => game.home_team === team.name;
  const ourScore       = (game) => isHome(game) ? game.home_score : game.away_score;
  const oppScore       = (game) => isHome(game) ? game.away_score : game.home_score;

  // Season stats
  const seasonStats = aggregateSeasonStats(completedGames, team.roster || []);
  const sorted      = {
    pts: [...seasonStats].sort((a, b) => b.avg.pts - a.avg.pts),
    reb: [...seasonStats].sort((a, b) => b.avg.reb - a.avg.reb),
    ast: [...seasonStats].sort((a, b) => b.avg.ast - a.avg.ast),
  };

  const TABS = [
    { key: 'leaders', label: 'Leaders' },
    { key: 'stats',   label: 'Stats'   },
    { key: 'games',   label: `Games (${completedGames.length})` },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition"
          >
            <ArrowLeft size={16} /> Home
          </button>
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition"
          >
            <LogIn size={14} /> Sign In
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5 pb-16">

        {/* Team header */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-3xl font-black flex-shrink-0">
              {team.name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black truncate">{team.name}</h1>
              {team.coach && (
                <p className="text-sm text-white/60 mt-0.5">Coach: {team.coach}</p>
              )}
              {team.league && (
                <p className="text-xs text-white/40 mt-0.5">{team.league}{team.division ? ` · ${team.division}` : ''}</p>
              )}
            </div>
          </div>

          {/* Record strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Wins',    value: team.wins    || 0 },
              { label: 'Losses',  value: team.losses  || 0 },
              { label: 'Players', value: team.roster?.length || 0 },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-black">{value}</p>
                <p className="text-xs text-white/50 font-bold mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Live game banner */}
        {liveGame && (
          <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500 text-white text-xs font-black rounded-lg">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  LIVE NOW · Q{liveGame.period || 1}
                </span>
              </div>
              <div className="flex items-center">
                <div className="flex-1 text-center">
                  <p className="text-xs text-gray-500 font-bold mb-2">{team.name}</p>
                  <p className="text-6xl font-black text-white tabular-nums leading-none">
                    {ourScore(liveGame)}
                  </p>
                </div>
                <div className="px-4 text-gray-700 font-black text-2xl">—</div>
                <div className="flex-1 text-center">
                  <p className="text-xs text-gray-500 font-bold mb-2">{liveGame.opponent}</p>
                  <p className="text-6xl font-black text-white tabular-nums leading-none">
                    {oppScore(liveGame)}
                  </p>
                </div>
              </div>

              {/* Last play */}
              {liveGame.play_log?.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-800">
                  <ActivityFeed plays={liveGame.play_log} maxShown={3} compact />
                </div>
              )}
            </div>
            <div className="border-t border-gray-800">
              <button
                onClick={() => navigate(`/game/${liveGame.id}`)}
                className="w-full py-3 text-xs font-bold text-yellow-400 hover:bg-gray-800 transition"
              >
                Watch Live →
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1 gap-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${
                activeTab === tab.key
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Leaders Tab */}
        {activeTab === 'leaders' && (
          <div className="space-y-4">
            {seasonStats.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <Trophy size={36} className="mx-auto text-gray-300 mb-3" />
                <p className="font-black text-gray-400">No stats yet</p>
                <p className="text-xs text-gray-300 mt-1">Complete a game to see leaders</p>
              </div>
            ) : (
              <>
                {[
                  { title: 'Points Per Game', key: 'pts', unit: 'PPG', data: sorted.pts },
                  { title: 'Rebounds Per Game', key: 'reb', unit: 'RPG', data: sorted.reb },
                  { title: 'Assists Per Game',  key: 'ast', unit: 'APG', data: sorted.ast },
                ].map(({ title, key, unit, data }) => (
                  <div key={title} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-50">
                      <h3 className="font-black text-gray-900 text-sm">{title}</h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {data.slice(0, 5).map((entry, i) => (
                        <div key={entry.player.id} className="flex items-center gap-4 px-5 py-3">
                          <span className={`w-6 text-center font-black text-sm flex-shrink-0 ${
                            i === 0 ? 'text-yellow-500' :
                            i === 1 ? 'text-gray-400' :
                            i === 2 ? 'text-orange-500' : 'text-gray-300'
                          }`}>
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-gray-900 text-sm truncate">
                              {entry.player.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              #{entry.player.number || '—'} · {entry.gp} GP
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-2xl font-black text-blue-600 tabular-nums leading-none">
                              {entry.avg[key]}
                            </p>
                            <p className="text-[10px] text-gray-400 font-bold">{unit}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Shooting leaders */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-50">
                    <h3 className="font-black text-gray-900 text-sm">Shooting</h3>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-gray-50">
                    {[
                      { label: 'FG%', key: 'fg' },
                      { label: '3P%', key: 'tp' },
                      { label: 'FT%', key: 'ft' },
                    ].map(({ label, key }) => {
                      const best = [...seasonStats]
                        .filter(s => s.totals.fga > 5)
                        .sort((a, b) => {
                          const parse = v => v === '—' ? 0 : parseInt(v);
                          return parse(b[key]) - parse(a[key]);
                        })[0];
                      return (
                        <div key={label} className="p-4 text-center">
                          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">{label}</p>
                          {best ? (
                            <>
                              <p className="text-2xl font-black text-blue-600">{best[key]}</p>
                              <p className="text-xs text-gray-500 font-bold mt-1 truncate">{best.player.name.split(' ')[0]}</p>
                            </>
                          ) : (
                            <p className="text-gray-300 font-bold">—</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {seasonStats.length === 0 ? (
              <div className="text-center py-16">
                <p className="font-black text-gray-400">No stats yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="text-xs min-w-max w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left py-3 px-4 font-bold text-gray-500 sticky left-0 bg-gray-50 min-w-[140px]">
                        Player
                      </th>
                      {[
                        { l: 'GP' }, { l: 'MIN' }, { l: 'PPG', bold: true },
                        { l: 'RPG' }, { l: 'APG' }, { l: 'FG%', muted: true },
                        { l: '3P%', muted: true }, { l: 'FT%', muted: true },
                        { l: 'STL' }, { l: 'BLK' }, { l: 'TO' },
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
                          <span className="text-gray-400 font-mono text-[10px] mr-2">#{entry.player.number || '—'}</span>
                          <span className="font-bold text-gray-900">{entry.player.name}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-500">{entry.gp}</td>
                        <td className="py-2.5 px-3 text-right text-gray-500">{entry.avg.min}</td>
                        <td className="py-2.5 px-3 text-right font-black text-blue-600">{entry.avg.pts}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{entry.avg.reb}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{entry.avg.ast}</td>
                        <td className="py-2.5 px-3 text-right text-gray-400">{entry.fg}</td>
                        <td className="py-2.5 px-3 text-right text-gray-400">{entry.tp}</td>
                        <td className="py-2.5 px-3 text-right text-gray-400">{entry.ft}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{entry.avg.stl}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{entry.avg.blk}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700">{entry.avg.to}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Games Tab */}
        {activeTab === 'games' && (
          <div className="space-y-3">
            {completedGames.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <Calendar size={36} className="mx-auto text-gray-300 mb-3" />
                <p className="font-black text-gray-400">No games yet</p>
              </div>
            ) : (
              completedGames.map(game => {
                const ours   = ourScore(game);
                const opp    = oppScore(game);
                const isWin  = ours > opp;
                const isLoss = ours < opp;
                return (
                  <button
                    key={game.id}
                    onClick={() => navigate(`/game/${game.id}`)}
                    className={`w-full text-left bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-all border ${
                      isWin  ? 'border-l-4 border-l-emerald-400 border-gray-100' :
                      isLoss ? 'border-l-4 border-l-red-400    border-gray-100' :
                               'border-gray-100'
                    }`}
                  >
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="w-8 text-center flex-shrink-0">
                        <p className={`text-lg font-black leading-none ${
                          isWin ? 'text-emerald-500' : isLoss ? 'text-red-500' : 'text-gray-300'
                        }`}>
                          {isWin ? 'W' : isLoss ? 'L' : 'D'}
                        </p>
                        <p className="text-[9px] text-gray-400 mt-0.5">{formatDate(game.created_at)}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-900 text-sm truncate">vs {game.opponent}</p>
                        {game.game_settings?.location && (
                          <p className="text-xs text-gray-400">{game.game_settings.location}</p>
                        )}
                      </div>
                      <p className={`text-xl font-black tabular-nums flex-shrink-0 ${
                        isWin ? 'text-emerald-600' : isLoss ? 'text-red-500' : 'text-gray-600'
                      }`}>
                        {ours}–{opp}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}