import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT    = Deno.env.get('VAPID_SUBJECT')!

// ── VAPID signing ─────────────────────────────────────────────────────────────
async function signVapid(audience: string): Promise<string> {
  const header  = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
  const payload = btoa(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_SUBJECT,
  })).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')

  const data    = new TextEncoder().encode(`${header}.${payload}`)
  const keyData = Uint8Array.from(atob(VAPID_PRIVATE_KEY.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0))

  const key = await crypto.subtle.importKey(
    'pkcs8', keyData.buffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  )

  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, data)
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')

  return `vapid t=${header}.${payload}.${sigB64},k=${VAPID_PUBLIC_KEY}`
}

async function sendPush(sub: any, payload: object): Promise<boolean> {
  try {
    const url      = new URL(sub.endpoint)
    const audience = `${url.protocol}//${url.host}`
    const vapid    = await signVapid(audience)

    const body     = new TextEncoder().encode(JSON.stringify(payload))

    const res = await fetch(sub.endpoint, {
      method:  'POST',
      headers: {
        'Content-Type':   'application/octet-stream',
        'Content-Length': body.length.toString(),
        'TTL':            '86400',
        'Authorization':  vapid,
      },
      body,
    })

    return res.status === 201 || res.status === 200 || res.status === 202
  } catch (e) {
    console.error('Push send error:', e)
    return false
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  let body: any
  try { body = await req.json() } catch { return new Response('Bad request', { status: 400 }) }

  const record   = body.record
  const old      = body.old_record

  if (!record) return new Response('No record', { status: 400 })

  const settings   = record.game_settings || {}
  const isHome     = settings.isHome ?? true
  const opponent   = settings.opponent || 'Opponent'
  const ourScore   = isHome ? record.home_score : record.away_score
  const theirScore = isHome ? record.away_score  : record.home_score
  const oldOur     = old ? (isHome ? old.home_score : old.away_score)   : 0
  const oldTheir   = old ? (isHome ? old.away_score  : old.home_score)  : 0
  const teamName   = record.home_team || 'Kingston'
  const perLabel   = (settings.totalPeriods === 2) ? 'Half' : 'Q'

  const notifications: { title: string; body: string; tag: string; pref: string }[] = []

  // Final score
  if (record.status === 'completed' && old?.status !== 'completed') {
    const won  = ourScore > theirScore
    const diff = Math.abs(ourScore - theirScore)
    notifications.push({
      title: `${won ? '🏆 Win!' : '🏀 Final score'} — ${teamName}`,
      body:  `${teamName} ${ourScore} – ${theirScore} ${opponent}${won ? ` — W by ${diff}` : ''}`,
      tag:   'obl-final',
      pref:  'final',
    })
  }

  // End of quarter/half — period incremented and timer reset
  if (
    old &&
    record.status === 'in-progress' &&
    record.period > old.period &&
    old.period > 0
  ) {
    notifications.push({
      title: `End of ${perLabel}${old.period} — ${teamName}`,
      body:  `${teamName} ${ourScore} – ${theirScore} ${opponent}`,
      tag:   `obl-quarter-${old.period}`,
      pref:  'quarter_end',
    })
  }

  // Close game — within 5 points and was not close before
  if (
    old &&
    record.status === 'in-progress' &&
    record.period >= 3
  ) {
    const nowClose  = Math.abs(ourScore - theirScore) <= 5
    const wasClose  = Math.abs(oldOur  - oldTheir)   <= 5
    const scoreChanged = ourScore !== oldOur || theirScore !== oldTheir
    if (nowClose && !wasClose && scoreChanged) {
      const leading = ourScore >= theirScore
      notifications.push({
        title: `Close game! ${teamName}`,
        body:  `${teamName} ${ourScore} – ${theirScore} ${opponent} · ${perLabel}${record.period}`,
        tag:   'obl-close',
        pref:  'close_game',
      })
    }
  }

  if (!notifications.length) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no triggers' }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Fetch all subscriptions
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, preferences')

  if (!subs?.length) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no subscribers' }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Send matching notifications to each subscriber
  let sent = 0
  for (const notif of notifications) {
    const eligible = subs.filter(s => s.preferences?.[notif.pref] !== false)
    await Promise.all(eligible.map(async (sub) => {
      const ok = await sendPush(sub, { title: notif.title, body: notif.body, tag: notif.tag })
      if (ok) sent++
    }))
  }

  return new Response(JSON.stringify({ sent, notifications: notifications.length, subscribers: subs.length }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
