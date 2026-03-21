import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SHEET_ID = '1vMVuV4Lqa1QXeFw6MfB1aNkd__OsftPM0uxGuch7odk'

const POOL_GIDS: Record<string, string> = {
  A: '0',
  B: '1107557202',
  C: '424111763',
  D: '199088204',
  E: '465785650',
  F: '1531550935',
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const results: Record<string, any> = {}
  const errors: string[] = []

  for (const [pool, gid] of Object.entries(POOL_GIDS)) {
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`
      const res = await fetch(csvUrl, { redirect: 'follow', signal: AbortSignal.timeout(15000) })
      if (!res.ok) { errors.push(`Pool ${pool}: HTTP ${res.status}`); continue }

      const csv = await res.text()
      const rows = csv.split(/\r?\n/).map(line => parseCSVLine(line))
      const parsed = parseRows(rows)

      if (parsed.standings.length > 0) {
        results[pool] = parsed
      } else {
        errors.push(`Pool ${pool}: 0 standings`)
      }
    } catch (e: any) {
      errors.push(`Pool ${pool}: ${e.message}`)
    }
  }

  const { error } = await supabase
    .from('obl_schedule_cache')
    .upsert({ id: 'u19_men_2526', data: results, fetched_at: new Date().toISOString() })

  return new Response(
    JSON.stringify({ ok: !error, pools: Object.keys(results), errors: errors.length ? errors : undefined, db_error: error?.message }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})

function parseRows(rows: string[][]) {
  const standings: any[] = []
  const weekends: any[] = []
  let mode = 'seek'
  let curWk: any = null
  let i = 0

  const c = (row: string[], idx: number) => (row[idx] ?? '').trim()
  const joined = (row: string[]) => row.join(' ').trim()

  while (i < rows.length) {
    const r = rows[i]
    const j = joined(r)

    // ── Standings header
    if (c(r, 1) === 'Teams' && c(r, 2) === 'Wins') {
      mode = 'standings'; i++; continue
    }

    // ── Standings row: col1=name, col2=wins, col3=losses, col4=pct, col5=bp
    if (mode === 'standings') {
      const name = c(r, 1)
      const wins = parseInt(c(r, 2))
      const losses = parseInt(c(r, 3))
      const bp = parseInt(c(r, 5))
      if (name.length > 3 && !isNaN(wins) && !isNaN(losses)) {
        standings.push({
          name: cleanName(name), wins, losses,
          pct: (wins + losses) > 0 ? wins / (wins + losses) : 0,
          bp: isNaN(bp) ? 0 : bp,
        })
        i++; continue
      }
    }

    // ── Weekend header row: col1 = "Weekend #N"
    const wm = c(r, 1).match(/^Weekend\s*#?\s*(\d+)$/i)
    if (wm) {
      // Look ahead up to 4 rows to collect date, location, address
      // Date row: "Date: Sunday" | "March 29" | "2026"  (split by commas in cell)
      // Location row: "Location: Venue Name"
      // Address row: "Address: ..." (may be split by commas too)
      let date: string | null = null
      let location: string | null = null
      let address: string | null = null

      for (let k = i + 1; k < Math.min(i + 6, rows.length); k++) {
        const kr = rows[k]
        const kj = kr.join(' ').trim()

        if (kj.includes('Date:')) {
          // Reconstruct date from split columns: "Date: Sunday" + "March 29" + "2026"
          const parts = kr.map(cell => cell.trim()).filter(Boolean)
          const raw = parts.join(' ').replace(/^Date:\s*/i, '').trim()
          date = raw || null
        } else if (kj.includes('Location:')) {
          location = kj.replace(/^Location:\s*/i, '').trim() || null
        } else if (kj.includes('Address:')) {
          // Address may be split by commas — rejoin non-empty cols, stop at empty ones
          const parts = kr.map(cell => cell.trim())
          const addrStart = parts.findIndex(p => p.startsWith('Address:'))
          const addrParts: string[] = []
          for (let a = addrStart; a < parts.length; a++) {
            const val = parts[a].replace(/^Address[:\s]*/i, '').trim()
            if (val === '' || val === '0') break
            addrParts.push(val)
          }
          address = addrParts.join(', ').trim() || null
        }
      }

      curWk = {
        num: parseInt(wm[1]),
        played: false,
        date,
        location,
        address,
        games: [],
      }
      weekends.push(curWk)
      mode = 'gh'
      i++; continue
    }

    // ── Skip date/location/address rows (handled by lookahead above)
    if (j.includes('Date:') || j.includes('Location:') || j.includes('Address:')) {
      i++; continue
    }

    // ── Games header
    if (mode === 'gh' && (c(r, 1) === 'Home Team' || c(r, 2) === 'Home Team')) {
      mode = 'games'; i++; continue
    }

    // ── Game row: col1=time, col2=home, col3=homeScore, col4=awayScore, col5=away
    if (mode === 'games' && curWk) {
      const time  = c(r, 1)
      const home  = c(r, 2)
      const hsRaw = c(r, 3)
      const asRaw = c(r, 4)
      const away  = c(r, 5)

      if (home.length > 2 && away.length > 2) {
        const hs = parseInt(hsRaw)
        const as_ = parseInt(asRaw)
        const scored = hsRaw !== '' && asRaw !== '' && !isNaN(hs) && !isNaN(as_)
        if (scored) curWk.played = true
        curWk.games.push({
          time, home: cleanName(home), away: cleanName(away),
          hs: scored ? hs : null,
          as: scored ? as_ : null,
        })
        i++; continue
      }

      if (!time && !home && !away) mode = 'seek'
    }

    i++
  }

  return { standings, weekends }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function cleanName(n: string): string {
  return n
    .replace(/\s*[-–]\s*(U19\s*)?(Men|Boys|Women|Girls)(\s+[-–]\s*.+)?$/i, '')
    .replace(/\s+U19\s*(Men|Boys|Women|Girls)?\s*/gi, ' ')
    .replace(/\s*2025[-\/]26\s*/g, ' ')
    .replace(/\s*[-–]\s*Coach\s+\w+\s*/gi, ' ')
    .replace(/\s+/g, ' ').trim()
}
