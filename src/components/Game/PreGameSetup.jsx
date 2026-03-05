import React, { useState } from 'react';
import { Home, Users } from 'lucide-react';
import AppHeader from '../Shared/AppHeader';

const PreGameSetup = ({ user, teams, onStartGame, onCancel, toast }) => {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [opponent, setOpponent] = useState('');
  const [location, setLocation] = useState('');
  const [isHome, setIsHome] = useState(true);
  const [periodLength, setPeriodLength] = useState(8);
  const [totalPeriods, setTotalPeriods] = useState(4);

  const handleStart = () => {
    if (!selectedTeam) {
      toast?.error('Please select a team');
      return;
    }
    if (!opponent.trim()) {
      toast?.error('Please enter opponent name');
      return;
    }

    const gameSettings = {
      opponent: opponent.trim(),
      location: location.trim(),
      isHome,
      periodLength,
      totalPeriods,
      homeFouls: 0,
      awayFouls: 0
    };

    onStartGame(selectedTeam, gameSettings);
  };

  return (
    <div className="h-screen w-full bg-gray-50 flex flex-col overflow-hidden">
      
      <AppHeader
        title="Start Game"
        isDashboard={false}
        onDashboard={onCancel}
        userEmail={user?.email}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Select Team */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-black text-gray-900 mb-4">Select Your Team</h3>
            
            {teams.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teams.map(team => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team)}
                    className={`p-4 rounded-xl border-2 transition text-left ${
                      selectedTeam?.id === team.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xl flex-shrink-0">
                        {team.name[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{team.name}</div>
                        <div className="text-sm text-gray-600">
                          {team.roster?.length || 0} players
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No teams available. Create a team first!</p>
            )}
          </div>

          {/* Game Details */}
          {selectedTeam && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-black text-gray-900 mb-4">Game Details</h3>
              
              <div className="space-y-4">
                {/* Opponent */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Opponent *
                  </label>
                  <input
                    type="text"
                    value={opponent}
                    onChange={(e) => setOpponent(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-600"
                    placeholder="Enter opponent team name"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-600"
                    placeholder="Enter game location"
                  />
                </div>

                {/* Home/Away */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Home or Away?
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsHome(true)}
                      className={`flex-1 px-4 py-3 rounded-xl font-bold transition ${
                        isHome
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      🏠 Home
                    </button>
                    <button
                      onClick={() => setIsHome(false)}
                      className={`flex-1 px-4 py-3 rounded-xl font-bold transition ${
                        !isHome
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      ✈️ Away
                    </button>
                  </div>
                </div>

                {/* Game Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Period Length (min)
                    </label>
                    <select
                      value={periodLength}
                      onChange={(e) => setPeriodLength(Number(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-600"
                    >
                      <option value={5}>5 minutes</option>
                      <option value={6}>6 minutes</option>
                      <option value={8}>8 minutes</option>
                      <option value={10}>10 minutes</option>
                      <option value={12}>12 minutes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Total Periods
                    </label>
                    <select
                      value={totalPeriods}
                      onChange={(e) => setTotalPeriods(Number(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-600"
                    >
                      <option value={2}>2 halves</option>
                      <option value={4}>4 quarters</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          {selectedTeam && (
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition"
              >
                Start Game
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreGameSetup;