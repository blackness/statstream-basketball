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
import PlayerStatsView from './components/Stats/PlayerStatsView';

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
  const [viewingPlayer, setViewingPlayer] = useState(null);

  // ── Load initial data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (user) loadData();
  }, [user]);

  // ── Realtime subscription ──────────────────────────────────────────────────
  // ❌ Before — only watches games
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

// ✅ After — watches both games and teams
useEffect(() => {
  if (!user) return;

  let gameTimer = null;

  const channel = supabase
    .channel('lgt-realtime')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'games' },
      ({ eventType, new: newGame, old: oldGame }) => {
        // Debounce rapid-fire updates (auto-save fires every 5s)
        clearTimeout(gameTimer);
        gameTimer = setTimeout(() => {
          if (eventType === 'INSERT') {
            setGameHistory(prev => {
              if (prev.find(g => g.id === newGame.id)) return prev; // ✅ skip dupes
              return [newGame, ...prev];
            });
          } else if (eventType === 'UPDATE') {
            setGameHistory(prev => prev.map(g => g.id === newGame.id ? newGame : g));
          } else if (eventType === 'DELETE') {
            setGameHistory(prev => prev.filter(g => g.id !== oldGame.id));
          }
        }, 300);
      }
    )
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'teams' },
      ({ new: newTeam }) => {
        setTeams(prev => prev.map(t =>
          t.id === newTeam.id
            ? { ...t, ...newTeam, roster: t.roster }
            : t
        ));
      }
    )
    .subscribe();

  return () => {
    clearTimeout(gameTimer);
    supabase.removeChannel(channel);
  };
}, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [teamsRes, gamesRes, accessRes] = await Promise.all([
        supabase
          .from('teams')
          .select('*, players:players(*)')
          .eq('archived', false)            // ✅ skip archived teams
          .order('created_at', { ascending: false }),
        supabase
          .from('games')
          .select('id,user_id,team_id,status,opponent,home_team,home_score,away_score,period,time_remaining,game_type,game_settings,scheduled_at,created_at,updated_at,play_log,opponent_roster,stats,opponent_stats,active_players,starters')  // ✅ skip unused columns
          .order('created_at', { ascending: false })
          .limit(100),                      // ✅ cap at 100 games
        user
          ? supabase.from('team_access').select('team_id').eq('user_id', user.id)
          : Promise.resolve({ data: [] }),
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

// ✅ After
const handleScheduleGame = async (team, gameSettings, scheduledAt) => {
  try {
    const { data, error } = await supabase.from('games').insert([{
      user_id: user.id,
      team_id: team.id,
      opponent: gameSettings.opponent,
      home_team: gameSettings.isHome ? team.name : gameSettings.opponent,
      status: 'scheduled',
      scheduled_at: scheduledAt,
      home_score: 0,
      away_score: 0,
      period: 1,
      time_remaining: gameSettings.periodLength * 60,
      stats: {},
      opponent_stats: {},
      opponent_roster: [],
      active_players: [],
      play_log: [],
      game_settings: gameSettings,
      visibility: 'public_view',
      is_scheduled: true,
    }]);

    if (error) {
      console.error('Supabase insert error:', error);  // ✅ surface the real error
      throw error;
    }

    toast?.success('Game scheduled!');
    setActiveView('home');
    loadData();
  } catch (err) {
    console.error('Schedule error full:', err);
    toast?.error(err.message || 'Failed to schedule game');
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
    const { error } = await supabase
      .from('games')
      .update({ status: 'completed' })
      .eq('id', game.id);
    if (error) throw error;

    // ✅ Update team win/loss record
    const gameTeam   = teams.find(t => t.id === game.team_id);
    const isHome     = game.home_team === gameTeam?.name;
    const ourScore   = isHome ? game.home_score : game.away_score;
    const oppScore   = isHome ? game.away_score : game.home_score;
    if (ourScore !== oppScore) {
      await supabase.rpc('increment_team_record', {
        p_team_id:    game.team_id,
        p_won:        ourScore > oppScore,
        p_is_playoff: game.game_type === 'playoff',
      });
    }

    toast?.success('Game ended!');
    loadData();
  } catch (err) {
    console.error(err);
    toast?.error('Failed to end game');
  }
};

// After handleReopenGame, also reverse the win/loss record
const handleReopenGame = async (game) => {
  try {
    const { error } = await supabase
      .from('games')
      .update({ status: 'in_progress' })
      .eq('id', game.id);
    if (error) throw error;

    // Reverse the win/loss that was recorded when game ended
    const team     = teams.find(t => t.id === game.team_id);
    const isHome   = game.home_team === team?.name;
    const ourScore = isHome ? game.home_score : game.away_score;
    const oppScore = isHome ? game.away_score : game.home_score;

    if (ourScore !== oppScore) {
      const wasWin     = ourScore > oppScore;
      const isPlayoff  = game.game_type === 'playoff';
      await supabase.rpc('decrement_team_record', {
        p_team_id:    game.team_id,
        p_won:        wasWin,
        p_is_playoff: isPlayoff,
      });
    }

    setSelectedTeam(team);
    setCurrentGameSettings({
      opponent:     game.opponent,
      location:     game.game_settings?.location || '',
      isHome:       game.home_team === team?.name,
      periodLength: game.game_settings?.periodLength || 8,
      totalPeriods: game.game_settings?.totalPeriods || 4,
      game_type:    game.game_type || 'regular',
      homeFouls:    0,
      awayFouls:    0,
    });
    setResumingGame({ ...game, status: 'in_progress' });
    setActiveView('liveGame');
    toast?.success('Game reopened!');
  } catch (err) {
    console.error(err);
    toast?.error('Failed to reopen game');
  }
};

  const handleViewPlayer = (player, team) => {
    setViewingPlayer({ player, team });
    setActiveView('playerStats');
  };

  const handleSeasonStats = (team) => {
    setStatsTeam(team);
    setActiveView('seasonStats');
  };
  // ── Routing ────────────────────────────────────────────────────────────────
  if (loading) return (
  <div className="h-screen w-full bg-gray-50 flex flex-col overflow-hidden">
    {/* Keep the header visible */}
    <div className="h-14 bg-white border-b border-gray-100 flex items-center px-5 flex-shrink-0">
      <div className="w-24 h-5 bg-gray-100 rounded-lg animate-pulse" />
    </div>
    {/* Skeleton content */}
    <div className="flex-1 flex">
      <div className="w-[300px] border-r border-gray-100 p-5 space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="flex-1 p-5 space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
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
      onGoHome={() => {
        setResumingGame(null);
        setActiveView('home');
        loadData();           // ✅ refresh teams with new record
      }}
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
  if (activeView === 'playerStats' && viewingPlayer) return (
  <PlayerStatsView
    user={user}
    player={viewingPlayer.player}
    team={viewingPlayer.team}
    onBack={() => {
      setViewingPlayer(null);
      setActiveView('home');
    }}
    toast={toast}
  />
  
);
if (activeView === 'manageRoster' && rosterTeam) return (
  <ManageRoster
    user={user}
    team={rosterTeam}
    onViewPlayer={(player) => handleViewPlayer(player, rosterTeam)}  // ✅ add
    onBack={() => {
      setRosterTeam(null);
      setActiveView('home');
      loadData();
    }}
    toast={toast}
  />
);
if (activeView === 'seasonStats' && statsTeam) return (
  <SeasonStats
    user={user}
    team={statsTeam}
    onViewPlayer={(player) => handleViewPlayer(player, statsTeam)}  // ✅ add
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
        onReopenGame={handleReopenGame}
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