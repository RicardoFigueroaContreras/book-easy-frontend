import { NavLink, Outlet, useParams, useNavigate, useLocation } from 'react-router-dom'
import { getAccessToken, setAccessToken, clearTokens, getCurrentRole, setCurrentBusinessSlug } from '../../lib/adminAuth'
import { API_BASE } from '../../config'
import { useEffect, useState } from 'react'

export default function AdminLayout() {
  const { businessSlug = 'barber-demo' } = useParams()
  const nav = useNavigate()
  const loc = useLocation()
  const [tokenPresent, setTokenPresent] = useState(!!getAccessToken())
  const [checking, setChecking] = useState(true)
  const [diagOpen, setDiagOpen] = useState(false)
  const [diagLoading, setDiagLoading] = useState(false)
  const [diagResult, setDiagResult] = useState<any | null>(null)
  const [diagError, setDiagError] = useState<string | null>(null)
  // Bootstrap access token from refresh cookie if available
  useEffect(() => {
    const maybeRedirect = () => {
      const role = getCurrentRole()
      if (getAccessToken() && role !== 'ADMIN') {
        nav(`/${businessSlug}/booking`, { replace: true })
        return true
      }
      return false
    }
    // immediate check in case token already exists
    const redirected = maybeRedirect()
    if (getAccessToken() && !redirected) {
      // Already have token and staying in admin
      setChecking(false)
    }
    if (!getAccessToken()) {
      fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json()
          setAccessToken(data.accessToken)
          setTokenPresent(true)
          if (data?.businessSlug) setCurrentBusinessSlug(data.businessSlug)
          // redirect after obtaining access token if non-admin
          const redirected2 = maybeRedirect()
          if (!redirected2 && getCurrentRole() === 'ADMIN') {
            setChecking(false)
          }
        } else {
          // No access token and refresh failed → send to slug-agnostic login
          nav(`/login`, { replace: true })
        }
      }).catch(() => {
        // Network or other error → send to login
        nav(`/login`, { replace: true })
      })
    }
  }, [businessSlug])

  if (checking) {
    return (
      <div className="w-full flex items-center justify-center py-16" aria-busy="true" aria-live="polite">
        <div className="h-6 w-6 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" aria-label="Loading" />
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-[240px_1fr] gap-6">
      <aside className="card p-4 h-fit sticky top-4">
        <div className="mb-4">
          <div className="text-xs text-gray-500">Business</div>
          <div className="font-semibold">{businessSlug}</div>
        </div>
        <div className="mb-4">
          <button
            className="btn-outline text-xs px-2 py-1"
            onClick={async () => {
              setDiagOpen(true)
              setDiagLoading(true)
              setDiagError(null)
              setDiagResult(null)
              try {
                const token = getAccessToken()
                const headers: Record<string,string> = { 'Accept': 'application/json' }
                if (token) headers['Authorization'] = `Bearer ${token}`
                const [pubRes, admRes] = await Promise.all([
                  fetch(`${API_BASE}/api/public/whoami`, { headers, credentials: 'include' }),
                  fetch(`${API_BASE}/api/admin/${businessSlug}/whoami`, { headers, credentials: 'include' }),
                ])
                const pubJson = await pubRes.json().catch(() => ({ error: 'invalid-json' }))
                const admJson = await admRes.json().catch(() => ({ error: 'invalid-json' }))
                setDiagResult({
                  public: { status: pubRes.status, body: pubJson },
                  admin: { status: admRes.status, body: admJson },
                })
              } catch (e: any) {
                setDiagError(e?.message || 'diagnose-failed')
              } finally {
                setDiagLoading(false)
              }
            }}
          >Diagnose</button>
        </div>
        <nav className="grid gap-1 text-sm">
          {[
            ['services','Services'],
            ['providers','Providers'],
            ['hours','Hours'],
            ['absences','Absences'],
            ['customers','Customers'],
            ['staff','Staff'],
            ['exports','Exports'],
            ['reports','Reports'],
            ['settings','Settings'],
          ].map(([path,label]) => (
            <NavLink key={path} to={`/admin/${businessSlug}/${path}`}
              className={({isActive}) => `px-2 py-1 rounded-md ${isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:text-gray-900'}`}>{label}</NavLink>
          ))}
        </nav>
        {/* Account actions moved to top header; nothing here */}
      </aside>
      <section>
        {diagOpen && (
          <div className="card p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Diagnostics</div>
              <button className="btn-ghost text-xs" onClick={() => setDiagOpen(false)}>Close</button>
            </div>
            {diagLoading && (
              <div className="text-xs text-gray-600" aria-busy="true">Running checks…</div>
            )}
            {diagError && (
              <div className="text-xs text-red-600">{diagError}</div>
            )}
            {diagResult && (
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="font-semibold mb-1">/api/public/whoami</div>
                  <pre className="bg-gray-50 p-2 rounded overflow-auto max-h-64">
                    {JSON.stringify(diagResult.public, null, 2)}
                  </pre>
                </div>
                <div>
                  <div className="font-semibold mb-1">/api/admin/{businessSlug}/whoami</div>
                  <pre className="bg-gray-50 p-2 rounded overflow-auto max-h-64">
                    {JSON.stringify(diagResult.admin, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
        <Outlet />
      </section>
    </div>
  )
}
