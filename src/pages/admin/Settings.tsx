import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AdminApi } from '../../lib/adminApi'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'

export default function Settings() {
  const { businessSlug = 'barber-demo' } = useParams()
  const [loading, setLoading] = useState(true)
  const [bookingPublic, setBookingPublic] = useState(true)
  const [dashboardPublic, setDashboardPublic] = useState(false)
  const [dashboardEditable, setDashboardEditable] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    AdminApi.getSettings(businessSlug)
      .then((s: any) => {
        if (!mounted) return
        setBookingPublic(Boolean(s.bookingPublic))
        setDashboardPublic(Boolean(s.dashboardPublic))
        setDashboardEditable(Boolean(s.dashboardEditable))
      })
      .catch((e: any) => setError(String(e?.message || e)))
      .finally(() => setLoading(false))
    return () => { mounted = false }
  }, [businessSlug])

  const onSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await AdminApi.updateSettings(businessSlug, { bookingPublic, dashboardPublic, dashboardEditable })
      setSaved(true)
    } catch (e: any) {
      setError(String(e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div>Loading settings…</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {saved && <div className="text-sm text-green-700">Saved</div>}

      <Card className="grid gap-4 max-w-xl">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={bookingPublic} onChange={(e) => setBookingPublic(e.target.checked)} />
          <span>
            Public booking enabled
            <div className="text-xs text-gray-500">When disabled, availability and booking endpoints are blocked.</div>
          </span>
        </label>

        <label className="flex items-center gap-3">
          <input type="checkbox" checked={dashboardPublic} onChange={(e) => setDashboardPublic(e.target.checked)} />
          <span>
            Public dashboard (read-only)
            <div className="text-xs text-gray-500">Allows anyone to view the calendar and appointments list.</div>
          </span>
        </label>

        <label className="flex items-center gap-3">
          <input type="checkbox" checked={dashboardEditable} onChange={(e) => setDashboardEditable(e.target.checked)} />
          <span>
            Public edits in dashboard
            <div className="text-xs text-gray-500">Allows creating, rescheduling and canceling appointments without sign-in.</div>
          </span>
        </label>

        <div>
          <Button onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
