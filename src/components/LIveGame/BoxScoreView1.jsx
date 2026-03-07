import React from 'react';
import { ArrowLeft } from 'lucide-react';

const BoxScoreView = ({ team, game, onBack }) => {
  const calculatePlayerStats = (playerId) => {
    const stats = game.stats?.[playerId] || {};
    const plusMinus = game.plus_minus?.[playerId] || 0;
    
    // Calculate totals
    const reb = (stats.oreb || 0) + (stats.dreb || 0);
    const fgPct = stats.fga > 0 ? ((stats.fgm / stats.fga) * 100).toFixed(1) : '0.0';
    const tpPct = stats.tpa > 0 ? ((stats.tpm / stats.tpa) * 100).toFixed(1) : '0.0';
    const ftPct = stats.fta > 0 ? ((stats.ftm / stats.fta) * 100).toFixed(1) : '0.0';
    
    return {
      ...stats,
      reb,
      fgPct,
      tpPct,
      ftPct,
      plusMinus
    };
  };

  const calculateTeamStats = () => {
    const totals = {
      pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0,
      oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0
    };
    
    Object.values(game.stats || {}).forEach(playerStats => {
      Object.keys(totals).forEach(key => {
        totals[key] += (playerStats[key] || 0);
      });
    });
    
    const reb = totals.oreb + totals.dreb;
    const fgPct = totals.fga > 0 ? ((totals.fgm / totals.fga) * 100).toFixed(1) : '0.0';
    const tpPct = totals.tpa > 0 ? ((totals.tpm / totals.tpa) * 100).toFixed(1) : '0.0';
    const ftPct = totals.fta > 0 ? ((totals.ftm / totals.fta) * 100).toFixed(1) : '0.0';
    
    return { ...totals, reb, fgPct, tpPct, ftPct };
  };

  const calculateOpponentTeamStats = () => {
    const opStats = game.opponent_stats?.team || {};
    const reb = (opStats.oreb || 0) + (opStats.dreb || 0);
    const fgPct = opStats.fga > 0 ? ((opStats.fgm / opStats.fga) * 100).toFixed(1) : '0.0';
    const tpPct = opStats.tpa > 0 ? ((opStats.tpm / opStats.tpa) * 100).toFixed(1) : '0.0';
    const ftPct = opStats.fta > 0 ? ((opStats.ftm / opStats.fta) * 100).toFixed(1) : '0.0';
    
    return { ...opStats, reb, fgPct, tpPct, ftPct };
  };

  const playersWithStats = team.roster?.filter(player => {
    const stats = game.stats?.[player.id];
    // Show player if they have any stat entry (even if all zeros)
    return stats !== undefined && stats !== null;
  }) || [];

  // Sort players by points descending
  playersWithStats.sort((a, b) => {
    const aStats = game.stats?.[a.id] || {};
    const bStats = game.stats?.[b.id] || {};
    return (bStats.pts || 0) - (aStats.pts || 0);
  });

  const teamStats = calculateTeamStats();
  const opponentStats = calculateOpponentTeamStats();
  const isHome = game.game_settings?.isHome;
  const finalScore = isHome 
    ? `${game.home_score} - ${game.away_score}` 
    : `${game.away_score} - ${game.home_score}`;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft size={20} />
              <span className="font-bold">Back</span>
            </button>
            <h1 className="text-xl font-black text-gray-900">Box Score</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Game Info */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-center mb-4">
            <h2 className="text-3xl font-black text-gray-900 mb-2">
              {team.name} vs {game.opponent}
            </h2>
            <div className="text-4xl font-black text-blue-600 mb-2">{finalScore}</div>
            <div className="text-sm text-gray-600">
              Final {game.period === 4 ? '' : `(${game.period} periods)`}
            </div>
          </div>
        </div>

        {/* Player Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-blue-600 px-6 py-3">
            <h3 className="font-black text-white text-lg">{team.name} - Player Stats</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs font-bold text-gray-600 uppercase">
                  <th className="px-4 py-3 text-left">Player</th>
                  <th className="px-3 py-3 text-center">PTS</th>
                  <th className="px-3 py-3 text-center">FG</th>
                  <th className="px-3 py-3 text-center">FG%</th>
                  <th className="px-3 py-3 text-center">3PT</th>
                  <th className="px-3 py-3 text-center">3P%</th>
                  <th className="px-3 py-3 text-center">FT</th>
                  <th className="px-3 py-3 text-center">FT%</th>
                  <th className="px-3 py-3 text-center">REB</th>
                  <th className="px-3 py-3 text-center">AST</th>
                  <th className="px-3 py-3 text-center">STL</th>
                  <th className="px-3 py-3 text-center">BLK</th>
                  <th className="px-3 py-3 text-center">TO</th>
                  <th className="px-3 py-3 text-center">PF</th>
                  <th className="px-3 py-3 text-center">+/-</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {playersWithStats.length > 0 ? (
                  playersWithStats.map(player => {
                    const stats = calculatePlayerStats(player.id);
                    return (
                      <tr key={player.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-900">#{player.number} {player.name}</div>
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-blue-600">{stats.pts || 0}</td>
                        <td className="px-3 py-3 text-center text-sm">{stats.fgm || 0}/{stats.fga || 0}</td>
                        <td className="px-3 py-3 text-center text-sm">{stats.fgPct}%</td>
                        <td className="px-3 py-3 text-center text-sm">{stats.tpm || 0}/{stats.tpa || 0}</td>
                        <td className="px-3 py-3 text-center text-sm">{stats.tpPct}%</td>
                        <td className="px-3 py-3 text-center text-sm">{stats.ftm || 0}/{stats.fta || 0}</td>
                        <td className="px-3 py-3 text-center text-sm">{stats.ftPct}%</td>
                        <td className="px-3 py-3 text-center">{stats.reb || 0}</td>
                        <td className="px-3 py-3 text-center">{stats.ast || 0}</td>
                        <td className="px-3 py-3 text-center">{stats.stl || 0}</td>
                        <td className="px-3 py-3 text-center">{stats.blk || 0}</td>
                        <td className="px-3 py-3 text-center">{stats.to || 0}</td>
                        <td className="px-3 py-3 text-center">{stats.pf || 0}</td>
                        <td className={`px-3 py-3 text-center font-bold ${stats.plusMinus > 0 ? 'text-green-600' : stats.plusMinus < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {stats.plusMinus > 0 ? '+' : ''}{stats.plusMinus}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="15" className="px-4 py-8 text-center text-gray-500">
                      No stats recorded for this game
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr className="font-bold">
                  <td className="px-4 py-3">TEAM TOTALS</td>
                  <td className="px-3 py-3 text-center text-blue-600">{teamStats.pts}</td>
                  <td className="px-3 py-3 text-center text-sm">{teamStats.fgm}/{teamStats.fga}</td>
                  <td className="px-3 py-3 text-center text-sm">{teamStats.fgPct}%</td>
                  <td className="px-3 py-3 text-center text-sm">{teamStats.tpm}/{teamStats.tpa}</td>
                  <td className="px-3 py-3 text-center text-sm">{teamStats.tpPct}%</td>
                  <td className="px-3 py-3 text-center text-sm">{teamStats.ftm}/{teamStats.fta}</td>
                  <td className="px-3 py-3 text-center text-sm">{teamStats.ftPct}%</td>
                  <td className="px-3 py-3 text-center">{teamStats.reb}</td>
                  <td className="px-3 py-3 text-center">{teamStats.ast}</td>
                  <td className="px-3 py-3 text-center">{teamStats.stl}</td>
                  <td className="px-3 py-3 text-center">{teamStats.blk}</td>
                  <td className="px-3 py-3 text-center">{teamStats.to}</td>
                  <td className="px-3 py-3 text-center">{teamStats.pf}</td>
                  <td className="px-3 py-3 text-center">-</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Opponent Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-red-600 px-6 py-3">
            <h3 className="font-black text-white text-lg">{game.opponent} - Team Stats</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs font-bold text-gray-600 uppercase">
                  <th className="px-4 py-3 text-left">Team</th>
                  <th className="px-3 py-3 text-center">PTS</th>
                  <th className="px-3 py-3 text-center">FG</th>
                  <th className="px-3 py-3 text-center">FG%</th>
                  <th className="px-3 py-3 text-center">3PT</th>
                  <th className="px-3 py-3 text-center">3P%</th>
                  <th className="px-3 py-3 text-center">FT</th>
                  <th className="px-3 py-3 text-center">FT%</th>
                  <th className="px-3 py-3 text-center">REB</th>
                  <th className="px-3 py-3 text-center">AST</th>
                  <th className="px-3 py-3 text-center">STL</th>
                  <th className="px-3 py-3 text-center">BLK</th>
                  <th className="px-3 py-3 text-center">TO</th>
                  <th className="px-3 py-3 text-center">PF</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold text-gray-900">{game.opponent}</td>
                  <td className="px-3 py-3 text-center font-bold text-red-600">{opponentStats.pts || 0}</td>
                  <td className="px-3 py-3 text-center text-sm">{opponentStats.fgm || 0}/{opponentStats.fga || 0}</td>
                  <td className="px-3 py-3 text-center text-sm">{opponentStats.fgPct}%</td>
                  <td className="px-3 py-3 text-center text-sm">{opponentStats.tpm || 0}/{opponentStats.tpa || 0}</td>
                  <td className="px-3 py-3 text-center text-sm">{opponentStats.tpPct}%</td>
                  <td className="px-3 py-3 text-center text-sm">{opponentStats.ftm || 0}/{opponentStats.fta || 0}</td>
                  <td className="px-3 py-3 text-center text-sm">{opponentStats.ftPct}%</td>
                  <td className="px-3 py-3 text-center">{opponentStats.reb || 0}</td>
                  <td className="px-3 py-3 text-center">{opponentStats.ast || 0}</td>
                  <td className="px-3 py-3 text-center">{opponentStats.stl || 0}</td>
                  <td className="px-3 py-3 text-center">{opponentStats.blk || 0}</td>
                  <td className="px-3 py-3 text-center">{opponentStats.to || 0}</td>
                  <td className="px-3 py-3 text-center">{opponentStats.pf || 0}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoxScoreView;
