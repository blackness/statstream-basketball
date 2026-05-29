import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const DIVISIONS = [
  // Boys
  { id: 'u19_men_2526',   label: 'U19 Men',   sheetId: '1vMVuV4Lqa1QXeFw6MfB1aNkd__OsftPM0uxGuch7odk', pools: { A:'0', B:'342610377', C:'1580774768', D:'879869540', E:'812896024', F:'1484065699' } },
  { id: 'u17_boys_2526',  label: 'U17 Boys',  sheetId: '15EsKfhla4Kww-R77JktBGYw1oYcLr2CACBNKUbkwaWE', pools: { A:'0' } },
  { id: 'u16_boys_2526',  label: 'U16 Boys',  sheetId: '1LDFHO0hyElvlMl6uwtMaJZDkX9PTY-Wa0_s18c5hujE', pools: { A:'0' } },
  { id: 'u15_boys_2526',  label: 'U15 Boys',  sheetId: '1SxrSkAcvihWzGyrtqMpdpIxV9mT2oWVHD9TU3hEC2ns', pools: { A:'0' } },
  { id: 'u14_boys_2526',  label: 'U14 Boys',  sheetId: '1dBwIW3BtlBaC1JM_RcyYx9CB26rxSlg1ucDxEktVGmM', pools: { A:'0' } },
  { id: 'u13_boys_2526',  label: 'U13 Boys',  sheetId: '1y41zrly5wm_ojqarEy0gCVbEqNraJBgaKPMF0F4yODU', pools: { A:'0' } },
  { id: 'u12_boys_2526',  label: 'U12 Boys',  sheetId: '13cHjyJNcWYqDzYlto4NoQ4j0wK3dAdudFmcO4RhcvFk', pools: { A:'0' } },
  { id: 'u11_boys_2526',  label: 'U11 Boys',  sheetId: '1SeETQjJ_djw7T83zl6VTGAeSJWxKru2j8L84RF77ifE', pools: { A:'0' } },
  { id: 'u10_boys_2526',  label: 'U10 Boys',  sheetId: '1bpKGdRfkyc4SPYoQUXwsGEkXiQy9AqxPDM_bx5Ly0IY', pools: { A:'0' } },
  { id: 'u9_boys_2526',   label: 'U9 Boys',   sheetId: '1IH_IRDqLJbU3DqcP7iWJ-EYDGUXPRwE14Kf2JJQaouk', pools: { A:'0' } },
  // Girls
  { id: 'u19_women_2526', label: 'U19 Women', sheetId: '1r8ea2bbxrweYdBCZ58lz4-LqCogmES6OPktZ-1hvGEQ', pools: { A:'0' } },
  { id: 'u17_girls_2526', label: 'U17 Girls', sheetId: '1T1EVLwieZUOA8SiNYzdV25WN2QG2iYUma2ju9cqW-hE', pools: { A:'0' } },
  { id: 'u16_girls_2526', label: 'U16 Girls', sheetId: '180BEGWeegyGcup7dsCToKJHcREQm1NHBvbwGA_ihotE', pools: { A:'0' } },
  { id: 'u15_girls_2526', label: 'U15 Girls', sheetId: '1lVcaQay0uGQgTMblyI-ig1AVKZFum52h_Ehe3R-6wcs', pools: { A:'0' } },
  { id: 'u14_girls_2526', label: 'U14 Girls', sheetId: '1TKTdfmnIsELG7_s-xvJXt8iB7B92k9NvhVafA646WK0', pools: { A:'0' } },
  { id: 'u13_girls_2526', label: 'U13 Girls', sheetId: '1yu1c-wZLfwDF4M62R9sS9XYquTX_34ImBQTwAhG2Inw', pools: { A:'0' } },
  { id: 'u12_girls_2526', label: 'U12 Girls', sheetId: '1ttmyQnD9h1PLMEpoTbigUsN692nmdbqfjjeatm5J7yM', pools: { A:'0' } },
  { id: 'u11_girls_2526', label: 'U11 Girls', sheetId: '1niiuPmD2NeW5fSXSUaia3AflmDfG2m6YTysowiCzfj8', pools: { A:'0' } },
  { id: 'u10_girls_2526', label: 'U10 Girls', sheetId: '1uIChNpE4sz5u16NQLGY5qKOaGrYExXRjqV38bOCsxbg', pools: { A:'0' } },
]

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.split('\n')
  for (const line of lines) {
    if (!line.trim()) continue
    const cells: string[] = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') { inQ = !inQ }
      else if (c === ',' && !inQ) { cells.push(cur.trim()); cur = '' }
      else { cur += c }
    }
    cells.push(cur.trim())
    rows.push(cells)
  }
  return rows
}

function parsePoolCSV(rows: string[][]) {
  const standings: any[] = []
  const weekends: any[] = []
  let mode = 'seek'
  let curWk: any = null

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const line = r.join(' ')

    // Skip leading empty column — data starts at col index 1
    const c = (n: number) => (r[n + 1] || '').trim()

    if (line.includes('Teams') && line.includes('Wins') && line.includes('Losses')) {
      mode = 'standings'; continue
    }

    if (mode === 'standings') {
      const name = c(0)
      const wins = parseInt(c(1))
      const losses = parseInt(c(2))
      const bp = parseInt(c(4))
      if (name.length > 3 && !isNaN(wins)) {
        standings.push({ name, wins, losses, pct: wins / ((wins + losses) || 1), bp: isNaN(bp) ? 0 : bp })
      }
    }

    const wm = line.match(/Weekend\s*#?\s*(\d+)/i)
    if (wm) {
      // Lookahead for date/location/address in next 5 rows
      let date = null, location = null, address = null
      const dateParts: string[] = []
      const locParts: string[] = []
      const addrParts: string[] = []

      for (let j = i; j < Math.min(i + 5, rows.length); j++) {
        const jLine = rows[j].filter(Boolean).join(' ')
        if (/Date:/i.test(jLine)) {
          const parts = rows[j].filter(Boolean)
          const dateIdx = parts.findIndex(p => /Date:/i.test(p))
          if (dateIdx >= 0) {
            const raw = parts.slice(dateIdx).join(' ').replace(/Date:\s*/i, '')
            const m = raw.match(/(?:Sunday|Saturday|Monday|Tuesday|Wednesday|Thursday|Friday)[,\s]+[A-Za-z]+\s+\d{1,2}[\s,]+\d{4}/i)
            if (m) date = m[0].trim()
          }
        }
        if (/Location:/i.test(jLine)) {
          const m = jLine.match(/Location:\s*([^A][^\n]*?)(?:\s*Address:|$)/i)
          if (m) location = m[1].trim()
        }
        if (/Address:/i.test(jLine)) {
          const m = jLine.match(/Address:\s*(.+?)(?:\s*\||\s*$)/i)
          if (m) address = m[1].trim()
        }
      }

      curWk = { num: parseInt(wm[1]), date, location, address, games: [] }
      weekends.push(curWk)
      mode = 'gh'
      continue
    }

    if (mode === 'gh' && line.includes('Home Team') && line.includes('Away Team')) {
      mode = 'games'; continue
    }

    if (mode === 'games' && curWk) {
      const time  = c(0)
      const home  = c(1)
      const hs    = c(2)
      const as_   = c(3)
      const away  = c(4)

      if (home.length > 2 && away.length > 2) {
        const scored = hs !== '' && as_ !== '' && !isNaN(parseInt(hs)) && !isNaN(parseInt(as_))
        curWk.games.push({
          time, home, away,
          hs: scored ? parseInt(hs) : null,
          as: scored ? parseInt(as_) : null,
          played: scored,
        })
      }
      if (!time && !home && !away) mode = 'seek'
    }
  }

  // Mark weekend as played if all games with scores
  for (const wk of weekends) {
    if (wk.games.length > 0 && wk.games.every((g: any) => g.played)) wk.played = true
    else wk.played = false
  }

  return { standings, weekends }
}

async function syncDivision(div: typeof DIVISIONS[0], supabase: any): Promise<{ id: string; ok: boolean; error?: string }> {
  try {
    const poolData: Record<string, any> = {}
    const errors: string[] = []

    await Promise.all(Object.entries(div.pools).map(async ([poolKey, gid]) => {
      try {
        const url = `https://docs.google.com/spreadsheets/d/${div.sheetId}/export?format=csv&gid=${gid}`
        const res = await fetch(url)
        if (!res.ok) { errors.push(`Pool ${poolKey}: HTTP ${res.status}`); return }
        const text = await res.text()
        const rows = parseCSV(text)
        poolData[poolKey] = parsePoolCSV(rows)
      } catch (e: any) {
        errors.push(`Pool ${poolKey}: ${e.message}`)
      }
    }))

    const { error: dbError } = await supabase
      .from('obl_schedule_cache')
      .upsert({ id: div.id, data: poolData, fetched_at: new Date().toISOString() }, { onConflict: 'id' })

    if (dbError) return { id: div.id, ok: false, error: dbError.message }
    return { id: div.id, ok: true }
  } catch (e: any) {
    return { id: div.id, ok: false, error: e.message }
  }
}

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // Check if a specific division was requested
  const url = new URL(req.url)
  const divId = url.searchParams.get('division')
  const divsToSync = divId ? DIVISIONS.filter(d => d.id === divId) : DIVISIONS

  const results = await Promise.all(divsToSync.map(div => syncDivision(div, supabase)))

  const ok = results.filter(r => r.ok).length
  const failed = results.filter(r => !r.ok)

  return new Response(JSON.stringify({ ok, total: results.length, failed, results }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
