import React from 'react';
import AppHeader from '../Shared/AppHeader';
import SplitView from './SplitView';

const Dashboard = ({ 
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
  toast
}) => {
  return (
    <div className="h-screen w-full bg-gray-50 flex flex-col overflow-hidden">
      
      <AppHeader
        title="Dashboard"
        isDashboard={true}
        onDashboard={() => {}}
        userEmail={user?.email}
      />
      
      <div className="flex-1 overflow-hidden">
        <SplitView
          user={user}
          teams={teams}
          gameHistory={gameHistory}
          isSuperUser={isSuperUser}
          showMyTeams={showMyTeams}
          onToggleMyTeams={onToggleMyTeams}
          onSignIn={onSignIn}
          onNewTeam={onNewTeam}
          onNewGame={onNewGame}
          onEditTeam={onEditTeam}
          onManageRoster={onManageRoster}
          onResumeGame={onResumeGame}
          onViewStats={onViewStats}
          onDeleteGame={onDeleteGame}
          onEndGame={onEndGame}
          toast={toast}
        />
      </div>
    </div>
  );
};

export default Dashboard;