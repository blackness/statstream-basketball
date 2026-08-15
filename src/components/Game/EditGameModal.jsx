import React, { useState } from 'react';
import { X, MapPin } from 'lucide-react';
import { supabase } from '../../../supabase';

const GAME_TYPES = [
  { value: 'regular',    label: 'Regular'    },
  { value: 'playoff',    label: 'Playoff'    },
  { value: 'tournament', label: 'Tournament' },
  { value: 'scrimmage',  label: 'Scrimmage'  },
];

const EditGameModal = ({ game, onSave, onClose, toast }) => {
  const [form, setForm] = useState({
    opponent:          game.opponent || '',
    location:          game.game_settings?.location || '',
    game_type:         game.game_type || 'regular',
    notes:             game.notes || '',
    include_in_record: game.include_in_record !== false,
  });
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.opponent.trim()) {
      toast?.error('Opponent name is required');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('games')
        .update({
          opponent:          form.opponent.trim(),
          game_type:         form.game_type,
          notes:             form.notes.trim() || null,
          include_in_record: form.include_in_record,
          game_settings: {
            ...game.game_settings,
            location: form.location.trim(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', game.id);

      if (error) throw error;
      toast?.success('Game updated!');
      onSave();
    } catch (err) {
      console.error(err);
      toast?.error('Failed to update game');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-900">Edit Game</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-400 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Opponent */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Opponent *
            </label>
            <input
              type="text"
              value={form.opponent}
              onChange={e => set('opponent', e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Opponent team name"
              autoFocus
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Location
            </label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={form.location}
                onChange={e => set('location', e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Arena / gym"
              />
            </div>
          </div>

          {/* Game Type */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Game Type
            </label>
            <div className="flex gap-2 flex-wrap">
              {GAME_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => set('game_type', type.value)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    form.game_type === type.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
              placeholder="Any notes about this game..."
            />
          </div>

          {/* Count toward record toggle */}
          <button
            onClick={() => set('include_in_record', !form.include_in_record)}
            className="flex items-center gap-3 w-full group"
          >
            <div className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
              form.include_in_record ? 'bg-blue-600' : 'bg-gray-200'
            }`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                form.include_in_record ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </div>
            <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900 transition text-left">
              Count toward win/loss record
            </span>
          </button>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl font-bold text-sm transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.opponent.trim()}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditGameModal;