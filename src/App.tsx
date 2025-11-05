import { Outlet, NavLink, Link, useLocation, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { API_BASE } from './config'
import { getAccessToken, setAccessToken, getCurrentRole, getCurrentBusinessSlug, setCurrentBusinessSlug, clearTokens, getCurrentUserName } from './lib/adminAuth'

export default function App() {
  const params = useParams()
  const location = useLocation()
  const slugFromParams = params.businessSlug as string | undefined
  const slugFromPath = (() => {
    const parts = location.pathname.split('/').filter(Boolean)
    if (parts[0] === 'admin' && parts[1]) return parts[1]
    if (parts[0] && (parts[1] === 'booking' || parts[1] === 'dashboard')) return parts[0]
    return undefined
  })()
  const businessSlug = slugFromParams || slugFromPath || getCurrentBusinessSlug() || 'barber-demo'

  const [tokenPresent, setTokenPresent] = useState(!!getAccessToken())
  const [role, setRole] = useState<string | null>(getCurrentRole())
  const [authTick, setAuthTick] = useState(0)

  // Bootstrap token from refresh cookie if available so header can reflect role
  useEffect(() => {
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
          setRole(getCurrentRole())
          if (data?.businessSlug) setCurrentBusinessSlug(data.businessSlug)
          // Force re-render so getCurrentRole() reflects the new token
          setAuthTick((x) => x + 1)
        }
      }).catch(() => {})
    } else {
      setRole(getCurrentRole())
    }
  }, [])

  // Hide menu option for public booking when explicitly requested via query param
  const parts = location.pathname.split('/').filter(Boolean)
  const isBookingPath = parts.length >= 2 && parts[1] === 'booking'
  const qs = new URLSearchParams(location.search)
  const menuDisableParam = (qs.get('menudisable') || '').toLowerCase()
  const menuDisabledRequested = menuDisableParam === 'true' || menuDisableParam === '1'
  const isStaffHere = !!tokenPresent && !!role && ['ADMIN','BOOKING'].includes(String(role).toUpperCase()) && !!businessSlug
  const shouldHideMenu = isBookingPath && menuDisabledRequested && !isStaffHere

  return (
    <div className="min-h-screen">
      {!shouldHideMenu && (
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
          <span className="font-semibold select-none cursor-default text-gray-900" aria-label="Bookeasy">Bookeasy</span>
          <nav className="text-sm flex gap-2">
            <NavLink to={`/${businessSlug}/booking`} className={({isActive}) => isActive ? 'px-2 py-1 rounded-md bg-gray-100 text-gray-900' : 'px-2 py-1 rounded-md text-gray-600 hover:text-gray-900'}>Booking</NavLink>
            <NavLink to={`/${businessSlug}/dashboard`} className={({isActive}) => isActive ? 'px-2 py-1 rounded-md bg-gray-100 text-gray-900' : 'px-2 py-1 rounded-md text-gray-600 hover:text-gray-900'}>Dashboard</NavLink>
            {role === 'ADMIN' ? (
              <NavLink to={`/admin/${businessSlug}`} className={({isActive}) => isActive ? 'px-2 py-1 rounded-md bg-gray-100 text-gray-900' : 'px-2 py-1 rounded-md text-gray-600 hover:text-gray-900'}>Admin</NavLink>
            ) : null}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {tokenPresent ? (
              <>
                <span className="text-gray-700" title="Signed in user">{getCurrentUserName() || 'Account'}</span>
                <button
                  className="btn-ghost"
                  onClick={async () => {
                    try {
                      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' })
                    } catch {}
                    clearTokens();
                    setTokenPresent(false);
                    // Optional: clear stored business slug on logout
                    setCurrentBusinessSlug(null)
                    window.location.href = '/login'
                  }}
                >Logout</button>
              </>
            ) : (
              <Link to={`/login`} className="btn-ghost">Sign in</Link>
            )}
          </div>
        </div>
      </header>
      )}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
