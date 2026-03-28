import React, { useState } from 'react';
import AppHeader from '../Shared/AppHeader';
import { Save, X, Trash2 } from 'lucide-react';

const EditTeam = ({ team, onSave, onDelete, onCancel, onManageRoster, toast }) => {
  const [formData, setFormData] = useState({
    name: team.name || '',
    coach: team.coach || '',
    sport: team.sport || 'basketball',
    visibility: team.visibility || 'private',
    wins: team.wins || 0,
    losses: team.losses || 0
  });

  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast?.error('Team name is required');
      return;
    }
    setSaving(true);
    try {
      await onSave(team.id, formData);
      toast?.success('Team updated!');
    } catch (error) {
      toast?.error('Failed to update team');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    try {
      await onDelete(team.id);
      toast?.success('Team deleted!');
    } catch (error) {
      toast?.error('Failed to delete team');
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Edit Team" onDashboard={onCancel} />

      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 space-y-5">

          {/* Team Name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Team Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              placeholder="Enter team name"
            />
          </div>

          {/* Coach */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Coach Name</label>
            <input
              type="text"
              value={formData.coach}
              onChange={(e) => setFormData({ ...formData, coach: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              placeholder="Enter coach name"
            />
          </div>

          {/* Sport */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Sport</label>
            <select
              value={formData.sport}
              onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white"
            >
              <option value="basketball">Basketball</option>
              <option value="soccer">Soccer</option>
              <option value="football">Football</option>
              <option value="hockey">Hockey</option>
            </select>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Visibility</label>
            <select
              value={formData.visibility}
              onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white"
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.visibility === 'private' && 'Only you can see this team'}
              {formData.visibility === 'public' && 'Anyone can view this team'}
              {formData.visibility === 'unlisted' && 'Visible with direct link only'}
            </p>
          </div>

          {/* Record */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Wins</label>
              <input
                type="number"
                min="0"
                value={formData.wins}
                onChange={(e) => setFormData({ ...formData, wins: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Losses</label>
              <input
                type="number"
                min="0"
                value={formData.losses}
                onChange={(e) => setFormData({ ...formData, losses: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 text-white rounded-lg font-bold transition text-base"
            >
              <Save size={20} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={onCancel}
              className="px-5 py-3 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 rounded-lg font-bold transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Manage Roster */}
          <button
            onClick={() => onManageRoster(team)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 hover:bg-gray-800 active:bg-gray-700 text-white rounded-lg font-bold transition text-base"
          >
            👥 Manage Roster
          </button>
        </div>

        {/* Delete Section */}
        <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 sm:p-6">
          <h3 className="text-lg font-bold text-red-900 mb-2">Danger Zone</h3>
          <p className="text-sm text-red-700 mb-4">
            Deleting this team will permanently remove all associated games, stats, and players. This action cannot be undone.
          </p>
          {!showDeleteConfirm ? (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg font-bold transition"
            >
              <Trash2 size={20} />
              Delete Team
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-red-900 font-bold">Are you absolutely sure?</p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg font-bold transition"
                >
                  <Trash2 size={20} />
                  Yes, Delete Forever
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-bold transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditTeam;
