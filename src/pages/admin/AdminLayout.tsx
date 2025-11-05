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
        <Outlet />
      </section>
    </div>
  )
}
