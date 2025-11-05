import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AdminApi } from '../../lib/adminApi'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'

type TimeOff = { id: number; providerId: number; start: string; end: string; reason?: string }

export default function AbsencesPage() {
  const { businessSlug = 'barber-demo' } = useParams()
  const [items, setItems] = useState<TimeOff[]>([])
  const [form, setForm] = useState<Partial<TimeOff>>({ start: new Date().toISOString(), end: new Date(Date.now()+3600000).toISOString() })

  const load = async () => { setItems(await AdminApi.listTimeOff(businessSlug)) }
  useEffect(() => { load() }, [businessSlug])

  const onAdd = async () => {
    if (!form.providerId || !form.start || !form.end) return alert('Fill provider, start and end')
    await AdminApi.createTimeOff(businessSlug, form)
    setForm({ start: new Date().toISOString(), end: new Date(Date.now()+3600000).toISOString() })
    load()
  }
  const onDelete = async (id: number) => { await AdminApi.deleteTimeOff(businessSlug, id); load() }

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Absences</h1>
      <Card>
        <div className="grid md:grid-cols-5 gap-3 items-end">
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Provider ID</span>
            <Input value={form.providerId || ''} onChange={e => setForm({ ...form, providerId: parseInt(e.target.value||'0',10) })} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Start</span>
            <Input value={form.start || ''} onChange={e => setForm({ ...form, start: e.target.value })} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">End</span>
            <Input value={form.end || ''} onChange={e => setForm({ ...form, end: e.target.value })} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Reason</span>
            <Input value={form.reason || ''} onChange={e => setForm({ ...form, reason: e.target.value })} />
          </label>
          <Button onClick={onAdd}>Add</Button>
        </div>
      </Card>
      <Card>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b"><th className="py-1">ID</th><th>Prov.</th><th>Start</th><th>End</th><th>Reason</th><th></th></tr>
        </thead>
        <tbody>
          {items.map(t => (
            <tr key={t.id} className="border-b">
              <td className="py-1">{t.id}</td>
              <td>{t.providerId}</td>
              <td>{t.start}</td>
              <td>{t.end}</td>
              <td>{t.reason}</td>
              <td><Button variant="outline" size="sm" onClick={() => onDelete(t.id)}>Delete</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
      </Card>
    </div>
  )
}
