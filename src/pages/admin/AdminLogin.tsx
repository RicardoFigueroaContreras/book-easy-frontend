import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { setAccessToken, setCurrentBusinessSlug, getAccessToken, getCurrentBusinessSlug } from '../../lib/adminAuth'
import { API_BASE } from '../../config'

export default function AdminLogin() {
  const [username, setUsername] = useState('admin@barber-demo')
  const [password, setPassword] = useState('demo123')
  const [error, setError] = useState<string | null>(null)
  const nav = useNavigate()
  const [checking, setChecking] = useState(true)

  // If already authenticated (or refreshable), redirect to the user's business booking
  useEffect(() => {
    const token = getAccessToken()
    if (token) {
      const slug = getCurrentBusinessSlug() || 'barber-demo'
      nav(`/${slug}/booking`, { replace: true })
      return
    }
    // Try silent refresh via HttpOnly cookie
    fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    }).then(async (res) => {
      if (res.ok) {
        const data = await res.json()
        setAccessToken(data.accessToken)
        if (data?.businessSlug) setCurrentBusinessSlug(data.businessSlug)
        const slug = data?.businessSlug || getCurrentBusinessSlug() || 'barber-demo'
        nav(`/${slug}/booking`, { replace: true })
      } else {
        setChecking(false)
      }
    }).catch(() => setChecking(false))
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      })
      if (!res.ok) {
        let msg = 'Invalid credentials'
        try { const e = await res.json(); if (e?.error) msg = e.error } catch {}
        setError(msg)
        return
      }
  const data = await res.json()
  setAccessToken(data.accessToken)
      // businessSlug is returned by backend; use it to route
      if (data?.businessSlug) {
        setCurrentBusinessSlug(data.businessSlug)
        nav(`/${data.businessSlug}/booking`)
      } else {
        nav(`/barber-demo/booking`)
      }
    } catch (err) {
      setError('Could not save credentials')
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen w-full grid place-items-center" aria-busy="true" aria-live="polite">
        <div className="h-8 w-8 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" aria-label="Loading" />
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full grid place-items-center px-4">
      <div className="w-full max-w-sm card p-6">
        <h1 className="text-2xl font-semibold mb-6">Sign in</h1>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <label className="grid gap-1">
            <span className="text-sm text-gray-600">Email</span>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="you@company" />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-gray-600">Password</span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </label>
          {error && <div className="text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 text-sm">{error}</div>}
          <button type="submit" className="btn-primary w-full">Sign in</button>
        </form>
        <p className="text-xs text-gray-500 mt-3">Dev profile: admin@barber-demo / demo123</p>
        <p className="text-sm text-gray-700 mt-4">
          New here?{' '}
          <Link to="/register" className="text-brand hover:underline">Create your business</Link>
        </p>
      </div>
    </div>
  )
}
