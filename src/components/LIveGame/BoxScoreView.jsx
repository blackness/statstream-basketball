import React from 'react';
import { ArrowLeft } from 'lucide-react';

const BoxScoreView = ({ team, game, onBack }) => {
  const calculatePlayerStats = (playerId) => {
    const stats = game.stats?.[playerId] || {};
    const plusMinus = game.plus_minus?.[playerId] || 0;
    
    // Calculate totals - FG includes both 2PT and 3PT
    const totalFGM = (stats.fgm || 0) + (stats.tpm || 0);
    const totalFGA = (stats.fga || 0) + (stats.tpa || 0);
    const reb = (stats.oreb || 0) + (stats.dreb || 0);
    const fgPct = totalFGA > 0 ? ((totalFGM / totalFGA) * 100).toFixed(1) : '0.0';
    const tpPct = stats.tpa > 0 ? ((stats.tpm / stats.tpa) * 100).toFixed(1) : '0.0';
    const ftPct = stats.fta > 0 ? ((stats.ftm / stats.fta) * 100).toFixed(1) : '0.0';
    
    return {
      ...stats,
      totalFGM,
      totalFGA,
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
    
    // Calculate total FG (2PT + 3PT combined)
    const totalFGM = totals.fgm + totals.tpm;
    const totalFGA = totals.fga + totals.tpa;
    const reb = totals.oreb + totals.dreb;
    const fgPct = totalFGA > 0 ? ((totalFGM / totalFGA) * 100).toFixed(1) : '0.0';
    const tpPct = totals.tpa > 0 ? ((totals.tpm / totals.tpa) * 100).toFixed(1) : '0.0';
    const ftPct = totals.fta > 0 ? ((totals.ftm / totals.fta) * 100).toFixed(1) : '0.0';
    
    return { ...totals, totalFGM, totalFGA, reb, fgPct, tpPct, ftPct };
  };

  const calculateOpponentTeamStats = () => {
    const opStats = game.opponent_stats?.team || {};
    
    // Calculate total FG (2PT + 3PT combined)
    const totalFGM = (opStats.fgm || 0) + (opStats.tpm || 0);
    const totalFGA = (opStats.fga || 0) + (opStats.tpa || 0);
    const reb = (opStats.oreb || 0) + (opStats.dreb || 0);
    const fgPct = totalFGA > 0 ? ((totalFGM / totalFGA) * 100).toFixed(1) : '0.0';
    const tpPct = opStats.tpa > 0 ? ((opStats.tpm / opStats.tpa) * 100).toFixed(1) : '0.0';
    const ftPct = opStats.fta > 0 ? ((opStats.ftm / opStats.fta) * 100).toFixed(1) : '0.0';
    
    return { ...opStats, totalFGM, totalFGA, reb, fgPct, tpPct, ftPct };
  };

  const starters = game.starters || [];

  const rosterPlayers = (team?.roster || []).map(p => ({
    id: p.id, name: p.name, number: p.number || '',
    isStarter: starters.includes(p.id), fromRoster: true,
  }));

  const rosterIds = new Set(rosterPlayers.map(p => p.id));
  const orphanPlayers = Object.entries(game.stats || {})
    .filter(([id]) => !rosterIds.has(id))
    .map(([id, stats]) => ({
      id, name: stats._name || '—', number: stats._number || '',
      isStarter: starters.includes(id), fromRoster: false,
    }));

  const allPlayers = [
    ...rosterPlayers.filter(p => p.isStarter),
    ...rosterPlayers.filter(p => !p.isStarter),
    ...orphanPlayers,
  ];

  const teamStats = calculateTeamStats();
  const opponentStats = calculateOpponentTeamStats();
  const isHome = team ? game.home_team === team.name : (game.game_settings?.isHome ?? true);
  const myScore    = isHome ? (game.home_score || 0) : (game.away_score || 0);
  const theirScore = isHome ? (game.away_score || 0) : (game.home_score || 0);
  const finalScore = `${myScore} - ${theirScore}`;

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
                {allPlayers.length > 0 ? (
                  allPlayers.map(player => {
                    const stats = calculatePlayerStats(player.id);
                    const hasPlayed = game.stats?.[player.id] != null;
                    return (
                      <tr key={player.id} className={`hover:bg-gray-50 ${!hasPlayed ? 'opacity-40' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-900">
                            {player.isStarter && <span className="text-blue-500 mr-1">*</span>}
                            {player.number ? `#${player.number} ` : ''}{player.name}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-blue-600">{stats.pts || 0}</td>
                        <td className="px-3 py-3 text-center text-sm">{stats.totalFGM || 0}/{stats.totalFGA || 0}</td>
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
                      No roster found for this game
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr className="font-bold">
                  <td className="px-4 py-3">TEAM TOTALS</td>
                  <td className="px-3 py-3 text-center text-blue-600">{teamStats.pts}</td>
                  <td className="px-3 py-3 text-center text-sm">{teamStats.totalFGM}/{teamStats.totalFGA}</td>
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
                  <td className="px-3 py-3 text-center text-sm">{opponentStats.totalFGM || 0}/{opponentStats.totalFGA || 0}</td>
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
