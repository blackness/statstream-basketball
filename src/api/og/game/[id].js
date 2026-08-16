import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { id }   = req.query;
  const appUrl   = `https://${req.headers.host}`;
  const gameUrl  = `${appUrl}/game/${id}`;

  try {
    const { data: game } = await supabase
      .from('games')
      .select('id,opponent,home_team,home_score,away_score,status,game_type,team_id')
      .eq('id', id)
      .single();

    let teamName = 'Unknown Team';
    if (game?.team_id) {
      const { data: team } = await supabase
        .from('teams')
        .select('name')
        .eq('id', game.team_id)
        .single();
      if (team) teamName = team.name;
    }

    const isHome     = game?.home_team === teamName;
    const ourScore   = isHome ? (game?.home_score || 0) : (game?.away_score || 0);
    const oppScore   = isHome ? (game?.away_score || 0) : (game?.home_score || 0);
    const isLive     = game?.status === 'in_progress';
    const isFinal    = game?.status === 'completed';
    const badge      = isLive ? '🔴 LIVE' : isFinal ? 'Final' : 'Scheduled';
    const title      = `${teamName} vs ${game?.opponent || 'TBD'}`;
    const desc       = `${badge} · ${ourScore}–${oppScore} | StatStream Basketball`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${gameUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="StatStream Basketball">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${desc}">
  <meta http-equiv="refresh" content="0;url=${gameUrl}">
  <script>window.location.replace("${gameUrl}");</script>
</head>
<body><a href="${gameUrl}">${title}</a></body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.status(200).send(html);
  } catch {
    res.redirect(302, gameUrl);
  }
}