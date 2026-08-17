import React, { useState } from 'react';
import AppHeader from '../Shared/AppHeader';
import { Trophy, Calendar } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtPct = (m, a) => (a > 0 ? `${Math.round((m / a) * 100)}%` : '—');

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

const buildRow = (player, statsMap) => {
  const s    = statsMap?.[player.id] || {};
  const fgm  = s.fgm  || 0,  fga  = s.fga  || 0;
  const tpm  = s.tpm  || 0,  tpa  = s.tpa  || 0;
  const ftm  = s.ftm  || 0,  fta  = s.fta  || 0;
  const oreb = s.oreb || 0,  dreb = s.dreb || 0;
  return {
    id:     player.id,
    number: player.number || '—',
    name:   player.name,
    pts:    s.pts || 0,
    fgm, fga, tpm, tpa, ftm, fta,
    oreb, dreb,
    reb:    oreb + dreb,
    ast:    s.ast || 0,
    stl:    s.stl || 0,
    blk:    s.blk || 0,
    to:     s.to  || 0,
    pf:     s.pf  || 0,
  };
};

const sumRows = (rows) =>
  rows.reduce(
    (acc, r) => ({
      pts:  acc.pts  + r.pts,
      fgm:  acc.fgm  + r.fgm,  fga:  acc.fga  + r.fga,
      tpm:  acc.tpm  + r.tpm,  tpa:  acc.tpa  + r.tpa,
      ftm:  acc.ftm  + r.ftm,  fta:  acc.fta  + r.fta,
      oreb: acc.oreb + r.oreb, dreb: acc.dreb + r.dreb,
      reb:  acc.reb  + r.reb,
      ast:  acc.ast  + r.ast,  stl:  acc.stl  + r.stl,
      blk:  acc.blk  + r.blk,  to:   acc.to   + r.to,
      pf:   acc.pf   + r.pf,
    }),
    {
      pts:0, fgm:0, fga:0, tpm:0, tpa:0,
      ftm:0, fta:0, oreb:0, dreb:0, reb:0,
      ast:0, stl:0, blk:0, to:0, pf:0,
    }
  );

const maxBy = (rows, key) =>
  rows.filter(r => r[key] > 0)
      .reduce((best, r) => (!best || r[key] > best[key] ? r : best), null);

// ─── Column definitions ───────────────────────────────────────────────────────
// bold = PTS column accent colour, muted = secondary display (pcts, o/d reb)
const COLS = [
  { label: 'PTS', render: r => r.pts,                         bold: true  },
  { label: 'FG',  render: r => `${r.fgm}-${r.fga}`                        },
  { label: 'FG%', render: r => fmtPct(r.fgm, r.fga),         muted: true },
  { label: '3P',  render: r => `${r.tpm}-${r.tpa}`                        },
  { label: '3P%', render: r => fmtPct(r.tpm, r.tpa),         muted: true },
  { label: 'FT',  render: r => `${r.ftm}-${r.fta}`                        },
  { label: 'FT%', render: r => fmtPct(r.ftm, r.fta),         muted: true },
  { label: 'REB', render: r => r.reb                                       },
  { label: 'ORB', render: r => r.oreb,                        muted: true },
  { label: 'DRB', render: r => r.dreb,                        muted: true },
  { label: 'AST', render: r => r.ast                                       },
  { label: 'STL', render: r => r.stl                                       },
  { label: 'BLK', render: r => r.blk                                       },
  { label: 'TO',  render: r => r.to                                        },
  { label: 'PF',  render: r => r.pf                                        },
];

// ─── Box Score Table ──────────────────────────────────────────────────────────
const StatTable = ({ rows, isOurs }) => {
  const totals  = sumRows(rows);
  const sorted  = [...rows].sort((a, b) => b.pts - a.pts);
  const ptsCls  = isOurs ? 'text-blue-600' : 'text-red-600';
  const rowBg   = (i) => (i % 2 === 0 ? 'bg-white' : 'bg-gray-50');

  return (
    <div className="overflow-x-auto">
      <table className="text-sm min-w-max w-full">

        {/* Header */}
        <thead>
          <tr className="border-b-2 border-gray-100">
            <th className="text-left py-3 px-4 font-bold text-gray-500 sticky left-0 bg-white z-10 min-w-[155px]">
              Player
            </th>
            {COLS.map(col => (
              <th
                key={col.label}
                className={`py-3 px-3 text-right font-bold whitespace-nowrap select-none ${
                  col.muted ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        {/* Player rows */}
        <tbody>
          {sorted.map((row, idx) => (
            <tr key={row.id} className={`${rowBg(idx)} hover:brightness-[0.97] transition`}>
              <td className={`py-2.5 px-4 sticky left-0 z-10 ${rowBg(idx)}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono w-7 text-right shrink-0">
                    #{row.number}
                  </span>
                  <span className="font-bold text-gray-900 truncate max-w-[95px]">
                    {row.name}
                  </span>
                </div>
              </td>
              {COLS.map(col => (
                <td
                  key={col.label}
                  className={`py-2.5 px-3 text-right tabular-nums whitespace-nowrap ${
                    col.bold  ? `font-black ${ptsCls}`
                    : col.muted ? 'text-gray-400'
                    : 'text-gray-700'
                  }`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>

        {/* Team totals */}
        <tfoot>
          <tr className="border-t-2 border-gray-200 bg-gray-100 font-black">
            <td className="py-3 px-4 sticky left-0 bg-gray-100 z-10 text-xs text-gray-500 uppercase tracking-wider">
              Team
            </td>
            {COLS.map(col => (
              <td
                key={col.label}
                className={`py-3 px-3 text-right tabular-nums ${
                  col.bold  ? ptsCls
                  : col.muted ? 'text-gray-500'
                  : 'text-gray-700'
                }`}
              >
                {col.render(totals)}
              </td>
            ))}
          </tr>
        </tfoot>

      </table>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const GameStatsView = ({ user, game, team, onBack }) => {
  const [activeTab, setActiveTab] = useState('ours');
  const isOurs = activeTab === 'ours';

  // ── Our team rows ──────────────────────────────────────────────────────────
  const ourRoster = team?.roster || [];
  const ourRows   = ourRoster.map(p => buildRow(p, game.stats || {}));
  const ourTotals = sumRows(ourRows);

  // ── Opponent rows — handles quick mode (opp-team) and full mode (roster) ──
  const oppStats    = game.opponent_stats || {};
  const oppRoster   = game.opponent_roster || [];
  const isQuickMode = oppRoster.length === 0 && !!oppStats['opp-team'];
  const oppRows     = isQuickMode
    ? [buildRow({ id: 'opp-team', name: game.opponent, number: '—' }, oppStats)]
    : oppRoster.map(p => buildRow(p, oppStats));
  const oppTotals = sumRows(oppRows);   // ✅ moved AFTER oppRows is defined


  // Scores — handle home/away correctly
  const ourScore  = game.home_team === team?.name ? game.home_score : game.away_score;
  const oppScore  = game.home_team === team?.name ? game.away_score : game.home_score;
  const isComplete = game.status === 'completed';
  const weWon     = isComplete && ourScore > oppScore;
  const weLost    = isComplete && ourScore < oppScore;

  // Leaders (our team only)
  const leaders = {
    pts: maxBy(ourRows, 'pts'),
    reb: maxBy(ourRows, 'reb'),
    ast: maxBy(ourRows, 'ast'),
  };

  const activeRows   = isOurs ? ourRows   : oppRows;
  const activeTotals = isOurs ? ourTotals : oppTotals;

  const headerGradient = weWon
    ? 'from-blue-600 to-blue-700'
    : weLost
    ? 'from-gray-500 to-gray-600'
    : 'from-slate-600 to-slate-700';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader
        title="Box Score"
        isDashboard={false}
        onDashboard={onBack}
        userEmail={user?.email}
      />

      <div className="max-w-4xl mx-auto w-full px-4 py-4 space-y-4 pb-12">

        {/* ── Game Header ── */}
        <div className={`rounded-2xl p-5 text-white bg-gradient-to-br ${headerGradient}`}>

          {/* Meta row */}
          <div className="flex items-center justify-between text-xs opacity-75 mb-4">
            <span className="flex items-center gap-1.5">
              <Calendar size={12} />
              {fmtDate(game.created_at)}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full font-bold ${
              isComplete ? 'bg-white/20' : 'bg-yellow-400 text-yellow-900'
            }`}>
              {isComplete ? 'Final' : 'In Progress'}
            </span>
          </div>

          {/* Score */}
          <div className="flex items-center">
            <div className="flex-1 text-center">
              <div className="text-sm font-bold opacity-80 mb-1">{team?.name}</div>
              <div className="text-6xl font-black tabular-nums">{ourScore}</div>
              {weWon && (
                <div className="flex items-center justify-center gap-1 mt-2">
                  <Trophy size={13} className="text-yellow-300" />
                  <span className="text-xs font-black text-yellow-300 uppercase tracking-wider">Win</span>
                </div>
              )}
            </div>

            <div className="px-4 text-2xl font-black opacity-30">–</div>

            <div className="flex-1 text-center">
              <div className="text-sm font-bold opacity-80 mb-1">{game.opponent}</div>
              <div className="text-6xl font-black tabular-nums">{oppScore}</div>
            </div>
          </div>
        </div>

        {/* ── Game Leaders (our team) ── */}
        {ourRows.some(r => r.pts > 0) && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { title: 'Points',   key: 'pts', unit: 'PTS', player: leaders.pts },
              { title: 'Rebounds', key: 'reb', unit: 'REB', player: leaders.reb },
              { title: 'Assists',  key: 'ast', unit: 'AST', player: leaders.ast },
            ].map(({ title, key, unit, player }) => (
              <div
                key={title}
                className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center"
              >
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {title}
                </div>
                {player ? (
                  <>
                    <div className="text-3xl font-black text-blue-600 leading-none my-1.5">
                      {player[key]}
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 mb-0.5">{unit}</div>
                    <div className="text-xs font-black text-gray-800 truncate">{player.name}</div>
                  </>
                ) : (
                  <div className="text-xl text-gray-300 font-bold mt-2">—</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Team Tabs ── */}
        <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1 gap-1">
          <button
            onClick={() => setActiveTab('ours')}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${
              isOurs
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            {team?.name}
            <span className={`ml-2 text-xs ${isOurs ? 'opacity-75' : 'text-gray-400'}`}>
              {ourTotals.pts} pts
            </span>
          </button>
          <button
            onClick={() => setActiveTab('opponent')}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${
              !isOurs
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            {game.opponent}
            <span className={`ml-2 text-xs ${!isOurs ? 'opacity-75' : 'text-gray-400'}`}>
              {oppTotals.pts} pts
            </span>
          </button>
        </div>

        {/* ── Box Score Table ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {activeRows.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-bold text-gray-400">No stats recorded for this team</p>
              {!isOurs && (
                <p className="text-xs text-gray-400 mt-1">
                  Add opponent players during the game to track their stats
                </p>
              )}
            </div>
          ) : (
            <StatTable rows={activeRows} isOurs={isOurs} />
          )}
        </div>

        {/* ── Team Summary ── */}
        {activeRows.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">
              {isOurs ? team?.name : game.opponent} — Team Totals
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
              {[
                { label: 'PTS', value: activeTotals.pts },
                { label: 'FG%', render: r => fmtPct(r.fgm + r.tpm, r.fga + r.tpa), muted: true },
                { label: '3P%', value: fmtPct(activeTotals.tpm, activeTotals.tpa) },
                { label: 'FT%', value: fmtPct(activeTotals.ftm, activeTotals.fta) },
                { label: 'REB', value: activeTotals.reb },
                { label: 'AST', value: activeTotals.ast },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className={`text-2xl font-black ${isOurs ? 'text-blue-600' : 'text-red-600'}`}>
                    {value}
                  </div>
                  <div className="text-xs text-gray-400 font-bold mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default GameStatsView;