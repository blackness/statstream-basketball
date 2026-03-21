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

const [activeTab, setActiveTab] = useState('info'); // 'info' or 'roster'

return (
  <div className="h-screen w-full bg-gray-50 flex flex-col">
    <AppHeader title="Create Team" isDashboard={false} onDashboard={onCancel} userEmail={user?.email} />

    {/* Tab Navigation */}
    <div className="flex px-4 pt-4 gap-2">
      <button 
        onClick={() => setActiveTab('info')}
        className={`flex-1 py-3 text-sm font-bold rounded-t-xl transition-all ${activeTab === 'info' ? 'bg-white text-blue-600 shadow-sm' : 'bg-gray-200 text-gray-500'}`}
      >
        Team Info
      </button>
      <button 
        onClick={() => setActiveTab('roster')}
        className={`flex-1 py-3 text-sm font-bold rounded-t-xl transition-all ${activeTab === 'roster' ? 'bg-white text-blue-600 shadow-sm' : 'bg-gray-200 text-gray-500'}`}
      >
        Roster ({roster.length})
      </button>
    </div>

    <main className="flex-1 overflow-y-auto px-4 py-6 bg-white">
      <div className="max-w-2xl mx-auto">
        
        {activeTab === 'info' ? (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Team Name</label>
                <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Thunder Bay Wolves" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Coach Name</label>
                <input type="text" value={coach} onChange={(e) => setCoach(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional" />
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
             {/* Add Player Input Group */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <input type="text" placeholder="Name" className="sm:col-span-5 px-3 py-2 rounded-lg border border-gray-200 text-sm" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
              <input type="text" placeholder="#" className="sm:col-span-2 px-3 py-2 rounded-lg border border-gray-200 text-sm" value={playerNumber} onChange={(e) => setPlayerNumber(e.target.value)} />
              <select className="sm:col-span-3 px-2 py-2 rounded-lg border border-gray-200 text-sm" value={playerPosition} onChange={(e) => setPlayerPosition(e.target.value)}>
                <option>Guard</option><option>Forward</option><option>Center</option>
              </select>
              <button onClick={addPlayer} className="sm:col-span-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition">Add</button>
            </div>

            {/* List */}
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
              {roster.map(player => (
                <div key={player.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 flex items-center justify-center bg-blue-50 rounded-full font-bold text-blue-600 text-sm">{player.number}</span>
                    <span className="font-bold text-gray-900">{player.name}</span>
                  </div>
                  <button onClick={() => removePlayer(player.id)} className="text-gray-400 hover:text-red-500"><X size={18} /></button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>

    {/* Sticky Bottom Footer */}
    <div className="p-4 bg-gray-50 border-t border-gray-200 grid grid-cols-2 gap-4">
      <button onClick={onCancel} className="py-4 font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition">Cancel</button>
      <button onClick={handleSave} disabled={saving} className="py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition">
        {saving ? 'Saving...' : 'Create Team'}
      </button>
    </div>
  </div>
);
};

export default CreateTeam;