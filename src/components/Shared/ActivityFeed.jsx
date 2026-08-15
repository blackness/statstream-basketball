import React from 'react';

const ACTION_META = {
  fg2m:    { label: '2PT ✓', color: 'text-emerald-600 bg-emerald-50'  },
  fg2miss: { label: '2PT ✗', color: 'text-gray-400   bg-gray-100'     },
  fg3m:    { label: '3PT ✓', color: 'text-blue-600   bg-blue-50'      },
  fg3miss: { label: '3PT ✗', color: 'text-gray-400   bg-gray-100'     },
  ftm:     { label: 'FT ✓',  color: 'text-green-600  bg-green-50'     },
  ftmiss:  { label: 'FT ✗',  color: 'text-gray-400   bg-gray-100'     },
  oreb:    { label: 'O-REB', color: 'text-orange-500  bg-orange-50'   },
  dreb:    { label: 'D-REB', color: 'text-blue-500   bg-blue-50'      },
  ast:     { label: 'AST',   color: 'text-yellow-600 bg-yellow-50'    },
  stl:     { label: 'STL',   color: 'text-emerald-600 bg-emerald-50'  },
  blk:     { label: 'BLK',   color: 'text-indigo-600 bg-indigo-50'    },
  to:      { label: 'TO',    color: 'text-orange-600 bg-orange-50'    },
  pf:      { label: 'FOUL',  color: 'text-red-600    bg-red-50'       },
  sub_in:  { label: 'SUB',   color: 'text-violet-600 bg-violet-50'    }, 
};

const ActivityFeed = ({ plays = [], maxShown, compact = false }) => {
  const shown = maxShown ? plays.slice(0, maxShown) : plays;

  if (shown.length === 0) {
    return (
      <p className="text-center text-xs text-gray-400 py-4">
        {compact ? 'No plays yet' : 'No activity recorded yet'}
      </p>
    );
  }

  return (
    <div className="space-y-0.5">
      {shown.map((play) => {
        const meta       = ACTION_META[play.action] || { label: play.action, color: 'text-gray-500 bg-gray-100' };
        const isOpponent = play.team === 'opponent';

        return (
          <div
            key={play.id}
            className={`flex items-center gap-2 ${compact ? 'py-1.5 px-3' : 'py-2 px-4'} rounded-lg ${
              compact ? '' : 'hover:bg-gray-50'
            }`}
          >
            {/* Clock */}
            <span className="flex-shrink-0 text-[10px] font-mono text-gray-400 w-14 text-right">
              Q{play.period} {play.clock}
            </span>

            {/* Action badge */}
            <span className={`flex-shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded ${meta.color}`}>
              {meta.label}
            </span>

            {/* Player label */}
            <span className={`flex-1 text-xs font-semibold truncate ${
              isOpponent ? 'text-red-500' : 'text-gray-800'
            }`}>
              {play.label}
              {isOpponent && <span className="ml-1 text-[9px] text-gray-400 font-normal">OPP</span>}
            </span>

            {/* Points */}
            {play.pts > 0 && (
              <span className={`flex-shrink-0 text-xs font-black ${
                isOpponent ? 'text-red-500' : 'text-emerald-500'
              }`}>
                +{play.pts}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ActivityFeed;