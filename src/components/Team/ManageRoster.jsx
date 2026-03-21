import React, { useState } from 'react';
import AppHeader from '../Shared/AppHeader';
import { UserPlus, Trash2, Edit2, Save, X } from 'lucide-react';

const EVENT_TAGS = ['Sprint', 'Mid', 'Long', 'Hurdles', 'Jumps', 'Throws', 'Relay'];

const TAG_COLORS = {
  Sprint:  'bg-orange-100 text-orange-700 border-orange-300',
  Mid:     'bg-blue-100 text-blue-700 border-blue-300',
  Long:    'bg-green-100 text-green-700 border-green-300',
  Hurdles: 'bg-purple-100 text-purple-700 border-purple-300',
  Jumps:   'bg-pink-100 text-pink-700 border-pink-300',
  Throws:  'bg-red-100 text-red-700 border-red-300',
  Relay:   'bg-yellow-100 text-yellow-700 border-yellow-300',
};

const TagChips = ({ selected = [], onChange }) => (
  <div className="flex flex-wrap gap-1.5">
    {EVENT_TAGS.map(tag => {
      const active = selected.includes(tag);
      return (
        <button
          key={tag}
          type="button"
          onClick={() => onChange(active ? selected.filter(t => t !== tag) : [...selected, tag])}
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border transition ${
            active ? TAG_COLORS[tag] : 'bg-gray-100 text-gray-400 border-gray-200 hover:border-gray-300'
          }`}
        >
          {tag}
        </button>
      );
    })}
  </div>
);

const ManageRoster = ({ team, onSave, onCancel, toast }) => {
  const [roster, setRoster] = useState(team.roster || []);
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ name: '', number: '', position: '', events: [] });
  const [saving, setSaving] = useState(false);

  const handleAddPlayer = () => {
    if (!newPlayer.name.trim()) {
      toast?.error('Player name is required');
      return;
    }

    const player = {
      id: `temp-${Date.now()}`,
      name: newPlayer.name.trim(),
      number: newPlayer.number.trim(),
      position: newPlayer.position.trim(),
      events: newPlayer.events,
      isNew: true
    };

    setRoster([...roster, player]);
    setNewPlayer({ name: '', number: '', position: '', events: [] });
    setShowAddForm(false);
    toast?.success('Player added to roster');
  };

  const handleRemovePlayer = (playerId) => {
    if (!confirm('Remove this player from the roster?')) return;
    setRoster(roster.filter(p => p.id !== playerId));
    toast?.success('Player removed');
  };

  const handleSaveEdit = (playerId, updates) => {
    setRoster(roster.map(p => p.id === playerId ? { ...p, ...updates } : p));
    setEditingId(null);
    toast?.success('Player updated');
  };

  const handleSaveRoster = async () => {
    setSaving(true);
    try {
      await onSave(team.id, roster);
      toast?.success('Roster saved!');
    } catch (error) {
      toast?.error('Failed to save roster');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title={`Manage Roster - ${team.name}`} onBack={onCancel} />

      <div className="max-w-4xl mx-auto p-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-gray-900">{roster.length} Players</h2>
            <p className="text-sm text-gray-600">Add, remove, or edit players on your roster</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition"
          >
            <UserPlus size={20} />
            Add Player
          </button>
        </div>

        {/* Add Player Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-2 border-blue-300">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Player</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={newPlayer.name}
                  onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Full name"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Number</label>
                <input
                  type="text"
                  value={newPlayer.number}
                  onChange={(e) => setNewPlayer({ ...newPlayer, number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Jersey #"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Position</label>
                <input
                  type="text"
                  value={newPlayer.position}
                  onChange={(e) => setNewPlayer({ ...newPlayer, position: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="PG, SG, etc."
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">Track & Field Events</label>
              <TagChips
                selected={newPlayer.events}
                onChange={(events) => setNewPlayer({ ...newPlayer, events })}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddPlayer}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition"
              >
                <UserPlus size={18} />
                Add to Roster
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewPlayer({ name: '', number: '', position: '', events: [] }); }}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-bold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Roster List */}
        {roster.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <UserPlus size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Players Yet</h3>
            <p className="text-gray-600 mb-6">Start building your roster by adding players</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition"
            >
              <UserPlus size={20} />
              Add First Player
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {roster.map((player) => (
              <PlayerRow
                key={player.id}
                player={player}
                isEditing={editingId === player.id}
                onEdit={() => setEditingId(player.id)}
                onSave={(updates) => handleSaveEdit(player.id, updates)}
                onCancel={() => setEditingId(null)}
                onRemove={() => handleRemovePlayer(player.id)}
              />
            ))}
          </div>
        )}

        {/* Save Button */}
        {roster.length > 0 && (
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSaveRoster}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg font-bold transition"
            >
              <Save size={20} />
              {saving ? 'Saving...' : 'Save Roster'}
            </button>
            <button
              onClick={onCancel}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-bold transition"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const PlayerRow = ({ player, isEditing, onEdit, onSave, onCancel, onRemove }) => {
  const [editData, setEditData] = useState({
    name: player.name,
    number: player.number || '',
    position: player.position || '',
    events: player.events || []
  });

  if (isEditing) {
    return (
      <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">#</label>
            <input
              type="text"
              value={editData.number}
              onChange={(e) => setEditData({ ...editData, number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base"
              placeholder="#"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-bold text-gray-600 mb-1">Name</label>
            <input
              type="text"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base"
              placeholder="Full name"
              autoFocus
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Position</label>
          <input
            type="text"
            value={editData.position}
            onChange={(e) => setEditData({ ...editData, position: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base"
            placeholder="PG, SG, etc."
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">T&F Events</label>
          <TagChips
            selected={editData.events}
            onChange={(events) => setEditData({ ...editData, events })}
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onSave(editData)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-lg font-bold transition"
          >
            <Save size={16} /> Save
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-bold transition"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-3">
      <span className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-700 font-bold rounded-full flex-shrink-0 text-sm">
        {player.number || '-'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-gray-900">{player.name}</div>
        <div className="text-sm text-gray-500">{player.position || '—'}</div>
        {player.events?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {player.events.map(tag => (
              <span key={tag} className={`px-2 py-0.5 rounded-full text-xs font-bold border ${TAG_COLORS[tag] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={onEdit}
          className="p-2.5 bg-blue-100 hover:bg-blue-200 active:bg-blue-300 text-blue-700 rounded-lg transition"
          title="Edit"
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={onRemove}
          className="p-2.5 bg-red-100 hover:bg-red-200 active:bg-red-300 text-red-700 rounded-lg transition"
          title="Remove"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default ManageRoster;
