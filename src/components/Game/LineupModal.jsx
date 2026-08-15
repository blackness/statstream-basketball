import React, { useState } from 'react';
import { Play, Users } from 'lucide-react';

const LineupModal = ({ team, onConfirm }) => {
  const roster   = team.roster?.filter(
    p => p.active !== false && p.status === 'rostered'
  ) || [];

  const [starters, setStarters] = useState(
    roster.slice(0, Math.min(5, roster.length)).map(p => p.id)
  );

  const toggle = (id) =>
    setStarters(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-black text-gray-900">Starting Lineup</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {team.name} · tap players to select starters
          </p>
        </div>

        {/* Counts strip */}
        <div className="flex items-center gap-3 px-6 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
          <div className={`flex-1 py-2 rounded-xl text-center text-xs font-black ${
            starters.length > 0
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-400'
          }`}>
            {starters.length} Starting
          </div>
          <div className={`flex-1 py-2 rounded-xl text-center text-xs font-black ${
            roster.length - starters.length > 0
              ? 'bg-gray-200 text-gray-700'
              : 'bg-gray-100 text-gray-300'
          }`}>
            {roster.length - starters.length} Bench
          </div>
        </div>

        {/* Roster */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {roster.length === 0 ? (
            <div className="text-center py-12">
              <Users size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="font-bold text-gray-400 text-sm">No rostered players</p>
              <p className="text-xs text-gray-300 mt-1">Add players to your roster first</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {roster.map(player => {
                const isStarter = starters.includes(player.id);
                return (
                  <button
                    key={player.id}
                    onClick={() => toggle(player.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition text-left active:scale-95 ${
                      isStarter
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-100 hover:border-gray-200 bg-white'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                      isStarter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {player.number || '#'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{player.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {isStarter ? '🟢 Starting' : '⚪ Bench'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick select strip */}
        {roster.length > 0 && (
          <div className="flex gap-2 px-6 py-3 border-t border-gray-100 flex-shrink-0">
            <button
              onClick={() => setStarters(roster.map(p => p.id))}
              className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition"
            >
              All In
            </button>
            <button
              onClick={() => setStarters([])}
              className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition"
            >
              Clear
            </button>
            <button
              onClick={() => setStarters(roster.slice(0, 5).map(p => p.id))}
              className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition"
            >
              First 5
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={() => onConfirm(starters)}
            disabled={starters.length === 0}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-black text-sm transition flex items-center justify-center gap-2"
          >
            <Play size={16} fill="currentColor" />
            Start Game · {starters.length} Starters
          </button>
        </div>
      </div>
    </div>
  );
};

export default LineupModal;