import React, { useState } from 'react';
import AppHeader from '../Shared/AppHeader';
import { Plus, X, Users, Eye, EyeOff, Copy, Check, RefreshCw } from 'lucide-react';
import { slugify } from '../../utils/slugify';
import { teamGradientStyle, darkenHex } from '../../utils/colorUtils';

const CreateTeam = ({ user, onSave, onCancel, toast }) => {
  const [teamName, setTeamName] = useState('');
  const [coach, setCoach] = useState('');
  const [roster, setRoster] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [playerNumber, setPlayerNumber] = useState('');
  const [playerPosition, setPlayerPosition] = useState('Guard');
  const [saving, setSaving] = useState(false);
  const [pin, setPin] = useState(Math.floor(1000 + Math.random() * 9000).toString());
  const [showPin,   setShowPin]   = useState(false);
  const [pinCopied, setPinCopied] = useState(false);
  const [slug, setSlug] = useState('');
  const [teamColor, setTeamColor] = useState('#3b82f6');

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
      losses: 0,
      pin: pin,
      colors: teamColor, 
      slug: slug || null
    });
    setSaving(false);
  };
  const copyPin = async () => {
    if (!pin) return;
    await navigator.clipboard.writeText(pin);
    setPinCopied(true);
    setTimeout(() => setPinCopied(false), 2000);
  };
  const handleNameChange = (e) => {
  setTeamName(e.target.value);
  if (!slug) setSlug(slugify(e.target.value));
};
onChange={handleNameChange}
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

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Team Color
                </label>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <input
                    type="color"
                    value={teamColor}
                    onChange={e => setTeamColor(e.target.value)}
                    className="w-12 h-12 rounded-xl border-2 border-gray-200 cursor-pointer p-1 bg-white"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-sm">Pick a color</p>
                    <p className="text-xs text-gray-400 mt-0.5">Used on cards, scoreboard, and public pages</p>
                  </div>
                  <div
                    className="w-14 h-14 rounded-xl shadow-md flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${teamColor}, ${darkenHex(teamColor, 0.3)})` }}
                  />
                </div>
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
          {/* Pin update */}          
          {/* PIN */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-black text-gray-900 mb-1">Stat Tracker PIN</h3>
            <p className="text-sm text-gray-500 mb-4">
              Share this 4-digit PIN with anyone you want to track stats for this team.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-600 font-mono tracking-[0.4em] text-center text-xl pr-10"
                  placeholder="••••"
                  maxLength={4}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition"
                >
                  {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <button
                type="button"
                onClick={copyPin}
                title="Copy PIN"
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition text-gray-500"
              >
                {pinCopied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
              </button>
              <button
                type="button"
                onClick={() => setPin(Math.floor(1000 + Math.random() * 9000).toString())}
                title="Generate new PIN"
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition text-gray-500"
              >
                <RefreshCw size={15} />
              </button>
            </div>
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
            <div>
  <label className="block text-sm font-bold text-gray-700 mb-2">
    Public URL Slug
  </label>
  <div className="flex items-center gap-2">
    <span className="text-sm text-gray-400 flex-shrink-0">yoursite.com/team/</span>
    <input
      type="text"
      value={slug}
      onChange={e => setSlug(slugify(e.target.value))}
      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-600 font-mono text-sm"
      placeholder="team-slug"
    />
  </div>
  <p className="text-xs text-gray-400 mt-1">Letters, numbers and dashes only</p>
</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTeam;