import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import AppHeader from '../Shared/AppHeader';
import { Play, Pause, RotateCcw, LayoutDashboard } from 'lucide-react';
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
  
  // Refresh roster from database
  const [team, setTeam] = useState(initialTeam);
  
  // State
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

  // Refresh roster when component mounts
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
          setTeam({
            ...data,
            roster: data.players || []
          });
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
      console.log('🎮 Initializing LiveGameView');
      
      const existingSessionGameId = localStorage.getItem(sessionKey);
      
      if (existingGame) {
        console.log('✅ Resuming game:', existingGame.id);
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
        
        toast?.success('Game resumed!');
      } else if (existingSessionGameId && !currentGameId) {
        console.log('📌 Found session game:', existingSessionGameId);
        setCurrentGameId(existingSessionGameId);
      } else if (!currentGameId) {
        console.log('🆕 Creating new game...');
        await createGame();
      } else {
        console.log('⏭️ Game already initialized');
      }
      
      if (!existingGame && team.roster && team.roster.length > 0 && activePlayers.length === 0) {
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

  // Create game
  const createGame = async () => {
    const result = await GameStateManager.createGame({
      userId: user.id,
      teamId: team.id,
      teamName: team.name,
      opponent: gameSettings.opponent,
      isHome: gameSettings.isHome,
      periodLength: gameSettings.periodLength,
      totalPeriods: gameSettings.totalPeriods
    });

    if (result.success) {
      console.log('✅ Game created:', result.game.id);
      setCurrentGameId(result.game.id);
      localStorage.setItem(sessionKey, result.game.id);
      toast?.success('Game started!');
    } else {
      console.error('❌ Failed to create game');
      toast?.error('Failed to start game');
    }
  };

  // Add recent play
  const addRecentPlay = (playDescription) => {
    const play = {
      id: Date.now(),
      description: playDescription,
      time: `${Math.floor(gameTime / 60)}:${(gameTime % 60).toString().padStart(2, '0')}`,
      period: currentPeriod
    };
    setRecentPlays(prev => [play, ...prev].slice(0, 5));
  };

  // Handle quick stat
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

      addRecentPlay(`${player?.name} - ${statName}`);
      
      if (points > 0) {
        toast?.success(`+${points} ${player?.name}`);
      }
    } else {
      toast?.error('Failed to record stat');
    }
  };

  // Handle opponent stat
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

    const newAwayScore = gameSettings.isHome ? awayScore + points : homeScore + points;
    const newHomeScore = gameSettings.isHome ? homeScore : awayScore + points;

    const manager = new GameStateManager(currentGameId);
    const result = await manager.saveGameState({
      homeScore: newHomeScore,
      awayScore: newAwayScore,
      period: currentPeriod,
      timeRemaining: gameTime,
      stats: liveStats,
      opponentStats: newOpponentStats,
      activePlayers,
      gameSettings: { ...gameSettings, homeFouls, awayFouls }
    });

    if (result.success) {
      setOpponentStats(newOpponentStats);
      setHomeScore(newHomeScore);
      setAwayScore(newAwayScore);

      const statName = {
        fgm: '2PT',
        tpm: '3PT',
        ftm: 'FT'
      }[statType] || statType.toUpperCase();

      addRecentPlay(`${gameSettings.opponent} - ${statName}`);
    }
  };

  // Handle swap players
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

  // Undo last play
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

  // Undo a specific stat
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

  // Handle next period
  const handleNextPeriod = () => {
    if (currentPeriod < gameSettings.totalPeriods) {
      setCurrentPeriod(prev => prev + 1);
      setGameTime(gameSettings.periodLength * 60);
      setIsTimerRunning(false);
      
      if (currentPeriod < gameSettings.totalPeriods) {
        setHomeFouls(0);
        setAwayFouls(0);
      }
      
      toast?.info(`Starting Period ${currentPeriod + 1}`);
    }
  };

  // Handle end game
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
        gameSettings: { ...gameSettings, homeFouls, awayFouls }
      });
    }

    localStorage.removeItem(sessionKey);
    
    toast?.success('Game ended!');
    onEndGame();
  };

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const homeTeamName = gameSettings.isHome ? team.name : gameSettings.opponent;
  const awayTeamName = gameSettings.isHome ? gameSettings.opponent : team.name;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader 
        title="Live Game"
        onBack={onGoHome}
      >
        <button
          onClick={onGoHome}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition"
          title="Back to Dashboard"
        >
          <LayoutDashboard size={16} />
          Dashboard
        </button>
      </AppHeader>

      <div className="max-w-4xl mx-auto p-4 pb-20">
        {/* SCOREBOARD */}
        <div className="sticky top-0 z-10 bg-white rounded-xl shadow-lg p-4 mb-4 border-2 border-gray-200">
          <div className="grid grid-cols-3 gap-4 items-center mb-3">
            <div className="text-center">
              <div className="text-xs font-bold text-gray-600 uppercase mb-1">{homeTeamName}</div>
              <div className="text-5xl font-black text-blue-600">{homeScore}</div>
              <div className="text-xs text-gray-500 mt-1">Fouls: {homeFouls}</div>
            </div>

            <div className="text-center">
              <div className="text-sm font-bold text-gray-600 uppercase">Period {currentPeriod}</div>
              <div className="text-3xl font-black text-gray-900 mb-2">{formatTime(gameTime)}</div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  {isTimerRunning ? <Pause size={20} /> : <Play size={20} />}
                </button>
              </div>
            </div>

            <div className="text-center">
              <div className="text-xs font-bold text-gray-600 uppercase mb-1">{awayTeamName}</div>
              <div className="text-5xl font-black text-red-600">{awayScore}</div>
              <div className="text-xs text-gray-500 mt-1">Fouls: {awayFouls}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleNextPeriod}
              disabled={currentPeriod >= gameSettings.totalPeriods}
              className="py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-bold text-sm transition"
            >
              Next Period
            </button>
            <button
              onClick={handleEndGame}
              className="py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition"
            >
              End Game
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* ACTIVE PLAYERS */}
          {activePlayers.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">On Court</h3>
              <div className="grid grid-cols-5 gap-2">
                {activePlayers.map(playerId => {
                  const player = team.roster?.find(p => p.id === playerId);
                  if (!player) return null;
                  
                  const stats = liveStats[playerId] || { pts: 0 };
                  const isSelected = selectedPlayer === playerId;
                  
                  return (
                    <button
                      key={playerId}
                      onClick={() => setSelectedPlayer(isSelected ? null : playerId)}
                      className={`p-3 rounded-xl font-bold text-center transition-all active:scale-95 ${
                        isSelected 
                          ? 'bg-blue-600 text-white shadow-lg' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                      }`}
                    >
                      <div className="text-2xl">
                        {player?.number}
                      </div>
                      {stats.pts > 0 && (
                        <div className={`text-xl ${isSelected ? 'text-white' : 'text-blue-600'}`}>
                          {stats.pts}
                        </div>
                      )}
                      <div className={`text-xs mt-1 ${isSelected ? 'text-blue-200' : 'text-gray-500'}`}>
                        {player?.name?.split(' ')[0]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* BENCH PLAYERS */}
          {team.roster?.filter(p => !activePlayers.includes(p.id)).length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">Bench</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {team.roster?.filter(p => !activePlayers.includes(p.id)).map(player => {
                  const stats = liveStats[player.id] || { pts: 0 };
                  const isSelected = selectedPlayer === player.id;
                  
                  return (
                    <button
                      key={player.id}
                      onClick={() => setSelectedPlayer(isSelected ? null : player.id)}
                      className={`flex-shrink-0 w-20 p-3 rounded-xl font-bold text-center transition-all active:scale-95 ${
                        isSelected 
                          ? 'bg-blue-600 text-white shadow-lg' 
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="text-xl">
                        {player.number}
                      </div>
                      {stats.pts > 0 && (
                        <div className={`text-lg ${isSelected ? 'text-white' : 'text-blue-600'}`}>
                          {stats.pts}
                        </div>
                      )}
                      <div className={`text-xs mt-1 ${isSelected ? 'text-blue-200' : 'text-gray-500'}`}>
                        {player.name?.split(' ')[0]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STAT ENTRY PANEL */}
          {selectedPlayer && (
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 shadow-lg border-2 border-blue-300">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-bold text-blue-900 uppercase">Recording for</p>
                  <p className="text-xl font-black text-blue-600">
                    #{team.roster?.find(p => p.id === selectedPlayer)?.number}{' '}
                    {team.roster?.find(p => p.id === selectedPlayer)?.name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-bold"
                >
                  Clear
                </button>
              </div>
              
              {/* Shooting */}
              <div className="mb-4">
                <p className="text-xs font-bold text-gray-700 uppercase mb-2">Scoring</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleQuickStat(selectedPlayer, 'fgm', 2, false)}
                    className="h-24 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:scale-95 text-white rounded-2xl font-black text-2xl transition-all shadow-lg"
                  >
                    MADE 2
                  </button>
                  <button
                    onClick={() => handleQuickStat(selectedPlayer, 'fgm', 0, true)}
                    className="h-24 bg-gradient-to-br from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 active:scale-95 text-white rounded-2xl font-black text-2xl transition-all shadow-lg"
                  >
                    MISS 2
                  </button>
                  <button
                    onClick={() => handleQuickStat(selectedPlayer, 'tpm', 3, false)}
                    className="h-24 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 active:scale-95 text-white rounded-2xl font-black text-2xl transition-all shadow-lg"
                  >
                    MADE 3
                  </button>
                  <button
                    onClick={() => handleQuickStat(selectedPlayer, 'tpm', 0, true)}
                    className="h-24 bg-gradient-to-br from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 active:scale-95 text-white rounded-2xl font-black text-2xl transition-all shadow-lg"
                  >
                    MISS 3
                  </button>
                  <button
                    onClick={() => handleQuickStat(selectedPlayer, 'ftm', 1, false)}
                    className="h-20 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 active:scale-95 text-white rounded-2xl font-black text-xl transition-all shadow-lg"
                  >
                    MADE FT
                  </button>
                  <button
                    onClick={() => handleQuickStat(selectedPlayer, 'ftm', 0, true)}
                    className="h-20 bg-gradient-to-br from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 active:scale-95 text-white rounded-2xl font-black text-xl transition-all shadow-lg"
                  >
                    MISS FT
                  </button>
                </div>
              </div>

              {/* Other Stats */}
              <div className="mb-4">
                <p className="text-xs font-bold text-gray-700 uppercase mb-2">Other Stats</p>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => handleQuickStat(selectedPlayer, 'oreb', 0)}
                    className="h-16 bg-gray-600 hover:bg-gray-700 active:scale-95 text-white rounded-xl font-black text-sm transition-all shadow-md"
                  >
                    OREB
                  </button>
                  <button
                    onClick={() => handleQuickStat(selectedPlayer, 'dreb', 0)}
                    className="h-16 bg-gray-500 hover:bg-gray-600 active:scale-95 text-white rounded-xl font-black text-sm transition-all shadow-md"
                  >
                    DREB
                  </button>
                  <button
                    onClick={() => handleQuickStat(selectedPlayer, 'ast', 0)}
                    className="h-16 bg-yellow-600 hover:bg-yellow-700 active:scale-95 text-white rounded-xl font-black text-sm transition-all shadow-md"
                  >
                    AST
                  </button>
                  <button
                    onClick={() => handleQuickStat(selectedPlayer, 'stl', 0)}
                    className="h-16 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-black text-sm transition-all shadow-md"
                  >
                    STL
                  </button>
                  <button
                    onClick={() => handleQuickStat(selectedPlayer, 'blk', 0)}
                    className="h-16 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-black text-sm transition-all shadow-md"
                  >
                    BLK
                  </button>
                  <button
                    onClick={() => handleQuickStat(selectedPlayer, 'to', 0)}
                    className="h-16 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white rounded-xl font-black text-sm transition-all shadow-md"
                  >
                    TO
                  </button>
                  <button
                    onClick={() => handleQuickStat(selectedPlayer, 'pf', 0)}
                    className="h-16 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl font-black text-sm transition-all shadow-md col-span-2"
                  >
                    FOUL
                  </button>
                </div>
              </div>

              {/* Quick Sub */}
              {activePlayers.includes(selectedPlayer) && team.roster?.filter(p => !activePlayers.includes(p.id)).length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-700 uppercase mb-2">Quick Sub</p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {team.roster?.filter(p => !activePlayers.includes(p.id)).map(player => (
                      <button
                        key={player.id}
                        onClick={() => handleSwapPlayers(selectedPlayer, player.id)}
                        className="flex-shrink-0 px-4 py-3 bg-orange-100 border-2 border-orange-300 hover:bg-orange-200 rounded-xl font-bold transition active:scale-95"
                      >
                        ↔ #{player.number} {player.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OPPONENT SCORING */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 shadow-lg border-2 border-red-300">
            <h3 className="font-bold text-red-900 mb-3 text-sm uppercase tracking-wide">
              {gameSettings.opponent} Scoring
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleOpponentQuickStat('fgm', 2)}
                className="h-20 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 active:scale-95 text-white rounded-xl font-black text-xl transition-all shadow-lg"
              >
                2PT
              </button>
              <button
                onClick={() => handleOpponentQuickStat('tpm', 3)}
                className="h-20 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 active:scale-95 text-white rounded-xl font-black text-xl transition-all shadow-lg"
              >
                3PT
              </button>
              <button
                onClick={() => handleOpponentQuickStat('ftm', 1)}
                className="h-20 bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 active:scale-95 text-white rounded-xl font-black text-xl transition-all shadow-lg"
              >
                FT
              </button>
            </div>
          </div>

          {/* RECENT PLAYS */}
          {recentPlays.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Recent Plays</h3>
                <button
                  onClick={undoLastPlay}
                  className="flex items-center gap-1 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-bold text-sm transition active:scale-95"
                >
                  <RotateCcw size={14} />
                  Undo
                </button>
              </div>
              <div className="space-y-1">
                {recentPlays.map(play => (
                  <div key={play.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <span className="font-medium text-gray-900">{play.description}</span>
                    <span className="text-gray-500 text-xs">{play.time} - {play.period}Q</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveGameView;
