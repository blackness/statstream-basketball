import React, { useState, useEffect } from 'react';
import { Calendar, Play } from 'lucide-react';
import AppHeader from '../Shared/AppHeader';

const PreGameSetup = ({
  user,
  teams,
  preselectedTeam,
  onStartGame,
  onScheduleGame,
  onCancel,
  toast
}) => {
  const [selectedTeam,    setSelectedTeam]    = useState(preselectedTeam || null);
  const [opponent,        setOpponent]        = useState('');
  const [location,        setLocation]        = useState('');
  const [isHome,          setIsHome]          = useState(true);
  const [periodLength,    setPeriodLength]    = useState(8);
  const [totalPeriods,    setTotalPeriods]    = useState(4);
  const [scheduleForLater, setScheduleForLater] = useState(false);
  const [scheduledAt,     setScheduledAt]     = useState('');
  const [saving,          setSaving]          = useState(false);
  const [gameType,        setGameType]        = useState('regular');

  // Auto-select preselected team
  useEffect(() => {
    if (preselectedTeam) setSelectedTeam(preselectedTeam);
  }, [preselectedTeam]);

  // Min datetime for scheduling — now
  const minDateTime = new Date(Date.now() - 60000).toISOString().slice(0, 16);

  const gameSettings = {
    opponent:     opponent.trim(),
    location:     location.trim(),
    isHome,
    periodLength,
    totalPeriods,
    game_type:    gameType,
    homeFouls:    0,
    awayFouls:    0,
  };

  const validate = () => {
    if (!selectedTeam)      { toast?.error('Please select a team');         return false; }
    if (!opponent.trim())   { toast?.error('Please enter an opponent name'); return false; }
    if (scheduleForLater && !scheduledAt) {
      toast?.error('Please pick a date and time'); return false;
    }
    return true;
  };

  const handleStart = () => {
    if (!validate()) return;
    onStartGame(selectedTeam, gameSettings);
  };

  const handleSchedule = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onScheduleGame(selectedTeam, gameSettings, new Date(scheduledAt).toISOString());
    } finally {
      setSaving(false);
    }
  };

  // ── Shared input style ───────────────────────────────────────────────────
  const inputCls =
    'w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none ' +
    'focus:border-blue-600 transition text-sm font-semibold text-gray-900 ' +
    'placeholder:text-gray-300 placeholder:font-normal';

  return (
    <div className="h-screen w-full bg-gray-50 flex flex-col overflow-hidden">

      <AppHeader
        title={scheduleForLater ? 'Schedule Game' : 'Start Game'}
        isDashboard={false}
        onDashboard={onCancel}
        userEmail={user?.email}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-2xl mx-auto space-y-5">

          {/* ── Select Team ── */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-black text-gray-900 mb-4">Your Team</h3>
            {teams.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teams.map(team => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team)}
                    className={`p-4 rounded-xl border-2 transition text-left ${
                      selectedTeam?.id === team.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                        {team.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-gray-900 truncate">{team.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {team.roster?.length || 0} players
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                No teams yet — create a team first.
              </p>
            )}
          </div>

          {/* ── Game Details ── */}
          {selectedTeam && (
            <>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-black text-gray-900">Game Details</h3>

                {/* Opponent */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Opponent *
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={opponent}
                    onChange={e => setOpponent(e.target.value)}
                    className={inputCls}
                    placeholder="Opponent team name"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className={inputCls}
                    placeholder="Arena / gym (optional)"
                  />
                </div>

                {/* Home / Away */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Home or Away?
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsHome(true)}
                      className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${
                        isHome
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      🏠 Home
                    </button>
                    <button
                      onClick={() => setIsHome(false)}
                      className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${
                        !isHome
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      ✈️ Away
                    </button>
                  </div>
                </div>
                {/* Game Type */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Game Type
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {['regular','playoff','tournament','scrimmage'].map(type => (
                      <button
                        key={type}
                        onClick={() => setGameType(type)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition ${
                          gameType === type
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Period settings */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Period Length
                    </label>
                    <select
                      value={periodLength}
                      onChange={e => setPeriodLength(Number(e.target.value))}
                      className={inputCls}
                    >
                      <option value={5}>5 minutes</option>
                      <option value={6}>6 minutes</option>
                      <option value={8}>8 minutes</option>
                      <option value={10}>10 minutes</option>
                      <option value={12}>12 minutes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Periods
                    </label>
                    <select
                      value={totalPeriods}
                      onChange={e => setTotalPeriods(Number(e.target.value))}
                      className={inputCls}
                    >
                      <option value={2}>2 halves</option>
                      <option value={4}>4 quarters</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Schedule toggle ── */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <button
                  onClick={() => setScheduleForLater(v => !v)}
                  className="flex items-center gap-3 w-full group"
                >
                  <div className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                    scheduleForLater ? 'bg-blue-600' : 'bg-gray-200'
                  }`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                      scheduleForLater ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-gray-900 text-sm group-hover:text-blue-600 transition">
                      Schedule for Later
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Set a date and time — start the game when you're ready
                    </p>
                  </div>
                </button>

                {/* Date/time picker */}
                {scheduleForLater && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Game Date & Time *
                    </label>
                    <div className="relative">
                      <Calendar
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                      <input
                        type="datetime-local"
                        value={scheduledAt}
                        min={minDateTime}
                        onChange={e => setScheduledAt(e.target.value)}
                        className={`${inputCls} pl-10`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ── Actions ── */}
              <div className="flex gap-3 pb-6">
                <button
                  onClick={onCancel}
                  className="flex-1 py-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-sm transition"
                >
                  Cancel
                </button>

                {scheduleForLater ? (
                  <button
                    onClick={handleSchedule}
                    disabled={saving || !opponent.trim() || !scheduledAt}
                    className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-black text-sm transition flex items-center justify-center gap-2"
                  >
                    <Calendar size={15} />
                    {saving ? 'Scheduling...' : 'Schedule Game'}
                  </button>
                ) : (
                  <button
                    onClick={handleStart}
                    disabled={!opponent.trim()}
                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-black text-sm transition flex items-center justify-center gap-2"
                  >
                    <Play size={15} fill="currentColor" />
                    Start Game Now
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreGameSetup;