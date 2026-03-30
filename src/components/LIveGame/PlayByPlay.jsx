import React, { useState } from 'react';

const PlayByPlay = ({ game, isDark = true, onDeletePlay }) => {
  const [filter,    setFilter]    = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [deleting,  setDeleting]  = useState(null);

  const plays = game.play_log || [];

  const playerNames = [...new Set(
    plays
      .filter(p => p.team === 'home' && p.description)
      .map(p => { const m = p.description.match(/^([^-]+)\s*-/); return m ? m[1].trim() : null; })
      .filter(Boolean)
  )].sort();

  const filtered = filter ? plays.filter(p => p.description?.startsWith(filter)) : plays;

  const bg      = isDark ? '#0b1120' : '#f8fafc';
  const surface = isDark ? '#0d1526' : '#fff';
  const border  = isDark ? '#1e293b' : '#e2e8f0';
  const textDim = isDark ? '#475569' : '#94a3b8';
  const text    = isDark ? '#e2e8f0' : '#1e293b';

  const handleDelete = async (play) => {
    if (!onDeletePlay) return;
    setDeleting(play.id);
    await onDeletePlay(play);
    setDeleting(null);
    setConfirmId(null);
  };

  if (plays.length === 0) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px', color: textDim, fontSize:13 }}>
        No plays recorded yet
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* Filter chips */}
      {playerNames.length > 0 && (
        <div style={{ flexShrink:0, display:'flex', gap:6, padding:'8px 12px', overflowX:'auto', borderBottom:`1px solid ${border}`, WebkitOverflowScrolling:'touch' }}>
          <button onClick={() => setFilter(null)} style={{ padding:'4px 12px', borderRadius:999, border:'none', cursor:'pointer', whiteSpace:'nowrap', fontSize:11, fontWeight:700, background: filter===null?'#3b82f6':(isDark?'#1e293b':'#f1f5f9'), color: filter===null?'#fff':textDim }}>All</button>
          {playerNames.map(name => (
            <button key={name} onClick={() => setFilter(filter===name?null:name)} style={{ padding:'4px 12px', borderRadius:999, border:'none', cursor:'pointer', whiteSpace:'nowrap', fontSize:11, fontWeight:700, background: filter===name?'#3b82f6':(isDark?'#1e293b':'#f1f5f9'), color: filter===name?'#fff':textDim }}>{name}</button>
          ))}
        </div>
      )}

      {/* Plays */}
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch' }}>
        {filtered.length === 0 ? (
          <div style={{ padding:'30px 20px', textAlign:'center', color:textDim, fontSize:12 }}>No plays for {filter}</div>
        ) : (
          filtered.map((play, i) => {
            const isSub     = play.description?.startsWith('SUB:');
            const isHome    = play.team === 'home';
            const isScore   = (play.points || 0) > 0 && !isSub;
            const accent    = isSub ? '#a78bfa' : isHome ? '#60a5fa' : '#f87171';
            const isConfirm  = confirmId === play.id;
            const isDeleting = deleting === play.id;

            return (
              <div key={play.id || i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', background: i%2===0?bg:surface, borderBottom:`1px solid ${border}08` }}>
                {/* Period + time */}
                <div style={{ flexShrink:0, width:52, textAlign:'right' }}>
                  <div style={{ fontSize:9, fontWeight:800, color:textDim, letterSpacing:'0.05em' }}>Q{play.period}</div>
                  <div style={{ fontSize:10, fontWeight:700, color:textDim, fontVariantNumeric:'tabular-nums' }}>{play.time}</div>
                </div>

                {/* Team bar or sub icon */}
                {isSub
                  ? <div style={{ width:18, textAlign:'center', flexShrink:0, fontSize:12 }}>⇄</div>
                  : <div style={{ width:3, height:32, borderRadius:999, background:accent, flexShrink:0, opacity:0.7 }} />
                }

                {/* Description */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:isScore?700:isSub?600:500, color:isSub?'#a78bfa':isScore?text:textDim, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {play.description}
                  </div>
                </div>

                {/* Points badge */}
                {isScore && !isConfirm && (
                  <div style={{ flexShrink:0, background:isHome?'#1e3a5f':'#3f1e1e', borderRadius:6, padding:'2px 7px' }}>
                    <span style={{ fontSize:11, fontWeight:800, color:accent }}>+{play.points}</span>
                  </div>
                )}

                {/* Delete / confirm */}
                {onDeletePlay && (
                  isConfirm ? (
                    <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                      <button
                        onClick={() => handleDelete(play)}
                        disabled={isDeleting}
                        style={{ padding:'3px 10px', borderRadius:6, border:'none', background:'#ef4444', color:'#fff', fontSize:10, fontWeight:800, cursor:'pointer' }}>
                        {isDeleting ? '...' : 'Delete'}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        style={{ padding:'3px 8px', borderRadius:6, border:'none', background: isDark?'#1e293b':'#e2e8f0', color:textDim, fontSize:10, fontWeight:700, cursor:'pointer' }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(play.id)}
                      style={{ flexShrink:0, background:'none', border:'none', cursor:'pointer', padding:'4px', color: isDark?'#374151':'#cbd5e1', fontSize:14, lineHeight:1 }}
                      title="Delete play"
                    >
                      🗑
                    </button>
                  )
                )}
              </div>
            );
          })
        )}
      </div>

      <div style={{ flexShrink:0, padding:'5px 14px', borderTop:`1px solid ${border}`, background:isDark?'#060d1a':'#f8fafc' }}>
        <span style={{ fontSize:9, color:textDim, fontWeight:700 }}>{filtered.length} {filter?`plays for ${filter}`:'total plays'}</span>
      </div>
    </div>
  );
};

export default PlayByPlay;
