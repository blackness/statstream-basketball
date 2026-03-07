import { supabase } from '../../supabase';

class GameStateManager {
  constructor(gameId) {
    this.gameId = gameId;
  }

  /**
   * Save game state to database
   */
  async saveGameState(state) {
    if (!this.gameId) {
      console.error('❌ No gameId - cannot save');
      return { success: false, error: 'No game ID' };
    }

    try {
      const { error } = await supabase
        .from('games')
        .update({
          home_score: state.homeScore,
          away_score: state.awayScore,
          period: state.period,
          time_remaining: state.timeRemaining,
          stats: state.stats,
          opponent_stats: state.opponentStats,
          active_players: state.activePlayers,
          game_settings: state.gameSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.gameId);

      if (error) {
        console.error('❌ Supabase error:', error);
        return { success: false, error };
      }

      return { success: true };
    } catch (err) {
      console.error('❌ Exception:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Update player stat and scores
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
    opponentStats,
    activePlayers,
    gameSettings
  }) {
    // Calculate new player stats
    const playerStats = currentStats[playerId] || {
      pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0,
      oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0
    };

    const updatedPlayerStats = {
      ...playerStats,
      [statType]: (playerStats[statType] || 0) + 1,
      pts: playerStats.pts + points
    };

    // Add missed attempt if applicable
    if (missed) {
      const attemptStat = statType.replace('m', 'a');
      updatedPlayerStats[attemptStat] = (playerStats[attemptStat] || 0) + 1;
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
      stats: newStats,
      opponentStats,
      activePlayers,
      gameSettings: {
        ...gameSettings,
        homeFouls: newHomeFouls,
        awayFouls: newAwayFouls
      }
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
        .insert([{
          user_id: userId,
          team_id: teamId,
          opponent,
          home_team: isHome ? teamName : opponent,
          status: 'in-progress',
          period: 1,
          time_remaining: periodLength * 60,
          home_score: 0,
          away_score: 0,
          stats: {},
          opponent_stats: {
            team: {
              pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0,
              oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0
            }
          },
          active_players: [],
          game_settings: {
            opponent,
            isHome,
            periodLength,
            totalPeriods,
            homeFouls: 0,
            awayFouls: 0
          },
          visibility: 'private'
        }])
        .select()
        .single();

      if (error) throw error;

      return { success: true, game: data };
    } catch (err) {
      console.error('❌ Error creating game:', err);
      return { success: false, error: err };
    }
  }

  /**
   * End game
   */
  async endGame(finalState) {
    if (!this.gameId) {
      return { success: false, error: 'No game ID' };
    }

    try {
      const { error } = await supabase
        .from('games')
        .update({
          status: 'completed',
          home_score: finalState.homeScore,
          away_score: finalState.awayScore,
          period: finalState.period,
          stats: finalState.stats,
          opponent_stats: finalState.opponentStats,
          game_settings: finalState.gameSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.gameId);

      if (error) throw error;

      return { success: true };
    } catch (err) {
      console.error('❌ Error ending game:', err);
      return { success: false, error: err };
    }
  }
}

export default GameStateManager;