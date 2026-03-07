import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Play, Pause, RotateCcw, LayoutDashboard, Maximize2, Minimize2, TrendingUp, TrendingDown, Target } from 'lucide-react';
import GameStateManager from '../../services/GameStateManager';

const LiveGameView = ({ 
  user,
  team: initialTeam, 
  gameSettings,
  existingGame = null,
  onEndGame,
  onGoHome,
  toast 
}) => {
  const sessionKey = `game-session-${initialTeam.id}`;
  
  const [team, setTeam] = useState(initialTeam);
  const [currentGameId, setCurrentGameId] = useState(existingGame?.id || null);
  const [homeScore, setHomeScore] = useState(existingGame?.home_score || 0);
  const [awayScore, setAwayScore] = useState(existingGame?.away_score || 0);
  const [currentPeriod, setCurrentPeriod] = useState(existingGame?.period || 1);
  const [gameTime, setGameTime] = useState(existingGame?.time_remaining || (gameSettings.periodLength * 60));
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [liveStats, setLiveStats] = useState(existingGame?.stats || {});
  const [opponentStats, setOpponentStats] = useState(
    existingGame?.opponent_stats || { 
      team: { 
        pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, 
        oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0 
      } 
    }
  );
  const [activePlayers, setActivePlayers] = useState(
    existingGame?.active_players && Array.isArray(existingGame.active_players) && existingGame.active_players.length > 0
      ? existingGame.active_players
      : []
  );
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [recentPlays, setRecentPlays] = useState([]);
  const [homeFouls, setHomeFouls] = useState(existingGame?.game_settings?.homeFouls || 0);
  const [awayFouls, setAwayFouls] = useState(existingGame?.game_settings?.awayFouls || 0);
  const [showSubPanel, setShowSubPanel] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [showPeriodSummary, setShowPeriodSummary] = useState(false);
  const [periodSummaryData, setPeriodSummaryData] = useState(null);
  const [lastFivePlays, setLastFivePlays] = useState([]);
  const [plusMinus, setPlusMinus] = useState({});
  const [showShotMap, setShowShotMap] = useState(false);

  // Refresh roster
  useEffect(() => {
    const refreshRoster = async () => {
      try {
        const { data, error } = await supabase
          .from('teams')
          .select(`
            *,
            players:players(*)
          `)
          .eq('id', initialTeam.id)
          .single();

        if (error) throw error;
        if (data) {
          const updatedTeam = {
            ...data,
            roster: data.players || []
          };
          setTeam(updatedTeam);
          
          console.log('Roster refreshed. Current active players:', activePlayers.length);
          console.log('Updated roster size:', updatedTeam.roster.length);
          
          // If we have activePlayers but some are missing from current roster, keep only valid ones
          if (activePlayers.length > 0) {
            const validPlayerIds = updatedTeam.roster.map(p => p.id);
            const stillActive = activePlayers.filter(id => validPlayerIds.includes(id));
            
            // If some active players are no longer in roster, update activePlayers
            if (stillActive.length !== activePlayers.length) {
              console.log('Some active players removed, updating list');
              setActivePlayers(stillActive);
            }
          } else if (updatedTeam.roster.length > 0 && !existingGame) {
            // If no active players but roster has players, set first 5
            console.log('No active players set, using first 5 from roster');
            const firstFive = updatedTeam.roster.slice(0, 5).map(p => p.id);
            setActivePlayers(firstFive);
          }
        }
      } catch (err) {
        console.error('Error refreshing roster:', err);
      }
    };
    refreshRoster();
  }, [initialTeam.id]);

  // Initialize game
  useEffect(() => {
    const initializeGame = async () => {
      console.log('Initializing game...', { existingGame, sessionKey });
      const existingSessionGameId = localStorage.getItem(sessionKey);
      console.log('Existing session game ID:', existingSessionGameId);
      
      if (existingGame) {
        console.log('Resuming existing game:', existingGame.id);
        setCurrentGameId(existingGame.id);
        localStorage.setItem(sessionKey, existingGame.id);
        setHomeScore(existingGame.home_score || 0);
        setAwayScore(existingGame.away_score || 0);
        setCurrentPeriod(existingGame.period || 1);
        setGameTime(existingGame.time_remaining || (gameSettings.periodLength * 60));
        setLiveStats(existingGame.stats || {});
        setOpponentStats(existingGame.opponent_stats || { team: { pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0 } });
        setActivePlayers(existingGame.active_players || []);
        setHomeFouls(existingGame.game_settings?.homeFouls || 0);
        setAwayFouls(existingGame.game_settings?.awayFouls || 0);
        setPlusMinus(existingGame.plus_minus || {});
        toast?.success('Game resumed!');
      } else if (existingSessionGameId && !currentGameId) {
        console.log('Found session game ID, checking if it exists...');
        // Verify the game still exists
        const { data, error } = await supabase
          .from('games')
          .select('id')
          .eq('id', existingSessionGameId)
          .maybeSingle();
        
        if (data) {
          console.log('Session game exists, setting it:', existingSessionGameId);
          setCurrentGameId(existingSessionGameId);
        } else {
          console.log('Session game no longer exists, clearing and creating new');
          localStorage.removeItem(sessionKey);
          await createGame();
        }
      } else if (!currentGameId) {
        console.log('No game found, creating new game...');
        await createGame();
      } else {
        console.log('Game already initialized:', currentGameId);
      }
      
      if (!existingGame && team.roster && team.roster.length > 0 && activePlayers.length === 0) {
        console.log('Setting initial active players (first 5)');
        const firstFive = team.roster.slice(0, 5).map(p => p.id);
        setActivePlayers(firstFive);
      }
    };
    
    initializeGame();
  }, []);

  // Timer
  useEffect(() => {
    let interval;
    if (isTimerRunning && gameTime > 0) {
      interval = setInterval(() => {
        setGameTime(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            toast?.info('Period ended!');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, gameTime]);

  const createGame = async () => {
    console.log('Creating game with:', {
      userId: user.id,
      teamId: team.id,
      teamName: team.name,
      opponent: gameSettings.opponent,
      isHome: gameSettings.isHome,
      periodLength: gameSettings.periodLength,
      totalPeriods: gameSettings.totalPeriods
    });

    const result = await GameStateManager.createGame({
      userId: user.id,
      teamId: team.id,
      teamName: team.name,
      opponent: gameSettings.opponent,
      isHome: gameSettings.isHome,
      periodLength: gameSettings.periodLength,
      totalPeriods: gameSettings.totalPeriods
    });

    console.log('Create game result:', result);

    if (result.success) {
      setCurrentGameId(result.game.id);
      localStorage.setItem(sessionKey, result.game.id);
      toast?.success('Game started!');
      console.log('Game created successfully:', result.game.id);
    } else {
      console.error('Failed to create game:', result.error);
      toast?.error(`Failed to start game: ${result.error?.message || 'Unknown error'}`);
    }
  };

  const addRecentPlay = (playDescription, points = 0) => {
    const play = {
      id: Date.now(),
      description: playDescription,
      time: `${Math.floor(gameTime / 60)}:${(gameTime % 60).toString().padStart(2, '0')}`,
      period: currentPeriod,
      points: points,
      team: playDescription.includes(gameSettings.opponent) ? 'away' : 'home'
    };
    setRecentPlays(prev => [play, ...prev].slice(0, 5));
    setLastFivePlays(prev => [play, ...prev].slice(0, 5));
  };

  const updatePlusMinus = (points, isTeamScore) => {
    if (!currentGameId) return;
    
    const newPlusMinus = { ...plusMinus };
    activePlayers.forEach(playerId => {
      if (!newPlusMinus[playerId]) {
        newPlusMinus[playerId] = 0;
      }
      if (isTeamScore) {
        newPlusMinus[playerId] += points;
      } else {
        newPlusMinus[playerId] -= points;
      }
    });
    setPlusMinus(newPlusMinus);
  };

  const handleQuickStat = async (playerId, statType, points = 0, missed = false) => {
    if (!currentGameId) {
      toast?.error('No active game');
      return;
    }

    const player = team.roster?.find(p => p.id === playerId);
    const manager = new GameStateManager(currentGameId);

    const result = await manager.recordStat({
      playerId,
      statType,
      points,
      missed,
      currentStats: liveStats,
      homeScore,
      awayScore,
      isHomeTeam: gameSettings.isHome,
      homeFouls,
      awayFouls,
      period: currentPeriod,
      timeRemaining: gameTime,
      opponentStats,
      activePlayers,
      plusMinus,
      gameSettings: {
        ...gameSettings,
        homeFouls,
        awayFouls
      }
    });

    if (result.success) {
      setLiveStats(result.newStats);
      setHomeScore(result.newHomeScore);
      setAwayScore(result.newAwayScore);
      setHomeFouls(result.newHomeFouls);
      setAwayFouls(result.newAwayFouls);

      if (points > 0) {
        updatePlusMinus(points, true);
      }

      const statName = {
        fgm: missed ? 'Missed 2PT' : 'Made 2PT',
        tpm: missed ? 'Missed 3PT' : 'Made 3PT',
        ftm: missed ? 'Missed FT' : 'Made FT',
        oreb: 'Off. Rebound',
        dreb: 'Def. Rebound',
        ast: 'Assist',
        stl: 'Steal',
        blk: 'Block',
        to: 'Turnover',
        pf: 'Foul'
      }[statType] || statType.toUpperCase();

      addRecentPlay(`${player?.name} - ${statName}`, points);
      
      if (points > 0) {
        toast?.success(`+${points} ${player?.name}`);
      }
    } else {
      // Check if game doesn't exist (0 rows error)
      if (result.error?.code === 'PGRST116' || result.error?.details?.includes('0 rows')) {
        console.error('Game no longer exists, clearing session and creating new game');
        localStorage.removeItem(sessionKey);
        toast?.error('Game session expired. Please start a new game.');
        // Redirect back to dashboard
        setTimeout(() => onGoHome(), 2000);
      } else {
        toast?.error('Failed to record stat');
      }
    }
  };

  const handleOpponentQuickStat = async (statType, points = 0) => {
    if (!currentGameId) {
      toast?.error('No active game');
      return;
    }

    const newOpponentStats = {
      ...opponentStats,
      team: {
        ...opponentStats.team,
        [statType]: (opponentStats.team[statType] || 0) + 1,
        pts: opponentStats.team.pts + points
      }
    };

    if (statType === 'fgm') {
      newOpponentStats.team.fga = (opponentStats.team.fga || 0) + 1;
    } else if (statType === 'tpm') {
      newOpponentStats.team.tpa = (opponentStats.team.tpa || 0) + 1;
    } else if (statType === 'ftm') {
      newOpponentStats.team.fta = (opponentStats.team.fta || 0) + 1;
    }

    const newAwayScore = gameSettings.isHome ? awayScore + points : homeScore + points;
    const newHomeScore = gameSettings.isHome ? homeScore : awayScore + points;

    // Update opponent fouls
    let newHomeFouls = homeFouls;
    let newAwayFouls = awayFouls;
    if (statType === 'pf') {
      if (gameSettings.isHome) {
        newAwayFouls = awayFouls + 1;
      } else {
        newHomeFouls = homeFouls + 1;
      }
    }

    if (points > 0) {
      updatePlusMinus(points, false);
    }

    const manager = new GameStateManager(currentGameId);
    const result = await manager.saveGameState({
      homeScore: newHomeScore,
      awayScore: newAwayScore,
      period: currentPeriod,
      timeRemaining: gameTime,
      stats: liveStats,
      opponentStats: newOpponentStats,
      activePlayers,
      plusMinus,
      gameSettings: { ...gameSettings, homeFouls: newHomeFouls, awayFouls: newAwayFouls }
    });

    if (result.success) {
      setOpponentStats(newOpponentStats);
      setHomeScore(newHomeScore);
      setAwayScore(newAwayScore);
      setHomeFouls(newHomeFouls);
      setAwayFouls(newAwayFouls);

      const statName = {
        fgm: '2PT',
        tpm: '3PT',
        ftm: 'FT',
        oreb: 'Off. Rebound',
        dreb: 'Def. Rebound',
        ast: 'Assist',
        stl: 'Steal',
        blk: 'Block',
        to: 'Turnover',
        pf: 'Foul'
      }[statType] || statType.toUpperCase();

      addRecentPlay(`${gameSettings.opponent} - ${statName}`, points);
    }
  };

  const handleSwapPlayers = (playerOutId, playerInId) => {
    const newActivePlayers = activePlayers.map(id => 
      id === playerOutId ? playerInId : id
    );
    setActivePlayers(newActivePlayers);
    setSelectedPlayer(null);
    
    const playerOut = team.roster?.find(p => p.id === playerOutId);
    const playerIn = team.roster?.find(p => p.id === playerInId);
    toast?.success(`${playerIn?.name} in for ${playerOut?.name}`);
    addRecentPlay(`SUB: ${playerIn?.name} → ${playerOut?.name}`);
  };

  const undoLastPlay = async () => {
    if (recentPlays.length === 0) return;

    const lastPlay = recentPlays[0];
    const description = lastPlay.description;
    
    let undoSuccess = false;
    
    if (description.includes('Made 2PT')) {
      const player = team.roster?.find(p => description.includes(p.name));
      if (player) {
        await undoStat(player.id, 'fgm', 2, false);
        undoSuccess = true;
      }
    } else if (description.includes('Made 3PT')) {
      const player = team.roster?.find(p => description.includes(p.name));
      if (player) {
        await undoStat(player.id, 'tpm', 3, false);
        undoSuccess = true;
      }
    } else if (description.includes('Made FT')) {
      const player = team.roster?.find(p => description.includes(p.name));
      if (player) {
        await undoStat(player.id, 'ftm', 1, false);
        undoSuccess = true;
      }
    } else if (description.includes('Missed')) {
      const player = team.roster?.find(p => description.includes(p.name));
      if (player) {
        const statType = description.includes('2PT') ? 'fgm' : description.includes('3PT') ? 'tpm' : 'ftm';
        await undoStat(player.id, statType, 0, true);
        undoSuccess = true;
      }
    } else if (description.includes('Off. Rebound')) {
      const player = team.roster?.find(p => description.includes(p.name));
      if (player) {
        await undoStat(player.id, 'oreb', 0, false);
        undoSuccess = true;
      }
    } else if (description.includes('Def. Rebound')) {
      const player = team.roster?.find(p => description.includes(p.name));
      if (player) {
        await undoStat(player.id, 'dreb', 0, false);
        undoSuccess = true;
      }
    } else if (description.includes('Assist')) {
      const player = team.roster?.find(p => description.includes(p.name));
      if (player) {
        await undoStat(player.id, 'ast', 0, false);
        undoSuccess = true;
      }
    } else if (description.includes('Steal')) {
      const player = team.roster?.find(p => description.includes(p.name));
      if (player) {
        await undoStat(player.id, 'stl', 0, false);
        undoSuccess = true;
      }
    } else if (description.includes('Block')) {
      const player = team.roster?.find(p => description.includes(p.name));
      if (player) {
        await undoStat(player.id, 'blk', 0, false);
        undoSuccess = true;
      }
    } else if (description.includes('Turnover')) {
      const player = team.roster?.find(p => description.includes(p.name));
      if (player) {
        await undoStat(player.id, 'to', 0, false);
        undoSuccess = true;
      }
    } else if (description.includes('Foul')) {
      const player = team.roster?.find(p => description.includes(p.name));
      if (player) {
        await undoStat(player.id, 'pf', 0, false);
        undoSuccess = true;
      }
    } else if (description.includes('SUB:')) {
      undoSuccess = true;
    }
    
    if (undoSuccess) {
      setRecentPlays(prev => prev.slice(1));
      toast?.success('Play undone!');
    } else {
      toast?.error('Could not undo play');
    }
  };

  const undoStat = async (playerId, statType, points, wasMissed) => {
    if (!currentGameId) return;

    const manager = new GameStateManager(currentGameId);
    const currentPlayerStats = liveStats[playerId] || {};
    
    const newPlayerStats = {
      ...currentPlayerStats,
      [statType]: Math.max(0, (currentPlayerStats[statType] || 0) - 1)
    };
    
    if (statType === 'fgm') {
      newPlayerStats.fga = Math.max(0, (currentPlayerStats.fga || 0) - 1);
    } else if (statType === 'tpm') {
      newPlayerStats.tpa = Math.max(0, (currentPlayerStats.tpa || 0) - 1);
    } else if (statType === 'ftm') {
      newPlayerStats.fta = Math.max(0, (currentPlayerStats.fta || 0) - 1);
    }
    
    const fgm = statType === 'fgm' ? newPlayerStats.fgm : (currentPlayerStats.fgm || 0);
    const tpm = statType === 'tpm' ? newPlayerStats.tpm : (currentPlayerStats.tpm || 0);
    const ftm = statType === 'ftm' ? newPlayerStats.ftm : (currentPlayerStats.ftm || 0);
    newPlayerStats.pts = (fgm * 2) + (tpm * 3) + ftm;
    
    const newStats = {
      ...liveStats,
      [playerId]: newPlayerStats
    };
    
    let newHomeScore = homeScore - points;
    let newAwayScore = awayScore;
    
    let newHomeFouls = homeFouls;
    let newAwayFouls = awayFouls;
    if (statType === 'pf') {
      if (gameSettings.isHome) {
        newHomeFouls = Math.max(0, homeFouls - 1);
      } else {
        newAwayFouls = Math.max(0, awayFouls - 1);
      }
    }
    
    const result = await manager.saveGameState({
      homeScore: newHomeScore,
      awayScore: newAwayScore,
      period: currentPeriod,
      timeRemaining: gameTime,
      stats: newStats,
      opponentStats,
      activePlayers,
      plusMinus,
      gameSettings: { ...gameSettings, homeFouls: newHomeFouls, awayFouls: newAwayFouls }
    });
    
    if (result.success) {
      setLiveStats(newStats);
      setHomeScore(newHomeScore);
      setAwayScore(newAwayScore);
      setHomeFouls(newHomeFouls);
      setAwayFouls(newAwayFouls);
    }
  };

  const handleNextPeriod = () => {
    if (currentPeriod < gameSettings.totalPeriods) {
      // Show period summary
      const teamStats = calculateTeamStats();
      setPeriodSummaryData({
        period: currentPeriod,
        homeScore,
        awayScore,
        teamStats,
        opponentStats: opponentStats.team
      });
      setShowPeriodSummary(true);
    }
  };

  const confirmNextPeriod = (resetFouls) => {
    setCurrentPeriod(prev => prev + 1);
    setGameTime(gameSettings.periodLength * 60);
    setIsTimerRunning(false);
    
    if (resetFouls) {
      setHomeFouls(0);
      setAwayFouls(0);
    }
    
    setShowPeriodSummary(false);
    toast?.info(`Starting Period ${currentPeriod + 1}`);
  };

  const handleEndGame = async () => {
    if (!confirm('End this game?')) return;

    if (currentGameId) {
      const manager = new GameStateManager(currentGameId);
      await manager.endGame({
        homeScore,
        awayScore,
        period: currentPeriod,
        stats: liveStats,
        opponentStats,
        plusMinus,
        gameSettings: { ...gameSettings, homeFouls, awayFouls }
      });
    }

    localStorage.removeItem(sessionKey);
    toast?.success('Game ended!');
    onEndGame();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateTeamStats = () => {
    const stats = { pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0 };
    Object.values(liveStats).forEach(playerStats => {
      Object.keys(stats).forEach(key => {
        stats[key] += (playerStats[key] || 0);
      });
    });
    return stats;
  };

  const calculateShootingPct = (made, attempted) => {
    if (attempted === 0) return '0.0';
    return ((made / attempted) * 100).toFixed(1);
  };

  const getMomentumIndicator = () => {
    if (lastFivePlays.length === 0) return null;
    
    let homePoints = 0;
    let awayPoints = 0;
    
    lastFivePlays.forEach(play => {
      if (play.team === 'home') {
        homePoints += play.points;
      } else {
        awayPoints += play.points;
      }
    });
    
    if (homePoints > awayPoints + 4) {
      return { team: 'home', text: `${homePoints}-${awayPoints} run`, color: 'text-blue-600' };
    } else if (awayPoints > homePoints + 4) {
      return { team: 'away', text: `${awayPoints}-${homePoints} run`, color: 'text-red-600' };
    }
    
    return null;
  };

  const homeTeamName = gameSettings.isHome ? team.name : gameSettings.opponent;
  const awayTeamName = gameSettings.isHome ? gameSettings.opponent : team.name;
  const teamStats = calculateTeamStats();
  const momentum = getMomentumIndicator();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* CUSTOM HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={onGoHome}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition text-lg sm:text-xl"
                title="Back"
              >
                ←
              </button>
              <h1 className="text-base sm:text-xl font-black text-gray-900">Live Game</h1>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setShowShotMap(!showShotMap)}
                className={`flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 ${showShotMap ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'} text-white rounded-lg font-bold text-xs transition`}
                title="Shot Map"
              >
                <Target size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Map</span>
              </button>
              <button
                onClick={() => setCompactMode(!compactMode)}
                className="hidden sm:flex items-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs transition"
                title={compactMode ? "Full Mode" : "Compact Mode"}
              >
                {compactMode ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                {compactMode ? 'Full' : 'Compact'}
              </button>
              <button
                onClick={onGoHome}
                className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition"
                title="Dashboard"
              >
                <LayoutDashboard size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Home</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={`${compactMode ? 'max-w-6xl' : 'max-w-4xl'} mx-auto px-2 sm:px-4 pb-20`}>
        {/* SCOREBOARD */}
        <div className="sticky top-0 z-10 bg-white rounded-xl shadow-lg p-2 sm:p-4 mb-4 border-2 border-gray-200">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center mb-2 sm:mb-3">
            <div className="text-center">
              <div className="text-xs font-bold text-gray-600 uppercase mb-1">{homeTeamName}</div>
              <div className="text-3xl sm:text-5xl font-black text-blue-600">{homeScore}</div>
              <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1 sm:gap-2">
                <span className="hidden sm:inline">Fouls:</span>
                <span className="sm:hidden">F:</span>
                {homeFouls}
                {homeFouls >= 4 && (
                  <span className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 bg-red-600 text-white text-xs font-black rounded-full">
                    B
                  </span>
                )}
              </div>
            </div>

            <div className="text-center">
              <div className="text-xs sm:text-sm font-bold text-gray-600 uppercase">Period {currentPeriod}</div>
              <div className="text-2xl sm:text-3xl font-black text-gray-900 mb-1 sm:mb-2">{formatTime(gameTime)}</div>
              {momentum && (
                <div className={`text-xs font-bold ${momentum.color} mb-1 sm:mb-2 flex items-center justify-center gap-1`}>
                  {momentum.team === 'home' ? <TrendingUp size={12} className="sm:w-3.5 sm:h-3.5" /> : <TrendingDown size={12} className="sm:w-3.5 sm:h-3.5" />}
                  <span className="hidden sm:inline">{momentum.text}</span>
                  <span className="sm:hidden">{momentum.text.split(' ')[0]}</span>
                </div>
              )}
              <div className="flex gap-1 sm:gap-2 justify-center">
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="p-1.5 sm:p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  {isTimerRunning ? <Pause size={16} className="sm:w-5 sm:h-5" /> : <Play size={16} className="sm:w-5 sm:h-5" />}
                </button>
              </div>
            </div>

            <div className="text-center">
              <div className="text-xs font-bold text-gray-600 uppercase mb-1">{awayTeamName}</div>
              <div className="text-3xl sm:text-5xl font-black text-red-600">{awayScore}</div>
              <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1 sm:gap-2">
                <span className="hidden sm:inline">Fouls:</span>
                <span className="sm:hidden">F:</span>
                {awayFouls}
                {awayFouls >= 4 && (
                  <span className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 bg-red-600 text-white text-xs font-black rounded-full">
                    B
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleNextPeriod}
              disabled={currentPeriod >= gameSettings.totalPeriods}
              className="py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-bold text-xs sm:text-sm transition"
            >
              Next Period
            </button>
            <button
              onClick={handleEndGame}
              className="py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs sm:text-sm transition"
            >
              End Game
            </button>
          </div>
        </div>

        <div className={`grid ${compactMode ? 'grid-cols-3' : 'grid-cols-1'} gap-4`}>
          {/* MAIN STATS AREA */}
          <div className={`${compactMode ? 'col-span-2' : ''} space-y-4`}>
            {/* ACTIVE PLAYERS */}
            {activePlayers.length > 0 && (
              <div className="bg-white rounded-xl p-2 sm:p-3 shadow-sm border border-gray-200">
                <div className={`grid ${compactMode ? 'grid-cols-5' : 'grid-cols-2 sm:grid-cols-3'} gap-2`}>
                  {activePlayers.map(playerId => {
                    const player = team.roster?.find(p => p.id === playerId);
                    if (!player) return null;
                    
                    const stats = liveStats[playerId] || { pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, reb: 0, ast: 0 };
                    const isSelected = selectedPlayer === playerId;
                    const pm = plusMinus[playerId] || 0;
                    const reb = (stats.oreb || 0) + (stats.dreb || 0);
                    
                    return (
                      <button
                        key={playerId}
                        onClick={() => setSelectedPlayer(isSelected ? null : playerId)}
                        className={`p-2 rounded-lg font-bold text-left transition-all active:scale-95 relative ${
                          isSelected 
                            ? 'bg-blue-600 text-white shadow-lg' 
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          {/* Left side: Number and Name */}
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs ${isSelected ? 'text-blue-200' : 'text-gray-500'} mb-0.5`}>
                              #{player?.number}
                            </div>
                            <div className={`text-sm sm:text-base font-black ${isSelected ? 'text-white' : 'text-gray-900'} truncate`}>
                              {player?.name}
                            </div>
                          </div>
                          
                          {/* Right side: Stats */}
                          <div className={`text-right text-xs ml-2 ${isSelected ? 'text-blue-100' : 'text-gray-600'} space-y-0.5`}>
                            <div className="font-bold">{stats.pts} PTS</div>
                            {stats.fga > 0 && (
                              <div>{stats.fgm}/{stats.fga} FG</div>
                            )}
                            {reb > 0 && (
                              <div>{reb} REB</div>
                            )}
                            {stats.ast > 0 && (
                              <div>{stats.ast} AST</div>
                            )}
                            {pm !== 0 && (
                              <div className={pm > 0 ? 'text-green-400' : 'text-red-400'}>
                                {pm > 0 ? '+' : ''}{pm}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STAT ENTRY PANEL */}
            {selectedPlayer && (
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 sm:p-4 shadow-lg border-2 border-blue-300">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div>
                    <p className="text-xs font-bold text-blue-900 uppercase">Recording for</p>
                    <p className={`${compactMode ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'} font-black text-blue-600`}>
                      #{team.roster?.find(p => p.id === selectedPlayer)?.number}{' '}
                      {team.roster?.find(p => p.id === selectedPlayer)?.name}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedPlayer(null)}
                    className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-xs sm:text-sm font-bold"
                  >
                    Clear
                  </button>
                </div>
                
                {/* Shooting */}
                <div className="mb-3 sm:mb-4">
                  <p className="text-xs font-bold text-gray-700 uppercase mb-2">Scoring</p>
                  {/* MADE shots - 2PT, 3PT, FT in one row */}
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <button
                      onClick={() => handleQuickStat(selectedPlayer, 'fgm', 2, false)}
                      className={`${compactMode ? 'h-14 sm:h-16' : 'h-16 sm:h-20'} bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:scale-95 text-white rounded-xl font-black text-base sm:text-xl transition-all shadow-lg`}
                    >
                      MADE 2
                    </button>
                    <button
                      onClick={() => handleQuickStat(selectedPlayer, 'tpm', 3, false)}
                      className={`${compactMode ? 'h-14 sm:h-16' : 'h-16 sm:h-20'} bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 active:scale-95 text-white rounded-xl font-black text-base sm:text-xl transition-all shadow-lg`}
                    >
                      MADE 3
                    </button>
                    <button
                      onClick={() => handleQuickStat(selectedPlayer, 'ftm', 1, false)}
                      className={`${compactMode ? 'h-14 sm:h-16' : 'h-16 sm:h-20'} bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 active:scale-95 text-white rounded-xl font-black text-base sm:text-xl transition-all shadow-lg`}
                    >
                      MADE FT
                    </button>
                  </div>
                  {/* MISS shots - 2PT, 3PT, FT in one row */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleQuickStat(selectedPlayer, 'fgm', 0, true)}
                      className={`${compactMode ? 'h-14 sm:h-16' : 'h-16 sm:h-20'} bg-gradient-to-br from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 active:scale-95 text-white rounded-xl font-black text-base sm:text-xl transition-all shadow-lg`}
                    >
                      MISS 2
                    </button>
                    <button
                      onClick={() => handleQuickStat(selectedPlayer, 'tpm', 0, true)}
                      className={`${compactMode ? 'h-14 sm:h-16' : 'h-16 sm:h-20'} bg-gradient-to-br from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 active:scale-95 text-white rounded-xl font-black text-base sm:text-xl transition-all shadow-lg`}
                    >
                      MISS 3
                    </button>
                    <button
                      onClick={() => handleQuickStat(selectedPlayer, 'ftm', 0, true)}
                      className={`${compactMode ? 'h-14 sm:h-16' : 'h-16 sm:h-20'} bg-gradient-to-br from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 active:scale-95 text-white rounded-xl font-black text-base sm:text-xl transition-all shadow-lg`}
                    >
                      MISS FT
                    </button>
                  </div>
                </div>

                {/* Other Stats */}
                <div className="mb-3 sm:mb-4">
                  <p className="text-xs font-bold text-gray-700 uppercase mb-2">Other Stats</p>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    <button
                      onClick={() => handleQuickStat(selectedPlayer, 'oreb', 0)}
                      className={`${compactMode ? 'h-10 sm:h-12' : 'h-12 sm:h-14'} bg-gray-600 hover:bg-gray-700 active:scale-95 text-white rounded-lg font-black text-xs sm:text-sm transition-all shadow-md`}
                    >
                      OREB
                    </button>
                    <button
                      onClick={() => handleQuickStat(selectedPlayer, 'dreb', 0)}
                      className={`${compactMode ? 'h-10 sm:h-12' : 'h-12 sm:h-14'} bg-gray-500 hover:bg-gray-600 active:scale-95 text-white rounded-lg font-black text-xs sm:text-sm transition-all shadow-md`}
                    >
                      DREB
                    </button>
                    <button
                      onClick={() => handleQuickStat(selectedPlayer, 'ast', 0)}
                      className={`${compactMode ? 'h-10 sm:h-12' : 'h-12 sm:h-14'} bg-yellow-600 hover:bg-yellow-700 active:scale-95 text-white rounded-lg font-black text-xs sm:text-sm transition-all shadow-md`}
                    >
                      AST
                    </button>
                    <button
                      onClick={() => handleQuickStat(selectedPlayer, 'stl', 0)}
                      className={`${compactMode ? 'h-10 sm:h-12' : 'h-12 sm:h-14'} bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg font-black text-xs sm:text-sm transition-all shadow-md`}
                    >
                      STL
                    </button>
                    <button
                      onClick={() => handleQuickStat(selectedPlayer, 'blk', 0)}
                      className={`${compactMode ? 'h-10 sm:h-12' : 'h-12 sm:h-14'} bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg font-black text-xs sm:text-sm transition-all shadow-md`}
                    >
                      BLK
                    </button>
                    <button
                      onClick={() => handleQuickStat(selectedPlayer, 'to', 0)}
                      className={`${compactMode ? 'h-10 sm:h-12' : 'h-12 sm:h-14'} bg-orange-600 hover:bg-orange-700 active:scale-95 text-white rounded-lg font-black text-xs sm:text-sm transition-all shadow-md`}
                    >
                      TO
                    </button>
                    <button
                      onClick={() => handleQuickStat(selectedPlayer, 'pf', 0)}
                      className={`${compactMode ? 'h-10 sm:h-12' : 'h-12 sm:h-14'} bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-lg font-black text-xs sm:text-sm transition-all shadow-md`}
                    >
                      FOUL
                    </button>
                    {activePlayers.includes(selectedPlayer) && team.roster?.filter(p => !activePlayers.includes(p.id)).length > 0 && (
                      <button
                        onClick={() => setShowSubPanel(!showSubPanel)}
                        className={`${compactMode ? 'h-10 sm:h-12' : 'h-12 sm:h-14'} ${showSubPanel ? 'bg-orange-600 hover:bg-orange-700' : 'bg-orange-500 hover:bg-orange-600'} active:scale-95 text-white rounded-lg font-black text-xs sm:text-sm transition-all shadow-md`}
                      >
                        SUB
                      </button>
                    )}
                  </div>
                </div>

                {/* Substitution Panel */}
                {showSubPanel && activePlayers.includes(selectedPlayer) && team.roster?.filter(p => !activePlayers.includes(p.id)).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-700 uppercase mb-2">Substitute Player</p>
                    <div className="grid grid-cols-4 gap-2">
                      {team.roster?.filter(p => !activePlayers.includes(p.id)).map(player => (
                        <button
                          key={player.id}
                          onClick={() => {
                            handleSwapPlayers(selectedPlayer, player.id);
                            setShowSubPanel(false);
                          }}
                          className="flex flex-col items-center justify-center p-3 bg-white border-2 border-orange-300 hover:bg-orange-50 rounded-xl font-bold transition active:scale-95"
                        >
                          <div className="text-xl text-orange-600">#{player.number}</div>
                          <div className="text-xs text-gray-700 mt-1">{player.name.split(' ')[0]}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* OPPONENT STATS PANEL */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-3 sm:p-4 shadow-lg border-2 border-red-300">
              <h3 className="font-bold text-red-900 mb-2 sm:mb-3 text-xs sm:text-sm uppercase tracking-wide">
                {gameSettings.opponent}
              </h3>
              
              <div className="mb-3 sm:mb-4">
                <p className="text-xs font-bold text-gray-700 uppercase mb-2">Scoring</p>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <button
                    onClick={() => handleOpponentQuickStat('fgm', 2)}
                    className={`${compactMode ? 'h-14 sm:h-16' : 'h-16 sm:h-20'} bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 active:scale-95 text-white rounded-lg sm:rounded-xl font-black text-base sm:text-xl transition-all shadow-lg`}
                  >
                    2PT
                  </button>
                  <button
                    onClick={() => handleOpponentQuickStat('tpm', 3)}
                    className={`${compactMode ? 'h-14 sm:h-16' : 'h-16 sm:h-20'} bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 active:scale-95 text-white rounded-lg sm:rounded-xl font-black text-base sm:text-xl transition-all shadow-lg`}
                  >
                    3PT
                  </button>
                  <button
                    onClick={() => handleOpponentQuickStat('ftm', 1)}
                    className={`${compactMode ? 'h-14 sm:h-16' : 'h-16 sm:h-20'} bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 active:scale-95 text-white rounded-lg sm:rounded-xl font-black text-base sm:text-xl transition-all shadow-lg`}
                  >
                    FT
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-700 uppercase mb-2">Other Stats</p>
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  <button
                    onClick={() => handleOpponentQuickStat('oreb', 0)}
                    className={`${compactMode ? 'h-10 sm:h-12' : 'h-12 sm:h-14'} bg-gray-600 hover:bg-gray-700 active:scale-95 text-white rounded-lg font-black text-xs sm:text-sm transition-all shadow-md`}
                  >
                    OREB
                  </button>
                  <button
                    onClick={() => handleOpponentQuickStat('dreb', 0)}
                    className={`${compactMode ? 'h-10 sm:h-12' : 'h-12 sm:h-14'} bg-gray-500 hover:bg-gray-600 active:scale-95 text-white rounded-lg font-black text-xs sm:text-sm transition-all shadow-md`}
                  >
                    DREB
                  </button>
                  <button
                    onClick={() => handleOpponentQuickStat('ast', 0)}
                    className={`${compactMode ? 'h-10 sm:h-12' : 'h-12 sm:h-14'} bg-yellow-600 hover:bg-yellow-700 active:scale-95 text-white rounded-lg font-black text-xs sm:text-sm transition-all shadow-md`}
                  >
                    AST
                  </button>
                  <button
                    onClick={() => handleOpponentQuickStat('stl', 0)}
                    className={`${compactMode ? 'h-10 sm:h-12' : 'h-12 sm:h-14'} bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg font-black text-xs sm:text-sm transition-all shadow-md`}
                  >
                    STL
                  </button>
                  <button
                    onClick={() => handleOpponentQuickStat('blk', 0)}
                    className={`${compactMode ? 'h-10 sm:h-12' : 'h-12 sm:h-14'} bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg font-black text-xs sm:text-sm transition-all shadow-md`}
                  >
                    BLK
                  </button>
                  <button
                    onClick={() => handleOpponentQuickStat('to', 0)}
                    className={`${compactMode ? 'h-10 sm:h-12' : 'h-12 sm:h-14'} bg-orange-600 hover:bg-orange-700 active:scale-95 text-white rounded-lg font-black text-xs sm:text-sm transition-all shadow-md`}
                  >
                    TO
                  </button>
                  <button
                    onClick={() => handleOpponentQuickStat('pf', 0)}
                    className={`${compactMode ? 'h-10 sm:h-12' : 'h-12 sm:h-14'} bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-lg font-black text-xs sm:text-sm transition-all shadow-md col-span-2`}
                  >
                    FOUL
                  </button>
                </div>
              </div>
            </div>

            {/* RECENT PLAYS */}
            {recentPlays.length > 0 && (
              <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h3 className="font-bold text-gray-900 text-xs sm:text-sm uppercase tracking-wide">Recent Plays</h3>
                  <button
                    onClick={undoLastPlay}
                    className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-bold text-xs sm:text-sm transition active:scale-95"
                  >
                    <RotateCcw size={12} className="sm:w-3.5 sm:h-3.5" />
                    Undo
                  </button>
                </div>
                <div className="space-y-1">
                  {recentPlays.map(play => (
                    <div key={play.id} className="flex items-center justify-between p-1.5 sm:p-2 bg-gray-50 rounded text-xs sm:text-sm">
                      <span className="font-medium text-gray-900 truncate">{play.description}</span>
                      <span className="text-gray-500 text-xs flex-shrink-0 ml-2">{play.time} - {play.period}Q</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* STATS SIDEBAR - Only in compact mode */}
          {compactMode && (
            <div className="space-y-4">
              {/* ACTIVE PLAYERS STATS */}
              <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-2 text-xs uppercase tracking-wide">Active Players</h3>
                <div className="space-y-2">
                  {activePlayers.map(playerId => {
                    const player = team.roster?.find(p => p.id === playerId);
                    if (!player) return null;
                    const stats = liveStats[playerId] || {};
                    const pm = plusMinus[playerId] || 0;
                    
                    return (
                      <div key={playerId} className="text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold">#{player.number} {player.name.split(' ')[0]}</span>
                          <span className={`font-bold ${pm > 0 ? 'text-green-600' : pm < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                            {pm > 0 ? '+' : ''}{pm}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-gray-600">
                          <span>{stats.pts || 0} PTS</span>
                          <span>{calculateShootingPct(stats.fgm || 0, stats.fga || 0)}% FG</span>
                          <span>{calculateShootingPct(stats.tpm || 0, stats.tpa || 0)}% 3P</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* TEAM TOTALS */}
              <div className="bg-blue-50 rounded-xl p-3 shadow-sm border border-blue-200">
                <h3 className="font-bold text-blue-900 mb-2 text-xs uppercase tracking-wide">Team Totals</h3>
                <div className="space-y-1 text-xs text-gray-700">
                  <div className="flex justify-between">
                    <span>Points</span>
                    <span className="font-bold">{teamStats.pts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>FG%</span>
                    <span className="font-bold">{calculateShootingPct(teamStats.fgm, teamStats.fga)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>3PT%</span>
                    <span className="font-bold">{calculateShootingPct(teamStats.tpm, teamStats.tpa)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>FT%</span>
                    <span className="font-bold">{calculateShootingPct(teamStats.ftm, teamStats.fta)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rebounds</span>
                    <span className="font-bold">{teamStats.oreb + teamStats.dreb}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Assists</span>
                    <span className="font-bold">{teamStats.ast}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PERIOD SUMMARY MODAL */}
      {showPeriodSummary && periodSummaryData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-black text-gray-900 mb-4">
              Period {periodSummaryData.period} Complete
            </h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <div className="text-sm font-bold text-gray-600 mb-1">{homeTeamName}</div>
                <div className="text-4xl font-black text-blue-600">{periodSummaryData.homeScore}</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-xl">
                <div className="text-sm font-bold text-gray-600 mb-1">{awayTeamName}</div>
                <div className="text-4xl font-black text-red-600">{periodSummaryData.awayScore}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <h3 className="font-bold text-sm mb-2">{team.name} Stats</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>FG%:</span>
                    <span className="font-bold">{calculateShootingPct(periodSummaryData.teamStats.fgm, periodSummaryData.teamStats.fga)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>3PT%:</span>
                    <span className="font-bold">{calculateShootingPct(periodSummaryData.teamStats.tpm, periodSummaryData.teamStats.tpa)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rebounds:</span>
                    <span className="font-bold">{periodSummaryData.teamStats.oreb + periodSummaryData.teamStats.dreb}</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-sm mb-2">{gameSettings.opponent} Stats</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>FG%:</span>
                    <span className="font-bold">{calculateShootingPct(periodSummaryData.opponentStats.fgm, periodSummaryData.opponentStats.fga)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>3PT%:</span>
                    <span className="font-bold">{calculateShootingPct(periodSummaryData.opponentStats.tpm, periodSummaryData.opponentStats.tpa)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rebounds:</span>
                    <span className="font-bold">{periodSummaryData.opponentStats.oreb + periodSummaryData.opponentStats.dreb}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-bold text-gray-700 mb-3">Reset team fouls for next period?</p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => confirmNextPeriod(true)}
                  className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition"
                >
                  Yes, Reset
                </button>
                <button
                  onClick={() => confirmNextPeriod(false)}
                  className="py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold transition"
                >
                  No, Keep
                </button>
                <button
                  onClick={() => setShowPeriodSummary(false)}
                  className="py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* SHOT MAP MODAL */}
      {showShotMap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black text-gray-900">Shot Map</h2>
              <button
                onClick={() => setShowShotMap(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold transition"
              >
                Close
              </button>
            </div>
            
            <div className="bg-gradient-to-b from-orange-100 to-orange-50 rounded-xl p-8 border-4 border-orange-800">
              <div className="text-center text-gray-500 py-20">
                <Target size={64} className="mx-auto mb-4 text-gray-400" />
                <p className="text-xl font-bold mb-2">Shot Map Coming Soon!</p>
                <p className="text-sm">Click on the court to record shot locations</p>
                <p className="text-xs mt-4 text-gray-400">Feature in development - will track make/miss locations for heat maps</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveGameView;
