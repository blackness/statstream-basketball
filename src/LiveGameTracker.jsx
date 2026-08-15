import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Dashboard        from './components/Dashboard/Dashboard';
import CreateTeam       from './components/Team/CreateTeam';
import PreGameSetup     from './components/Game/PreGameSetup';
import LiveGameView     from './components/LIveGame/LiveGameView';
import GameStatsView    from './components/Game/GameStatsView';
import PinEntryModal    from './components/Team/PinEntryModal';
import StartGameModal   from './components/Game/StartGameModal';
import EditTeam         from './components/Team/EditTeam';
import ManageRoster     from './components/Team/ManageRoster';
import SeasonStats      from './components/Stats/SeasonStats';

const LiveGameTracker = ({ user, toast }) => {
  const [teams,           setTeams]           = useState([]);
  const [gameHistory,     setGameHistory]     = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [activeView,      setActiveView]      = useState('home');
  const [selectedTeam,    setSelectedTeam]    = useState(null);
  const [currentGameSettings, setCurrentGameSettings] = useState(null);
  const [resumingGame,    setResumingGame]    = useState(null);
  const [viewingGame,     setViewingGame]     = useState(null);
  const [preselectedTeam, setPreselectedTeam] = useState(null);

  // PIN + access
  const [grantedTeams,  setGrantedTeams]  = useState(new Set());
  const [showPinModal,  setShowPinModal]  = useState(false);
  const [pinTeam,       setPinTeam]       = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  // Start scheduled game modal
  const [showStartModal,  setShowStartModal]  = useState(false);
  const [startGameTarget, setStartGameTarget] = useState(null);

  const [editingTeam, setEditingTeam] = useState(null);
  const [rosterTeam,  setRosterTeam]  = useState(null);
  const [statsTeam, setStatsTeam] = useState(null);

  // ── Load initial data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (user) loadData();
  }, [user]);

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('lgt-games')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games' },
        ({ eventType, new: newGame, old: oldGame }) => {
          if (eventType === 'INSERT') {
            setGameHistory(prev => [newGame, ...prev]);
          } else if (eventType === 'UPDATE') {
            setGameHistory(prev => prev.map(g => g.id === newGame.id ? newGame : g));
          } else if (eventType === 'DELETE') {
            setGameHistory(prev => prev.filter(g => g.id !== oldGame.id));
          }
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [teamsRes, gamesRes, accessRes] = await Promise.all([
        supabase.from('teams').select('*, players:players(*)').order('created_at', { ascending: false }),
        supabase.from('games').select('*').order('created_at', { ascending: false }),
        user ? supabase.from('team_access').select('team_id').eq('user_id', user.id) : { data: [] },
      ]);

      if (teamsRes.error) throw teamsRes.error;
      if (gamesRes.error) throw gamesRes.error;

      setTeams((teamsRes.data || []).map(t => ({ ...t, roster: t.players || [] })));
      setGameHistory(gamesRes.data || []);

      if (accessRes.data?.length) {
        setGrantedTeams(new Set(accessRes.data.map(a => a.team_id)));
      }
    } catch (err) {
      console.error(err);
      toast?.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // ── Permission helpers ─────────────────────────────────────────────────────
  const isOwner    = (team) => team?.user_id === user?.id;
  const canManage  = (team) => {
    if (!team || !user) return false;
    return isOwner(team) || grantedTeams.has(team.id);
  };

  const requestAccess = (team, action) => {
    if (canManage(team)) { action(); return; }
    setPinTeam(team);
    setPendingAction(action);
    setShowPinModal(true);
  };

  const handlePinSuccess = async (teamId) => {
    try {
      await supabase.from('team_access').upsert({ team_id: teamId, user_id: user.id });
    } catch (e) { /* non-critical */ }
    setGrantedTeams(prev => new Set([...prev, teamId]));
    setShowPinModal(false);
    if (pendingAction) { pendingAction(); setPendingAction(null); }
  };

  // ── Team handlers ──────────────────────────────────────────────────────────
  const handleCreateTeam = async (teamData) => {
    try {
      const { data: newTeam, error: tErr } = await supabase
        .from('teams')
        .insert([{
          name: teamData.name, coach: teamData.coach,
          sport: teamData.sport, visibility: teamData.visibility,
          wins: teamData.wins, losses: teamData.losses,
          pin: teamData.pin, user_id: user.id,
        }])
        .select().single();
      if (tErr) throw tErr;

      if (teamData.roster?.length) {
        const { error: pErr } = await supabase.from('players').insert(
          teamData.roster.map(p => ({
            team_id: newTeam.id, name: p.name,
            number: p.number || '', position: p.position || '',
            active: true, status: 'rostered',
          }))
        );
        if (pErr) throw pErr;
      }
      toast?.success('Team created!');
      setActiveView('home');
      loadData();
    } catch (err) {
      console.error(err);
      toast?.error(err.message || 'Failed to create team');
    }
  };
  const handleEditTeam = (team) => {
    setEditingTeam(team);
    setActiveView('editTeam');
  };

  const handleManageRoster = (team) => {
    setRosterTeam(team);
    setActiveView('manageRoster');
  };
  // ── Game handlers ──────────────────────────────────────────────────────────
  const handleNewGame = (team = null) => {
    setPreselectedTeam(team);
    setActiveView('gameSetup');
  };

  const handleStartGame = (team, gameSettings) => {
    setSelectedTeam(team);
    setCurrentGameSettings(gameSettings);
    setResumingGame(null);
    setActiveView('liveGame');
  };

  const handleScheduleGame = async (team, gameSettings, scheduledAt) => {
    try {
      await supabase.from('games').insert([{
        user_id: user.id, team_id: team.id,
        opponent: gameSettings.opponent,
        home_team: gameSettings.isHome ? team.name : gameSettings.opponent,
        status: 'scheduled', scheduled_at: scheduledAt,
        home_score: 0, away_score: 0, period: 1,
        time_remaining: gameSettings.periodLength * 60,
        stats: {}, opponent_stats: {}, opponent_roster: [],
        active_players: [], play_log: [],
        game_settings: gameSettings,
        visibility: 'public', is_scheduled: true,
      }]);
      toast?.success('Game scheduled!');
      setActiveView('home');
    } catch (err) {
      console.error(err);
      toast?.error('Failed to schedule game');
    }
  };

  const handleResumeGame = async (game) => {
    const team = teams.find(t => t.id === game.team_id);
    if (!team) { toast?.error('Team not found'); return; }

    requestAccess(team, () => {
      setSelectedTeam(team);
      setCurrentGameSettings({
        opponent: game.opponent,
        location: game.game_settings?.location || '',
        isHome: game.home_team === team.name,
        periodLength: game.game_settings?.periodLength || 8,
        totalPeriods: game.game_settings?.totalPeriods || 4,
      });
      setResumingGame(game);
      setActiveView('liveGame');
    });
  };

  const handleStartScheduled = (game) => {
    const team = teams.find(t => t.id === game.team_id);
    if (!team) return;

    requestAccess(team, () => {
      setStartGameTarget({ game, team });
      setShowStartModal(true);
    });
  };

  const handleGameStarted = (startedGame) => {
    const team = teams.find(t => t.id === startedGame.team_id);
    setShowStartModal(false);
    setSelectedTeam(team);
    setCurrentGameSettings({
      ...startedGame.game_settings,
      opponent: startedGame.opponent,
      isHome: startedGame.home_team === team?.name,
    });
    setResumingGame(startedGame);
    setActiveView('liveGame');
  };

  const handleViewStats = (game) => {
    setViewingGame({ game, team: teams.find(t => t.id === game.team_id) });
    setActiveView('viewStats');
  };

  const handleDeleteGame = async (game) => {
    if (!confirm('Delete this game?')) return;
    try {
      const { error } = await supabase.from('games').delete().eq('id', game.id);
      if (error) throw error;
      toast?.success('Game deleted!');
    } catch (err) {
      toast?.error('Failed to delete game');
    }
  };

  const handleEndGame = async (game) => {
    if (!confirm('End this game?')) return;
    try {
      const { error } = await supabase.from('games')
        .update({ status: 'completed' }).eq('id', game.id);
      if (error) throw error;
      toast?.success('Game ended!');
    } catch (err) {
      toast?.error('Failed to end game');
    }
  };
  const handleSeasonStats = (team) => {
    setStatsTeam(team);
    setActiveView('seasonStats');
  };
  // ── Routing ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );

  if (activeView === 'createTeam') return (
    <CreateTeam
      user={user}
      onSave={handleCreateTeam}
      onCancel={() => setActiveView('home')}
      toast={toast}
    />
  );
  if (activeView === 'editTeam' && editingTeam) return (
    <EditTeam
      user={user}
      team={editingTeam}
      onSave={() => {
        setEditingTeam(null);
        setActiveView('home');
        loadData();
      }}
      onCancel={() => {
        setEditingTeam(null);
        setActiveView('home');
      }}
      toast={toast}
    />
  );

  if (activeView === 'manageRoster' && rosterTeam) return (
    <ManageRoster
      user={user}
      team={rosterTeam}
      onBack={() => {
        setRosterTeam(null);
        setActiveView('home');
        loadData();
      }}
      toast={toast}
    />
  );
  if (activeView === 'gameSetup') return (
  <PreGameSetup
    user={user}
    teams={teams}
    preselectedTeam={preselectedTeam}       // ✅ auto-selects team from card
    onStartGame={handleStartGame}
    onScheduleGame={handleScheduleGame}     // ✅ schedule for later
    onCancel={() => {
      setPreselectedTeam(null);
      setActiveView('home');
    }}
    toast={toast}
  />
);

  if (activeView === 'liveGame') return (
    <LiveGameView
      user={user}
      team={selectedTeam}
      gameSettings={currentGameSettings}
      existingGame={resumingGame}
      onGoHome={() => { setResumingGame(null); setActiveView('home'); }}
      toast={toast}
    />
  );

  if (activeView === 'viewStats' && viewingGame) return (
    <GameStatsView
      user={user}
      game={viewingGame.game}
      team={viewingGame.team}
      onBack={() => setActiveView('home')}
    />
  );
  if (activeView === 'seasonStats' && statsTeam) return (
    <SeasonStats
      user={user}
      team={statsTeam}
      onBack={() => {
        setStatsTeam(null);
        setActiveView('home');
      }}
    />
  );
  return (
    <>
      <Dashboard
        user={user}
        teams={teams}
        gameHistory={gameHistory}
        canManage={canManage}
        onNewTeam={() => setActiveView('createTeam')}
        onNewGame={handleNewGame}
        onEditTeam={handleEditTeam}
        onManageRoster={handleManageRoster}
        onResumeGame={handleResumeGame}
        onStartScheduled={handleStartScheduled}
        onViewStats={handleViewStats}
        onDeleteGame={handleDeleteGame}
        onEndGame={handleEndGame}
        onRefresh={loadData}
        toast={toast}
        onSeasonStats={handleSeasonStats}
      />

      {showPinModal && pinTeam && (
        <PinEntryModal
          team={pinTeam}
          onSuccess={handlePinSuccess}
          onClose={() => { setShowPinModal(false); setPendingAction(null); }}
        />
      )}

      {showStartModal && startGameTarget && (
        <StartGameModal
          game={startGameTarget.game}
          team={startGameTarget.team}
          onStart={handleGameStarted}
          onModifySetup={() => {
            setShowStartModal(false);
            setPreselectedTeam(startGameTarget.team);
            setActiveView('gameSetup');
          }}
          onClose={() => setShowStartModal(false)}
          toast={toast}
        />
      )}
    </>
  );
};

export default LiveGameTracker;