import React, { useState } from 'react';
import { Plus, X, Users } from 'lucide-react';
import AppHeader from '../Shared/AppHeader';

const CreateTeam = ({ user, onSave, onCancel, toast }) => {
  const [teamName, setTeamName] = useState('');
  const [coach, setCoach] = useState('');
  const [roster, setRoster] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [playerNumber, setPlayerNumber] = useState('');
  const [playerPosition, setPlayerPosition] = useState('Guard');
  const [saving, setSaving] = useState(false);

  const addPlayer = () => {
    if (!playerName.trim()) {
      toast?.error('Player name is required');
      return;
    }

    const newPlayer = {
      id: Date.now().toString(),
      name: playerName.trim(),
      number: playerNumber.trim() || '',
      position: playerPosition,
      active: false
    };

    setRoster([...roster, newPlayer]);
    setPlayerName('');
    setPlayerNumber('');
    setPlayerPosition('Guard');
  };

  const removePlayer = (playerId) => {
    setRoster(roster.filter(p => p.id !== playerId));
  };

  const handleSave = async () => {
    if (!teamName.trim()) {
      toast?.error('Team name is required');
      return;
    }

    if (roster.length === 0) {
      toast?.error('Add at least one player');
      return;
    }

    setSaving(true);
    await onSave({
      name: teamName.trim(),
      coach: coach.trim(),
      roster,
      sport: 'basketball',
      visibility: 'private',
      wins: 0,
      losses: 0
    });
    setSaving(false);
  };

  return (
    <div className="h-screen w-full bg-gray-50 flex flex-col overflow-hidden">
      
      <AppHeader
        title="Create Team"
        isDashboard={false}
        onDashboard={onCancel}
        userEmail={user?.email}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Team Info */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-black text-gray-900 mb-4">Team Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Team Name *
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-600"
                  placeholder="Enter team name"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Coach (Optional)
                </label>
                <input
                  type="text"
                  value={coach}
                  onChange={(e) => setCoach(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-600"
                  placeholder="Enter coach name"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-2xl">🏀</span>
                <span className="font-bold text-blue-900">Basketball</span>
              </div>
            </div>
          </div>

          {/* Roster */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-gray-900">
                Roster ({roster.length} players)
              </h3>
            </div>

            {/* Add Player Form */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Player name"
                className="px-3 py-2 border-2 border-gray-200 rounded-lg outline-none focus:border-blue-600"
                onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
              />
              <input
                type="text"
                value={playerNumber}
                onChange={(e) => setPlayerNumber(e.target.value)}
                placeholder="Number"
                className="px-3 py-2 border-2 border-gray-200 rounded-lg outline-none focus:border-blue-600"
                onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
              />
              <select
                value={playerPosition}
                onChange={(e) => setPlayerPosition(e.target.value)}
                className="px-3 py-2 border-2 border-gray-200 rounded-lg outline-none focus:border-blue-600"
              >
                <option>Guard</option>
                <option>Forward</option>
                <option>Center</option>
              </select>
              <button
                onClick={addPlayer}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition"
              >
                <Plus size={18} />
                Add
              </button>
            </div>

            {/* Player List */}
            {roster.length > 0 ? (
              <div className="space-y-2">
                {roster.map(player => (
                  <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-900 w-8">{player.number || '-'}</span>
                      <span className="font-bold text-gray-900">{player.name}</span>
                      <span className="text-sm text-gray-600">{player.position}</span>
                    </div>
                    <button
                      onClick={() => removePlayer(player.id)}
                      className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No players added yet
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTeam;