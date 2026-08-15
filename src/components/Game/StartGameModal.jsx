import React, { useState } from 'react';
import { X, Play, Settings, Users } from 'lucide-react';
import { supabase } from '../../../supabase';

const StartGameModal = ({ game, team, onStart, onModifySetup, onClose, toast }) => {
  const roster   = team?.roster || [];
  const initials = (game.starters?.length ? game.starters : roster.slice(0, 5).map(p => p.id));

  const [starters,  setStarters]  = useState(initials);
  const [starting,  setStarting]  = useState(false);

  const togglePlayer = (id) => {
    setStarters(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleStart = async () => {
    if (starters.length === 0) {
      toast?.error('Select at least one player');
      return;
    }
    setStarting(true);
    try {
      const { data, error } = await supabase
        .from('games')
        .update({
          status:          'in_progress',
          starters:        starters,
          active_players:  starters,
          scheduled_at:    game.scheduled_at,
          updated_at:      new Date().toISOString(),
        })
        .eq('id', game.id)
        .select()
        .single();

      if (error) throw error;
      toast?.success('Game started!');
      onStart(data);
    } catch (err) {
      console.error(err);
      toast?.error('Failed to start game');
      setStarting(false);
    }
  };

  const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    }) : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-black text-gray-900">Start Game</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {team?.name} vs {game.opponent}
              {game.scheduled_at && ` · ${fmtDate(game.scheduled_at)}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Roster */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-gray-400" />
              <span className="text-xs font-black text-gray-500 uppercase tracking-wider">
                Select Starters
              </span>
            </div>
            <span className="text-xs font-bold text-gray-400">
              {starters.length} selected
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {roster.map(player => {
              const active = starters.includes(player.id);
              return (
                <button
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition text-left ${
                    active
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0 ${
                    active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {player.number || '#'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{player.name}</p>
                    {player.position && (
                      <p className="text-[10px] text-gray-400">{player.position}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 space-y-2">
          <button
            onClick={handleStart}
            disabled={starting || starters.length === 0}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-black text-sm transition flex items-center justify-center gap-2"
          >
            <Play size={16} fill="currentColor" />
            {starting ? 'Starting...' : 'Start Game Now'}
          </button>
          <button
            onClick={onModifySetup}
            className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
          >
            <Settings size={14} />
            Modify Game Setup
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartGameModal;