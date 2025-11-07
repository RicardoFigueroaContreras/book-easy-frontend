import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AdminApi } from '../../lib/adminApi'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'

// UI shape mapped from backend WorkHours JSON
// Backend fields: id, provider{ id }, weekday (0..6), startTime, endTime
type WorkHour = { id: number; providerId: number | ''; weekday: number; start: string; end: string }
type ProviderItem = { id: number; name: string }

export default function HoursPage() {
  const { businessSlug = 'barber-demo' } = useParams()
  const [items, setItems] = useState<WorkHour[]>([])
  const [providers, setProviders] = useState<ProviderItem[]>([])
  const [providerQuery, setProviderQuery] = useState('')
  const [form, setForm] = useState<{ providerId: number | ''; weekday: number | ''; start: string; end: string }>({
    providerId: '',
    weekday: '',
    start: '09:00',
    end: '17:00',
  })
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const canAdd = useMemo(() => {
    const wOk = form.weekday !== ''
    const tOk = form.start && form.end && form.end > form.start
    return wOk && tOk
  }, [form.weekday, form.start, form.end])

  const load = async () => {
    const raw = await AdminApi.listWorkHours(businessSlug)
    const mapped: WorkHour[] = (raw as any[]).map(w => ({
      id: w.id,
      providerId: w.provider?.id ?? '',
      weekday: w.weekday,
      start: w.startTime,
      end: w.endTime,
    }))
    setItems(mapped)
    const provs = await AdminApi.listProviders(businessSlug)
    setProviders((provs as any[]).map(p => ({ id: p.id, name: p.name })))
  }
  useEffect(() => { load() }, [businessSlug])

  const onAdd = async () => {
    // Validate required fields before POST
    if (form.weekday === '' || form.start.trim() === '' || form.end.trim() === '') {
      alert('Please complete Day, Start and End')
      return
    }
    const payload: any = {
      weekday: Number(form.weekday),
      startTime: form.start,
      endTime: form.end,
    }
    if (form.providerId) payload.provider = { id: form.providerId }
    await AdminApi.createWorkHours(businessSlug, payload)
    setForm({ providerId: '', weekday: '', start: '09:00', end: '17:00' })
    load()
  }

  const onDelete = async (id: number) => { await AdminApi.deleteWorkHours(businessSlug, id); load() }

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Hours</h1>
      <Card>
        <div className="grid md:grid-cols-5 gap-3 items-end">
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Provider (optional)</span>
            <Input placeholder="Search provider" value={providerQuery}
                   onChange={e => setProviderQuery(e.target.value)} />
            <select
              className="border rounded px-2 py-2 text-sm"
              value={form.providerId === '' ? '' : String(form.providerId)}
              onChange={e => {
                const v = e.target.value
                setForm({ ...form, providerId: v === '' ? '' : parseInt(v, 10) })
              }}
            >
              <option value="">- All providers -</option>
              {providers
                .filter(p => p.name.toLowerCase().includes(providerQuery.toLowerCase()))
                .map(p => (
                  <option key={p.id} value={p.id}>{p.name} (#{p.id})</option>
                ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Day</span>
            <select
              className="border rounded px-2 py-2 text-sm"
              value={form.weekday === '' ? '' : String(form.weekday)}
              onChange={e => {
                const v = e.target.value
                setForm({ ...form, weekday: v === '' ? '' : parseInt(v, 10) })
              }}
            >
              <option value="">- Day -</option>
              {dayNames.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Start</span>
            <Input type="time" value={form.start}
                   onChange={e => setForm({ ...form, start: e.target.value })} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">End</span>
            <Input type="time" value={form.end}
                   onChange={e => setForm({ ...form, end: e.target.value })} />
          </label>
          <Button onClick={onAdd} disabled={!canAdd}>Add</Button>
        </div>
      </Card>
      <Card>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-1">ID</th><th>Provider</th><th>Day</th><th>Start</th><th>End</th><th></th>
          </tr>
        </thead>
        <tbody>
          {items.map(w => (
            <tr key={w.id} className="border-b">
              <td className="py-1">{w.id}</td>
              <td>{w.providerId}</td>
              <td>{dayNames[w.weekday] ?? w.weekday}</td>
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
