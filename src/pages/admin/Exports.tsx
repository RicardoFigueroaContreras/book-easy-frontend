import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { API_BASE } from '../../config'
import { bearerAuthHeader } from '../../lib/adminAuth'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'

export default function ExportsPage() {
  const { businessSlug = 'barber-demo' } = useParams()
  const today = new Date().toISOString().slice(0,10)
  const weekAgo = new Date(Date.now() - 6*86400000).toISOString().slice(0,10)
  const [from, setFrom] = useState(weekAgo)
  const [to, setTo] = useState(today)
  const [providerId, setProviderId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const downloadCsv = async () => {
    setBusy(true); setError(null)
    try {
      const url = `${API_BASE}/api/admin/${businessSlug}/export/appointments.csv?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  const res = await fetch(url, { headers: { ...(bearerAuthHeader() || {}) } })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'appointments.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e: any) {
      setError(e.message || 'Could not download CSV')
    } finally { setBusy(false) }
  }

  const downloadProviderIcs = async () => {
    if (!providerId) return
    setBusy(true); setError(null)
    try {
      const base = `${API_BASE}/api/admin/${businessSlug}/export/provider/${encodeURIComponent(providerId)}.ics`
      const params = new URLSearchParams()
      if (from) params.set('from', new Date(from).toISOString())
      if (to) params.set('to', new Date(to).toISOString())
      const url = params.toString() ? `${base}?${params}` : base
  const res = await fetch(url, { headers: { ...(bearerAuthHeader() || {}) } })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const text = await res.text()
      const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `provider-${providerId}.ics`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e: any) {
      setError(e.message || 'Could not download ICS')
    } finally { setBusy(false) }
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Exports</h1>

      <Card className="grid gap-2">
        <div className="font-medium">Appointments (CSV)</div>
        <div className="flex gap-2 items-end">
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">From</span>
            <Input value={from} onChange={e => setFrom(e.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">To</span>
            <Input value={to} onChange={e => setTo(e.target.value)} />
          </label>
          <Button variant="outline" disabled={busy} onClick={downloadCsv}>Download CSV</Button>
        </div>
      </Card>

      <Card className="grid gap-2">
        <div className="font-medium">Provider calendar (ICS)</div>
        <div className="grid md:grid-cols-[1fr_auto] gap-2 items-end">
          <div className="flex gap-2">
            <label className="grid gap-1">
              <span className="text-xs text-gray-600">Provider ID</span>
              <Input className="w-32" value={providerId} onChange={e => setProviderId(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-gray-600">From</span>
              <Input value={from} onChange={e => setFrom(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-gray-600">To</span>
              <Input value={to} onChange={e => setTo(e.target.value)} />
            </label>
          </div>
          <Button variant="outline" disabled={busy || !providerId} onClick={downloadProviderIcs}>Download ICS</Button>
        </div>
        <p className="text-xs text-gray-500">For Google/Apple Calendar subscriptions, use the public tokenized link from "Providers" → "Rotate ICS link" (no authentication required).</p>
      </Card>

      {error && <div className="text-red-600 text-sm">{error}</div>}
    </div>
  )
}
