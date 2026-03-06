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
  const [opponentStats, setOpponentStats] = useState(existingGame?.opponent_stats || {});
  const creatingGame = useRef(false);

const [activePlayers, setActivePlayers] = useState(
  existingGame?.active_players && Array.isArray(existingGame.active_players) && existingGame.active_players.length > 0
    ? existingGame.active_players
    : []
);

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
    try {
      const { data, error } = await supabase
        .from('games')
        .insert([{
          user_id: user.id,
          team_id: team.id,
          opponent: gameSettings.opponent,
          home_team: gameSettings.isHome ? team.name : gameSettings.opponent,
          status: 'in-progress',
          period: currentPeriod,
          time_remaining: gameTime,
          home_score: 0,
          away_score: 0,
          stats: {},
          opponent_stats: {},
          active_players: activePlayers,
          game_settings: gameSettings,
          visibility: 'private'
        }])
        .select()
        .single();

      if (error) throw error;
      
      setCurrentGameId(data.id);
      toast?.success('Game started!');
    } catch (err) {
      console.error('Error creating game:', err);
      toast?.error('Failed to start game');
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

const handleOpponentScore = async (points) => {
  let newHomeScore = homeScore;
  let newAwayScore = awayScore;

  if (gameSettings.isHome) {
    newAwayScore = awayScore + points;
    setAwayScore(newAwayScore);
  } else {
    newHomeScore = homeScore + points;
    setHomeScore(newHomeScore);
  }
  
  toast?.info(`Opponent +${points}`, 'info', 500);

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
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <h3 className="font-black text-gray-900 mb-3">Active Players</h3>
            <div className="space-y-2">
              {team.roster?.filter(p => activePlayers.includes(p.id)).map(player => {
                const stats = liveStats[player.id] || { pts: 0 };
                return (
<div className="flex items-center gap-2">
  <span className="font-black text-blue-600 text-lg mr-4">{stats.pts} pts</span>
  
  {/* Scoring */}
  <button
    onClick={() => handleQuickStat(player.id, 'fgm', 2)}
    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition"
  >
    2PT
  </button>
  <button
    onClick={() => handleQuickStat(player.id, 'tpm', 3)}
    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm transition"
  >
    3PT
  </button>
  <button
    onClick={() => handleQuickStat(player.id, 'ftm', 1)}
    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm transition"
  >
    FT
  </button>
  
  {/* Other Stats */}
  <button
    onClick={() => handleQuickStat(player.id, 'oreb', 0)}
    className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold text-sm transition"
  >
    REB
  </button>
  <button
    onClick={() => handleQuickStat(player.id, 'ast', 0)}
    className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-bold text-sm transition"
  >
    AST
  </button>
  <button
    onClick={() => handleQuickStat(player.id, 'stl', 0)}
    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition"
  >
    STL
  </button>
  <button
    onClick={() => handleQuickStat(player.id, 'blk', 0)}
    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm transition"
  >
    BLK
  </button>
  <button
    onClick={() => handleQuickStat(player.id, 'to', 0)}
    className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-sm transition"
  >
    TO
  </button>
  <button
    onClick={() => handleQuickStat(player.id, 'pf', 0)}
    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition"
  >
    FOUL
  </button>
</div>
                );
              })}
            </div>
          </div>

          {/* Opponent Scoring */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <h3 className="font-black text-gray-900 mb-3">Opponent Scoring</h3>
            <div className="flex gap-3">
              <button
                onClick={() => handleOpponentScore(2)}
                className="flex-1 px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-lg transition"
              >
                +2 PTS
              </button>
              <button
                onClick={() => handleOpponentScore(3)}
                className="flex-1 px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-lg transition"
              >
                +3 PTS
              </button>
              <button
                onClick={() => handleOpponentScore(1)}
                className="flex-1 px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-lg transition"
              >
                +1 PT
              </button>
            </div>
          </div>

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