import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AdminApi } from '../../lib/adminApi'
import { useToast } from '../../components/ui/toaster'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { Modal } from '../../components/ui/modal'
import { SkeletonRows } from '../../components/ui/skeleton'

type StaffItem = {
  id: number
  fullName: string
  username: string
  phone: string
  role: 'ADMIN' | 'BOOKING' | string
  active: boolean
  invitedAt?: string
}

export default function StaffPage() {
  const { businessSlug = 'barber-demo' } = useParams()
  const { toast } = useToast()
  const [items, setItems] = useState<StaffItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', role: 'BOOKING' })
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ fullName?: string; email?: string; phone?: string; role?: string }>({})
  const [busy, setBusy] = useState<Set<number>>(new Set())
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'BOOKING'>('ALL')

  const emailValid = useMemo(() => /.+@.+\..+/.test(form.email), [form.email])
  const roleValid = useMemo(() => form.role === 'BOOKING' || form.role === 'ADMIN', [form.role])
  const nameValid = useMemo(() => form.fullName.trim().length >= 2, [form.fullName])
  const phoneValid = useMemo(() => {
    if (!form.phone) return true
    return /^[0-9+()\-\s]{7,}$/.test(form.phone)
  }, [form.phone])
  const filteredItems = useMemo(() => {
    if (roleFilter === 'ALL') return items
    return items.filter(i => i.role === roleFilter)
  }, [items, roleFilter])
  const [confirmDeactivate, setConfirmDeactivate] = useState<StaffItem | null>(null)

  async function load() {
    if (!businessSlug) return
    setLoading(true)
    setError(null)
    try {
      const data = await AdminApi.listStaff(businessSlug)
      setItems(data)
    } catch (e: any) {
      const msg = e?.message || 'Failed to load'
      setError(msg)
      toast({ title: 'Failed to load staff', description: msg, variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [businessSlug])

  async function invite() {
    if (!businessSlug) return
    if (!emailValid || !roleValid || !nameValid || !phoneValid) {
      toast({ title: 'Check form', description: 'Please fix highlighted fields', variant: 'error' })
      return
    }
    setSending(true)
    setFieldErrors({})
    setError(null)
    try {
      const origin = window.location.origin
      await AdminApi.inviteStaff(businessSlug, form, origin)
      setForm({ fullName: '', email: '', phone: '', role: 'BOOKING' })
      await load()
      toast({ title: 'Invite sent', variant: 'success' })
      setCooldown(true)
      setTimeout(() => setCooldown(false), 1200)
    } catch (e: any) {
      const msg = e?.message || 'Failed to invite'
      setError(msg)
      toast({ title: 'Failed to invite', description: msg, variant: 'error' })
      // Map server error codes to field-level hints when possible
      if (typeof msg === 'string') {
        const lower = msg.toLowerCase()
        const fe: any = {}
        if (lower.includes('user-exists')) fe.email = 'A user with this email already exists'
        if (lower.includes('email-invalid')) fe.email = 'Enter a valid email'
        if (lower.includes('email-required')) fe.email = 'Email is required'
        if (lower.includes('name-too-short')) fe.fullName = 'Enter at least 2 characters'
        if (lower.includes('phone-invalid')) fe.phone = 'Use at least 7 digits; allowed: + - ( ) and spaces'
        if (lower.includes('role-invalid')) fe.role = 'Role must be ADMIN or BOOKING'
        setFieldErrors(fe)
      }
    } finally {
      setSending(false)
    }
  }

  async function toggleActive(u: StaffItem) {
    if (!businessSlug) return
    if (u.active) { setConfirmDeactivate(u); return }
    try {
      setBusy(prev => new Set(prev).add(u.id))
      await AdminApi.activateStaff(businessSlug, u.id)
      await load()
      toast({ title: 'User activated', variant: 'success' })
    } catch (e: any) {
      const msg = e?.message || 'Failed to update user'
      setError(msg)
      toast({ title: 'Failed to update user', description: msg, variant: 'error' })
    } finally {
      setBusy(prev => { const n = new Set(prev); n.delete(u.id); return n })
    }
  }

  async function resend(u: StaffItem) {
    if (!businessSlug) return
    try {
      setBusy(prev => new Set(prev).add(u.id))
      const origin = window.location.origin
      await AdminApi.resendInvite(businessSlug, u.id, origin)
      await load()
      toast({ title: 'Invite resent', variant: 'success' })
    } catch (e: any) {
      const msg = e?.message || 'Failed to resend invite'
      setError(msg)
      toast({ title: 'Failed to resend invite', description: msg, variant: 'error' })
    } finally {
      setBusy(prev => { const n = new Set(prev); n.delete(u.id); return n })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Staff</h1>
        <p className="text-sm text-gray-500">Invite admins or booking staff. BOOKING users can operate the dashboard/booking even if not public; only ADMINs can access admin.</p>
      </div>

      <Card>
        <h2 className="font-medium mb-3">Invite</h2>
        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <Input placeholder="Full name" value={form.fullName} onChange={e=>setForm(f=>({...f, fullName: e.target.value}))} />
            {(!nameValid && form.fullName) && (
              <div className="text-xs text-red-600 mt-1">Enter at least 2 characters</div>
            )}
            {fieldErrors.fullName && (
              <div className="text-xs text-red-600 mt-1">{fieldErrors.fullName}</div>
            )}
          </div>
          <div>
            <Input placeholder="Email" value={form.email} onChange={e=>setForm(f=>({...f, email: e.target.value}))} />
            {!emailValid && form.email && (
              <div className="text-xs text-red-600 mt-1">Enter a valid email</div>
            )}
            {fieldErrors.email && (
              <div className="text-xs text-red-600 mt-1">{fieldErrors.email}</div>
            )}
          </div>
          <div>
            <Input placeholder="Phone" value={form.phone} onChange={e=>setForm(f=>({...f, phone: e.target.value}))} />
            {!phoneValid && form.phone && (
              <div className="text-xs text-red-600 mt-1">Use at least 7 digits; allowed: + - ( ) and spaces</div>
            )}
            {fieldErrors.phone && (
              <div className="text-xs text-red-600 mt-1">{fieldErrors.phone}</div>
            )}
          </div>
          <Select value={form.role} onChange={e=>setForm(f=>({...f, role: (e.target as HTMLSelectElement).value}))}>
            <option value="BOOKING">BOOKING</option>
            <option value="ADMIN">ADMIN</option>
          </Select>
          {fieldErrors.role && (
            <div className="text-xs text-red-600 mt-1 col-span-4">{fieldErrors.role}</div>
          )}
        </div>
        <div className="mt-3">
          <Button disabled={sending || cooldown || !emailValid || !roleValid || !nameValid || !phoneValid} onClick={invite}>
            {sending ? 'Sending…' : (cooldown ? 'Please wait…' : 'Send invite')}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">{filteredItems.length} staff</div>
          <div className="flex items-center gap-2">
            <label className="text-sm">Role</label>
            <Select className="text-sm max-w-[160px]" value={roleFilter} onChange={e=>setRoleFilter(e.target.value as any)}>
              <option value="ALL">All</option>
              <option value="ADMIN">ADMIN</option>
              <option value="BOOKING">BOOKING</option>
            </Select>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Phone</th>
              <th className="p-2">Role</th>
              <th className="p-2">Status</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-2" colSpan={6}><SkeletonRows rows={3} /></td></tr>
            ) : error ? (
              <tr><td className="p-2 text-red-600" colSpan={6}>{error}</td></tr>
            ) : filteredItems.length === 0 ? (
              <tr><td className="p-2 text-gray-500" colSpan={6}>No staff yet</td></tr>
            ) : filteredItems.map(u => (
              <tr key={u.id} className="border-t">
                <td className="p-2">{u.fullName || '—'}</td>
                <td className="p-2">{u.username}</td>
                <td className="p-2">{u.phone || '—'}</td>
                <td className="p-2">
                  <span className={
                    `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'}`
                  }>
                    {u.role}
                  </span>
                </td>
                <td className="p-2">{u.active ? 'Active' : (u.invitedAt ? 'Invited' : 'Inactive')}</td>
                <td className="p-2 space-x-2">
                  <Button variant="outline" size="sm" disabled={busy.has(u.id)} onClick={()=>toggleActive(u)}>
                    {busy.has(u.id) ? 'Working…' : (u.active ? 'Deactivate' : 'Activate')}
                  </Button>
                  {!u.active && (
                    <Button variant="outline" size="sm" disabled={busy.has(u.id)} onClick={()=>resend(u)}>
                      {busy.has(u.id) ? 'Sending…' : 'Resend invite'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Modal open={!!confirmDeactivate} onClose={()=>setConfirmDeactivate(null)} title="Deactivate user?">
        <p className="text-sm text-gray-600">This will prevent the user from accessing the app until reactivated.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={()=>setConfirmDeactivate(null)}>Cancel</Button>
          <Button onClick={async ()=>{
            if (!businessSlug || !confirmDeactivate) return
            try {
              setBusy(prev => new Set(prev).add(confirmDeactivate.id))
              await AdminApi.deactivateStaff(businessSlug, confirmDeactivate.id)
              setConfirmDeactivate(null)
              await load()
              toast({ title: 'User deactivated', variant: 'success' })
            } catch (e: any) {
              const msg = e?.message || 'Failed to update user'
              setError(msg)
              toast({ title: 'Failed to update user', description: msg, variant: 'error' })
            } finally {
              setBusy(prev => { const n = new Set(prev); n.delete(confirmDeactivate!.id); return n })
            }
          }}>Deactivate</Button>
        </div>
      </Modal>
    </div>
  )
}
