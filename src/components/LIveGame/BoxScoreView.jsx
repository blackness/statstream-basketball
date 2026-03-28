import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import PlayByPlay from './PlayByPlay';

const BoxScoreView = ({ team, game, onBack }) => {

  // ── Stat helpers ─────────────────────────────────────────────────────────────
  const getPlayerStats = (playerId) => {
    const s = game.stats?.[playerId] || {};
    return {
      pts: s.pts || 0,
      fgm: (s.fgm||0)+(s.tpm||0), fga: (s.fga||0)+(s.tpa||0),
      tpm: s.tpm||0, tpa: s.tpa||0,
      ftm: s.ftm||0, fta: s.fta||0,
      reb: (s.oreb||0)+(s.dreb||0),
      ast: s.ast||0, stl: s.stl||0, blk: s.blk||0,
      to:  s.to||0,  pf:  s.pf||0,
      pm:  game.plus_minus?.[playerId] || 0,
    };
  };

  const getTeamTotals = () => {
    const t = { pts:0,fgm:0,fga:0,tpm:0,tpa:0,ftm:0,fta:0,oreb:0,dreb:0,ast:0,stl:0,blk:0,to:0,pf:0 };
    Object.values(game.stats || {}).forEach(s => Object.keys(t).forEach(k => { t[k] += s[k]||0; }));
    return {
      pts: t.pts,
      fgm: t.fgm+t.tpm, fga: t.fga+t.tpa,
      tpm: t.tpm, tpa: t.tpa,
      ftm: t.ftm, fta: t.fta,
      reb: t.oreb+t.dreb,
      ast: t.ast, stl: t.stl, blk: t.blk, to: t.to, pf: t.pf,
    };
  };

  // ── Player list ───────────────────────────────────────────────────────────────
  const starters = game.starters || [];

  const statsPlayers = Object.entries(game.stats || {}).map(([id, stats]) => {
    const rp = team?.roster?.find(p => p.id === id);
    return { id, name: rp?.name || stats._name || '—', number: rp?.number || stats._number || '', isStarter: starters.includes(id), hasStats: true };
  });

  const statsNames = new Set(statsPlayers.map(p => p.name.toLowerCase()));
  const rosterOnly = (team?.roster || [])
    .filter(p => game.stats?.[p.id] == null && !statsNames.has(p.name.toLowerCase()))
    .map(p => ({ id: p.id, name: p.name, number: p.number || '', isStarter: starters.includes(p.id), hasStats: false }));

  const allPlayers = [...statsPlayers, ...rosterOnly]
    .sort((a, b) => (game.stats?.[b.id]?.pts || 0) - (game.stats?.[a.id]?.pts || 0));

  const totals = getTeamTotals();

  // ── Score ─────────────────────────────────────────────────────────────────────
  const isHome  = game.home_team !== game.opponent;
  const myName  = team?.name || game.home_team;
  const myScore = isHome ? (game.home_score||0) : (game.away_score||0);
  const oppScore= isHome ? (game.away_score||0) : (game.home_score||0);
  const isWin   = myScore > oppScore;
  const isLoss  = myScore < oppScore;

  // ── Columns ───────────────────────────────────────────────────────────────────
  const COLS = [
    { key:'pts', label:'PTS', w:36, bold:true, color:'#60a5fa' },
    { key:'fg',  label:'FG',  w:50 },
    { key:'3pt', label:'3PT', w:50 },
    { key:'ft',  label:'FT',  w:50 },
    { key:'reb', label:'REB', w:34 },
    { key:'ast', label:'AST', w:34 },
    { key:'stl', label:'STL', w:34 },
    { key:'blk', label:'BLK', w:34 },
    { key:'to',  label:'TO',  w:34 },
    { key:'pf',  label:'PF',  w:34 },
    { key:'pm',  label:'+/-', w:38 },
  ];

  const colVal = (s, key) => {
    if (key==='fg')  return `${s.fgm}/${s.fga}`;
    if (key==='3pt') return `${s.tpm}/${s.tpa}`;
    if (key==='ft')  return `${s.ftm}/${s.fta}`;
    if (key==='pm')  return s.pm > 0 ? `+${s.pm}` : `${s.pm}`;
    return s[key] ?? 0;
  };

  const totalsVal = (key) => {
    if (key==='fg')  return `${totals.fgm}/${totals.fga}`;
    if (key==='3pt') return `${totals.tpm}/${totals.tpa}`;
    if (key==='ft')  return `${totals.ftm}/${totals.fta}`;
    if (key==='pm')  return '—';
    return totals[key] ?? 0;
  };

  const pmColor = (pm) => pm > 0 ? '#4ade80' : pm < 0 ? '#f87171' : '#475569';
  const isFrac  = (key) => key==='fg'||key==='3pt'||key==='ft';
  const NAME_W  = 112;
  const ROW_H   = 30;
  const HDR_H   = 26;
  const [activeTab, setActiveTab] = useState('boxscore');

  return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'stretch', height:'100dvh', background:'#030712' }}>
      <style>{`@media (max-width: 768px) { .bs-inner { max-width: 100% !important; } }`}</style>
      <div className="bs-inner" style={{ width:'100%', maxWidth:'66vw', display:'flex', flexDirection:'column', height:'100dvh', background:'#0b1120', color:'#fff', fontFamily:'system-ui,sans-serif', overflow:'hidden' }}>

      {/* ── SCORE HEADER ──────────────────────────────────────────────────────── */}
      <div style={{ flexShrink:0, background:'#0b1120', borderBottom:'2px solid #1e293b' }}>

        {/* Nav */}
        <div style={{ display:'flex', alignItems:'center', padding:'8px 10px 4px' }}>
          <button onClick={onBack} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:700, padding:'2px 4px' }}>
            <ArrowLeft size={14} /> Back
          </button>
          <span style={{ flex:1, textAlign:'center', fontSize:10, fontWeight:800, color:'#334155', letterSpacing:'0.12em', textTransform:'uppercase' }}>Box Score · Final</span>
          <div style={{ width:52 }} />
        </div>

        {/* Score row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 40px 1fr', alignItems:'center', padding:'2px 14px 10px', gap:6 }}>
          <div>
            <div style={{ fontSize:9, fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{myName}</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:5 }}>
              <span style={{ fontSize:30, fontWeight:900, lineHeight:1, color:isWin?'#f1f5f9':'#64748b', fontVariantNumeric:'tabular-nums' }}>{myScore}</span>
              <span style={{ fontSize:10, fontWeight:800, color:isWin?'#4ade80':isLoss?'#f87171':'#64748b' }}>{isWin?'W':isLoss?'L':'T'}</span>
            </div>
          </div>
          <div style={{ textAlign:'center', fontSize:11, fontWeight:800, color:'#334155' }}>—</div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:9, fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{game.opponent}</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:5, justifyContent:'flex-end' }}>
              <span style={{ fontSize:10, fontWeight:800, color:isLoss?'#4ade80':isWin?'#f87171':'#64748b' }}>{isLoss?'W':isWin?'L':'T'}</span>
              <span style={{ fontSize:30, fontWeight:900, lineHeight:1, color:isLoss?'#f1f5f9':'#64748b', fontVariantNumeric:'tabular-nums' }}>{oppScore}</span>
            </div>
          </div>
        </div>

        {/* ── COLUMN HEADERS ────────────────────────────────────────────────── */}
        <div style={{ display:'flex', background:'#060d1a', borderTop:'1px solid #1e293b' }}>
          {/* Fixed name header */}
          <div style={{ width:NAME_W, minWidth:NAME_W, flexShrink:0, height:HDR_H, display:'flex', alignItems:'center', paddingLeft:10, borderRight:'1px solid #1e293b' }}>
            <span style={{ fontSize:8, fontWeight:900, color:'#334155', letterSpacing:'0.15em', textTransform:'uppercase' }}>PLAYER</span>
          </div>
          {/* Scrollable stat headers — synced via JS */}
          <div id="hdr-scroll" style={{ flex:1, overflowX:'hidden', display:'flex' }}>
            <div id="hdr-inner" style={{ display:'flex' }}>
              {COLS.map(col => (
                <div key={col.key} style={{ width:col.w, minWidth:col.w, height:HDR_H, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:8, fontWeight:900, color:col.color||'#334155', letterSpacing:'0.1em', textTransform:'uppercase' }}>{col.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS ──────────────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', borderBottom:'1px solid #1e293b', background:'#060d1a', flexShrink:0 }}>
        {[['boxscore','Box Score'],['playbyplay','Play by Play']].map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex:1, padding:'9px 0', border:'none', cursor:'pointer', fontSize:11, fontWeight:800,
              letterSpacing:'0.06em', textTransform:'uppercase', background:'transparent',
              color: activeTab===tab ? '#60a5fa' : '#334155',
              borderBottom: activeTab===tab ? '2px solid #60a5fa' : '2px solid transparent',
            }}
          >{label}</button>
        ))}
      </div>

      {activeTab === 'playbyplay' ? (
        <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          <PlayByPlay game={game} isDark={true} />
        </div>
      ) : (<>

      {/* ── PLAYER ROWS ───────────────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:'auto', overflowX:'auto', WebkitOverflowScrolling:'touch' }}
        onScroll={e => {
          const hdr = document.getElementById('hdr-inner');
          if (hdr) hdr.parentElement.scrollLeft = e.currentTarget.scrollLeft;
        }}
      >
        <div style={{ minWidth: NAME_W + COLS.reduce((s,c)=>s+c.w,0) }}>

          {allPlayers.map((player, i) => {
            const s = getPlayerStats(player.id);
            return (
              <div key={player.id} style={{ display:'flex', height:ROW_H, background: i%2===0 ? '#0b1120' : '#0d1526', borderBottom:'1px solid #ffffff08' }}>
                {/* Fixed name */}
                <div style={{ width:NAME_W, minWidth:NAME_W, flexShrink:0, height:ROW_H, display:'flex', alignItems:'center', gap:3, paddingLeft:8, paddingRight:4, borderRight:'1px solid #1e293b', background: i%2===0 ? '#0b1120' : '#0d1526', position:'sticky', left:0, zIndex:1, overflow:'hidden' }}>
                  {player.isStarter && <span style={{ color:'#3b82f6', fontSize:9, fontWeight:900, flexShrink:0 }}>*</span>}
                  <span style={{ fontSize:9, fontWeight:700, color:'#475569', flexShrink:0, minWidth:14, textAlign:'right' }}>{player.number||'—'}</span>
                  <span style={{ fontSize:11, fontWeight:player.hasStats?700:400, color:player.hasStats?'#e2e8f0':'#334155', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {player.name}
                  </span>
                </div>
                {/* Stats */}
                {COLS.map(col => {
                  const val = colVal(s, col.key);
                  return (
                    <div key={col.key} style={{ width:col.w, minWidth:col.w, height:ROW_H, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span style={{
                        fontSize: isFrac(col.key) ? 9 : 11,
                        fontWeight: col.bold ? 800 : 500,
                        color: col.key==='pm' ? pmColor(s.pm) : col.color || (player.hasStats ? '#94a3b8' : '#1e293b'),
                        fontVariantNumeric:'tabular-nums',
                        letterSpacing: isFrac(col.key) ? '-0.02em' : 0,
                      }}>
                        {player.hasStats ? val : (isFrac(col.key)?'0/0':col.key==='pm'?'—':'0')}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Totals row */}
          <div style={{ display:'flex', height:ROW_H+2, background:'#162032', borderTop:'2px solid #2d4a6e', position:'sticky', bottom:0 }}>
            <div style={{ width:NAME_W, minWidth:NAME_W, flexShrink:0, display:'flex', alignItems:'center', paddingLeft:10, borderRight:'1px solid #2d4a6e', background:'#162032', position:'sticky', left:0, zIndex:1 }}>
              <span style={{ fontSize:8, fontWeight:900, color:'#64748b', letterSpacing:'0.15em', textTransform:'uppercase' }}>TOTALS</span>
            </div>
            {COLS.map(col => (
              <div key={col.key} style={{ width:col.w, minWidth:col.w, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ fontSize:isFrac(col.key)?9:11, fontWeight:800, color:col.color||'#64748b', fontVariantNumeric:'tabular-nums' }}>
                  {totalsVal(col.key)}
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>

      </>)}

      {/* Legend */}
      <div style={{ flexShrink:0, padding:'5px 12px', background:'#060d1a', borderTop:'1px solid #1e293b', display:'flex', gap:14 }}>
        <span style={{ fontSize:8, color:'#1e3a5f', fontWeight:700 }}>* starter</span>
        <span style={{ fontSize:8, color:'#1e3a5f', fontWeight:700 }}>FG includes 3PT</span>
      </div>

    </div>
    </div>
  );
};

export default BoxScoreView;
