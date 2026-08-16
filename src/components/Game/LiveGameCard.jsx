import React, { useState } from 'react';
import { Play, BarChart2, StopCircle, ChevronDown, ChevronUp } from 'lucide-react';
import ActivityFeed from '../Shared/ActivityFeed';
import ShareButton from '../Shared/ShareButton';

const LiveGameCard = ({ game, teamName, onResume, onViewStats, onEnd, canManage, toast }) => {
  const [feedOpen, setFeedOpen] = useState(false);

  const isHome   = game.home_team === teamName;
  const ourScore = isHome ? game.home_score : game.away_score;
  const oppScore = isHome ? game.away_score : game.home_score;
  const plays    = game.play_log || [];

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">

      {/* Scoreboard */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500 text-white text-xs font-black rounded-lg">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
            <span className="text-xs text-gray-500 font-bold">Q{game.period || 1}</span>
          </div>
          {game.game_settings?.location && (
            <span className="text-xs text-gray-600 truncate max-w-[120px]">
              {game.game_settings.location}
            </span>
          )}
        </div>

        <div className="flex items-center">
          <div className="flex-1 text-center">
            <p className="text-xs text-gray-500 font-bold mb-2 truncate px-2">{teamName}</p>
            <p className="text-6xl font-black text-white tabular-nums leading-none">{ourScore}</p>
          </div>
          <div className="px-4 text-gray-700 font-black text-2xl select-none">—</div>
          <div className="flex-1 text-center">
            <p className="text-xs text-gray-500 font-bold mb-2 truncate px-2">{game.opponent}</p>
            <p className="text-6xl font-black text-white tabular-nums leading-none">{oppScore}</p>
          </div>
        </div>
      </div>

      {/* Recent plays preview */}
      {plays.length > 0 && (
        <div className="border-t border-gray-800">
          <button
            onClick={() => setFeedOpen(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-500 hover:text-gray-400 transition"
          >
            <span className="font-bold uppercase tracking-wider">
              Recent Plays ({plays.length})
            </span>
            {feedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {feedOpen && (
            <div className="pb-2">
              <ActivityFeed plays={plays} maxShown={5} compact />
            </div>
          )}

          {!feedOpen && plays[0] && (
            <div className="px-4 pb-3">
              <ActivityFeed plays={plays} maxShown={1} compact />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-3 border-t border-gray-800">
        <button
          onClick={onViewStats}
          className="py-3 flex items-center justify-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition"
        >
          <BarChart2 size={13} />
          Stats
        </button>
        {canManage && (
          <>
            <button
              onClick={onEnd}
              className="py-3 flex items-center justify-center gap-1.5 text-xs font-bold text-gray-400 hover:text-red-400 hover:bg-gray-800 transition"
            >
              <StopCircle size={13} />
              End
            </button>
            <button
              onClick={onResume}
              className="py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 text-xs font-black transition flex items-center justify-center gap-1.5"
            >
              <Play size={12} fill="currentColor" />
              Resume
            </button>
            <ShareButton
              path={`/game/${game.id}`}
              title={`LIVE: ${teamName} vs ${game.opponent}`}
              toast={toast}
              compact
              className="text-gray-400 hover:text-white hover:bg-gray-800 transition rounded-lg"
            />
          </>
        )}
        {!canManage && (
          <div className="col-span-2 py-3 flex items-center justify-center">
            <span className="text-xs text-gray-600 font-medium">Enter PIN to manage</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveGameCard;