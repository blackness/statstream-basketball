import React from 'react';
import AppHeader from '../Shared/AppHeader';
import { ArrowLeft } from 'lucide-react';

const BoxScoreView = ({ user, game, team, onBack }) => {
  const isHome = game.home_team === team.name;
  const teamScore = isHome ? game.home_score : game.away_score;
  const opponentScore = isHome ? game.away_score : game.home_score;
  
  // Get players with stats
  const playersWithStats = team.roster?.map(player => {
    const stats = game.stats?.[player.id] || {
      pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0,
      oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0
    };
    return { ...player, stats };
  }).sort((a, b) => b.stats.pts - a.stats.pts) || [];

  // Calculate team totals
  const teamTotals = playersWithStats.reduce((acc, p) => ({
    pts: acc.pts + (p.stats.pts || 0),
    fgm: acc.fgm + (p.stats.fgm || 0),
    tpm: acc.tpm + (p.stats.tpm || 0),
    ftm: acc.ftm + (p.stats.ftm || 0),
    oreb: acc.oreb + (p.stats.oreb || 0),
    dreb: acc.dreb + (p.stats.dreb || 0),
    ast: acc.ast + (p.stats.ast || 0),
    stl: acc.stl + (p.stats.stl || 0),
    blk: acc.blk + (p.stats.blk || 0),
    to: acc.to + (p.stats.to || 0),
    pf: acc.pf + (p.stats.pf || 0)
  }), { pts: 0, fgm: 0, tpm: 0, ftm: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0 });

  // Get opponent stats
  const opponentTeamStats = game.opponent_stats?.team || {
    pts: 0, fgm: 0, tpm: 0, ftm: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0
  };

  const gameResult = teamScore > opponentScore ? 'WIN' : teamScore < opponentScore ? 'LOSS' : 'TIE';
  const resultColor = gameResult === 'WIN' ? 'text-emerald-600' : gameResult === 'LOSS' ? 'text-red-600' : 'text-gray-600';

  return (
    <div className="h-screen w-full bg-gray-50 flex flex-col overflow-hidden">
      
      <AppHeader
        title="Box Score"
        isDashboard={false}
        onDashboard={onBack}
        userEmail={user?.email}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Game Header */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold transition"
              >
                <ArrowLeft size={18} />
                Back
              </button>
              <span className={`text-2xl font-black ${resultColor}`}>
                {gameResult}
              </span>
            </div>
            
            <div className="flex items-center justify-center gap-8 mb-4">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-600">{team.name}</div>
                <div className="text-5xl font-black text-gray-900">{teamScore}</div>
              </div>
              <div className="text-3xl font-bold text-gray-400">-</div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-600">{game.opponent}</div>
                <div className="text-5xl font-black text-gray-900">{opponentScore}</div>
              </div>
            </div>

            <div className="text-center text-sm text-gray-600">
              Final • {new Date(game.created_at).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
          </div>

          {/* Your Team Box Score */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-blue-600 px-4 py-3">
              <h3 className="font-black text-white text-lg">{team.name}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-black text-gray-700 uppercase">PTS</th>
                    <th className="px-3 py-3 text-center text-xs font-black text-gray-700 uppercase">2PT</th>
                    <th className="px-3 py-3 text-center text-xs font-black text-gray-700 uppercase">3PT</th>
                    <th className="px-3 py-3 text-center text-xs font-black text-gray-700 uppercase">FT</th>
                    <th className="px-3 py-3 text-center text-xs font-black text-gray-700 uppercase">OREB</th>
                    <th className="px-3 py-3 text-center text-xs font-black text-gray-700 uppercase">DREB</th>
                    <th className="px-3 py-3 text-center text-xs font-black text-gray-700 uppercase">AST</th>
                    <th className="px-3 py-3 text-center text-xs font-black text-gray-700 uppercase">STL</th>
                    <th className="px-3 py-3 text-center text-xs font-black text-gray-700 uppercase">BLK</th>
                    <th className="px-3 py-3 text-center text-xs font-black text-gray-700 uppercase">TO</th>
                    <th className="px-3 py-3 text-center text-xs font-black text-gray-700 uppercase">PF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {playersWithStats.map(player => (
                    <tr key={player.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-500 w-6">#{player.number}</span>
                          <div>
                            <div className="font-bold text-gray-900">{player.name}</div>
                            <div className="text-xs text-gray-500">{player.position}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center font-black text-blue-600">{player.stats.pts}</td>
                      <td className="px-3 py-3 text-center text-gray-700">{player.stats.fgm}</td>
                      <td className="px-3 py-3 text-center text-gray-700">{player.stats.tpm}</td>
                      <td className="px-3 py-3 text-center text-gray-700">{player.stats.ftm}</td>
                      <td className="px-3 py-3 text-center text-gray-700">{player.stats.oreb}</td>
                      <td className="px-3 py-3 text-center text-gray-700">{player.stats.dreb}</td>
                      <td className="px-3 py-3 text-center text-gray-700">{player.stats.ast}</td>
                      <td className="px-3 py-3 text-center text-gray-700">{player.stats.stl}</td>
                      <td className="px-3 py-3 text-center text-gray-700">{player.stats.blk}</td>
                      <td className="px-3 py-3 text-center text-gray-700">{player.stats.to}</td>
                      <td className="px-3 py-3 text-center text-gray-700">{player.stats.pf}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                  <tr>
                    <td className="px-4 py-3 font-black text-gray-900 uppercase">Team Totals</td>
                    <td className="px-3 py-3 text-center font-black text-blue-600">{teamTotals.pts}</td>
                    <td className="px-3 py-3 text-center font-bold text-gray-900">{teamTotals.fgm}</td>
                    <td className="px-3 py-3 text-center font-bold text-gray-900">{teamTotals.tpm}</td>
                    <td className="px-3 py-3 text-center font-bold text-gray-900">{teamTotals.ftm}</td>
                    <td className="px-3 py-3 text-center font-bold text-gray-900">{teamTotals.oreb}</td>
                    <td className="px-3 py-3 text-center font-bold text-gray-900">{teamTotals.dreb}</td>
                    <td className="px-3 py-3 text-center font-bold text-gray-900">{teamTotals.ast}</td>
                    <td className="px-3 py-3 text-center font-bold text-gray-900">{teamTotals.stl}</td>
                    <td className="px-3 py-3 text-center font-bold text-gray-900">{teamTotals.blk}</td>
                    <td className="px-3 py-3 text-center font-bold text-gray-900">{teamTotals.to}</td>
                    <td className="px-3 py-3 text-center font-bold text-gray-900">{teamTotals.pf}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Opponent Team Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-red-600 px-4 py-3">
              <h3 className="font-black text-white text-lg">{game.opponent}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                      Team Stats
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-black text-gray-700 uppercase">PTS</th>
                    <th className="px-3 py-3 text-center text-xs font-black text-gray-700 uppercase">2PT</th>
                    <th className="px-3 py-3 text-center text-xs font-black text-gray-700 uppercase">3PT</th>
                    <th className="px-3 py-3 text-center text-xs font-black text-gray-700 uppercase">FT</th>
                    <th className="px-3 py-3 text-center text-xs font-black text-gray-700 uppercase">OREB</th>
                    <th className="px-3 py-3 text-center text-xs font-black text-gray-700 uppercase">DREB</th>
                    <th className="px-3 py-3 text-center text-xs font-black text-gray-700 uppercase">AST</th>
                    <th className="px-3 py-3 text-center text-xs font-black text-gray-700 uppercase">STL</th>
                    <th className="px-3 py-3 text-center text-xs font-black text-gray-700 uppercase">BLK</th>
                    <th className="px-3 py-3 text-center text-xs font-black text-gray-700 uppercase">TO</th>
                    <th className="px-3 py-3 text-center text-xs font-black text-gray-700 uppercase">PF</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">{game.opponent}</div>
                    </td>
                    <td className="px-3 py-3 text-center font-black text-red-600">{opponentTeamStats.pts}</td>
                    <td className="px-3 py-3 text-center text-gray-700">{opponentTeamStats.fgm}</td>
                    <td className="px-3 py-3 text-center text-gray-700">{opponentTeamStats.tpm}</td>
                    <td className="px-3 py-3 text-center text-gray-700">{opponentTeamStats.ftm}</td>
                    <td className="px-3 py-3 text-center text-gray-700">{opponentTeamStats.oreb}</td>
                    <td className="px-3 py-3 text-center text-gray-700">{opponentTeamStats.dreb}</td>
                    <td className="px-3 py-3 text-center text-gray-700">{opponentTeamStats.ast}</td>
                    <td className="px-3 py-3 text-center text-gray-700">{opponentTeamStats.stl}</td>
                    <td className="px-3 py-3 text-center text-gray-700">{opponentTeamStats.blk}</td>
                    <td className="px-3 py-3 text-center text-gray-700">{opponentTeamStats.to}</td>
                    <td className="px-3 py-3 text-center text-gray-700">{opponentTeamStats.pf}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoxScoreView;