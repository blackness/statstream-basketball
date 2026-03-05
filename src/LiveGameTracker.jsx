import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Dashboard from './components/Dashboard/Dashboard';

const LiveGameTracker = ({ user, toast }) => {
  const [teams, setTeams] = useState([]);
  const [gameHistory, setGameHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load teams and games
  useEffect(() => {
    if (user) {
      loadTeamsAndGames();
    }
  }, [user]);

  const loadTeamsAndGames = async () => {
    try {
      setLoading(true);

      // Load teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });

      if (teamsError) throw teamsError;

      // Load games
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .order('created_at', { ascending: false });

      if (gamesError) throw gamesError;

      setTeams(teamsData || []);
      setGameHistory(gamesData || []);
      
    } catch (err) {
      console.error('Error loading data:', err);
      toast?.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleNewTeam = () => {
    toast?.info('Create team feature coming next!');
  };

  const handleNewGame = () => {
    toast?.info('Start game feature coming next!');
  };

  const handleEditTeam = (team) => {
    toast?.info('Edit team feature coming next!');
  };

  const handleManageRoster = (team) => {
    toast?.info('Manage roster feature coming next!');
  };

  const handleResumeGame = (game) => {
    toast?.info('Resume game feature coming next!');
  };

  const handleViewStats = (game) => {
    toast?.info('View stats feature coming next!');
  };

  const handleDeleteGame = async (game) => {
    if (!confirm('Delete this game?')) return;

    try {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', game.id);

      if (error) throw error;

      toast?.success('Game deleted!');
      loadTeamsAndGames();
    } catch (err) {
      console.error('Error deleting game:', err);
      toast?.error('Failed to delete game');
    }
  };

  const handleEndGame = async (game) => {
    if (!confirm('End this game?')) return;

    try {
      const { error } = await supabase
        .from('games')
        .update({ status: 'completed' })
        .eq('id', game.id);

      if (error) throw error;

      toast?.success('Game ended!');
      loadTeamsAndGames();
    } catch (err) {
      console.error('Error ending game:', err);
      toast?.error('Failed to end game');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <Dashboard
      user={user}
      teams={teams}
      gameHistory={gameHistory}
      onNewTeam={handleNewTeam}
      onNewGame={handleNewGame}
      onEditTeam={handleEditTeam}
      onManageRoster={handleManageRoster}
      onResumeGame={handleResumeGame}
      onViewStats={handleViewStats}
      onDeleteGame={handleDeleteGame}
      onEndGame={handleEndGame}
      toast={toast}
    />
  );
};

export default LiveGameTracker;