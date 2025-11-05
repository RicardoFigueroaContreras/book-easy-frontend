import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { API_BASE } from '../../config'
import { useToast } from '../../components/ui/toaster'

export default function InviteAcceptPage() {
  const { token = '' } = useParams()
  const nav = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<{ businessSlug?: string, businessName?: string, email?: string, fullName?: string } | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fullName, setFullName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordFieldError, setPasswordFieldError] = useState<string | null>(null)
  const [confirmFieldError, setConfirmFieldError] = useState<string | null>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)

  const passwordValid = useMemo(() => password.length >= 8, [password])
  const confirmValid = useMemo(() => password === confirm && confirm.length > 0, [password, confirm])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE}/api/auth/invite/${encodeURIComponent(token!)}`)
        if (!res.ok) throw new Error('Invalid or expired invite')
        const data = await res.json()
        setInfo(data)
        if (data?.fullName) setFullName(data.fullName)
      } catch (e: any) {
        const msg = e?.message || 'Failed to load invite'
        setError(msg)
        toast({ title: 'Invite error', description: msg, variant: 'error' })
      } finally {
        setLoading(false)
      }
    }
    if (token) load()
  }, [token])

  async function submit() {
    if (!passwordValid || !confirmValid) {
      setPasswordFieldError(!passwordValid ? 'Use at least 8 characters' : null)
      setConfirmFieldError(!confirmValid ? 'Passwords must match' : null)
      // focus first invalid field
      if (!passwordValid) passwordRef.current?.focus()
      else if (!confirmValid) confirmRef.current?.focus()
      toast({ title: 'Check form', description: 'Password must be at least 8 characters and match confirmation', variant: 'error' })
      return
    }
    setSubmitting(true)
    setError(null)
    setPasswordFieldError(null)
    setConfirmFieldError(null)
    try {
      const res = await fetch(`${API_BASE}/api/auth/invite/${encodeURIComponent(token!)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, fullName }),
      })
      if (!res.ok) {
        let msg = 'Failed to accept invite'
        try {
          const e = await res.json()
          if (e?.error === 'password-too-weak') {
            const rule = typeof e?.rules === 'string' ? e.rules : 'Use at least 8 chars with at least 3 of: lowercase, uppercase, digit, special'
            setPasswordFieldError(rule)
            passwordRef.current?.focus()
            msg = e.error
          } else if (e?.error) {
            msg = e.error
          }
        } catch {}
        throw new Error(msg)
      }
  // Navigate to slug-agnostic login
  toast({ title: 'Invite accepted', description: 'You can now sign in', variant: 'success' })
  nav(`/login`, { replace: true })
    } catch (e: any) {
      const msg = e?.message || 'Failed to accept invite'
      setError(msg)
      toast({ title: 'Failed to accept invite', description: msg, variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-xl font-semibold mb-4">Accept invitation</h1>
      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            You were invited to {info?.businessName || info?.businessSlug || 'this business'} as a staff member for {info?.email}.
          </div>
          <div className="space-y-2">
            <label className="block text-sm">Full name</label>
            <input className="border rounded px-3 py-2 w-full" value={fullName} onChange={e=>setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="block text-sm">Set password</label>
            <input
              ref={passwordRef}
              type={showPassword ? 'text' : 'password'}
              className="border rounded px-3 py-2 w-full"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              placeholder="At least 8 characters"
              aria-invalid={!passwordValid || !!passwordFieldError}
            />
            {!passwordValid && password.length > 0 && (
              <div className="text-xs text-red-600">Use at least 8 characters</div>
            )}
            {passwordFieldError && (
              <div className="text-xs text-red-600">{passwordFieldError}</div>
            )}
            <label className="flex items-center gap-2 text-xs text-gray-600 select-none">
              <input type="checkbox" checked={showPassword} onChange={e=>setShowPassword(e.target.checked)} />
              Show password
            </label>
          </div>
          <div className="space-y-2">
            <label className="block text-sm">Confirm password</label>
            <input
              ref={confirmRef}
              type={showPassword ? 'text' : 'password'}
              className="border rounded px-3 py-2 w-full"
              value={confirm}
              onChange={e=>setConfirm(e.target.value)}
              aria-invalid={!confirmValid || !!confirmFieldError}
            />
            {!confirmValid && confirm.length > 0 && (
              <div className="text-xs text-red-600">Passwords don’t match</div>
            )}
            {confirmFieldError && (
              <div className="text-xs text-red-600">{confirmFieldError}</div>
            )}
          </div>
          <div>
            <button disabled={submitting || !passwordValid || !confirmValid} onClick={submit} className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-60">
              {submitting ? 'Setting up…' : 'Complete setup'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
