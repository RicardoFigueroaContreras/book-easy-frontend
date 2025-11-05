import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AdminApi, providerIcsUrl } from '../../lib/adminApi'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { Modal } from '../../components/ui/modal'
import { SkeletonRows } from '../../components/ui/skeleton'
import { useToast } from '../../components/ui/toaster'

type Provider = {
  id: number
  name: string
  email?: string
  maxConcurrentAppointments?: number | null
}

export default function ProvidersPage() {
  const { businessSlug = 'barber-demo' } = useParams()
  const { toast } = useToast()
  const [items, setItems] = useState<Provider[]>([])
  const [newName, setNewName] = useState('')
  const [newMaxCap, setNewMaxCap] = useState<number | ''>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokenById, setTokenById] = useState<Record<number, string>>({})

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await AdminApi.listProviders(businessSlug)
      setItems(data)
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [businessSlug])

  async function onCreate() {
    const name = newName.trim()
    if (!name) {
      toast({ title: 'Name is required', variant: 'error' })
      return
    }
    try {
      const body: any = { name }
      if (newMaxCap !== '' && Number(newMaxCap) > 0) body.maxConcurrentAppointments = Number(newMaxCap)
      await AdminApi.createProvider(businessSlug, body)
      setNewName('')
      setNewMaxCap('')
      await load()
      toast({ title: 'Provider added', variant: 'success' })
    } catch (e: any) {
      toast({ title: 'Failed to add provider', description: e?.message, variant: 'error' })
    }
  }

  function onRename(p: Provider) {
    setRename({ id: p.id, name: p.name })
  }

  async function onRotateIcs(p: Provider) {
    try {
      const res = await AdminApi.rotateProviderIcsToken(businessSlug, p.id)
      if (typeof res === 'string') {
        setTokenById(prev => ({ ...prev, [p.id]: res }))
      } else if (res?.token) {
        setTokenById(prev => ({ ...prev, [p.id]: res.token }))
      }
      toast({ title: 'ICS link rotated', variant: 'success' })
    } catch (e: any) {
      toast({ title: 'Failed to rotate ICS link', description: e?.message, variant: 'error' })
    }
  }

  const [rename, setRename] = useState<{ id: number, name: string, maxConcurrentAppointments?: number | null } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [confirmRotate, setConfirmRotate] = useState<Provider | null>(null)
  const nameInvalid = !!(rename && rename.name.trim().length === 0)

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Providers</h1>
      <Card>
        <div className="flex gap-2 items-end">
          <Input placeholder="Provider name" value={newName} onChange={e => setNewName(e.target.value)} className="max-w-sm" />
          <Input placeholder="Max concurrent (optional)" value={newMaxCap as any} onChange={e => setNewMaxCap(e.target.value ? Number(e.target.value) : '')} className="w-48" type="number" min={1} max={20} />
          <Button onClick={onCreate}>Add</Button>
        </div>
      </Card>
      {loading && <SkeletonRows rows={4} />}
      {error && <div className="text-red-600">{error}</div>}
      <Card>
        <ul className="divide-y">
          {items.map(p => (
          <li key={p.id} className="py-3 px-2 md:px-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{p.name}</div>
              {tokenById[p.id] && (
                <div className="text-xs text-gray-600 mt-1 break-all">
                  ICS: <a className="underline" href={providerIcsUrl(businessSlug, p.id, tokenById[p.id])} target="_blank" rel="noreferrer">
                    {providerIcsUrl(businessSlug, p.id, tokenById[p.id])}
                  </a>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setRename({ id: p.id, name: p.name, maxConcurrentAppointments: (p as any).maxConcurrentAppointments })}>Edit</Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmRotate(p)}>Rotate ICS link</Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(p.id)}>Delete</Button>
            </div>
          </li>
          ))}
        </ul>
      </Card>
      <p className="text-xs text-gray-500">Note: "Rotate ICS link" generates a new token and invalidates old links.</p>

      <Modal open={rename !== null} onClose={() => setRename(null)} title="Edit provider">
        {rename && (
          <div className="grid gap-2">
            <Input aria-label="Provider name" value={rename.name} onChange={e=>setRename({ ...rename, name: e.target.value })} />
            <Input aria-label="Max concurrent (optional)" type="number" min={1} max={20} value={(rename.maxConcurrentAppointments ?? '') as any} onChange={e=>setRename({ ...rename, maxConcurrentAppointments: e.target.value? Number(e.target.value) : null })} />
            {nameInvalid && (<div className="text-xs text-red-600">Name is required</div>)}
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={()=>setRename(null)}>Cancel</Button>
          <Button disabled={nameInvalid} onClick={async ()=>{ if (rename){ try { await AdminApi.updateProvider(businessSlug, rename.id, { id: rename.id, name: rename.name.trim(), maxConcurrentAppointments: rename.maxConcurrentAppointments ?? null }); setRename(null); await load(); toast({ title: 'Provider updated', variant: 'success' }); } catch (e: any) { toast({ title: 'Failed to update', description: e?.message, variant: 'error' }) } } }}>Save</Button>
        </div>
      </Modal>

      <Modal open={confirmDelete !== null} onClose={() => setConfirmDelete(null)} title="Delete provider?">
        <p className="text-sm text-gray-600">This action cannot be undone.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={()=>setConfirmDelete(null)}>Cancel</Button>
          <Button onClick={async ()=>{ if (confirmDelete!=null){ try { await AdminApi.deleteProvider(businessSlug, confirmDelete); setConfirmDelete(null); await load(); toast({ title: 'Provider deleted', variant: 'success' }) } catch (e: any) { toast({ title: 'Failed to delete', description: e?.message, variant: 'error' }) } } }}>Delete</Button>
        </div>
      </Modal>

      <Modal open={!!confirmRotate} onClose={() => setConfirmRotate(null)} title="Rotate ICS link?">
        <p className="text-sm text-gray-600">This will invalidate the current ICS link for {confirmRotate?.name} and generate a new one.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={()=>setConfirmRotate(null)}>Cancel</Button>
          <Button onClick={async ()=>{ if (confirmRotate){ await onRotateIcs(confirmRotate); setConfirmRotate(null); } }}>Rotate</Button>
        </div>
      </Modal>
    </div>
  )
}
