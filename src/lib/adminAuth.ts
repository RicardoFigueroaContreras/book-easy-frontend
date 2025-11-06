let ACCESS_TOKEN: string | null = null
let CURRENT_BIZ_SLUG: string | null = null

// Initialize CURRENT_BIZ_SLUG from localStorage if available
try {
  const saved = localStorage.getItem('currentBusinessSlug')
  if (saved) CURRENT_BIZ_SLUG = saved
} catch {}

// Initialize ACCESS_TOKEN from localStorage if available
try {
  const savedToken = localStorage.getItem('accessToken')
  if (savedToken) ACCESS_TOKEN = savedToken
} catch {}

export function setAccessToken(token: string | null) {
  ACCESS_TOKEN = token
  try {
    if (token) localStorage.setItem('accessToken', token)
    else localStorage.removeItem('accessToken')
  } catch {}
}

export function getAccessToken(): string | null {
  return ACCESS_TOKEN
}

export function clearTokens() {
  ACCESS_TOKEN = null
  try { localStorage.removeItem('accessToken') } catch {}
}

export function bearerAuthHeader(): HeadersInit | undefined {
  if (!ACCESS_TOKEN) return undefined
  return { Authorization: `Bearer ${ACCESS_TOKEN}` }
}

export function parseJwtClaims(token: string | null): any | null {
  try {
    if (!token) return null
    const parts = token.split('.')
    if (parts.length < 2) return null
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    // Add padding for base64 decoding
    const padLength = (4 - (payload.length % 4)) % 4
    if (padLength) payload = payload + '='.repeat(padLength)
    const json = atob(payload)
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function getCurrentRole(): 'ADMIN' | 'BOOKING' | null {
  const c = parseJwtClaims(ACCESS_TOKEN)
  const role = c?.role || c?.claims?.role
  if (role === 'ADMIN' || role === 'BOOKING') return role
  if (typeof role === 'string') return role.toUpperCase() as any
  return null
}

export function setCurrentBusinessSlug(slug: string | null) {
  CURRENT_BIZ_SLUG = slug
  try {
    if (slug) localStorage.setItem('currentBusinessSlug', slug)
    else localStorage.removeItem('currentBusinessSlug')
  } catch {}
}

export function getCurrentBusinessSlug(): string | null {
  return CURRENT_BIZ_SLUG
}

export function getCurrentUserName(): string | null {
  const c = parseJwtClaims(ACCESS_TOKEN)
  const name = c?.name || c?.fullName || c?.given_name || c?.preferred_username || c?.email || c?.sub || c?.username
  return typeof name === 'string' ? name : null
}
