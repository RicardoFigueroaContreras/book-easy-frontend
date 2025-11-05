import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { API_BASE } from '../../config'
import { setAccessToken, setCurrentBusinessSlug } from '../../lib/adminAuth'

function slugify(input: string): string {
  return (input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

export default function RegisterBusiness() {
  const nav = useNavigate()
  const [businessName, setBusinessName] = useState('')
  const [slug, setSlug] = useState('')
  const [adminFullName, setAdminFullName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)
  const [slugChecking, setSlugChecking] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)

  // Auto-generate slug from business name if user hasn't manually edited slug
  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugify(businessName))
    }
  }, [businessName, slugTouched])

  // Check slug availability when it changes and looks valid
  useEffect(() => {
    let cancelled = false
    async function check() {
      const s = slug
      if (!s || s.length < 3) { setSlugAvailable(null); return }
      setSlugChecking(true)
      try {
        const res = await fetch(`${API_BASE}/api/auth/check-slug?slug=${encodeURIComponent(s)}`)
        const data = await res.json().catch(() => ({}))
        if (!cancelled) setSlugAvailable(Boolean(data?.available))
      } catch {
        if (!cancelled) setSlugAvailable(null)
      } finally {
        if (!cancelled) setSlugChecking(false)
      }
    }
    check()
    return () => { cancelled = true }
  }, [slug])

  const passwordHint = 'Use at least 8 chars with at least 3 of: lowercase, uppercase, digit, special'
  const passwordOk = useMemo(() => password.length >= 8, [password])
  const confirmOk = useMemo(() => confirm.length > 0 && confirm === password, [confirm, password])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!businessName.trim()) { setError('Business name is required'); return }
    if (!slug || slug.length < 3) { setError('Choose a valid slug (min 3 chars)'); return }
    if (slugAvailable === false) { setError('This slug is already taken'); return }
    if (!adminEmail.includes('@')) { setError('Enter a valid email'); return }
    if (!passwordOk) { setError(passwordHint); return }
    if (!confirmOk) { setError('Passwords must match'); return }
    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ businessName, slug, adminFullName, adminEmail, password, phone })
      })
      if (!res.ok) {
        let msg = 'Registration failed'
        try {
          const e = await res.json()
          if (e?.error === 'slug-taken') msg = 'This slug is already taken'
          else if (e?.error === 'slug-invalid') msg = 'Slug is invalid. Use a-z, 0-9 and dashes'
          else if (e?.error === 'email-invalid') msg = 'Email is invalid'
          else if (e?.error === 'user-exists') msg = 'There is already an account with this email'
          else if (e?.error === 'password-too-weak') msg = passwordHint
          else if (e?.error) msg = e.error
        } catch {}
        throw new Error(msg)
      }
      const data = await res.json()
      if (data?.accessToken) setAccessToken(data.accessToken)
      if (data?.businessSlug) setCurrentBusinessSlug(data.businessSlug)
      const target = (data?.businessSlug || slug)
      nav(`/${target}/booking`, { replace: true })
    } catch (e: any) {
      setError(e?.message || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen w-full grid place-items-center px-4">
      <div className="w-full max-w-md card p-6">
        <h1 className="text-2xl font-semibold mb-6">Create your business</h1>
        <form className="grid gap-4" onSubmit={submit}>
          <label className="grid gap-1">
            <span className="text-sm text-gray-600">Business name</span>
            <input value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="My Salon" />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-gray-600">Slug (URL)</span>
            <div className="flex items-center gap-2">
              <input
                className="flex-1"
                value={slug}
                onChange={e=>{ setSlug(e.target.value.toLowerCase()); setSlugTouched(true) }}
                onBlur={()=> setSlug(s=>slugify(s))}
                placeholder="my-salon"
              />
              <span className="text-xs text-gray-500 min-w-[80px] text-right">
                {slugChecking ? 'Checking…' : slugAvailable === false ? 'Taken' : slug.length>=3 ? 'Available' : ''}
              </span>
            </div>
            <span className="text-xs text-gray-500">Use lowercase letters, numbers and dashes</span>
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-sm text-gray-600">Your name</span>
              <input value={adminFullName} onChange={e=>setAdminFullName(e.target.value)} placeholder="Alex Smith" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-gray-600">Email (admin)</span>
              <input type="email" value={adminEmail} onChange={e=>setAdminEmail(e.target.value)} placeholder="admin@mysalon.com" />
            </label>
          </div>
            <label className="grid gap-1">
              <span className="text-sm text-gray-600">Phone (optional)</span>
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="e.g. +1 555 123 4567" />
            </label>
          <label className="grid gap-1">
            <span className="text-sm text-gray-600">Password</span>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={passwordHint} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-gray-600">Confirm password</span>
            <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} />
          </label>
          {error && <div className="text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 text-sm">{error}</div>}
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create business'}
          </button>
        </form>
        <div className="mt-4 text-xs text-gray-600">
          Already have an account? <Link className="text-brand hover:underline" to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
