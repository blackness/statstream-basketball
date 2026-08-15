import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import AppHeader from '../Shared/AppHeader';
import {
  Plus, Edit2, UserX, UserCheck,
  Trash2, X, ChevronDown, ChevronUp
} from 'lucide-react';

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];

const inputCls =
  'w-full px-3.5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm ' +
  'font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ' +
  'focus:border-transparent transition placeholder:text-gray-300 placeholder:font-normal';

// ─── Edit Player Modal ─────────────────────────────────────────────────────────
const EditPlayerModal = ({ player, onSave, onClose, toast }) => {
  const [form, setForm] = useState({
    name:     player.name     || '',
    number:   player.number   || '',
    position: player.position || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast?.error('Name required'); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('players')
        .update({
          name:     form.name.trim(),
          number:   form.number.trim(),
          position: form.position.trim() || null,
        })
        .eq('id', player.id);

      if (error) throw error;
      onSave({ ...player, ...form });
    } catch (err) {
      console.error(err);
      toast?.error('Failed to save');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-black text-gray-900">Edit Player</h3>
            <p className="text-xs text-gray-400 mt-0.5">{player.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Name *
            </label>
            <input
              autoFocus
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className={inputCls}
              placeholder="Full name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Number
              </label>
              <input
                type="text"
                value={form.number}
                onChange={e => set('number', e.target.value)}
                className={inputCls}
                placeholder="#"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Position
              </label>
              <div className="flex gap-1 flex-wrap">
                {POSITIONS.map(pos => (
                  <button
                    key={pos}
                    onClick={() => set('position', form.position === pos ? '' : pos)}
                    className={`px-2.5 py-2 rounded-lg text-xs font-bold transition ${
                      form.position === pos
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl font-bold text-sm transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Player Row ────────────────────────────────────────────────────────────────
const PlayerRow = ({ player, onEdit, onUnroster, onReroster, onDelete, isInactive }) => (
  <div className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition ${
    isInactive ? 'opacity-50 hover:opacity-100' : ''
  }`}>
    {/* Jersey number */}
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
      isInactive ? 'bg-gray-100' : 'bg-gray-900'
    }`}>
      <span className={`font-black text-sm ${isInactive ? 'text-gray-400' : 'text-white'}`}>
        {player.number || '—'}
      </span>
    </div>

    {/* Name + position */}
    <div className="flex-1 min-w-0">
      <p className={`font-black truncate ${isInactive ? 'text-gray-500' : 'text-gray-900'}`}>
        {player.name}
      </p>
      {player.position && (
        <p className="text-xs text-gray-400 font-medium">{player.position}</p>
      )}
    </div>

    {/* Actions */}
    <div className="flex items-center gap-1 flex-shrink-0">
      {isInactive ? (
        <>
          <button
            onClick={onReroster}
            title="Re-roster"
            className="p-2 text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
          >
            <UserCheck size={14} />
          </button>
          <button
            onClick={onDelete}
            title="Delete permanently"
            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
          >
            <Trash2 size={14} />
          </button>
        </>
      ) : (
        <>
          <button
            onClick={onEdit}
            title="Edit player"
            className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={onUnroster}
            title="Remove from roster"
            className="p-2 text-gray-300 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition"
          >
            <UserX size={14} />
          </button>
        </>
      )}
    </div>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
const ManageRoster = ({ user, team, onBack, toast }) => {
  const [players,       setPlayers]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [showAddForm,   setShowAddForm]   = useState(false);
  const [showInactive,  setShowInactive]  = useState(false);
  const [newPlayer,     setNewPlayer]     = useState({ name: '', number: '', position: '' });
  const [adding,        setAdding]        = useState(false);

  useEffect(() => { loadPlayers(); }, []);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', team.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setPlayers(data || []);
    } catch (err) {
      console.error(err);
      toast?.error('Failed to load roster');
    } finally {
      setLoading(false);
    }
  };

  const active   = players
    .filter(p => p.active && p.status === 'rostered')
    .sort((a, b) => (parseInt(a.number) || 999) - (parseInt(b.number) || 999));

  const inactive = players
    .filter(p => !p.active || p.status !== 'rostered');

  // ── Add player ──────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!newPlayer.name.trim()) { toast?.error('Name is required'); return; }
    setAdding(true);
    try {
      const { data, error } = await supabase
        .from('players')
        .insert([{
          team_id:  team.id,
          name:     newPlayer.name.trim(),
          number:   newPlayer.number.trim(),
          position: newPlayer.position || null,
          active:   true,
          status:   'rostered',
        }])
        .select()
        .single();
      if (error) throw error;
      setPlayers(prev => [...prev, data]);
      setNewPlayer({ name: '', number: '', position: '' });
      setShowAddForm(false);
      toast?.success('Player added!');
    } catch (err) {
      console.error(err);
      toast?.error('Failed to add player');
    } finally {
      setAdding(false);
    }
  };

  // ── Unroster ────────────────────────────────────────────────────────────────
  const handleUnroster = async (player) => {
    if (!confirm(`Remove ${player.name} from the active roster?`)) return;
    try {
      const { error } = await supabase
        .from('players')
        .update({
          active:        false,
          status:        'unrostered',
          unrostered_at: new Date().toISOString(),
          unrostered_by: user.id,
        })
        .eq('id', player.id);
      if (error) throw error;
      setPlayers(prev => prev.map(p =>
        p.id === player.id
          ? { ...p, active: false, status: 'unrostered' }
          : p
      ));
      toast?.success(`${player.name} removed from roster`);
    } catch (err) {
      console.error(err);
      toast?.error('Failed to update player');
    }
  };

  // ── Re-roster ───────────────────────────────────────────────────────────────
  const handleReroster = async (player) => {
    try {
      const { error } = await supabase
        .from('players')
        .update({
          active:        true,
          status:        'rostered',
          unrostered_at: null,
          unrostered_by: null,
        })
        .eq('id', player.id);
      if (error) throw error;
      setPlayers(prev => prev.map(p =>
        p.id === player.id
          ? { ...p, active: true, status: 'rostered', unrostered_at: null }
          : p
      ));
      toast?.success(`${player.name} re-rostered!`);
    } catch (err) {
      console.error(err);
      toast?.error('Failed to re-roster player');
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (player) => {
    if (!confirm(`Permanently delete ${player.name}? This cannot be undone.`)) return;
    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', player.id);
      if (error) throw error;
      setPlayers(prev => prev.filter(p => p.id !== player.id));
      toast?.success('Player deleted');
    } catch (err) {
      console.error(err);
      toast?.error('Failed to delete player');
    }
  };

  // ── Player saved from modal ─────────────────────────────────────────────────
  const handlePlayerSaved = (updated) => {
    setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p));
    setEditingPlayer(null);
    toast?.success('Player updated!');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <AppHeader
          title="Manage Roster"
          isDashboard={false}
          onDashboard={onBack}
          userEmail={user?.email}
        />

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto p-4 pb-12 space-y-4">

            {/* Team header */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0">
                {team.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-black text-gray-900 truncate">{team.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {active.length} active
                  {inactive.length > 0 && ` · ${inactive.length} unrostered`}
                </p>
              </div>
              <button
                onClick={() => setShowAddForm(v => !v)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition active:scale-95 flex-shrink-0"
              >
                <Plus size={14} />
                Add Player
              </button>
            </div>

            {/* Add player form */}
            {showAddForm && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-blue-200 space-y-4">
                <h3 className="font-black text-gray-900 text-sm">New Player</h3>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Name *
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={newPlayer.name}
                    onChange={e => setNewPlayer(p => ({ ...p, name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    className={inputCls}
                    placeholder="Player name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Number
                    </label>
                    <input
                      type="text"
                      value={newPlayer.number}
                      onChange={e => setNewPlayer(p => ({ ...p, number: e.target.value }))}
                      className={inputCls}
                      placeholder="e.g. 23"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Position
                    </label>
                    <div className="flex gap-1 flex-wrap">
                      {POSITIONS.map(pos => (
                        <button
                          key={pos}
                          onClick={() => setNewPlayer(p => ({
                            ...p, position: p.position === pos ? '' : pos
                          }))}
                          className={`px-2.5 py-2 rounded-lg text-xs font-bold transition ${
                            newPlayer.position === pos
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewPlayer({ name: '', number: '', position: '' });
                    }}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold text-sm transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={adding || !newPlayer.name.trim()}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition"
                  >
                    {adding ? 'Adding...' : 'Add Player'}
                  </button>
                </div>
              </div>
            )}

            {/* Active roster */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <h3 className="font-black text-gray-900 text-sm">
                  Active Roster
                  <span className="ml-2 text-xs font-bold text-gray-400">
                    ({active.length})
                  </span>
                </h3>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : active.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm font-bold text-gray-400">No active players</p>
                  <p className="text-xs text-gray-300 mt-1">Add players using the button above</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {active.map(player => (
                    <PlayerRow
                      key={player.id}
                      player={player}
                      isInactive={false}
                      onEdit={() => setEditingPlayer(player)}
                      onUnroster={() => handleUnroster(player)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Unrostered */}
            {inactive.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setShowInactive(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition"
                >
                  <h3 className="font-black text-gray-500 text-sm">
                    Unrostered
                    <span className="ml-2 text-xs font-bold text-gray-400">
                      ({inactive.length})
                    </span>
                  </h3>
                  {showInactive
                    ? <ChevronUp size={15} className="text-gray-400" />
                    : <ChevronDown size={15} className="text-gray-400" />
                  }
                </button>

                {showInactive && (
                  <div className="divide-y divide-gray-50 border-t border-gray-50">
                    {inactive.map(player => (
                      <PlayerRow
                        key={player.id}
                        player={player}
                        isInactive={true}
                        onReroster={() => handleReroster(player)}
                        onDelete={() => handleDelete(player)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Hint */}
            {!loading && (
              <p className="text-center text-xs text-gray-400">
                Unrostering a player removes them from the active roster but
                preserves all their game stats.
              </p>
            )}

          </div>
        </div>
      </div>

      {/* Edit player modal */}
      {editingPlayer && (
        <EditPlayerModal
          player={editingPlayer}
          onSave={handlePlayerSaved}
          onClose={() => setEditingPlayer(null)}
          toast={toast}
        />
      )}
    </>
  );
};

export default ManageRoster;