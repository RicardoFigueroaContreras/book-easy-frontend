import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AdminApi } from '../../lib/adminApi'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'

type Appointment = { id: number; start: string; end: string; serviceName?: string; providerName?: string; status?: string }

export default function CustomerDetailPage() {
  const { businessSlug = 'barber-demo', id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<any>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')

  const load = async () => {
    const data = await AdminApi.getCustomer(businessSlug, Number(id))
    const c = (data && (data.customer || data))
    const appts = (data && (data.appointments || data.history)) || []
    setCustomer(c)
    setAppointments(appts as Appointment[])
    setNotes(c?.notes || '')
    setTags(c?.tags || '')
  }
  useEffect(() => { load() }, [id])

  const onSave = async () => {
    await AdminApi.updateCustomer(businessSlug, Number(id), { notes, tags })
    navigate(-1)
  }

  const apptCount = useMemo(() => appointments?.length || 0, [appointments])

  if (!customer) return <div>Loading…</div>

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{customer.name}</h1>
        <div className="text-sm text-gray-600">
          <span className="mr-2">Appointments:</span>
          <span className="font-medium">{apptCount}</span>
          <Link to={`/${businessSlug}/dashboard?customerId=${encodeURIComponent(String(id))}`} className="ml-3 underline" title="Open calendar filtered by this customer">View in Dashboard</Link>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="grid gap-3">
          <div className="text-sm text-gray-600">{customer.email} {customer.phone}</div>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Tags</span>
            <input className="border rounded px-3 py-2" value={tags} onChange={e => setTags(e.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Notes</span>
            <textarea className="border rounded px-3 py-2 min-h-[120px]" value={notes} onChange={e => setNotes(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <Button onClick={onSave}>Save</Button>
            <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
          </div>
        </Card>
        <Card>
          <h2 className="font-medium mb-2">History</h2>
          <ul className="text-sm divide-y">
            {appointments?.map(a => (
              <li key={a.id} className="py-2">
                <div>{a.serviceName} with {a.providerName}</div>
                <div className="text-xs text-gray-600">{a.start} — {a.end} · {a.status}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
