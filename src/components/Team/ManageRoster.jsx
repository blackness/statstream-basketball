import React, { useState } from 'react';
import AppHeader from '../Shared/AppHeader';
import { UserPlus, Trash2, Edit2, Save, X } from 'lucide-react';

const ManageRoster = ({ team, onSave, onCancel, toast }) => {
  const [roster, setRoster] = useState(team.roster || []);
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ name: '', number: '', position: '' });
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
      isNew: true
    };

    setRoster([...roster, player]);
    setNewPlayer({ name: '', number: '', position: '' });
    setShowAddForm(false);
    toast?.success('Player added to roster');
  };

  const handleRemovePlayer = (playerId) => {
    if (!confirm('Remove this player from the roster?')) return;
    
    setRoster(roster.filter(p => p.id !== playerId));
    toast?.success('Player removed');
  };

  const handleEditPlayer = (playerId) => {
    setEditingId(playerId);
  };

  const handleSaveEdit = (playerId, updates) => {
    setRoster(roster.map(p => 
      p.id === playerId ? { ...p, ...updates } : p
    ));
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
            <div className="grid grid-cols-3 gap-4 mb-4">
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
            <div className="flex gap-2">
              <button
                onClick={handleAddPlayer}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition"
              >
                <UserPlus size={18} />
                Add to Roster
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewPlayer({ name: '', number: '', position: '' });
                }}
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
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {roster.map((player) => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    isEditing={editingId === player.id}
                    onEdit={() => handleEditPlayer(player.id)}
                    onSave={(updates) => handleSaveEdit(player.id, updates)}
                    onCancel={() => setEditingId(null)}
                    onRemove={() => handleRemovePlayer(player.id)}
                  />
                ))}
              </tbody>
            </table>
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
    position: player.position || ''
  });

  if (isEditing) {
    return (
      <tr className="bg-blue-50">
        <td className="px-6 py-4">
          <input
            type="text"
            value={editData.number}
            onChange={(e) => setEditData({ ...editData, number: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded"
            placeholder="#"
          />
        </td>
        <td className="px-6 py-4">
          <input
            type="text"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded"
            placeholder="Name"
          />
        </td>
        <td className="px-6 py-4">
          <input
            type="text"
            value={editData.position}
            onChange={(e) => setEditData({ ...editData, position: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded"
            placeholder="Position"
          />
        </td>
        <td className="px-6 py-4 text-right">
          <button
            onClick={() => onSave(editData)}
            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg mr-2"
            title="Save"
          >
            <Save size={16} />
          </button>
          <button
            onClick={onCancel}
            className="p-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg"
            title="Cancel"
          >
            <X size={16} />
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-gray-50 transition">
      <td className="px-6 py-4">
        <span className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-700 font-bold rounded-full">
          {player.number || '-'}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className="font-bold text-gray-900">{player.name}</span>
      </td>
      <td className="px-6 py-4">
        <span className="text-gray-600">{player.position || '-'}</span>
      </td>
      <td className="px-6 py-4 text-right">
        <button
          onClick={onEdit}
          className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg mr-2"
          title="Edit"
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={onRemove}
          className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg"
          title="Remove"
        >
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
};

export default ManageRoster;
