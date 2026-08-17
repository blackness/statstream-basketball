import React from 'react';
import { Plus, Edit2, Users, Play, ChevronRight, BarChart2 } from 'lucide-react';
import { teamGradientStyle, isHexColor } from '../../utils/colorUtils';

const GRADIENTS = [
  'from-blue-500 to-blue-700',    'from-purple-500 to-purple-700',
  'from-emerald-500 to-emerald-700', 'from-orange-500 to-orange-700',
  'from-rose-500 to-rose-700',    'from-indigo-500 to-indigo-700',
  'from-teal-500 to-teal-700',    'from-amber-500 to-amber-700',
];

const gradient = (name = '') =>
  GRADIENTS[(name.charCodeAt(0) || 0) % GRADIENTS.length];
const getAvatarStyle = (team) =>
  isHexColor(team?.colors) ? teamGradientStyle(team.colors) : undefined;

const getAvatarClass = (team) =>
  `w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0 ${
    !isHexColor(team?.colors) ? `bg-gradient-to-br ${gradient(team?.name || '')}` : ''
  }`;
const TeamPanel = ({
  teams = [],
  selectedTeamId,
  onSelectTeam,
  onNewTeam,
  onEditTeam,
  onManageRoster,
  onNewGame,
  onSeasonStats, 
}) => {
  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <div>
          <h2 className="font-black text-gray-900">Teams</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {teams.length} team{teams.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={onNewTeam}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition active:scale-95"
        >
          <Plus size={13} />
          New Team
        </button>
      </div>

      {/* All Teams chip */}
      <div className="px-5 pt-3 pb-2 flex-shrink-0">
        <button
          onClick={() => onSelectTeam(null)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold transition ${
            !selectedTeamId
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          <span>All Teams</span>
          {!selectedTeamId && <ChevronRight size={13} className="opacity-60" />}
        </button>
      </div>

      {/* Team list */}
      <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2">
        {teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
              <Users size={22} className="text-gray-300" />
            </div>
            <p className="font-black text-gray-400 text-sm">No teams yet</p>
            <p className="text-xs text-gray-300 mt-1">Create your first team</p>
            <button
              onClick={onNewTeam}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
            >
              Create Team
            </button>
          </div>
        ) : (
          teams.map(team => {
            const selected = selectedTeamId === team.id;
            const wins     = team.wins   || 0;
            const losses   = team.losses || 0;
            const total    = wins + losses;
            const pct      = total > 0 ? Math.round((wins / total) * 100) : null;

            return (
              <div
                key={team.id}
                className={`rounded-2xl border-2 overflow-hidden transition-all ${
                  selected
                    ? 'border-blue-500 shadow-md shadow-blue-100'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                {/* Main row — click to select */}
                <button
                  onClick={() => onSelectTeam(selected ? null : team)}
                  className="w-full flex items-center gap-3 p-3 text-left"
                >
                  <div className={getAvatarClass(team)} style={getAvatarStyle(team)}>
                    {team.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 text-sm truncate">{team.name}</p>
                    <p className="text-xs text-gray-500 font-semibold tabular-nums">
                      {wins}–{losses}
                      {pct !== null && (
                        <span className="text-gray-400 font-normal ml-1">({pct}%)</span>
                      )}
                      <span className="text-gray-300 mx-1">·</span>
                      <span className="text-gray-400">{team.roster?.length || 0} players</span>
                    </p>
                  </div>
                  <ChevronRight size={13} className={`flex-shrink-0 transition-colors ${
                    selected ? 'text-blue-500' : 'text-gray-300'
                  }`} />
                </button>

                {/* Quick actions (always visible) */}
                <div className="flex border-t border-gray-50">
                  <button
                    onClick={() => onEditTeam(team)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-bold text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition"
                  >
                    <Edit2 size={11} /> Edit
                  </button>
                  <div className="w-px bg-gray-50" />
                  <button
                    onClick={() => onManageRoster(team)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-bold text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition"
                  >
                    <Users size={11} /> Roster
                  </button>
                  <div className="w-px bg-gray-50" />
                  <button
                    onClick={() => onNewGame(team)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-bold text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition"
                  >
                    <Play size={11} fill="currentColor" /> Game
                  </button>
                  <div className="w-px bg-gray-50" />
                  <button
                    onClick={() => onSeasonStats(team)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-bold text-purple-500 hover:text-purple-700 hover:bg-purple-50 transition"
                  >
                    <BarChart2 size={11} /> Stats
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TeamPanel;