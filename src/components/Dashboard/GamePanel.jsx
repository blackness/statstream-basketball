import React, { useState } from 'react';
import { Play, Calendar } from 'lucide-react';
import LiveGameCard      from '../Game/LiveGameCard';
import CompletedGameCard from '../Game/CompletedGameCard';
import ScheduledGameCard from '../Game/ScheduledGameCard';
import EditGameModal     from '../Game/EditGameModal';

const FILTERS = ['All', 'Live', 'Scheduled', 'History'];

const GamePanel = ({
  games = [],
  teams = [],
  user,
  canManage,
  onResumeGame,
  onViewStats,
  onDeleteGame,
  onEndGame,
  onStartScheduled,
  onNewGame,
  onRefresh,
  toast,
}) => {
  const [filter,      setFilter]      = useState('All');
  const [editingGame, setEditingGame] = useState(null);

  const getTeam = (teamId) => teams.find(t => t.id === teamId);

  const live      = games.filter(g => g.status === 'in_progress');
  const scheduled = games.filter(g => g.status === 'scheduled');
  const history   = games.filter(g => g.status === 'completed');

  const showLive      = filter === 'All' || filter === 'Live';
  const showScheduled = filter === 'All' || filter === 'Scheduled';
  const showHistory   = filter === 'All' || filter === 'History';

  const hasAny = live.length > 0 || scheduled.length > 0 || history.length > 0;

  return (
    <>
      <div className="h-full flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-black text-gray-900">Games</h2>
            <p className="text-xs mt-0.5">
              {live.length > 0 && (
                <span className="text-red-500 font-bold">{live.length} live · </span>
              )}
              {scheduled.length > 0 && (
                <span className="text-blue-500 font-bold">{scheduled.length} upcoming · </span>
              )}
              <span className="text-gray-400">{history.length} completed</span>
            </p>
          </div>
          <button
            onClick={() => onNewGame()}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition active:scale-95"
          >
            <Play size={13} fill="currentColor" />
            New Game
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 px-5 py-3 border-b border-gray-50 flex-shrink-0 overflow-x-auto">
          {FILTERS.map(f => {
            const count =
              f === 'Live'      ? live.length :
              f === 'Scheduled' ? scheduled.length :
              f === 'History'   ? history.length : null;

            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex-shrink-0 ${
                  filter === f
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {f === 'Live' && (
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    live.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-gray-400'
                  }`} />
                )}
                {f}
                {count !== null && count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    filter === f ? 'bg-white/20' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable game list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 pb-10">

          {!hasAny && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                <Calendar size={26} className="text-gray-300" />
              </div>
              <p className="font-black text-gray-400 text-sm">No games yet</p>
              <p className="text-xs text-gray-300 mt-1">Start or schedule a game to begin</p>
              <button
                onClick={() => onNewGame()}
                className="mt-5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition"
              >
                Start First Game
              </button>
            </div>
          )}

          {/* Live */}
          {showLive && live.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Live Now</span>
              </div>
              {live.map(game => {
                const team = getTeam(game.team_id);
                return (
                  <LiveGameCard
                    key={game.id}
                    game={game}
                    teamName={team?.name || 'Unknown'}
                    canManage={canManage(team)}
                    onResume={() => onResumeGame(game)}
                    onViewStats={() => onViewStats(game)}
                    onEnd={() => onEndGame(game)}
                  />
                );
              })}
            </section>
          )}

          {/* Scheduled */}
          {showScheduled && scheduled.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Upcoming</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              {scheduled.map(game => {
                const team = getTeam(game.team_id);
                return (
                  <ScheduledGameCard
                    key={game.id}
                    game={game}
                    teamName={team?.name || 'Unknown'}
                    canManage={canManage(team)}
                    onStart={() => onStartScheduled(game)}
                    onEdit={() => setEditingGame(game)}
                    onDelete={() => onDeleteGame(game)}
                  />
                );
              })}
            </section>
          )}

          {/* History */}
          {showHistory && history.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">History</span>
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-300">{history.length}</span>
              </div>
              {history.map(game => {
                const team = getTeam(game.team_id);
                return (
                  <CompletedGameCard
                    key={game.id}
                    game={game}
                    team={team}
                    onViewStats={() => onViewStats(game)}
                    onDelete={() => onDeleteGame(game)}
                    onEdit={() => setEditingGame(game)}
                  />
                );
              })}
            </section>
          )}
        </div>
      </div>

      {editingGame && (
        <EditGameModal
          game={editingGame}
          onSave={() => { setEditingGame(null); onRefresh?.(); }}
          onClose={() => setEditingGame(null)}
          toast={toast}
        />
      )}
    </>
  );
};

export default GamePanel;