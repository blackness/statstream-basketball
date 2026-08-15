import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { useAuth } from '../services/AuthContext';
import { LogIn, Calendar, Trophy } from 'lucide-react';

const GRADIENTS = [
  'from-blue-500 to-blue-700', 'from-purple-500 to-purple-700',
  'from-emerald-500 to-emerald-700', 'from-orange-500 to-orange-700',
  'from-rose-500 to-rose-700', 'from-indigo-500 to-indigo-700',
];
const gradient = (name = '') =>
  GRADIENTS[(name.charCodeAt(0) || 0) % GRADIENTS.length];

const formatDate = (iso) => {
  if (!iso) return '';
  const d    = new Date(iso);
  const days = Math.floor((Date.now() - d) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const fmtScheduled = (iso) => {
  if (!iso) return 'TBD';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

export default function PublicHome() {
  const navigate        = useNavigate();
  const { user }        = useAuth();
  const [teams,   setTeams]   = useState([]);
  const [games,   setGames]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [selTeam, setSelTeam] = useState(null);

  useEffect(() => {
    loadData();

    const ch = supabase
      .channel('pub-home-games')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'games' },
        ({ eventType, new: n, old: o }) => {
          if (eventType === 'INSERT') setGames(p => [n, ...p]);
          else if (eventType === 'UPDATE') setGames(p => p.map(g => g.id === n.id ? n : g));
          else if (eventType === 'DELETE') setGames(p => p.filter(g => g.id !== o.id));
        }
      ).subscribe();

    return () => supabase.removeChannel(ch);
  }, []);

  const loadData = async () => {
    try {
      const [tr, gr] = await Promise.all([
        supabase.from('teams').select('*, players:players(*)').eq('archived', false).order('created_at', { ascending: false }),
        supabase.from('games').select('*').order('created_at', { ascending: false }).limit(100),
      ]);
      setTeams((tr.data || []).map(t => ({ ...t, roster: t.players || [] })));
      setGames(gr.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const getTeam    = id => teams.find(t => t.id === id);
  const getScore   = (game) => {
    const t      = getTeam(game.team_id);
    const isHome = game.home_team === t?.name;
    return {
      ours: isHome ? (game.home_score || 0) : (game.away_score || 0),
      opp:  isHome ? (game.away_score || 0) : (game.home_score || 0),
    };
  };

  const allGames   = selTeam ? games.filter(g => g.team_id === selTeam) : games;
  const live       = allGames.filter(g => g.status === 'in_progress');
  const scheduled  = allGames.filter(g => g.status === 'scheduled');
  const history    = allGames.filter(g => g.status === 'completed');

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">SS</span>
            </div>
            <span className="font-black text-gray-900 text-lg">StatStream</span>
            {live.length > 0 && (
              <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full border border-red-100">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                {live.length} Live
              </span>
            )}
          </div>
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition active:scale-95"
          >
            <LogIn size={14} />
            {user ? 'Dashboard' : 'Sign In'}
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Left: Teams ── */}
          <div className="lg:w-[300px] xl:w-[340px] flex-shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-gray-900">Teams</h2>
              <span className="text-xs text-gray-400">{teams.length}</span>
            </div>

            <button
              onClick={() => setSelTeam(null)}
              className={`w-full px-3 py-2 rounded-xl text-sm font-bold transition text-left ${
                !selTeam ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-100'
              }`}
            >
              All Teams
            </button>

            {teams.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <Trophy size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No teams yet</p>
              </div>
            ) : (
              teams.map(team => (
                <div
                  key={team.id}
                  className={`bg-white rounded-2xl border-2 overflow-hidden transition ${
                    selTeam === team.id
                      ? 'border-blue-500 shadow-md shadow-blue-100'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <button
                    onClick={() => setSelTeam(selTeam === team.id ? null : team.id)}
                    className="w-full flex items-center gap-3 p-3 text-left"
                  >
                    <div className={`w-10 h-10 bg-gradient-to-br ${gradient(team.name)} rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0`}>
                      {team.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900 text-sm truncate">{team.name}</p>
                      <p className="text-xs text-gray-400 tabular-nums">
                        {team.wins || 0}–{team.losses || 0}
                        <span className="mx-1 text-gray-200">·</span>
                        {team.roster?.length || 0} players
                      </p>
                    </div>
                  </button>
                  <div className="border-t border-gray-50">
                    <button
                      onClick={() => navigate(`/team/${team.slug || team.id}`)}
                      className="w-full py-2 text-xs font-bold text-blue-500 hover:bg-blue-50 transition"
                    >
                      View Team →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── Right: Games ── */}
          <div className="flex-1 space-y-6 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-gray-900">Games</h2>
              <p className="text-xs text-gray-400">
                {live.length > 0 && <span className="text-red-500 font-bold">{live.length} live · </span>}
                {history.length} completed
              </p>
            </div>

            {/* Live */}
            {live.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Live Now</span>
                </div>
                {live.map(game => {
                  const team       = getTeam(game.team_id);
                  const { ours, opp } = getScore(game);
                  return (
                    <div key={game.id} className="bg-gray-900 rounded-2xl overflow-hidden shadow-xl">
                      <div className="px-5 pt-5 pb-4">
                        <div className="flex items-center justify-between mb-4">
                          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500 text-white text-xs font-black rounded-lg">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            LIVE · Q{game.period || 1}
                          </span>
                          {game.game_settings?.location && (
                            <span className="text-xs text-gray-500 truncate ml-3">
                              {game.game_settings.location}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center">
                          <div className="flex-1 text-center">
                            <p className="text-xs text-gray-500 font-bold mb-2 truncate px-2">{team?.name}</p>
                            <p className="text-6xl font-black text-white tabular-nums leading-none">{ours}</p>
                          </div>
                          <div className="px-4 text-gray-700 font-black text-2xl">—</div>
                          <div className="flex-1 text-center">
                            <p className="text-xs text-gray-500 font-bold mb-2 truncate px-2">{game.opponent}</p>
                            <p className="text-6xl font-black text-white tabular-nums leading-none">{opp}</p>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-gray-800">
                        <button
                          onClick={() => navigate(`/game/${game.id}`)}
                          className="w-full py-3 text-xs font-bold text-yellow-400 hover:bg-gray-800 transition"
                        >
                          Watch Live →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Scheduled */}
            {scheduled.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Upcoming</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                {scheduled.map(game => {
                  const team = getTeam(game.team_id);
                  return (
                    <div key={game.id} className="bg-white rounded-2xl border-2 border-dashed border-blue-200 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-black rounded-lg">UPCOMING</span>
                        <span className="text-xs text-gray-400">{fmtScheduled(game.scheduled_at)}</span>
                      </div>
                      <p className="font-black text-gray-900">
                        {team?.name}
                        <span className="text-gray-400 font-normal text-sm mx-2">vs</span>
                        {game.opponent}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">History</span>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-300">{history.length}</span>
                </div>
                {history.map(game => {
                  const team       = getTeam(game.team_id);
                  const { ours, opp } = getScore(game);
                  const isWin      = ours > opp;
                  const isLoss     = ours < opp;
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
                          <p className="font-black text-gray-900 text-sm truncate">
                            {team?.name}
                            <span className="text-gray-400 font-normal text-xs mx-1.5">vs</span>
                            {game.opponent}
                          </p>
                          {game.game_type && game.game_type !== 'regular' && (
                            <p className="text-xs text-gray-400 capitalize">{game.game_type}</p>
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
                })}
              </div>
            )}

            {allGames.length === 0 && (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="font-black text-gray-400">No games yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}