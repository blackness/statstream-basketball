import React from 'react';
import AppHeader from '../Shared/AppHeader';
import SplitView from './SplitView';

const Dashboard = ({
  user, teams = [], gameHistory = [], canManage,
  onNewTeam, onNewGame, onEditTeam, onManageRoster,
  onResumeGame, onStartScheduled, onViewStats,
  onDeleteGame, onEndGame, onRefresh, toast, onSeasonStats,
}) => (
  <div className="h-screen w-full bg-gray-50 flex flex-col overflow-hidden">
    <AppHeader title="Dashboard" isDashboard={true} onDashboard={() => {}} userEmail={user?.email} />
    <div className="flex-1 overflow-hidden">
      <SplitView
        user={user} teams={teams} gameHistory={gameHistory} canManage={canManage}
        onNewTeam={onNewTeam} onNewGame={onNewGame} onEditTeam={onEditTeam}
        onManageRoster={onManageRoster} onResumeGame={onResumeGame}
        onStartScheduled={onStartScheduled} onViewStats={onViewStats}
        onDeleteGame={onDeleteGame} onEndGame={onEndGame}
        onRefresh={onRefresh} toast={toast}
        onSeasonStats={onSeasonStats}
      />
    </div>
  </div>
);
export default Dashboard;