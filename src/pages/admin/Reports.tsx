import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AdminApi } from '../../lib/adminApi'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'

export default function ReportsPage() {
  const { businessSlug = 'barber-demo' } = useParams()
  const today = new Date().toISOString().slice(0,10)
  const weekAgo = new Date(Date.now() - 6*86400000).toISOString().slice(0,10)
  const [from, setFrom] = useState(weekAgo)
  const [to, setTo] = useState(today)
  const [report, setReport] = useState<any | null>(null)

  const load = async () => { setReport(await AdminApi.getReport(businessSlug, from, to)) }
  useEffect(() => { load() }, [])

  const byService = useMemo(() => {
    const entries = Object.entries(report?.bookedMinutesByService || {}) as Array<[string, number]>
    const max = Math.max(1, ...entries.map(([name, v]) => {
      const cap = Number((report?.capacityMinutesByService || {})[name] || 0)
      if (!cap) return 0
      return Math.min(100, Math.round((Number(v) || 0) * 100 / cap))
    }))
    return { max, entries }
  }, [report])

  const byProvider = useMemo(() => {
    const entries = Object.entries(report?.bookedMinutesByProvider || {}) as Array<[string, number]>
    const max = Math.max(1, ...entries.map(([name, v]) => {
      const cap = Number((report?.capacityMinutesByProvider || {})[name] || 0)
      if (!cap) return 0
      return Math.min(100, Math.round((Number(v) || 0) * 100 / cap))
    }))
    return { max, entries }
  }, [report])

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Reports</h1>
      <Card>
      <div className="flex gap-2 items-end">
        <label className="grid gap-1">
          <span className="text-xs text-gray-600">From</span>
          <Input value={from} onChange={e => setFrom(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs text-gray-600">To</span>
          <Input value={to} onChange={e => setTo(e.target.value)} />
        </label>
        <Button variant="outline" onClick={load}>Refresh</Button>
      </div>
      </Card>
      {report && (
        <>
          <div className="grid md:grid-cols-4 gap-4">
            <Stat title="Appointments" value={report.appointments} />
            <Stat title="Booked minutes" value={report.bookedMinutes} />
            <Stat title="Cancelled" value={report.cancellations} />
            <Stat title="No Shows" value={report.noShows} />
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <ChartPctCard title="Occupancy by service" entries={byService.entries} capacities={report?.capacityMinutesByService || {}} maxPct={byService.max} />
            <ChartPctCard title="Occupancy by provider" entries={byProvider.entries} capacities={report?.capacityMinutesByProvider || {}} maxPct={byProvider.max} />
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ title, value }: { title: string; value: any }) {
  return (
    <Card>
      <div className="text-xs text-gray-600">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </Card>
  )
}

function ChartCard({ title, entries, max }: { title: string; entries: Array<[string, number]>; max: number }) {
  return (
    <Card>
      <div className="font-medium mb-3">{title}</div>
      {entries.length === 0 && <div className="text-sm text-gray-500">No data</div>}
      <ul className="grid gap-2">
        {entries.map(([name, value]) => (
          <li key={name} className="grid gap-1">
            <div className="flex justify-between text-xs"><span className="truncate mr-2">{name}</span><span>{value}</span></div>
            <div className="h-2 bg-gray-100 rounded">
              <div className="h-2 bg-black rounded" style={{ width: `${Math.max(4, Math.round((Number(value) || 0) * 100 / max))}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function ChartPctCard({ title, entries, capacities, maxPct }: { title: string; entries: Array<[string, number]>; capacities: Record<string, number>; maxPct: number }) {
  return (
    <Card>
      <div className="font-medium mb-3">{title}</div>
      {entries.length === 0 && <div className="text-sm text-gray-500">No data</div>}
      <ul className="grid gap-2">
        {entries.map(([name, booked]) => {
          const cap = Number(capacities[name] || 0)
          const pct = cap > 0 ? Math.min(100, Math.round((Number(booked) || 0) * 100 / cap)) : 0
          return (
            <li key={name} className="grid gap-1">
              <div className="flex justify-between text-xs"><span className="truncate mr-2">{name}</span><span>{pct}%</span></div>
              <div className="h-2 bg-gray-100 rounded" title={`${pct}% (${booked} / ${cap} min)`}>
                <div className="h-2 bg-black rounded" style={{ width: `${Math.max(4, pct)}%` }} />
              </div>
              <div className="text-[11px] text-gray-500">{booked} / {cap} min</div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
