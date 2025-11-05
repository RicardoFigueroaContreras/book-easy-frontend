import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AdminApi } from '../../lib/adminApi'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'

type WorkHour = { id: number; providerId: number; dayOfWeek: number; start: string; end: string }

export default function HoursPage() {
  const { businessSlug = 'barber-demo' } = useParams()
  const [items, setItems] = useState<WorkHour[]>([])
  const [form, setForm] = useState<Partial<WorkHour>>({ dayOfWeek: 1, start: '09:00', end: '17:00' })

  const load = async () => { setItems(await AdminApi.listWorkHours(businessSlug)) }
  useEffect(() => { load() }, [businessSlug])

  const onAdd = async () => {
    if (!form.providerId) return alert('providerId required')
    await AdminApi.createWorkHours(businessSlug, form)
    setForm({ dayOfWeek: 1, start: '09:00', end: '17:00' })
    load()
  }

  const onDelete = async (id: number) => { await AdminApi.deleteWorkHours(businessSlug, id); load() }

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Hours</h1>
      <Card>
        <div className="grid md:grid-cols-5 gap-3 items-end">
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Provider ID</span>
            <Input value={form.providerId || ''} onChange={e => setForm({ ...form, providerId: parseInt(e.target.value || '0', 10) })} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Day (1=Mon)</span>
            <Input type="number" min={1} max={7} value={form.dayOfWeek || 1} onChange={e => setForm({ ...form, dayOfWeek: parseInt(e.target.value, 10) })} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Start</span>
            <Input value={form.start || ''} onChange={e => setForm({ ...form, start: e.target.value })} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">End</span>
            <Input value={form.end || ''} onChange={e => setForm({ ...form, end: e.target.value })} />
          </label>
          <Button onClick={onAdd}>Add</Button>
        </div>
      </Card>
      <Card>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-1">ID</th><th>Prov.</th><th>Day</th><th>Start</th><th>End</th><th></th>
          </tr>
        </thead>
        <tbody>
          {items.map(w => (
            <tr key={w.id} className="border-b">
              <td className="py-1">{w.id}</td>
              <td>{w.providerId}</td>
              <td>{w.dayOfWeek}</td>
              <td>{w.start}</td>
              <td>{w.end}</td>
              <td>
                <Button variant="outline" size="sm" onClick={() => onDelete(w.id)}>Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </Card>
      <p className="text-xs text-gray-500">Tip: use IDs from "Providers" to assign hours.</p>
    </div>
  )
}
