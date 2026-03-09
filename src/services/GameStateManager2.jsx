import { supabase } from '../supabase';

class GameStateManager {
  constructor(gameId) {
    this.gameId = gameId;
  }

  /**
   * Save current game state to database
   */
  async saveGameState({
    homeScore,
    awayScore,
    period,
    timeRemaining,
    timerRunning,
    stats,
    opponentStats,
    activePlayers,
    plusMinus,
    gameSettings,
    recentPlays
  }) {
    try {
      const { data, error } = await supabase
        .from('games')
        .update({
          home_score: homeScore,
          away_score: awayScore,
          period,
          time_remaining: timeRemaining,
          timer_running: timerRunning ?? false,
          stats,
          opponent_stats: opponentStats,
          active_players: activePlayers,
          plus_minus: plusMinus,
          game_settings: gameSettings,
          recent_plays: recentPlays || [],
          updated_at: new Date().toISOString()
        })
        .eq('id', this.gameId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error saving game state:', error);
      return { success: false, error };
    }
  }

  /**
   * Record a stat for a player
   */
  async recordStat({
    playerId,
    statType,
    points = 0,
    missed = false,
    currentStats,
    homeScore,
    awayScore,
    isHomeTeam,
    homeFouls,
    awayFouls,
    period,
    timeRemaining,
    timerRunning,
    opponentStats,
    activePlayers,
    plusMinus,
    gameSettings,
    recentPlays
  }) {
    // Calculate new player stats
    const playerStats = currentStats[playerId] || {
      pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0,
      oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0
    };

    const updatedPlayerStats = {
      ...playerStats,
      pts: playerStats.pts + points
    };

    // Handle shooting stats correctly
    if (statType === 'fgm' || statType === 'tpm' || statType === 'ftm') {
      // Always increment attempts
      const attemptStat = statType.replace('m', 'a');
      updatedPlayerStats[attemptStat] = (playerStats[attemptStat] || 0) + 1;
      
      // Only increment makes if not a miss
      if (!missed) {
        updatedPlayerStats[statType] = (playerStats[statType] || 0) + 1;
      }
    } else {
      // Non-shooting stats just increment normally
      updatedPlayerStats[statType] = (playerStats[statType] || 0) + 1;
    }

    const newStats = {
      ...currentStats,
      [playerId]: updatedPlayerStats
    };

    // Calculate new scores
    let newHomeScore = homeScore;
    let newAwayScore = awayScore;
    let newHomeFouls = homeFouls;
    let newAwayFouls = awayFouls;

    if (points > 0) {
      if (isHomeTeam) {
        newHomeScore = homeScore + points;
      } else {
        newAwayScore = awayScore + points;
      }
    }

    // Update fouls
    if (statType === 'pf') {
      if (isHomeTeam) {
        newHomeFouls = homeFouls + 1;
      } else {
        newAwayFouls = awayFouls + 1;
      }
    }

    // Save to database
    const result = await this.saveGameState({
      homeScore: newHomeScore,
      awayScore: newAwayScore,
      period,
      timeRemaining,
      timerRunning,
      stats: newStats,
      opponentStats,
      activePlayers,
      plusMinus,
      gameSettings: {
        ...gameSettings,
        homeFouls: newHomeFouls,
        awayFouls: newAwayFouls
      },
      recentPlays
    });

    return {
      ...result,
      newStats,
      newHomeScore,
      newAwayScore,
      newHomeFouls,
      newAwayFouls
    };
  }

  /**
   * Create new game
   */
  static async createGame({
    userId,
    teamId,
    teamName,
    opponent,
    isHome,
    periodLength,
    totalPeriods
  }) {
    try {
      const { data, error } = await supabase
        .from('games')
        .insert({
          user_id: userId,
          team_id: teamId,
          status: 'in-progress',
          opponent,
          home_team: isHome ? teamName : opponent,
          home_score: 0,
          away_score: 0,
          period: 1,
          time_remaining: periodLength * 60,
          stats: {},
          opponent_stats: {
            team: {
              pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0,
              oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0
            }
          },
          active_players: [],
          plus_minus: {},
          game_settings: {
            isHome,
            opponent,
            periodLength,
            totalPeriods,
            homeFouls: 0,
            awayFouls: 0
          }
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, game: data };
    } catch (error) {
      console.error('Error creating game:', error);
      return { success: false, error };
    }
  }

  /**
   * End game
   */
  async endGame({ homeScore, awayScore, period, stats, opponentStats, plusMinus, gameSettings }) {
    try {
      const { data, error } = await supabase
        .from('games')
        .update({
          status: 'completed',
          home_score: homeScore,
          away_score: awayScore,
          period,
          stats,
          opponent_stats: opponentStats,
          plus_minus: plusMinus,
          game_settings: gameSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.gameId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error ending game:', error);
      return { success: false, error };
    }
  }

  /**
   * Load game by ID
   */
  static async loadGame(gameId) {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error) throw error;

      return { success: true, game: data };
    } catch (error) {
      console.error('Error loading game:', error);
      return { success: false, error };
    }
  }
}

export default GameStateManager;
