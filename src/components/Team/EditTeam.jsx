import React, { useState } from 'react';
import { supabase } from '../../../supabase';
import AppHeader from '../Shared/AppHeader';
import {
  Eye, EyeOff, RefreshCw, Copy, Check,
  Archive, ChevronDown, ChevronUp
} from 'lucide-react';
import { slugify } from '../../utils/slugify';

const SPORTS = [
  'basketball', 'baseball', 'soccer',
  'football', 'volleyball', 'hockey', 'other'
];

const VISIBILITY = [
  { value: 'public',  label: 'Public',  desc: 'Anyone can view this team' },
  { value: 'private', label: 'Private', desc: 'Only you can view this team' },
];

// ─── Small reusable field wrapper ─────────────────────────────────────────────
const Field = ({ label, required, hint, children }) => (
  <div>
    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
  </div>
);

const inputCls =
  'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm ' +
  'font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ' +
  'focus:border-transparent transition placeholder:text-gray-300 placeholder:font-normal';

// ─── Component ────────────────────────────────────────────────────────────────
const EditTeam = ({ user, team, onSave, onCancel, toast }) => {
  const [form, setForm] = useState({
    name:            team.name            || '',
    sport:           team.sport           || 'basketball',
    colors:          team.colors          || '',
    coach:           team.coach           || '',
    assistant_coach: team.assistant_coach || '',
    manager:         team.manager         || '',
    league:          team.league          || '',
    division:        team.division        || '',
    location:        team.location        || '',
    venue:           team.venue           || '',
    founded:         team.founded         || '',
    notes:           team.notes           || '',
    visibility:      team.visibility      || 'public',
    pin:             team.pin             || '',
    slug: team.slug || '',
    
  });

  const [saving,     setSaving]     = useState(false);
  const [showPin,    setShowPin]    = useState(false);
  const [pinCopied,  setPinCopied]  = useState(false);
  const [showDanger, setShowDanger] = useState(false);
  const [archiving,  setArchiving]  = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const generatePin = () =>
    set('pin', Math.floor(1000 + Math.random() * 9000).toString());

  const copyPin = async () => {
    if (!form.pin) return;
    await navigator.clipboard.writeText(form.pin);
    setPinCopied(true);
    setTimeout(() => setPinCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast?.error('Team name is required'); return; }
    if (form.pin && form.pin.length !== 4) { toast?.error('PIN must be 4 digits'); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('teams')
        .update({
          name:            form.name.trim(),
          sport:           form.sport,
          colors:          form.colors.trim()          || null,
          coach:           form.coach.trim()           || null,
          assistant_coach: form.assistant_coach.trim() || null,
          manager:         form.manager.trim()         || null,
          league:          form.league.trim()          || null,
          division:        form.division.trim()        || null,
          location:        form.location.trim()        || null,
          venue:           form.venue.trim()           || null,
          founded:         form.founded.trim()         || null,
          notes:           form.notes.trim()           || null,
          visibility:      form.visibility,
          pin:             form.pin                    || null,
          updated_at:      new Date().toISOString(),
          slug:            form.slug || null,
        })
        .eq('id', team.id);

      if (error) throw error;
      toast?.success('Team updated!');
      onSave();
    } catch (err) {
      console.error(err);
      toast?.error('Failed to update team');
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm(`Archive "${team.name}"? It will be hidden from your dashboard. All game history is preserved.`)) return;
    setArchiving(true);
    try {
      const { error } = await supabase
        .from('teams')
        .update({
          archived:    true,
          archived_at: new Date().toISOString(),
          archived_by: user.id,
        })
        .eq('id', team.id);
      if (error) throw error;
      toast?.success('Team archived');
      onSave();
    } catch (err) {
      console.error(err);
      toast?.error('Failed to archive team');
      setArchiving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader
        title="Edit Team"
        isDashboard={false}
        onDashboard={onCancel}
        userEmail={user?.email}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 pb-12 space-y-5">

          {/* ── Team Info ── */}
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Team Info
            </h2>

            <Field label="Team Name" required>
              <input
                autoFocus
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className={inputCls}
                placeholder="e.g. Chicago Bulls"
              />
            </Field>

            <Field label="Sport">
              <div className="flex flex-wrap gap-2">
                {SPORTS.map(s => (
                  <button
                    key={s}
                    onClick={() => set('sport', s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
                      form.sport === s
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Team Colors">
              <input
                type="text"
                value={form.colors}
                onChange={e => set('colors', e.target.value)}
                className={inputCls}
                placeholder="e.g. Red & Black"
              />
            </Field>
            <Field label="Public URL Slug" hint="yoursite.com/team/your-slug">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                <span className="pl-4 text-sm text-gray-400 whitespace-nowrap">yoursite.com/team/</span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => set('slug', slugify(e.target.value))}
                  className="flex-1 py-3 pr-4 bg-transparent text-sm font-mono font-semibold text-gray-900 focus:outline-none"
                  placeholder="team-slug"
                />
              </div>
            </Field>

          </section>

          {/* ── Staff ── */}
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Staff</h2>

            <Field label="Head Coach">
              <input
                type="text"
                value={form.coach}
                onChange={e => set('coach', e.target.value)}
                className={inputCls}
                placeholder="Coach name"
              />
            </Field>

            <Field label="Assistant Coach">
              <input
                type="text"
                value={form.assistant_coach}
                onChange={e => set('assistant_coach', e.target.value)}
                className={inputCls}
                placeholder="Assistant coach name"
              />
            </Field>

            <Field label="Manager">
              <input
                type="text"
                value={form.manager}
                onChange={e => set('manager', e.target.value)}
                className={inputCls}
                placeholder="Team manager"
              />
            </Field>
          </section>

          {/* ── League & Location ── */}
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">
              League & Location
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <Field label="League">
                <input
                  type="text"
                  value={form.league}
                  onChange={e => set('league', e.target.value)}
                  className={inputCls}
                  placeholder="e.g. NBA"
                />
              </Field>
              <Field label="Division">
                <input
                  type="text"
                  value={form.division}
                  onChange={e => set('division', e.target.value)}
                  className={inputCls}
                  placeholder="e.g. East"
                />
              </Field>
            </div>

            <Field label="City / Location">
              <input
                type="text"
                value={form.location}
                onChange={e => set('location', e.target.value)}
                className={inputCls}
                placeholder="e.g. Chicago, IL"
              />
            </Field>

            <Field label="Home Venue">
              <input
                type="text"
                value={form.venue}
                onChange={e => set('venue', e.target.value)}
                className={inputCls}
                placeholder="e.g. United Center"
              />
            </Field>

            <Field label="Founded">
              <input
                type="text"
                value={form.founded}
                onChange={e => set('founded', e.target.value)}
                className={inputCls}
                placeholder="e.g. 1966"
              />
            </Field>
          </section>

          {/* ── Settings ── */}
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-5">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Settings</h2>

            {/* Visibility */}
            <Field label="Visibility">
              <div className="flex gap-2">
                {VISIBILITY.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => set('visibility', opt.value)}
                    className={`flex-1 p-3 rounded-xl border-2 text-left transition ${
                      form.visibility === opt.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <p className={`font-black text-sm ${
                      form.visibility === opt.value ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </Field>

            {/* PIN */}
            <Field
              label="Stat Tracker PIN"
              hint="Share this 4-digit PIN with anyone you want to track stats for this team."
            >
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={form.pin}
                    onChange={e => set('pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className={`${inputCls} font-mono tracking-[0.4em] text-center pr-10`}
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

                {/* Copy */}
                <button
                  type="button"
                  onClick={copyPin}
                  disabled={!form.pin}
                  title="Copy PIN"
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded-xl transition text-gray-500"
                >
                  {pinCopied
                    ? <Check size={15} className="text-emerald-500" />
                    : <Copy size={15} />
                  }
                </button>

                {/* Regenerate */}
                <button
                  type="button"
                  onClick={generatePin}
                  title="Generate new PIN"
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition text-gray-500"
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            </Field>

            {/* Notes */}
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                rows={3}
                className={`${inputCls} resize-none`}
                placeholder="Any notes about this team..."
              />
            </Field>
          </section>

          {/* ── Danger Zone ── */}
          <section className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            <button
              onClick={() => setShowDanger(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-red-50 transition"
            >
              <span className="text-xs font-black text-red-500 uppercase tracking-widest">
                Danger Zone
              </span>
              {showDanger
                ? <ChevronUp size={15} className="text-red-400" />
                : <ChevronDown size={15} className="text-red-400" />
              }
            </button>

            {showDanger && (
              <div className="px-5 pb-5 border-t border-red-50 space-y-3">
                <p className="text-xs text-gray-400 mt-3">
                  Archiving hides this team from your dashboard. All games and player
                  stats are preserved and can be restored by the admin.
                </p>
                <button
                  onClick={handleArchive}
                  disabled={archiving}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-sm transition disabled:opacity-50"
                >
                  <Archive size={14} />
                  {archiving ? 'Archiving...' : 'Archive Team'}
                </button>
              </div>
            )}
          </section>

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancel}
              className="flex-1 py-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-sm transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EditTeam;