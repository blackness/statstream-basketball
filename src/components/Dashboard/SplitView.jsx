import React from 'react';
import { Play, Trophy, Calendar, Users, Edit, Trash2, Plus, MapPin } from 'lucide-react';

const SplitView = ({ 
  user,
  teams = [], 
  gameHistory = [],
  onNewTeam,
  onNewGame,
  onEditTeam,
  onManageRoster,
  onResumeGame,
  onViewStats,
  onDeleteGame,
  onEndGame,
  toast
}) => {
  const liveGames = gameHistory.filter(g => g.status === 'in-progress');
  const completedGames = gameHistory.filter(g => g.status === 'completed');

  const getTeamName = (teamId) => {
    return teams.find(t => t.id === teamId)?.name || 'Unknown Team';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recently';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      
      {/* LEFT COLUMN: TEAMS */}
      <div className="flex flex-col space-y-4 overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between sticky top-0 bg-gray-50 pb-4 z-10">
          <h2 className="text-2xl font-black text-gray-900">Teams</h2>
          <button
            onClick={onNewTeam}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition shadow-sm active:scale-95"
          >
            <Plus size={18} />
            New Team
          </button>
        </div>

        {/* Teams List */}
        {teams.length > 0 ? (
          <div className="space-y-3">
            {teams.map(team => (
              <div key={team.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-md transition">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-md flex-shrink-0">
                    {team.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-black text-lg text-gray-900 truncate">{team.name}</h3>
                      {team.visibility === 'public' && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded uppercase">
                          Public
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        {team.roster?.length || 0} players
                      </span>
                      {(team.wins !== undefined || team.losses !== undefined) && (
                        <span className="font-bold text-gray-900">
                          {team.wins || 0}-{team.losses || 0}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => onEditTeam(team)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-sm transition"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() => onManageRoster(team)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition"
                  >
                    <Users size={16} />
                    Roster
                  </button>
                </div>

                {team.coach && (
                  <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600">
                    Coach: <span className="font-semibold text-gray-900">{team.coach}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-12">
              <Trophy size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Teams Yet</h3>
              <p className="text-gray-600 mb-6">Create your first team to get started!</p>
              <button
                onClick={onNewTeam}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-md"
              >
                Create First Team
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: GAMES */}
      <div className="flex flex-col space-y-4 overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between sticky top-0 bg-gray-50 pb-4 z-10">
          <h2 className="text-2xl font-black text-gray-900">Games</h2>
          <button
            onClick={onNewGame}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition shadow-sm active:scale-95"
          >
            <Play size={18} />
            Start Game
          </button>
        </div>

        {/* Live Games */}
        {liveGames.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <h3 className="text-sm font-black text-yellow-800 uppercase tracking-wide">
                Live Now ({liveGames.length})
              </h3>
            </div>
            
            {liveGames.map(game => (
              <div key={game.id} className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-400 rounded-xl p-4 shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-yellow-800 bg-yellow-200 px-2 py-1 rounded uppercase">
                        Q{game.period || 1}
                      </span>
                      {game.game_settings?.location && (
                        <span className="text-xs text-gray-600 flex items-center gap-1">
                          <MapPin size={12} />
                          {game.game_settings.location}
                        </span>
                      )}
                    </div>
                    <div className="font-black text-gray-900 text-lg mb-1">
                      {getTeamName(game.team_id)} vs {game.opponent}
                    </div>
                    <div className="text-3xl font-black text-gray-900 tabular-nums">
                      {game.home_score || 0} - {game.away_score || 0}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => onViewStats(game)}
                    className="flex-1 px-4 py-2 bg-white/80 hover:bg-white text-gray-700 rounded-lg font-bold text-sm transition"
                  >
                    Stats
                  </button>
                  <button
                    onClick={() => onResumeGame(game)}
                    className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-bold text-sm transition flex items-center justify-center gap-2"
                  >
                    <Play size={16} fill="currentColor" />
                    RESUME
                  </button>
                  <button
                    onClick={() => onEndGame(game)}
                    className="px-4 py-2 bg-white/80 hover:bg-white border border-gray-300 text-gray-700 rounded-lg font-bold text-sm transition"
                  >
                    End
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Completed Games */}
        <div className="space-y-3">
          <h3 className="text-sm font-black text-gray-500 uppercase tracking-wide">
            Game History ({completedGames.length})
          </h3>
          
          {completedGames.length > 0 ? (
            <div className="space-y-2">
              {completedGames.map(game => {
                const isWin = game.home_score > game.away_score;
                const isLoss = game.home_score < game.away_score;
                
                return (
                  <div key={game.id} className="bg-white border-2 border-gray-100 rounded-xl p-3 hover:border-blue-200 transition">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex flex-col items-center justify-center min-w-[50px]">
                          {isWin ? (
                            <span className="text-emerald-600 font-black text-xs">WIN</span>
                          ) : isLoss ? (
                            <span className="text-red-500 font-black text-xs">LOSS</span>
                          ) : (
                            <span className="text-gray-400 font-black text-xs">DRAW</span>
                          )}
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                            {formatDate(game.created_at)}
                          </span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm mb-1">
                            <span className="font-black text-gray-900 truncate">
                              {getTeamName(game.team_id)}
                            </span>
                            <span className="text-gray-300 font-bold text-xs">vs</span>
                            <span className="font-black text-gray-600 truncate">
                              {game.opponent}
                            </span>
                          </div>
                          <div className="bg-gray-900 text-white px-2 py-1 rounded font-black text-sm tabular-nums inline-block">
                            {game.home_score || 0} - {game.away_score || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => onDeleteGame(game)}
                        className="p-2 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded transition"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        onClick={() => onViewStats(game)}
                        className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-xs transition"
                      >
                        Stats
                      </button>
                      <button
                        onClick={() => onResumeGame(game)}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition"
                      >
                        Resume
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <Calendar size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600 text-sm">No games yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SplitView;