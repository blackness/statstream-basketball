import React, { useState, useEffect, useRef } from 'react';  // ✅ Add useRef
import { supabase } from '../../../supabase';
import AppHeader from '../Shared/AppHeader';
import { Play, Pause } from 'lucide-react';


const LiveGameView = ({ 
  user,
  team, 
  gameSettings,
  existingGame = null, // ✅ NEW: Accept existing game for resume
  onEndGame,
  onGoHome,
  toast 
}) => {
  const [currentGameId, setCurrentGameId] = useState(existingGame?.id || null);
  const [homeScore, setHomeScore] = useState(existingGame?.home_score || 0);
  const [awayScore, setAwayScore] = useState(existingGame?.away_score || 0);
  const [currentPeriod, setCurrentPeriod] = useState(existingGame?.period || 1);
  const [gameTime, setGameTime] = useState(existingGame?.time_remaining || (gameSettings.periodLength * 60));
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [liveStats, setLiveStats] = useState(existingGame?.stats || {});
  const creatingGame = useRef(false);
  const [opponentStats, setOpponentStats] = useState(
  existingGame?.opponent_stats || { team: { pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0 } }
);
const [activePlayers, setActivePlayers] = useState(
  existingGame?.active_players && Array.isArray(existingGame.active_players) && existingGame.active_players.length > 0
    ? existingGame.active_players
    : []
);
const [selectedForSub, setSelectedForSub] = useState(null);
const [selectedPlayer, setSelectedPlayer] = useState(null);

 // Initialize game
useEffect(() => {
  if (!existingGame) {
    // New game - create it only once
    if (!creatingGame.current && !currentGameId) {
      creatingGame.current = true;  // ✅ Prevents Strict Mode double-call
      createGame();
    }
    
    // Set default active players
    if (team.roster && team.roster.length > 0 && activePlayers.length === 0) {
      const firstFive = team.roster.slice(0, 5).map(p => p.id);
      setActivePlayers(firstFive);
    }
  } else {
    // Resuming - just show success
    toast?.success('Game resumed!');
  }
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

  // Auto-save every 5 seconds
  useEffect(() => {
    if (!currentGameId) return;
    
    const interval = setInterval(() => {
      saveGame();
    }, 5000);

    return () => clearInterval(interval);
  }, [currentGameId, homeScore, awayScore, currentPeriod, gameTime, liveStats, opponentStats, activePlayers]);

const createGame = async () => {
  if (currentGameId || creatingGame.current) {
    console.log('⚠️ Game already created or creating, skipping');
    return;
  }
  
  creatingGame.current = true;
  console.log('🆕 Creating new game...');

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
    setCurrentGameId(result.game.id);
    toast?.success('Game started!');
  } else {
    toast?.error('Failed to start game');
    creatingGame.current = false; // Reset on failure
  }
};

  const saveGame = async () => {
    if (!currentGameId) return;

    try {
      const { error } = await supabase
        .from('games')
        .update({
          home_score: homeScore,
          away_score: awayScore,
          period: currentPeriod,
          time_remaining: gameTime,
          stats: liveStats,
          opponent_stats: opponentStats,
          active_players: activePlayers,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentGameId);

      if (error) throw error;
    } catch (err) {
      console.error('Error saving game:', err);
    }
  };

const handleQuickStat = async (playerId, statType, points = 0) => {
  // Update player stats
  const updatedStats = {
    ...liveStats,
    [playerId]: {
      ...(liveStats[playerId] || {
        pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0,
        oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0
      }),
      [statType]: ((liveStats[playerId]?.[statType] || 0) + 1),
      pts: (liveStats[playerId]?.pts || 0) + points
    }
  };

  setLiveStats(updatedStats);

  // Update score - use functional setState to get latest value
  let newHomeScore = homeScore;
  let newAwayScore = awayScore;
  
  if (points > 0) {
    if (gameSettings.isHome) {
      newHomeScore = homeScore + points;
      setHomeScore(newHomeScore);
    } else {
      newAwayScore = awayScore + points;
      setAwayScore(newAwayScore);
    }
    toast?.success(`+${points} points!`, 'success', 500);
  }

  // Save immediately with the new values
  if (currentGameId) {
    try {
      await supabase
        .from('games')
        .update({
          home_score: newHomeScore,
          away_score: newAwayScore,
          period: currentPeriod,
          time_remaining: gameTime,
          stats: updatedStats,
          opponent_stats: opponentStats,
          active_players: activePlayers,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentGameId);
    } catch (err) {
      console.error('Error saving:', err);
    }
  }
};

const handleOpponentQuickStat = async (statType, points = 0) => {
  const updatedOpponentStats = {
    ...opponentStats,
    team: {
      ...(opponentStats.team || { pts: 0, fgm: 0, tpm: 0, ftm: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0 }),
      [statType]: ((opponentStats.team?.[statType] || 0) + 1),  // ✅ This increments the stat
      pts: (opponentStats.team?.pts || 0) + points  // ✅ This adds points
    }
  };

  console.log('Updated opponentStats:', updatedOpponentStats);
  
  setOpponentStats(updatedOpponentStats);
  
  // ... rest of function

  // Update score if points were scored
  let newHomeScore = homeScore;
  let newAwayScore = awayScore;
  
  if (points > 0) {
    if (gameSettings.isHome) {
      newAwayScore = awayScore + points;
      setAwayScore(newAwayScore);
    } else {
      newHomeScore = homeScore + points;
      setHomeScore(newHomeScore);
    }
    toast?.info(`Opponent +${points}`, 'info', 1000);
  }

  // Save immediately
  if (currentGameId) {
    try {
      await supabase
        .from('games')
        .update({
          home_score: newHomeScore,
          away_score: newAwayScore,
          period: currentPeriod,
          time_remaining: gameTime,
          stats: liveStats,
          opponent_stats: updatedOpponentStats,
          active_players: activePlayers,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentGameId);
    } catch (err) {
      console.error('Error saving:', err);
    }
  }
};


  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndGame = async () => {
    if (!confirm('End this game?')) return;

    try {
      await saveGame();
      
      const { error } = await supabase
        .from('games')
        .update({ status: 'completed' })
        .eq('id', currentGameId);

      if (error) throw error;

      toast?.success('Game ended!');
      onGoHome();
    } catch (err) {
      console.error('Error ending game:', err);
      toast?.error('Failed to end game');
    }
  };

  return (
    <div className="h-screen w-full bg-gray-50 flex flex-col overflow-hidden">
      
      <AppHeader
        title={existingGame ? "Resume Game" : "Live Game"}
        isDashboard={false}
        onDashboard={onGoHome}
        userEmail={user?.email}
      />

      {/* Scoreboard */}
      <div className="w-full bg-gradient-to-br from-blue-600 to-blue-700 text-white p-4 flex-shrink-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 text-center">
              <div className="text-sm font-bold opacity-90">{gameSettings.isHome ? team.name : gameSettings.opponent}</div>
              <div className="text-5xl font-black tabular-nums">{homeScore}</div>
            </div>
            
            <div className="px-6 text-center">
              <div className="text-sm font-bold opacity-90">Q{currentPeriod}</div>
              <div className="text-2xl font-black tabular-nums">{formatTime(gameTime)}</div>
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="mt-2 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
              >
                {isTimerRunning ? <Pause size={20} /> : <Play size={20} />}
              </button>
            </div>
            
            <div className="flex-1 text-center">
              <div className="text-sm font-bold opacity-90">{gameSettings.isHome ? gameSettings.opponent : team.name}</div>
              <div className="text-5xl font-black tabular-nums">{awayScore}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Players & Stats */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-6xl mx-auto space-y-4">
          
          {/* Active Players */}
{/* Active Players */}
{/* Two-Column Layout: Players Left, Stats Right */}
{/* Stat Buttons Panel - Only shows when player selected */}
{selectedPlayer && (
  <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-4">
    <div className="mb-3">
      <p className="text-sm font-bold text-blue-900">Recording stats for:</p>
      <p className="text-xl font-black text-blue-600">
        #{team.roster?.find(p => p.id === selectedPlayer)?.number} {team.roster?.find(p => p.id === selectedPlayer)?.name}
      </p>
    </div>
    
    <div className="grid grid-cols-5 gap-2">
      {/* Scoring */}
      <button
        onClick={() => handleQuickStat(selectedPlayer, 'fgm', 2)}
        className="h-16 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 active:scale-95 text-white rounded-lg font-black text-sm transition-all shadow-md"
      >
        2PT
      </button>
      <button
        onClick={() => handleQuickStat(selectedPlayer, 'tpm', 3)}
        className="h-16 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 active:scale-95 text-white rounded-lg font-black text-sm transition-all shadow-md"
      >
        3PT
      </button>
      <button
        onClick={() => handleQuickStat(selectedPlayer, 'ftm', 1)}
        className="h-16 bg-green-600 hover:bg-green-700 active:bg-green-800 active:scale-95 text-white rounded-lg font-black text-sm transition-all shadow-md"
      >
        FT
      </button>
      <button
        onClick={() => handleQuickStat(selectedPlayer, 'oreb', 0)}
        className="h-16 bg-gray-600 hover:bg-gray-700 active:bg-gray-800 active:scale-95 text-white rounded-lg font-black text-sm transition-all shadow-md"
      >
        OREB
      </button>
      <button
        onClick={() => handleQuickStat(selectedPlayer, 'dreb', 0)}
        className="h-16 bg-gray-500 hover:bg-gray-600 active:bg-gray-700 active:scale-95 text-white rounded-lg font-black text-sm transition-all shadow-md"
      >
        DREB
      </button>
      
      {/* Other Stats */}
      <button
        onClick={() => handleQuickStat(selectedPlayer, 'ast', 0)}
        className="h-16 bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 active:scale-95 text-white rounded-lg font-black text-sm transition-all shadow-md"
      >
        AST
      </button>
      <button
        onClick={() => handleQuickStat(selectedPlayer, 'stl', 0)}
        className="h-16 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 active:scale-95 text-white rounded-lg font-black text-sm transition-all shadow-md"
      >
        STL
      </button>
      <button
        onClick={() => handleQuickStat(selectedPlayer, 'blk', 0)}
        className="h-16 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 active:scale-95 text-white rounded-lg font-black text-sm transition-all shadow-md"
      >
        BLK
      </button>
      <button
        onClick={() => handleQuickStat(selectedPlayer, 'to', 0)}
        className="h-16 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 active:scale-95 text-white rounded-lg font-black text-sm transition-all shadow-md"
      >
        TO
      </button>
      <button
        onClick={() => handleQuickStat(selectedPlayer, 'pf', 0)}
        className="h-16 bg-red-600 hover:bg-red-700 active:bg-red-800 active:scale-95 text-white rounded-lg font-black text-sm transition-all shadow-md"
      >
        FOUL
      </button>
    </div>
  </div>
)}

{/* Active Players - Single Row */}
<div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-4">
  <h3 className="font-bold text-gray-900 mb-3 text-sm">ACTIVE PLAYERS</h3>
  <div className="flex gap-2 overflow-x-auto pb-2">
    {team.roster?.filter(p => activePlayers.includes(p.id)).map(player => {
      const stats = liveStats[player.id] || { pts: 0 };
      const isSelected = selectedPlayer === player.id;
      
      return (
        <button
          key={player.id}
          onClick={() => setSelectedPlayer(isSelected ? null : player.id)}
          className={`flex-shrink-0 w-20 p-3 rounded-xl font-bold transition-all text-center ${
            isSelected
              ? 'bg-blue-600 text-white shadow-lg scale-105 border-4 border-blue-700'
              : 'bg-green-50 text-gray-900 border-2 border-green-200 hover:bg-green-100 active:scale-95'
          }`}
        >
          <div className={`text-xs mb-1 ${isSelected ? 'text-blue-200' : 'text-gray-500'}`}>
            #{player.number}
          </div>
          <div className="text-sm leading-tight mb-2">
            {player.name.split(' ')[0]}
          </div>
          <div className={`text-lg font-black ${isSelected ? 'text-white' : 'text-blue-600'}`}>
            {stats.pts}
          </div>
        </button>
      );
    })}
  </div>
</div>

{/* Bench Players - Single Row (if any) */}
{team.roster?.filter(p => !activePlayers.includes(p.id)).length > 0 && (
  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-4">
    <h3 className="font-bold text-gray-700 mb-3 text-sm">BENCH</h3>
    <div className="flex gap-2 overflow-x-auto pb-2">
      {team.roster?.filter(p => !activePlayers.includes(p.id)).map(player => {
        const stats = liveStats[player.id] || { pts: 0 };
        const isSelected = selectedPlayer === player.id;
        
        return (
          <button
            key={player.id}
            onClick={() => setSelectedPlayer(isSelected ? null : player.id)}
            className={`flex-shrink-0 w-20 p-3 rounded-xl font-bold transition-all text-center ${
              isSelected
                ? 'bg-blue-600 text-white shadow-lg scale-105 border-4 border-blue-700'
                : 'bg-gray-50 text-gray-900 border-2 border-gray-200 hover:bg-gray-100 active:scale-95'
            }`}
          >
            <div className={`text-xs mb-1 ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
              #{player.number}
            </div>
            <div className="text-sm leading-tight mb-2">
              {player.name.split(' ')[0]}
            </div>
            {stats.pts > 0 && (
              <div className={`text-lg font-black ${isSelected ? 'text-white' : 'text-blue-600'}`}>
                {stats.pts}
              </div>
            )}
          </button>
        );
      })}
    </div>
  </div>
)}

{/* Substitution Options (when player selected) */}
{selectedPlayer && (
  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-4">
    {activePlayers.includes(selectedPlayer) ? (
      <>
        <h3 className="font-bold text-gray-900 mb-2 text-sm">SUBSTITUTE OUT</h3>
        <p className="text-xs text-gray-600 mb-3">
          Select a bench player to swap in for {team.roster?.find(p => p.id === selectedPlayer)?.name}
        </p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {team.roster?.filter(p => !activePlayers.includes(p.id)).map(player => (
            <button
              key={player.id}
              onClick={() => {
                handleSwapPlayers(selectedPlayer, player.id);
              }}
              className="flex-shrink-0 w-20 p-3 rounded-xl font-bold transition-all text-center bg-orange-100 border-2 border-orange-300 hover:bg-orange-200 active:scale-95"
            >
              <div className="text-xs mb-1 text-orange-700">#{player.number}</div>
              <div className="text-sm leading-tight text-gray-900">
                {player.name.split(' ')[0]}
              </div>
            </button>
          ))}
        </div>
      </>
    ) : (
      <button
        onClick={() => {
          const updatedActivePlayers = [...activePlayers, selectedPlayer];
          setActivePlayers(updatedActivePlayers);
          toast?.success(`${team.roster?.find(p => p.id === selectedPlayer)?.name} subbed in`);
          setSelectedPlayer(null);
        }}
        className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition"
      >
        ↑ Sub In {team.roster?.find(p => p.id === selectedPlayer)?.name}
      </button>
    )}
  </div>
)}
          {/* Controls */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (currentPeriod < gameSettings.totalPeriods) {
                  setCurrentPeriod(prev => prev + 1);
                  setGameTime(gameSettings.periodLength * 60);
                  setIsTimerRunning(false);
                  toast?.info(`Starting Q${currentPeriod + 1}`);
                }
              }}
              disabled={currentPeriod >= gameSettings.totalPeriods}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition disabled:opacity-50"
            >
              Next Period
            </button>
            <button
              onClick={handleEndGame}
              className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-bold transition"
            >
              End Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveGameView;