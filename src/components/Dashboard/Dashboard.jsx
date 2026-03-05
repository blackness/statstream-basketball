import React from 'react';
import AppHeader from '../Shared/AppHeader';
import { Plus, Play } from 'lucide-react';

const Dashboard = ({ 
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

  return (
    <div className="h-screen w-full bg-gray-50 flex flex-col overflow-hidden">
      
      <AppHeader
        title="Dashboard"
        isDashboard={true}
        onDashboard={() => {}}
        userEmail={user?.email}
      />
      
      {/* Action Bar */}
      <div className="w-full bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex gap-3">
          <button
            onClick={onNewTeam}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition"
          >
            <Plus size={18} />
            New Team
          </button>
          <button
            onClick={onNewGame}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition"
          >
            <Play size={18} />
            Start Game
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 w-full overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
              <div className="text-4xl font-black text-blue-600 mb-2">{teams.length}</div>
              <div className="text-gray-600 font-bold">Teams</div>
            </div>
            <div className="bg-white rounded-xl p-6 border-2 border-yellow-300">
              <div className="text-4xl font-black text-yellow-600 mb-2">{liveGames.length}</div>
              <div className="text-gray-600 font-bold">Live Games</div>
            </div>
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
              <div className="text-4xl font-black text-gray-900 mb-2">{completedGames.length}</div>
              <div className="text-gray-600 font-bold">Completed</div>
            </div>
          </div>

          {/* Teams */}
          {teams.length > 0 && (
            <section>
              <h2 className="text-2xl font-black mb-4">My Teams</h2>
              <div className="space-y-3">
                {teams.map(team => (
                  <div key={team.id} className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg">{team.name}</h3>
                        <p className="text-sm text-gray-600">
                          {team.roster?.length || 0} players
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEditTeam(team)}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onManageRoster(team)}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition"
                        >
                          Roster
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {teams.length === 0 && (
            <div className="text-center py-16">
              <h3 className="text-2xl font-bold mb-3">No teams yet</h3>
              <p className="text-gray-600 mb-6">Create your first team to get started!</p>
              <button
                onClick={onNewTeam}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition"
              >
                Create First Team
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;