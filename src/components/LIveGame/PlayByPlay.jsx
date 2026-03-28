import React, { useState } from 'react';

const PlayByPlay = ({ game, isDark = true }) => {
  const [filter, setFilter] = useState(null); // player name filter

  const plays = game.play_log || [];

  // Extract unique player names from home team plays
  const playerNames = [...new Set(
    plays
      .filter(p => p.team === 'home' && p.description)
      .map(p => {
        const match = p.description.match(/^([^-]+)\s*-/);
        return match ? match[1].trim() : null;
      })
      .filter(Boolean)
  )].sort();

  const filtered = filter
    ? plays.filter(p => p.description?.startsWith(filter))
    : plays;

  const bg      = isDark ? '#0b1120' : '#f8fafc';
  const surface = isDark ? '#0d1526' : '#fff';
  const border  = isDark ? '#1e293b' : '#e2e8f0';
  const textDim = isDark ? '#475569' : '#94a3b8';
  const text    = isDark ? '#e2e8f0' : '#1e293b';

  if (plays.length === 0) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px', color: textDim, fontSize:13 }}>
        No plays recorded yet
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* Player filter chips */}
      {playerNames.length > 0 && (
        <div style={{ flexShrink:0, display:'flex', gap:6, padding:'8px 12px', overflowX:'auto', borderBottom:`1px solid ${border}`, WebkitOverflowScrolling:'touch' }}>
          <button
            onClick={() => setFilter(null)}
            style={{
              padding:'4px 12px', borderRadius:999, border:'none', cursor:'pointer', whiteSpace:'nowrap', fontSize:11, fontWeight:700,
              background: filter === null ? '#3b82f6' : (isDark ? '#1e293b' : '#f1f5f9'),
              color: filter === null ? '#fff' : textDim,
            }}
          >
            All
          </button>
          {playerNames.map(name => (
            <button
              key={name}
              onClick={() => setFilter(filter === name ? null : name)}
              style={{
                padding:'4px 12px', borderRadius:999, border:'none', cursor:'pointer', whiteSpace:'nowrap', fontSize:11, fontWeight:700,
                background: filter === name ? '#3b82f6' : (isDark ? '#1e293b' : '#f1f5f9'),
                color: filter === name ? '#fff' : textDim,
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Play list */}
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch' }}>
        {filtered.length === 0 ? (
          <div style={{ padding:'30px 20px', textAlign:'center', color: textDim, fontSize:12 }}>
            No plays for {filter}
          </div>
        ) : (
          filtered.map((play, i) => {
            const isHome = play.team === 'home';
            const isScore = (play.points || 0) > 0;
            const accentColor = isHome ? '#60a5fa' : '#f87171';

            return (
              <div
                key={play.id || i}
                style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'8px 14px',
                  background: i % 2 === 0 ? bg : surface,
                  borderBottom:`1px solid ${border}08`,
                }}
              >
                {/* Period + time */}
                <div style={{ flexShrink:0, width:52, textAlign:'right' }}>
                  <div style={{ fontSize:9, fontWeight:800, color: textDim, letterSpacing:'0.05em' }}>Q{play.period}</div>
                  <div style={{ fontSize:10, fontWeight:700, color: textDim, fontVariantNumeric:'tabular-nums' }}>{play.time}</div>
                </div>

                {/* Team indicator */}
                <div style={{ width:3, height:32, borderRadius:999, background: accentColor, flexShrink:0, opacity:0.7 }} />

                {/* Description */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight: isScore ? 700 : 500, color: isScore ? text : textDim, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {play.description}
                  </div>
                </div>

                {/* Points badge */}
                {isScore && (
                  <div style={{ flexShrink:0, background: isHome ? '#1e3a5f' : '#3f1e1e', borderRadius:6, padding:'2px 7px' }}>
                    <span style={{ fontSize:11, fontWeight:800, color: accentColor }}>+{play.points}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Count */}
      <div style={{ flexShrink:0, padding:'5px 14px', borderTop:`1px solid ${border}`, background: isDark ? '#060d1a' : '#f8fafc' }}>
        <span style={{ fontSize:9, color: textDim, fontWeight:700 }}>
          {filtered.length} {filter ? `plays for ${filter}` : 'total plays'}
        </span>
      </div>
    </div>
  );
};

export default PlayByPlay;
