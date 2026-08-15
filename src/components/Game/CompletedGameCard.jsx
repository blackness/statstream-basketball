import React from 'react';
import { Trash2, Edit2, ChevronRight } from 'lucide-react';
import { buildRow, maxBy } from '../../utils/statsHelpers';

const CompletedGameCard = ({ game, team, onViewStats, onDelete, onEdit }) => {
  const teamName = team?.name || 'Unknown';
  const isHome   = game.home_team === teamName;
  const ourScore = isHome ? game.home_score : game.away_score;
  const oppScore = isHome ? game.away_score : game.home_score;
  const isWin    = ourScore > oppScore;
  const isLoss   = ourScore < oppScore;

  const roster    = team?.roster || [];
  const statsMap  = game.stats   || {};
  const rows      = roster.map(p => buildRow(p, statsMap));
  const hasStats  = rows.some(r => r.pts > 0);

  const leaders = hasStats ? [
    { key: 'pts', unit: 'PTS', player: maxBy(rows, 'pts') },
    { key: 'reb', unit: 'REB', player: maxBy(rows, 'reb') },
    { key: 'ast', unit: 'AST', player: maxBy(rows, 'ast') },
  ].filter(l => l.player) : [];

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const days = Math.floor((Date.now() - d) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7)  return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const GAME_TYPE_STYLE = {
    regular:    'bg-gray-100 text-gray-500',
    playoff:    'bg-purple-100 text-purple-700',
    tournament: 'bg-blue-100 text-blue-700',
    scrimmage:  'bg-orange-100 text-orange-700',
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all ${
      isWin ? 'border-l-4 border-l-emerald-400' : isLoss ? 'border-l-4 border-l-red-400' : ''
    }`}>
      {/* Main row */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">

        {/* W/L */}
        <div className="flex-shrink-0 w-8 text-center">
          <p className={`text-lg font-black leading-none ${
            isWin ? 'text-emerald-500' : isLoss ? 'text-red-500' : 'text-gray-300'
          }`}>
            {isWin ? 'W' : isLoss ? 'L' : 'D'}
          </p>
          <p className="text-[9px] text-gray-400 font-medium mt-1 leading-none">
            {formatDate(game.created_at)}
          </p>
        </div>

        {/* Match */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 mb-1.5 flex-wrap">
            <span className="font-black text-gray-900 text-sm truncate">{teamName}</span>
            <span className="text-[11px] text-gray-300 font-bold flex-shrink-0">vs</span>
            <span className="font-bold text-gray-500 text-sm truncate">{game.opponent}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {game.game_type && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg capitalize ${
                GAME_TYPE_STYLE[game.game_type] || GAME_TYPE_STYLE.regular
              }`}>
                {game.game_type}
              </span>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="flex-shrink-0">
          <p className={`text-2xl font-black tabular-nums ${
            isWin ? 'text-emerald-600' : isLoss ? 'text-red-500' : 'text-gray-700'
          }`}>
            {ourScore}–{oppScore}
          </p>
        </div>
      </div>

      {/* Leaders strip */}
      {leaders.length > 0 && (
        <div className="mx-4 mb-3 flex gap-2">
          {leaders.map(({ key, unit, player }) => (
            <div key={key} className="flex-1 bg-gray-50 rounded-xl px-2 py-1.5 text-center">
              <p className="text-base font-black text-gray-800 leading-none">{player[key]}</p>
              <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">{unit}</p>
              <p className="text-[10px] text-gray-500 font-semibold truncate mt-0.5">{player.name.split(' ')[0]}</p>
            </div>
          ))}
        </div>
      )}

      {/* Action bar */}
      <div className="flex border-t border-gray-50">
        <button
          onClick={onDelete}
          className="px-3 py-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 transition"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
        <div className="w-px bg-gray-50" />
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition"
        >
          <Edit2 size={12} />
          Edit
        </button>
        <div className="w-px bg-gray-50" />
        <button
          onClick={onViewStats}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition"
        >
          <ChevronRight size={13} />
          Box Score
        </button>
      </div>
    </div>
  );
};

export default CompletedGameCard;