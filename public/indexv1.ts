// supabase/functions/sync-obl-schedule/index.ts
// Deploy with: supabase functions deploy sync-obl-schedule
// Schedule with: supabase functions schedule sync-obl-schedule --cron "*/5 * * * *"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SHEET_ID = '1vMVuV4Lqa1QXeFw6MfB1aNkd__OsftPM0uxGuch7odk'

const POOL_GIDS: Record<string, string> = {
  A: '0',
  B: '342610377',
  C: '1580774768',
  D: '879869540',
  E: '812896024',
  F: '1484065699',
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('https://sclhzmgdafotyiynrjwr.supabase.co')!,
    Deno.env.get('sb_publishable_N1UhoXnqybNEFCGBMdWXWg_BujE6Eh-')!
  )

  const results: Record<string, any> = {}

  for (const [pool, gid] of Object.entries(POOL_GIDS)) {
    try {
      // Fetch the sheet export as CSV — fast, no JS needed, no proxy
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`
      const res = await fetch(url)
      if (!res.ok) continue
      const csv = await res.text()
      const parsed = parsePoolCSV(csv, pool)
      if (parsed) results[pool] = parsed
    } catch (e) {
      console.error(`Pool ${pool} failed:`, e)
    }
  }

  // Upsert into obl_schedule_cache table
  const { error } = await supabase
    .from('obl_schedule_cache')
    .upsert({
      id: 'u19_men_2526',
      data: results,
      fetched_at: new Date().toISOString(),
    })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true, pools: Object.keys(results) }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

// ── CSV PARSER ──────────────────────────────────────────────────────────────
function parsePoolCSV(csv: string, pool: string) {
  const rows = csv.split('\n').map(r =>
    r.split(',').map(c => c.replace(/^"|"$/g, '').trim())
  )

  const standings: any[] = []
  const weekends: any[] = []
  let mode = 'seek'
  let curWk: any = null

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const line = r.join(' ')

    if (line.includes('Teams') && line.includes('Wins')) { mode = 'standings'; continue }

    if (mode === 'standings') {
      const name = r[0]?.trim()
      const wins = parseInt(r[1])
      const losses = parseInt(r[2])
      const bp = parseInt(r[4])
      if (name && name.length > 3 && !isNaN(wins)) {
        standings.push({
          name: cleanName(name),
          wins, losses,
          pct: (wins + losses) > 0 ? wins / (wins + losses) : 0,
          bp: isNaN(bp) ? 0 : bp,
        })
      }
    }

    const wm = line.match(/Weekend\s*#?\s*(\d+)/i)
    if (wm) {
      const dm = line.match(/(?:Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday),?\s+([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i)
      const lm = line.match(/Location[:\s]+([^A][^\n]+?)(?:\s*Address|$)/i)
      const am = line.match(/Address[:\s]+([^\n|,]+(?:,[^\n|,]+)?)/i)
      curWk = {
        num: parseInt(wm[1]),
        played: false,
        date: dm ? dm[0].replace(/Date[:\s]*/i, '').trim() : null,
        location: lm ? lm[1].trim() : null,
        address: am ? am[1].trim() : null,
        games: [],
      }
      weekends.push(curWk)
      mode = 'gh'
      continue
    }

    if (mode === 'gh' && line.includes('Home Team')) { mode = 'games'; continue }

    if (mode === 'games' && curWk) {
      const [time, home, hsRaw, asRaw, away] = r
      if (home?.length > 2 && away?.length > 2) {
        const hs = parseInt(hsRaw)
        const as_ = parseInt(asRaw)
        const scored = !isNaN(hs) && !isNaN(as_)
        if (scored) curWk.played = true
        curWk.games.push({
          time: time?.trim(),
          home: cleanName(home),
          away: cleanName(away),
          hs: scored ? hs : null,
          as: scored ? as_ : null,
        })
      }
      if (!time && !home && !away) mode = 'seek'
    }
  }

  return standings.length ? { standings, weekends } : null
}

function cleanName(n: string): string {
  return n
    .replace(/\s*[-–]\s*(U19\s*)?(Men|Boys|Women|Girls)(\s+[-–]\s*.+)?$/i, '')
    .replace(/\s+U19\s*(Men|Boys|Women|Girls)?\s*/gi, ' ')
    .replace(/\s*2025[-\/]26\s*/g, ' ')
    .replace(/\s*[-–]\s*Coach\s+\w+\s*/gi, ' ')
    .replace(/\s+/g, ' ').trim()
}
