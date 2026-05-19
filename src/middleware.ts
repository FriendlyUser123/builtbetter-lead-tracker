import { NextRequest, NextResponse } from 'next/server'

const GATE_PASSWORD = process.env.GATE_PASSWORD
const GATE_ENABLED = !!GATE_PASSWORD
const GATE_COOKIE = process.env.GATE_COOKIE_NAME || 'bb_gate_leads'
const GATE_PATH = '/__gate'
const GATE_MAX_FAILS = 5
const GATE_WINDOW_MS = 15 * 60 * 1000
const GATE_BYPASS_EXACT = new Set(['/api/health', GATE_PATH])
const GATE_BYPASS_PREFIX: string[] = []

const RL_MAX_ENTRIES = 10_000
const gateFails = new Map<string, { count: number; resetAt: number }>()
function recordGateFail(ip: string): number {
  const now = Date.now()
  const entry = gateFails.get(ip)
  if (!entry || now > entry.resetAt) {
    if (gateFails.size >= RL_MAX_ENTRIES) {
      for (const [k, val] of gateFails) {
        if (now > val.resetAt) gateFails.delete(k)
      }
    }
    gateFails.set(ip, { count: 1, resetAt: now + GATE_WINDOW_MS })
    return 1
  }
  entry.count++
  return entry.count
}
function isLockedOut(ip: string): boolean {
  const now = Date.now()
  const entry = gateFails.get(ip)
  if (!entry || now > entry.resetAt) return false
  return entry.count >= GATE_MAX_FAILS
}

let cachedToken: string | null = null
async function computeToken(): Promise<string> {
  if (cachedToken) return cachedToken
  const secret = process.env.GATE_SECRET
  if (!secret) throw new Error('GATE_SECRET must be set')
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('gate:v1'))
  cachedToken = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return cachedToken
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
function passwordPage(opts: { error?: string; next?: string; status: number }): NextResponse {
  const error = opts.error ? `<p class="err">${esc(opts.error)}</p>` : ''
  const next = opts.next ? `<input type="hidden" name="next" value="${esc(opts.next)}">` : ''
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Enter password</title><style>:root{color-scheme:light dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:-apple-system,system-ui,sans-serif;background:#0b0b0b;color:#f1f1f1;padding:1.5rem}.card{width:100%;max-width:360px;background:#171717;border:1px solid #2a2a2a;border-radius:12px;padding:2rem;box-shadow:0 10px 40px rgba(0,0,0,.4)}h1{margin:0 0 .25rem;font-size:1.125rem;font-weight:600}p.sub{margin:0 0 1.25rem;color:#a0a0a0;font-size:.875rem}label{display:block;font-size:.75rem;color:#a0a0a0;margin-bottom:.375rem;text-transform:uppercase;letter-spacing:.05em}input[type="password"]{width:100%;padding:.75rem .875rem;font-size:1rem;background:#0b0b0b;border:1px solid #2a2a2a;color:#f1f1f1;border-radius:8px;outline:none}input[type="password"]:focus{border-color:#4a9eff}button{margin-top:.875rem;width:100%;padding:.75rem;font-size:.9rem;font-weight:600;background:#4a9eff;color:#0b0b0b;border:0;border-radius:8px;cursor:pointer}button:hover{background:#66afff}.err{margin-top:.75rem;color:#ff6b6b;font-size:.85rem}.foot{margin-top:1rem;font-size:.7rem;color:#666;text-align:center}</style></head><body><main class="card"><h1>Built Better — Leads</h1><p class="sub">Private. Enter access code to continue.</p><form method="POST" action="${GATE_PATH}"><label for="password">Access code</label><input id="password" name="password" type="password" autofocus autocomplete="off" required>${next}<button type="submit">Enter</button>${error}</form><p class="foot">builtbetter.cc</p></main></body></html>`
  return new NextResponse(html, {
    status: opts.status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  })
}
const CF_TRUSTED = process.env.CF_TRUSTED === 'true'
function getIp(headers: Headers): string {
  if (CF_TRUSTED) {
    return (
      headers.get('cf-connecting-ip') ||
      headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      '127.0.0.1'
    )
  }
  return '0.0.0.0'
}

export async function middleware(request: NextRequest) {
  if (!GATE_ENABLED) return NextResponse.next()
  const ip = getIp(request.headers)
  const { pathname } = request.nextUrl
  const expected = await computeToken()
  const cookieValue = request.cookies.get(GATE_COOKIE)?.value

  if (pathname === GATE_PATH) {
    if (request.method !== 'POST') return passwordPage({ status: 200 })
    if (isLockedOut(ip))
      return passwordPage({ error: 'Too many attempts. Wait 15 minutes.', status: 429 })
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return passwordPage({ error: 'Invalid submission.', status: 400 })
    }
    const password = formData.get('password')
    const next = formData.get('next')
    if (typeof password !== 'string' || password !== GATE_PASSWORD) {
      const count = recordGateFail(ip)
      const remaining = GATE_MAX_FAILS - count
      return passwordPage({
        error:
          remaining <= 0
            ? 'Too many attempts. Wait 15 minutes.'
            : `Wrong password. ${remaining} attempt${remaining === 1 ? '' : 's'} left.`,
        status: remaining <= 0 ? 429 : 401,
      })
    }
    const redirectTo =
      typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
        ? next
        : '/'
    const res = NextResponse.redirect(new URL(redirectTo, request.url))
    const isLocalhost =
      request.nextUrl.hostname === 'localhost' || request.nextUrl.hostname === '127.0.0.1'
    res.cookies.set(GATE_COOKIE, expected, {
      httpOnly: true,
      secure: !isLocalhost,
      sameSite: 'lax',
      path: '/',
      ...(isLocalhost ? {} : { domain: '.builtbetter.cc' }),
      maxAge: 60 * 60 * 24 * 7,
    })
    gateFails.delete(ip)
    return res
  }

  if (!GATE_BYPASS_EXACT.has(pathname) && !GATE_BYPASS_PREFIX.some((p) => pathname.startsWith(p))) {
    if (!cookieValue || !safeEqual(cookieValue, expected)) {
      return passwordPage({ next: pathname + request.nextUrl.search, status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|_next/data|favicon\\.ico).*)'],
}
