import React, { useState } from 'react';
import TeamPanel from './TeamPanel';
import GamePanel from './GamePanel';

const SplitView = ({
  user,
  teams = [],
  gameHistory = [],
  canManage,
  onNewTeam,
  onNewGame,
  onEditTeam,
  onManageRoster,
  onResumeGame,
  onViewStats,
  onDeleteGame,
  onEndGame,
  onStartScheduled,
  onRefresh,
  toast,
  onSeasonStats,
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [mobileTab,      setMobileTab]      = useState('teams');

  const handleSelectTeam = (team) => {
    setSelectedTeamId(team ? team.id : null);
    if (team) setMobileTab('games'); // auto-switch on mobile
  };

  const filteredGames = selectedTeamId
    ? gameHistory.filter(g => g.team_id === selectedTeamId)
    : gameHistory;

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">

      {/* Mobile tab bar */}
      <div className="lg:hidden flex bg-white border-b border-gray-100 flex-shrink-0">
        {[
          { key: 'teams', label: 'Teams',  count: teams.length },
          { key: 'games', label: 'Games',  count: gameHistory.filter(g => g.status === 'in_progress').length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setMobileTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-black transition border-b-2 ${
              mobileTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400'
            }`}
          >
            {tab.label}
            {tab.count > 0 && tab.key === 'games' && (
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Team Panel */}
      <div className={`
        ${mobileTab === 'teams' ? 'flex' : 'hidden'} lg:flex
        lg:w-[300px] xl:w-[340px] flex-shrink-0
        border-b lg:border-b-0 lg:border-r border-gray-100
        flex-col overflow-hidden bg-white
      `}>
        <TeamPanel
          teams={teams}
          selectedTeamId={selectedTeamId}
          onSelectTeam={handleSelectTeam}
          onNewTeam={onNewTeam}
          onEditTeam={onEditTeam}
          onManageRoster={onManageRoster}
          onNewGame={onNewGame}
          onSeasonStats={onSeasonStats}
        />
      </div>

      {/* Game Panel */}
      <div className={`
        ${mobileTab === 'games' ? 'flex' : 'hidden'} lg:flex
        flex-1 flex-col overflow-hidden bg-gray-50
      `}>
        {selectedTeam && (
          <div className="px-5 py-2 bg-blue-50 border-b border-blue-100 flex-shrink-0 flex items-center justify-between">
            <p className="text-xs font-bold text-blue-600">
              Showing games for <span className="font-black">{selectedTeam.name}</span>
            </p>
            <button
              onClick={() => setSelectedTeamId(null)}
              className="text-xs text-blue-400 hover:text-blue-700 font-bold transition"
            >
              Clear filter
            </button>
          </div>
        )}
        <GamePanel
          games={filteredGames}
          teams={teams}
          user={user}
          canManage={canManage}
          onResumeGame={onResumeGame}
          onViewStats={onViewStats}
          onDeleteGame={onDeleteGame}
          onEndGame={onEndGame}
          onStartScheduled={onStartScheduled}
          onNewGame={onNewGame}
          onRefresh={onRefresh}
          toast={toast}
        />
      </div>
    </div>
  );
};

export default SplitView;