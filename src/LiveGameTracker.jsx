import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Dashboard from './components/Dashboard/Dashboard';
import CreateTeam from './components/Team/CreateTeam';
import EditTeam from './components/Team/EditTeam';
import ManageRoster from './components/Team/ManageRoster';
import PreGameSetup from './components/Game/PreGameSetup';
import LiveGameView from './components/LIveGame/LiveGameView';
import LiveGameDetail from './components/LIveGame/LiveGameDetail';
import BoxScoreView from './components/LIveGame/BoxScoreView';
import AuthUI from './services/AuthUI';

const SUPER_USER_ID = 'cbaf203e-b350-48c7-b38a-62d4533c057f';

const LiveGameTracker = ({ user, toast }) => {
  const [teams, setTeams] = useState([]);
  const [gameHistory, setGameHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('home');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [currentGameSettings, setCurrentGameSettings] = useState(null);
  const [resumingGame, setResumingGame] = useState(null);
  const [viewingBoxScore, setViewingBoxScore] = useState(null);
  const [viewingGameDetail, setViewingGameDetail] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [managingRoster, setManagingRoster] = useState(null);
  const [showMyTeams, setShowMyTeams] = useState(true); // logged-in default: my teams


  const isSuperUser = user?.id === SUPER_USER_ID;

  // Redirect to dashboard when user signs in
  useEffect(() => {
    if (user && (activeView === 'signIn' || activeView === 'home')) {
      setActiveView('home');
      loadTeamsAndGames();
    }
  }, [user]);

  useEffect(() => {
    loadTeamsAndGames();
  }, [showMyTeams]);

  const loadTeamsAndGames = async () => {
    try {
      setLoading(true);

      // Always fetch all teams — RLS handles visibility
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`*, players:players(*)`)
        .order('created_at', { ascending: false });

      if (teamsError) throw teamsError;

      const teamsWithRoster = (teamsData || []).map(team => ({
        ...team,
        roster: team.players || []
      }));

      // Sort: user's own teams first, then everyone else's alphabetically
      const sorted = [
        ...teamsWithRoster.filter(t => t.user_id === user?.id),
        ...teamsWithRoster
          .filter(t => t.user_id !== user?.id)
          .sort((a, b) => a.name.localeCompare(b.name))
      ];

      // Games query — everyone sees all public games by default
      let gamesQuery = supabase
        .from('games')
        .select('*')
        .order('created_at', { ascending: false });

      if (user && showMyTeams && !isSuperUser) {
        // Logged-in user in "My Teams" mode — own games only
        gamesQuery = gamesQuery.eq('user_id', user.id);
      } else if (!user) {
        // Logged-out — public only
        gamesQuery = gamesQuery.eq('is_public', true);
      }
      // Superuser or logged-in "All Teams" — no filter, see everything

      const { data: gamesData, error: gamesError } = await gamesQuery;
      if (gamesError) throw gamesError;

      setTeams(sorted);
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

      toast?.success('Team created!');
      setActiveView('home');
      loadTeamsAndGames();

    } catch (err) {
      console.error('Error creating team:', err);
      toast?.error(err.message || 'Failed to create team');
    }
  };

  const handleEditTeam = (team) => {
    setEditingTeam(team);
    setActiveView('editTeam');
  };

  const handleSaveTeamEdits = async (teamId, updates) => {
    try {
      const { error } = await supabase
        .from('teams')
        .update({
          name: updates.name,
          coach: updates.coach,
          sport: updates.sport,
          visibility: updates.visibility,
          wins: updates.wins,
          losses: updates.losses
        })
        .eq('id', teamId);

      if (error) throw error;

      setActiveView('home');
      setEditingTeam(null);
      loadTeamsAndGames();
    } catch (err) {
      console.error('Error updating team:', err);
      throw err;
    }
  };

  const handleDeleteTeam = async (teamId) => {
    try {
      const { error: playersError } = await supabase
        .from('players')
        .delete()
        .eq('team_id', teamId);
      if (playersError) throw playersError;

      const { error: gamesError } = await supabase
        .from('games')
        .delete()
        .eq('team_id', teamId);
      if (gamesError) throw gamesError;

      const { error: teamError } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);
      if (teamError) throw teamError;

      setActiveView('home');
      setEditingTeam(null);
      loadTeamsAndGames();
    } catch (err) {
      console.error('Error deleting team:', err);
      throw err;
    }
  };

  const handleManageRoster = (team) => {
    setManagingRoster(team);
    setActiveView('manageRoster');
  };

  const handleSaveRoster = async (teamId, roster) => {
    try {
      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .eq('team_id', teamId);
      if (deleteError) throw deleteError;

      if (roster.length > 0) {
        const players = roster.map(player => ({
          team_id: teamId,
          name: player.name,
          number: player.number || '',
          position: player.position || '',
          active: true,
          status: 'rostered'
        }));

        const { error: insertError } = await supabase
          .from('players')
          .insert(players);
        if (insertError) throw insertError;
      }

      setActiveView('home');
      setManagingRoster(null);
      loadTeamsAndGames();
    } catch (err) {
      console.error('Error saving roster:', err);
      throw err;
    }
  };

  const handleStartGame = (team, gameSettings) => {
    setSelectedTeam(team);
    setCurrentGameSettings(gameSettings);
    setResumingGame(null);
    setActiveView('liveGame');
  };

  const handleNewTeam = () => setActiveView('createTeam');
  const handleNewGame = () => setActiveView('gameSetup');

  const handleResumeGame = async (game) => {
    try {
      const { data: freshGame, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', game.id)
        .single();

      if (error) {
        toast?.error('Failed to load game');
        return;
      }

      const team = teams.find(t => t.id === freshGame.team_id);
      if (!team) {
        toast?.error('Team not found');
        return;
      }

      setSelectedTeam(team);
      setCurrentGameSettings({
        opponent: freshGame.opponent,
        location: freshGame.game_settings?.location || '',
        isHome: freshGame.home_team === team.name,
        periodLength: freshGame.game_settings?.periodLength || 8,
        totalPeriods: freshGame.game_settings?.totalPeriods || 4,
        homeFouls: freshGame.game_settings?.homeFouls || 0,
        awayFouls: freshGame.game_settings?.awayFouls || 0
      });
      setResumingGame(freshGame);
      setActiveView('liveGame');
    } catch (err) {
      console.error('Error resuming game:', err);
      toast?.error('Failed to resume game');
    }
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

  const handleViewStats = (game) => {
    if (game.status === 'in-progress') {
      setViewingGameDetail(game);
    } else {
      setViewingBoxScore(game);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (activeView === 'signIn') {
    return (
      <AuthUI onBrowseGames={() => setActiveView('home')} />
    );
  }

  if (activeView === 'createTeam') {
    if (!user) { setActiveView('home'); return null; }
    return (
      <CreateTeam
        user={user}
        onSave={handleCreateTeam}
        onCancel={() => setActiveView('home')}
        toast={toast}
      />
    );
  }

  if (activeView === 'editTeam' && editingTeam) {
    return (
      <EditTeam
        team={editingTeam}
        onSave={handleSaveTeamEdits}
        onDelete={handleDeleteTeam}
        onCancel={() => { setEditingTeam(null); setActiveView('home'); }}
        toast={toast}
      />
    );
  }

  if (activeView === 'manageRoster' && managingRoster) {
    return (
      <ManageRoster
        team={managingRoster}
        onSave={handleSaveRoster}
        onCancel={() => { setManagingRoster(null); setActiveView('home'); }}
        toast={toast}
      />
    );
  }

  if (activeView === 'gameSetup') {
    if (!user) { setActiveView('home'); return null; }
    return (
      <PreGameSetup
        user={user}
        teams={teams.filter(t => t.user_id === user.id)}
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
        existingGame={resumingGame}
        onEndGame={() => { setResumingGame(null); setActiveView('home'); loadTeamsAndGames(); }}
        onGoHome={() => { setResumingGame(null); setActiveView('home'); loadTeamsAndGames(); }}
        toast={toast}
      />
    );
  }

  if (viewingGameDetail) {
    const team = teams.find(t => t.id === viewingGameDetail.team_id);
    return (
      <LiveGameDetail
        initialGame={viewingGameDetail}
        team={team}
        onBack={() => setViewingGameDetail(null)}
      />
    );
  }

  if (viewingBoxScore) {
    const team = teams.find(t => t.id === viewingBoxScore.team_id);
    return (
      <BoxScoreView
        user={user}
        game={viewingBoxScore}
        team={team}
        onBack={() => setViewingBoxScore(null)}
      />
    );
  }

  return (
    <Dashboard
      user={user}
      teams={teams}
      gameHistory={gameHistory}
      isSuperUser={isSuperUser}
      showMyTeams={showMyTeams}
      onToggleMyTeams={() => setShowMyTeams(prev => !prev)}
      onSignIn={() => setActiveView('signIn')}
      onNewTeam={handleNewTeam}
      onNewGame={handleNewGame}
      onEditTeam={handleEditTeam}
      onManageRoster={handleManageRoster}
      onResumeGame={handleResumeGame}
      onViewStats={handleViewStats}
      onDeleteGame={handleDeleteGame}
      onEndGame={handleEndGame}
      onSelectTeam={(team) => {/* handled inside SplitView */}}
      toast={toast}
    />
  );
};

export default LiveGameTracker;
