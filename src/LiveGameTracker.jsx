import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Dashboard from './components/Dashboard/Dashboard';
import CreateTeam from './components/Team/CreateTeam';
import PreGameSetup from './components/Game/PreGameSetup';

const LiveGameTracker = ({ user, toast }) => {
  const [teams, setTeams] = useState([]);
  const [gameHistory, setGameHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('home'); // 'home', 'createTeam', 'gameSetup', 'liveGame'
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [currentGameSettings, setCurrentGameSettings] = useState(null);
  useEffect(() => {
    if (user) {
      loadTeamsAndGames();
    }
  }, [user]);

  
  const loadTeamsAndGames = async () => {
    try {
      setLoading(true);

      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          players:players(*)
        `)
        .order('created_at', { ascending: false });

      if (teamsError) throw teamsError;

      const teamsWithRoster = teamsData?.map(team => ({
        ...team,
        roster: team.players || []
      })) || [];

      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .order('created_at', { ascending: false });

      if (gamesError) throw gamesError;

      setTeams(teamsWithRoster);
      setGameHistory(gamesData || []);
      
    } catch (err) {
      console.error('Error loading data:', err);
      toast?.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (teamData) => {
    try {
      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert([{
          name: teamData.name,
          coach: teamData.coach,
          sport: teamData.sport,
          visibility: teamData.visibility,
          wins: teamData.wins,
          losses: teamData.losses,
          user_id: user.id
        }])
        .select()
        .single();

      if (teamError) throw teamError;

      if (teamData.roster && teamData.roster.length > 0) {
        const players = teamData.roster.map(player => ({
          team_id: newTeam.id,
          name: player.name,
          number: player.number || '',
          position: player.position || '',
          active: true,
          status: 'rostered'
        }));

        const { error: playersError } = await supabase
          .from('players')
          .insert(players);

        if (playersError) throw playersError;
      }

      toast?.success('Team created successfully!');
      setActiveView('home');
      loadTeamsAndGames();
      
    } catch (err) {
      console.error('Error creating team:', err);
      toast?.error(err.message || 'Failed to create team');
    }
  };

const handleStartGame = (team, gameSettings) => {
  setSelectedTeam(team);
  setCurrentGameSettings(gameSettings);
  setActiveView('liveGame');
};

  const handleNewTeam = () => {
    setActiveView('createTeam');
  };

  const handleNewGame = () => {
    setActiveView('gameSetup');
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

  if (activeView === 'createTeam') {
    return (
      <CreateTeam
        user={user}
        onSave={handleCreateTeam}
        onCancel={() => setActiveView('home')}
        toast={toast}
      />
    );
  }

  if (activeView === 'gameSetup') {
    return (
      <PreGameSetup
        user={user}
        teams={teams}
        onStartGame={handleStartGame}
        onCancel={() => setActiveView('home')}
        toast={toast}
      />
    );
  }
if (activeView === 'liveGame') {
  return (
    <LiveGameView
      user={user}
      team={selectedTeam}
      gameSettings={currentGameSettings}
      onEndGame={() => {
        setActiveView('home');
        loadTeamsAndGames();
      }}
      onGoHome={() => {
        setActiveView('home');
        loadTeamsAndGames();
      }}
      toast={toast}
    />
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