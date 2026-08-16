import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { slug }  = req.query;
  const appUrl    = `https://${req.headers.host}`;
  const isUUID    = /^[0-9a-f-]{36}$/i.test(slug);
  const teamUrl   = `${appUrl}/team/${slug}`;

  try {
    const q = supabase.from('teams').select('name,wins,losses,coach,league');
    const { data: team } = await (isUUID ? q.eq('id', slug) : q.eq('slug', slug)).single();

    const name  = team?.name || 'Team';
    const rec   = `${team?.wins || 0}–${team?.losses || 0}`;
    const title = `${name} | StatStream`;
    const desc  = `${rec}${team?.coach ? ` · Coach ${team.coach}` : ''}${team?.league ? ` · ${team.league}` : ''}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${teamUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="StatStream Basketball">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${desc}">
  <meta http-equiv="refresh" content="0;url=${teamUrl}">
  <script>window.location.replace("${teamUrl}");</script>
</head>
<body><a href="${teamUrl}">${title}</a></body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    res.status(200).send(html);
  } catch {
    res.redirect(302, teamUrl);
  }
}