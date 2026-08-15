import React from 'react';
import { Calendar, MapPin, Play, Edit2, Trash2, Lock } from 'lucide-react';

const ScheduledGameCard = ({ game, teamName, onStart, onEdit, onDelete, canManage }) => {
  const fmtScheduled = (iso) => {
    if (!iso) return 'TBD';
    const d    = new Date(iso);
    const days = Math.floor((d - Date.now()) / 86400000);
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (days === 0) return `Today · ${time}`;
    if (days === 1) return `Tomorrow · ${time}`;
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ` · ${time}`;
  };

  const isUpcoming = game.scheduled_at && new Date(game.scheduled_at) > new Date();

  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-blue-200 overflow-hidden hover:border-blue-300 transition">
      <div className="px-4 pt-4 pb-3">

        {/* Date badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-black rounded-lg">
            <Calendar size={11} />
            {isUpcoming ? 'UPCOMING' : 'SCHEDULED'}
          </span>
          <span className="text-xs text-gray-500 font-medium">
            {fmtScheduled(game.scheduled_at)}
          </span>
        </div>

        {/* Match */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-black text-gray-900">{teamName}</span>
              <span className="text-xs text-gray-300 font-bold">vs</span>
              <span className="font-black text-gray-600">{game.opponent}</span>
            </div>
            {game.game_settings?.location && (
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                <MapPin size={10} />
                {game.game_settings.location}
              </p>
            )}
          </div>

          {canManage ? (
            <button
              onClick={onStart}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm transition active:scale-95 flex-shrink-0 ml-3"
            >
              <Play size={12} fill="currentColor" />
              Start
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-400 rounded-xl text-xs font-bold flex-shrink-0 ml-3">
              <Lock size={11} />
              PIN Required
            </div>
          )}
        </div>
      </div>

      {canManage && (
        <div className="flex border-t border-gray-50">
          <button
            onClick={onDelete}
            className="px-3 py-2 text-gray-300 hover:text-red-500 hover:bg-red-50 transition"
          >
            <Trash2 size={13} />
          </button>
          <div className="w-px bg-gray-50" />
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition"
          >
            <Edit2 size={12} />
            Edit
          </button>
        </div>
      )}
    </div>
  );
};

export default ScheduledGameCard;