import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AdminApi } from '../../lib/adminApi'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Modal } from '../../components/ui/modal'
import { SkeletonRows } from '../../components/ui/skeleton'

type Service = { id: number; name: string; durationMinutes: number; priceCents?: number; bufferBefore?: number; bufferAfter?: number; concurrentCapacity?: number }

export default function ServicesPage() {
  const { businessSlug = 'barber-demo' } = useParams()
  const [items, setItems] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [duration, setDuration] = useState(30)
  const [bufferBefore, setBufferBefore] = useState(0)
  const [bufferAfter, setBufferAfter] = useState(0)
  const [capacity, setCapacity] = useState(1)
  const [formError, setFormError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await AdminApi.listServices(businessSlug))
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [businessSlug])

  const onAdd = async () => {
    if (!name.trim()) return
    // Validaciones simples
    const dur = Math.max(5, duration|0)
    const bufB = Math.max(0, bufferBefore|0)
    const bufA = Math.max(0, bufferAfter|0)
    if (dur > 12*60 || bufB > 12*60 || bufA > 12*60) {
      setFormError('Values too large. Use up to 720 minutes.')
      return
    }
    setFormError(null)
  const cap = Math.max(1, capacity|0)
  await AdminApi.createService(businessSlug, { name, durationMinutes: dur, bufferBefore: bufB, bufferAfter: bufA, concurrentCapacity: cap })
  setName(''); setDuration(30); setBufferBefore(0); setBufferAfter(0); setCapacity(1)
    load()
  }

  const onEdit = async (s: Service) => {
    setEditData({ ...s })
    setShowEdit(true)
  }
  const onDelete = async (id: number) => { if (confirm('Delete service?')) { await AdminApi.deleteService(businessSlug, id); load() } }

  const [showEdit, setShowEdit] = useState(false)
  const [editData, setEditData] = useState<Service | null>(null)
  const [showDeleteId, setShowDeleteId] = useState<number | null>(null)

  async function saveEdit() {
    if (!editData) return
    const s = editData
    const dur = Math.max(5, s.durationMinutes|0)
    const bufB = Math.max(0, (s.bufferBefore ?? 0)|0)
    const bufA = Math.max(0, (s.bufferAfter ?? 0)|0)
    const cap = Math.max(1, (s.concurrentCapacity ?? 1)|0)
    if (dur > 12*60 || bufB > 12*60 || bufA > 12*60) { setFormError('Values too large. Use up to 720 minutes.'); return }
    await AdminApi.updateService(businessSlug, s.id, { ...s, durationMinutes: dur, bufferBefore: bufB, bufferAfter: bufA, concurrentCapacity: cap })
    setShowEdit(false)
    setEditData(null)
    load()
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Services</h1>
      <Card>
        <div className="grid md:grid-cols-5 gap-3 items-end">
          <Input placeholder="Haircut" value={name} onChange={e => setName(e.target.value)} />
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Duration (min)</span>
            <Input type="number" min={5} step={5} value={duration} onChange={e => setDuration(parseInt(e.target.value || '0', 10))} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Buffer before (min)</span>
            <Input type="number" min={0} step={5} value={bufferBefore} onChange={e => setBufferBefore(parseInt(e.target.value || '0', 10))} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Buffer after (min)</span>
            <Input type="number" min={0} step={5} value={bufferAfter} onChange={e => setBufferAfter(parseInt(e.target.value || '0', 10))} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Concurrent capacity</span>
            <Input type="number" min={1} step={1} value={capacity} onChange={e => setCapacity(parseInt(e.target.value || '1', 10))} />
          </label>
          <Button onClick={onAdd}>Add</Button>
        </div>
        {formError && <div className="text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 text-sm mt-3">{formError}</div>}
        <p className="text-xs text-gray-600 mt-2">Buffers block extra time before/after to reduce calendar overlaps.</p>
      </Card>
      {loading && <SkeletonRows rows={4} />}
      {error && <div className="text-red-600">{error}</div>}
      <Card>
        <ul className="divide-y">
          {items.map(s => (
            <li key={s.id} className="py-3 px-3 md:px-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-gray-600">{s.durationMinutes} min · buffers {s.bufferBefore ?? 0}/{s.bufferAfter ?? 0} min · capacity {s.concurrentCapacity ?? 1}x</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(s)}>Edit</Button>
                <Button variant="outline" size="sm" onClick={() => setShowDeleteId(s.id)}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit service">
        {editData && (
          <div className="grid gap-3">
            <label className="grid gap-1">
              <span className="text-xs text-gray-600">Name</span>
              <Input value={editData.name} onChange={e=>setEditData({...editData, name: e.target.value})} />
            </label>
            <div className="grid md:grid-cols-3 gap-3">
              <label className="grid gap-1">
                <span className="text-xs text-gray-600">Duration (min)</span>
                <Input type="number" min={5} step={5} value={editData.durationMinutes} onChange={e=>setEditData({...editData, durationMinutes: parseInt(e.target.value||'0',10)})} />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-gray-600">Buffer before</span>
                <Input type="number" min={0} step={5} value={editData.bufferBefore || 0} onChange={e=>setEditData({...editData, bufferBefore: parseInt(e.target.value||'0',10)})} />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-gray-600">Buffer after</span>
                <Input type="number" min={0} step={5} value={editData.bufferAfter || 0} onChange={e=>setEditData({...editData, bufferAfter: parseInt(e.target.value||'0',10)})} />
              </label>
            </div>
            <label className="grid gap-1">
              <span className="text-xs text-gray-600">Concurrent capacity</span>
              <Input type="number" min={1} step={1} value={editData.concurrentCapacity || 1} onChange={e=>setEditData({...editData, concurrentCapacity: parseInt(e.target.value||'1',10)})} />
            </label>
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={()=>setShowEdit(false)}>Cancel</Button>
          <Button onClick={saveEdit}>Save</Button>
        </div>
      </Modal>

      <Modal open={showDeleteId !== null} onClose={() => setShowDeleteId(null)} title="Delete service?">
        <p className="text-sm text-gray-600">This action cannot be undone.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={()=>setShowDeleteId(null)}>Cancel</Button>
          <Button onClick={async ()=>{ if (showDeleteId!=null){ await AdminApi.deleteService(businessSlug, showDeleteId); setShowDeleteId(null); load(); } }}>Delete</Button>
        </div>
      </Modal>
    </div>
  )
}
