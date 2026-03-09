import React, { useState, useEffect } from 'react';
import { Play, Trophy, Calendar, Plus, Zap } from 'lucide-react';

// Countdown clock that syncs from DB time_remaining + updated_at drift
const LiveClock = ({ timeRemaining, updatedAt, timerRunning }) => {
  const calcTime = () => {
    if (timeRemaining == null) return null;
    if (!timerRunning) return timeRemaining; // frozen
    const elapsed = updatedAt
      ? Math.floor((Date.now() - new Date(updatedAt).getTime()) / 1000)
      : 0;
    return Math.max(0, timeRemaining - elapsed);
  };

  const [seconds, setSeconds] = useState(calcTime);

  // Re-sync when game data updates (new stat, timer toggle, autosave)
  useEffect(() => {
    setSeconds(calcTime());
  }, [timeRemaining, updatedAt, timerRunning]);

  // Tick locally only when running
  useEffect(() => {
    if (!timerRunning || seconds === null || seconds <= 0) return;
    const t = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [timerRunning, seconds]);

  if (seconds === null) return null;
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toString().padStart(2, '0');
  return (
    <span className={`text-[9px] font-bold tabular-nums ${timerRunning ? 'text-white/60' : 'text-white/35'}`}>
      {m}:{s}
    </span>
  );
};

const SplitView = ({
  user,
  teams = [],
  gameHistory = [],
  isSuperUser = false,
  showMyTeams = true,
  onToggleMyTeams,
  onSignIn,
  onNewTeam,
  onNewGame,
  onEditTeam,
  onManageRoster,
  onResumeGame,
  onViewStats,
  onDeleteGame,
  onEndGame,
  onSelectTeam,
  toast
}) => {
  const [filterTeamId, setFilterTeamId] = useState(null);

  const handleTeamClick = (team) => {
    setFilterTeamId(prev => prev === team.id ? null : team.id);
  };

  const canEdit = (game) => isSuperUser || (user && game.user_id === user.id);
  const canEditTeam = (team) => isSuperUser || (user && team.user_id === user.id);

  const filteredHistory = filterTeamId
    ? gameHistory.filter(g => g.team_id === filterTeamId)
    : gameHistory;

  const liveGames = filteredHistory.filter(g => g.status === 'in-progress');
  const completedGames = filteredHistory.filter(g => g.status === 'completed');

  const getTeamName = (teamId) => {
    return teams.find(t => t.id === teamId)?.name || 'Unknown Team';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getTopScorer = (game) => {
    if (!game.stats) return null;
    let top = null;
    let topPts = 0;
    Object.entries(game.stats).forEach(([playerId, stats]) => {
      if ((stats.pts || 0) > topPts) {
        topPts = stats.pts;
        top = { playerId, pts: stats.pts };
      }
    });
    if (!top) return null;
    for (const team of teams) {
      const player = team.roster?.find(p => p.id === top.playerId);
      if (player) {
        const parts = player.name.split(' ');
        const short = parts.length > 1 ? `${parts[0][0]}. ${parts[parts.length - 1]}` : player.name;
        return `${short} ${top.pts} PTS`;
      }
    }
    return `${top.pts} PTS`;
  };

  const getMyScore = (game) =>
    game.game_settings?.isHome ? (game.home_score || 0) : (game.away_score || 0);

  const getTheirScore = (game) =>
    game.game_settings?.isHome ? (game.away_score || 0) : (game.home_score || 0);

  const TEAM_GRADIENTS = [
    'from-blue-700 to-blue-500',
    'from-emerald-700 to-emerald-500',
    'from-violet-700 to-violet-500',
    'from-orange-700 to-orange-500',
    'from-rose-700 to-rose-500',
    'from-cyan-700 to-cyan-500',
  ];

  const TEAM_SOLIDS = ['#1d4ed8','#047857','#6d28d9','#c2410c','#be123c','#0e7490'];

  const getTeamGradient = (teamId) => {
    const idx = teams.findIndex(t => t.id === teamId);
    const safeIdx = idx >= 0 ? idx : Math.abs(teamId?.charCodeAt(0) || 0);
    return TEAM_GRADIENTS[safeIdx % TEAM_GRADIENTS.length];
  };

  const getTeamSolid = (teamId) => {
    const idx = teams.findIndex(t => t.id === teamId);
    const safeIdx = idx >= 0 ? idx : Math.abs(teamId?.charCodeAt(0) || 0);
    return TEAM_SOLIDS[safeIdx % TEAM_SOLIDS.length];
  };

  return (
    <div className="h-full flex overflow-hidden bg-gray-100">

      {/* ══ LEFT 30% · TEAMS ══ */}
      <div className="w-[30%] min-w-[200px] max-w-[320px] flex flex-col border-r-2 border-gray-300 bg-gray-50">

        <div className="flex items-center justify-between px-4 py-3 bg-white border-b-2 border-gray-300">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Teams</span>
          {user && (
            <button
              onClick={onNewTeam}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-black text-[10px] uppercase tracking-wide transition active:scale-95"
            >
              <Plus size={11} strokeWidth={3} />
              New
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {teams.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {teams.map(team => {
                const isSelected = filterTeamId === team.id;
                const isOwn = user && team.user_id === user.id;
                return (
                <button
                  key={team.id}
                  onClick={() => handleTeamClick(team)}
                  className={`group relative border-2 rounded-lg p-3 text-left transition-all active:scale-[0.97] focus:outline-none overflow-hidden ${
                    isSelected
                      ? 'bg-gray-900 border-gray-700'
                      : 'bg-white border-gray-200 hover:border-gray-400'
                  }`}
                  style={{ minHeight: '84px' }}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[3px]"
                    style={{ backgroundColor: getTeamSolid(team.id) }}
                  />
                  <div className="pl-2">
                    <div
                      className="w-7 h-7 rounded flex items-center justify-center text-white font-black text-sm mb-2 shadow-sm"
                      style={{ backgroundColor: getTeamSolid(team.id) }}
                    >
                      {team.name[0]?.toUpperCase()}
                    </div>
                    <div className={`font-black text-[11px] leading-tight truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                      {team.name}
                      {isOwn && <span className="ml-1 text-[8px] font-bold text-gray-400">★</span>}
                    </div>
                    <div className={`text-[9px] font-bold tabular-nums mt-0.5 ${isSelected ? 'text-gray-400' : 'text-gray-400'}`}>
                      {team.wins || 0}W – {team.losses || 0}L
                    </div>
                    {team.sport && (
                      <div className="text-[9px] text-gray-400 uppercase tracking-wide mt-0.5 truncate">{team.sport}</div>
                    )}
                  </div>
                </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-10 text-center px-3">
              <Trophy size={28} className="text-gray-300 mb-2" />
              <p className="text-[11px] font-bold text-gray-400 mb-3">
                {user ? 'No teams yet' : 'No teams available'}
              </p>
              {user ? (
                <button
                  onClick={onNewTeam}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs transition"
                >
                  Create Team
                </button>
              ) : (
                <button
                  onClick={onSignIn}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs transition"
                >
                  Sign In
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══ RIGHT 70% · GAMES ══ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-5 py-3 bg-white border-b-2 border-gray-300">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Games</span>
            {/* Live scores indicator */}
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-50 rounded">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-black text-green-600 uppercase tracking-wide">Live</span>
            </div>
            {filterTeamId && (
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-wide bg-blue-50 px-1.5 py-0.5 rounded">
                {teams.find(t => t.id === filterTeamId)?.name}
              </span>
            )}
            {/* My / All toggle — logged-in users only */}
            {user && (
              <div className="flex items-center rounded-full border border-gray-300 overflow-hidden">
                <button
                  onClick={() => !showMyTeams && onToggleMyTeams()}
                  className={`text-[9px] font-black uppercase tracking-wide px-2.5 py-0.5 transition ${
                    showMyTeams ? 'bg-gray-900 text-white' : 'bg-white text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Mine
                </button>
                <button
                  onClick={() => showMyTeams && onToggleMyTeams()}
                  className={`text-[9px] font-black uppercase tracking-wide px-2.5 py-0.5 transition ${
                    !showMyTeams ? 'bg-gray-900 text-white' : 'bg-white text-gray-400 hover:text-gray-600'
                  }`}
                >
                  All
                </button>
              </div>
            )}
          </div>
          {user ? (
            <button
              onClick={onNewGame}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-black text-[10px] uppercase tracking-wide transition active:scale-95"
            >
              <Play size={11} fill="currentColor" strokeWidth={0} />
              Start Game
            </button>
          ) : (
            <button
              onClick={onSignIn}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-black text-[10px] uppercase tracking-wide transition active:scale-95"
            >
              Sign In
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* LIVE */}
          {liveGames.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-[10px] font-black text-yellow-700 uppercase tracking-widest">
                  Live · {liveGames.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {liveGames.map(game => {
                  const myScore = getMyScore(game);
                  const theirScore = getTheirScore(game);
                  const gradient = getTeamGradient(game.team_id);
                  const myName = getTeamName(game.team_id);
                  const isHome = game.game_settings?.isHome;

                  return (
                    <div
                      key={game.id}
                      className={`relative bg-gradient-to-br ${gradient} rounded-lg shadow-md overflow-hidden`}
                      style={{ minHeight: '84px' }}
                    >
                      <div className="absolute inset-0 opacity-[0.07]"
                        style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '6px 6px' }}
                      />
                      <div className="relative z-10 p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-white/70 uppercase tracking-widest">
                              Q{game.period || 1}
                            </span>
                            <LiveClock timeRemaining={game.time_remaining} updatedAt={game.updated_at} timerRunning={game.timer_running} />
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Zap size={8} className="text-yellow-300 fill-yellow-300" />
                            <span className="text-[8px] font-black text-yellow-300 uppercase">Live</span>
                          </div>
                        </div>
                        <div className="text-white/90 font-bold text-[9px] truncate leading-tight mb-0.5">
                          {isHome ? `${myName} vs ${game.opponent}` : `${myName} @ ${game.opponent}`}
                        </div>
                        <div className="text-white font-black text-lg tabular-nums leading-none mb-2">
                          {myScore} – {theirScore}
                        </div>

                        {/* Last 3 plays */}
                        {game.recent_plays?.length > 0 && (
                          <div className="mb-2 space-y-0.5">
                            {game.recent_plays.slice(0, 3).map((play, i) => (
                              <div key={play.id || i} className={`flex items-center justify-between text-[8px] ${i === 0 ? 'text-white/90' : 'text-white/50'}`}>
                                <span className="truncate font-medium">{play.description}</span>
                                <span className="flex-shrink-0 ml-1 tabular-nums">{play.time}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-1">
                          {canEdit(game) && (
                            <button
                              onClick={() => onResumeGame(game)}
                              className="flex-1 py-1 bg-white/25 hover:bg-white/35 text-white rounded font-black text-[9px] uppercase tracking-wide transition flex items-center justify-center gap-0.5"
                            >
                              <Play size={8} fill="currentColor" strokeWidth={0} />
                              Resume
                            </button>
                          )}
                          {canEdit(game) && (
                            <button
                              onClick={() => onEndGame(game)}
                              className="px-2 py-1 bg-black/20 hover:bg-black/30 text-white/70 rounded font-bold text-[9px] transition"
                            >
                              End
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* HISTORY */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                History · {completedGames.length}
              </span>
            </div>

            {completedGames.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {completedGames.map(game => {
                  const myScore = getMyScore(game);
                  const theirScore = getTheirScore(game);
                  const isWin = myScore > theirScore;
                  const isLoss = myScore < theirScore;
                  const topScorer = getTopScorer(game);
                  const myName = getTeamName(game.team_id);
                  const isHome = game.game_settings?.isHome;
                  const accentColor = isWin ? '#059669' : isLoss ? '#dc2626' : '#9ca3af';

                  return (
                    <div
                      key={game.id}
                      className="relative bg-white border-2 border-gray-200 rounded-lg overflow-hidden"
                      style={{ minHeight: '84px' }}
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 w-[3px]"
                        style={{ backgroundColor: accentColor }}
                      />

                      <div className="pl-3 pr-2.5 pt-2.5 pb-1.5">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: accentColor }}>
                            {isWin ? 'Win' : isLoss ? 'Loss' : 'Draw'}
                          </span>
                          <span className="text-[9px] font-bold text-gray-300 tabular-nums">
                            {formatDate(game.created_at)}
                          </span>
                        </div>

                        <div className="text-[9px] font-bold text-gray-500 truncate leading-tight mb-0.5">
                          {isHome ? `${myName} vs ${game.opponent}` : `${myName} @ ${game.opponent}`}
                        </div>

                        <div className="font-black text-gray-900 text-base tabular-nums leading-none mb-1">
                          {myScore} – {theirScore}
                        </div>

                        {topScorer && (
                          <div className="text-[9px] font-bold text-gray-400 truncate">
                            ★ {topScorer}
                          </div>
                        )}
                      </div>

                      <div className="flex border-t border-gray-100">
                        <button
                          onClick={() => onViewStats(game)}
                          className="flex-1 py-1.5 text-[9px] font-black text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition uppercase tracking-wide"
                        >
                          Boxscore
                        </button>
                        {canEdit(game) && (
                          <button
                            onClick={() => onResumeGame(game)}
                            className="flex-1 py-1.5 text-[9px] font-black text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition border-l border-gray-100 uppercase tracking-wide"
                          >
                            Resume
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 bg-white border-2 border-dashed border-gray-200 rounded-lg">
                <Calendar size={24} className="text-gray-300 mb-2" />
                <p className="text-[11px] font-bold text-gray-400 mb-2">No games yet</p>
                {user && (
                  <button
                    onClick={onNewGame}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs transition"
                  >
                    Start First Game
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitView;
