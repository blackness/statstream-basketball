export const fmtPct = (m, a) =>
  a > 0 ? `${Math.round((m / a) * 100)}%` : '—';

export const EMPTY_STATS = {
  min: 0, pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0,
  ftm: 0, fta: 0, oreb: 0, dreb: 0,
  ast: 0, stl: 0, blk: 0, to: 0, pf: 0,
};

export const buildRow = (player, statsMap = {}) => {
  const s    = statsMap[player.id] || {};
  const fgm  = s.fgm  || 0, fga  = s.fga  || 0;
  const tpm  = s.tpm  || 0, tpa  = s.tpa  || 0;
  const ftm  = s.ftm  || 0, fta  = s.fta  || 0;
  const oreb = s.oreb || 0, dreb = s.dreb || 0;
  return {
    id: player.id, number: player.number || '—', name: player.name,
    min: s.min || 0, pts: s.pts || 0,
    fgm, fga, tpm, tpa, ftm, fta, oreb, dreb,
    reb: oreb + dreb,
    ast: s.ast || 0, stl: s.stl || 0,
    blk: s.blk || 0, to:  s.to  || 0, pf: s.pf || 0,
  };
};

export const sumRows = (rows) =>
  rows.reduce((acc, r) => ({
    min:  acc.min  + r.min,  pts:  acc.pts  + r.pts,
    fgm:  acc.fgm  + r.fgm,  fga:  acc.fga  + r.fga,
    tpm:  acc.tpm  + r.tpm,  tpa:  acc.tpa  + r.tpa,
    ftm:  acc.ftm  + r.ftm,  fta:  acc.fta  + r.fta,
    oreb: acc.oreb + r.oreb, dreb: acc.dreb + r.dreb,
    reb:  acc.reb  + r.reb,  ast:  acc.ast  + r.ast,
    stl:  acc.stl  + r.stl,  blk:  acc.blk  + r.blk,
    to:   acc.to   + r.to,   pf:   acc.pf   + r.pf,
  }), { min:0,pts:0,fgm:0,fga:0,tpm:0,tpa:0,ftm:0,fta:0,
        oreb:0,dreb:0,reb:0,ast:0,stl:0,blk:0,to:0,pf:0 });

export const maxBy = (rows, key) =>
  rows.filter(r => r[key] > 0)
      .reduce((best, r) => (!best || r[key] > best[key] ? r : best), null);

// ── Season aggregation ────────────────────────────────────────────────────────
export const aggregateSeasonStats = (games, roster) =>
  roster.map(player => {
    const gameStats = games
      .filter(g => g.stats?.[player.id])
      .map(g => g.stats[player.id]);

    const gp = gameStats.length;
    if (gp === 0) return null;

    const t = gameStats.reduce((acc, s) => ({
      pts:  acc.pts  + (s.pts  || 0), fgm:  acc.fgm  + (s.fgm  || 0),
      fga:  acc.fga  + (s.fga  || 0), tpm:  acc.tpm  + (s.tpm  || 0),
      tpa:  acc.tpa  + (s.tpa  || 0), ftm:  acc.ftm  + (s.ftm  || 0),
      fta:  acc.fta  + (s.fta  || 0), oreb: acc.oreb + (s.oreb || 0),
      dreb: acc.dreb + (s.dreb || 0), ast:  acc.ast  + (s.ast  || 0),
      stl:  acc.stl  + (s.stl  || 0), blk:  acc.blk  + (s.blk  || 0),
      to:   acc.to   + (s.to   || 0), pf:   acc.pf   + (s.pf   || 0),
      min:  acc.min  + (s.min  || 0),
    }), { pts:0,fgm:0,fga:0,tpm:0,tpa:0,ftm:0,fta:0,
          oreb:0,dreb:0,ast:0,stl:0,blk:0,to:0,pf:0,min:0 });

    const reb = t.oreb + t.dreb;
    const avg = v => +(v / gp).toFixed(1);

    return {
      player, gp,
      totals: { ...t, reb },
      avg: {
        pts: avg(t.pts), reb: avg(reb),  ast: avg(t.ast),
        stl: avg(t.stl), blk: avg(t.blk), to: avg(t.to),
        min: avg(t.min),
      },
      fg: fmtPct(t.fgm, t.fga),
      tp: fmtPct(t.tpm, t.tpa),
      ft: fmtPct(t.ftm, t.fta),
    };
  }).filter(Boolean);

export const STAT_COLS = [
  { label: 'MIN', render: r => r.min || 0                             },
  { label: 'PTS', render: r => r.pts,                   bold:  true  },
  { label: 'FG',  render: r => `${r.fgm}-${r.fga}`                   },
  { label: 'FG%', render: r => fmtPct(r.fgm + r.tpm, r.fga + r.tpa), muted: true },
  { label: '3P',  render: r => `${r.tpm}-${r.tpa}`                   },
  { label: '3P%', render: r => fmtPct(r.tpm, r.tpa),   muted: true  },
  { label: 'FT',  render: r => `${r.ftm}-${r.fta}`                   },
  { label: 'FT%', render: r => fmtPct(r.ftm, r.fta),   muted: true  },
  { label: 'REB', render: r => r.reb                                  },
  { label: 'ORB', render: r => r.oreb,                  muted: true  },
  { label: 'DRB', render: r => r.dreb,                  muted: true  },
  { label: 'AST', render: r => r.ast                                  },
  { label: 'STL', render: r => r.stl                                  },
  { label: 'BLK', render: r => r.blk                                  },
  { label: 'TO',  render: r => r.to                                   },
  { label: 'PF',  render: r => r.pf                                   },
];