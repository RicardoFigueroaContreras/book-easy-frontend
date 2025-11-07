import { useEffect, useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
// NOTE: FullCalendar CSS not imported due to package export restrictions with Vite in this setup.
// For styling, add the CSS via CDN in index.html or copy CSS locally.
import { Button } from '../../components/ui/button'
import { Select } from '../../components/ui/select'
import { Card } from '../../components/ui/card'
import { useParams, useSearchParams } from 'react-router-dom'
import { getPublicConfig } from '../../lib/api'
import { AdminApi } from '../../lib/adminApi'
import { getAccessToken, parseJwtClaims } from '../../lib/adminAuth'
import { cancelAppointment, rescheduleAppointment, createAppointment } from '../../lib/api'
import { API_BASE } from '../../config'
import { Modal } from '../../components/ui/modal'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'

export default function Dashboard() {
  const [events, setEvents] = useState<any[]>([])
  const [blockEvents, setBlockEvents] = useState<any[]>([])
  const [blockWindows, setBlockWindows] = useState<Array<{ id: number; start: Date; end: Date; reason?: string; providerId?: number; providerName?: string }>>([])
  // Background style for business-wide blocks is applied via CSS class 'be-blocked' (striped gray)
  const { businessSlug = 'barber-demo' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const calRef = useRef<FullCalendar | null>(null)
  const [services, setServices] = useState<Array<{ id: number; name: string; durationMinutes?: number }>>([])
  const [serviceId, setServiceId] = useState<string>('')
  const [providers, setProviders] = useState<Array<{ id: number; name: string }>>([])
  const [providerId, setProviderId] = useState<string>('')
  const [loadingConfig, setLoadingConfig] = useState(false)
  const [canView, setCanView] = useState(true)
  const [canEdit, setCanEdit] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const customerId = searchParams.get('customerId') || ''
  const [viewMode, setViewMode] = useState<'calendar' | 'agenda'>('calendar')

  // Quick booking modal state
  const [quickOpen, setQuickOpen] = useState(false)
  const [quickStart, setQuickStart] = useState<Date | null>(null)
  const [quickServiceId, setQuickServiceId] = useState<string>('')
  const [quickProviderId, setQuickProviderId] = useState<string>('')
  const [qName, setQName] = useState('')
  const [qEmail, setQEmail] = useState('')
  const [qPhone, setQPhone] = useState('')
  const [qNotes, setQNotes] = useState('')
  const [qError, setQError] = useState<string | null>(null)
  const [qLoading, setQLoading] = useState(false)
  const [workHours, setWorkHours] = useState<Record<number, Array<{ start: string; end: string }>> | null>(null)
  const [resOpen, setResOpen] = useState(false)
  const [resEvent, setResEvent] = useState<any | null>(null)
  const [resStart, setResStart] = useState<string>('')
  const [resProviderId, setResProviderId] = useState<string>('')
  const [resError, setResError] = useState<string | null>(null)
  const [searchCustomer, setSearchCustomer] = useState<string>('')
  // Business-wide block modal (admin only)
  const [blockOpen, setBlockOpen] = useState(false)
  const [blockStart, setBlockStart] = useState<string>('')
  const [blockEnd, setBlockEnd] = useState<string>('')
  const [blockProviderId, setBlockProviderId] = useState<string>('')
  const [blockReason, setBlockReason] = useState<string>('')
  const [blockError, setBlockError] = useState<string | null>(null)
  const lastSelectionRef = useRef<{ start: Date; end: Date } | null>(null)

  const headerToolbar = {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay',
  } as const

  useEffect(() => {
    // Initialize filters from URL
    const s = searchParams.get('serviceId') || ''
    const p = searchParams.get('providerId') || ''
    if (s) setServiceId(s)
    if (p) setProviderId(p)
  }, [])

  useEffect(() => {
    // Load business config (services/providers) and permissions
    let mounted = true
    ;(async () => {
      setLoadingConfig(true)
      try {
        const cfg: any = await getPublicConfig(businessSlug!)
        if (!mounted) return
        if (Array.isArray(cfg?.services)) setServices(cfg.services)
        if (Array.isArray(cfg?.providers)) setProviders(cfg.providers)
        // Optional work hours from backend config if available
        if (cfg?.business?.workHours && typeof cfg.business.workHours === 'object') {
          setWorkHours(cfg.business.workHours as Record<number, Array<{ start: string; end: string }>>)
        } else {
          setWorkHours(null)
        }
        // Permissions based on config + role
        const role = ((): string | null => {
          try { return (parseJwtClaims(getAccessToken()) as any)?.role || null } catch { return null }
        })()
        const isStaff = !!role && ['ADMIN','BOOKING'].includes(String(role).toUpperCase())
        setIsAdmin(String(role || '').toUpperCase() === 'ADMIN')
        const dashPublic = Boolean(cfg?.business?.dashboardPublic ?? true)
        const dashEditable = Boolean(cfg?.business?.dashboardEditable ?? true)
        setCanView(dashPublic || isStaff)
        setCanEdit(isStaff || dashEditable)
      } catch (e) {
        console.error('Failed to load config', e)
        // Fallback: if config fetch fails, derive from role only
        const role = ((): string | null => {
          try { return (parseJwtClaims(getAccessToken()) as any)?.role || null } catch { return null }
        })()
        const isStaff = !!role && ['ADMIN','BOOKING'].includes(String(role).toUpperCase())
        setCanView(isStaff)
        setCanEdit(isStaff)
      }
      finally {
        if (mounted) setLoadingConfig(false)
      }
    })()
    return () => { mounted = false }
  }, [businessSlug])

  // Keyboard shortcuts: T (today), ArrowLeft/ArrowRight navigate
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = (target?.tagName || '').toLowerCase()
      if (['input','textarea','select'].includes(tag) || target?.isContentEditable) return
      const api = (calRef.current as any)?.getApi?.()
      if (!api) return
      if (e.key === 't' || e.key === 'T') { api.today(); e.preventDefault() }
      else if (e.key === 'ArrowLeft') { api.prev(); e.preventDefault() }
      else if (e.key === 'ArrowRight') { api.next(); e.preventDefault() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const isWithinWorkHours = (d: Date) => {
    if (!workHours) return true
    const day = d.getDay() // 0-6
    const blocks = workHours[day]
    if (!blocks || blocks.length === 0) return false
    const hh = String(d.getHours()).padStart(2,'0')
    const mm = String(d.getMinutes()).padStart(2,'0')
    const t = `${hh}:${mm}`
    return blocks.some(b => b.start <= t && t < b.end)
  }

  const toLocalDateTimeInputValue = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2,'0')
    const yyyy = date.getFullYear()
    const mm = pad(date.getMonth() + 1)
    const dd = pad(date.getDate())
    const hh = pad(date.getHours())
    const mi = pad(date.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
  }

  const defaultBlockWindow = () => {
    const sel = lastSelectionRef.current
    if (sel) return { start: sel.start, end: sel.end }
    const now = new Date()
    const start = new Date(now)
    start.setMinutes(0,0,0)
    const end = new Date(start)
    end.setHours(start.getHours() + 1)
    return { start, end }
  }

  const fetchEvents = async (startIso: string, endIso: string) => {
    try {
      const url = new URL(`${API_BASE}/api/public/${businessSlug}/appointments`)
      url.searchParams.set('from', startIso)
      url.searchParams.set('to', endIso)
      if (serviceId) url.searchParams.set('serviceId', String(serviceId))
      if (providerId) url.searchParams.set('providerId', String(providerId))
      if (customerId) url.searchParams.set('customerId', String(customerId))
      const token = getAccessToken()
      const res = await fetch(url.toString(), {
        // Optional bearer; endpoint is public if dashboardPublic is true
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      const data = await res.json()
      const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
      const mapped = arr.map((a: any) => ({
        id: String(a.id),
        title: a.customerName ? `${a.customerName} • ${a.serviceName || a.service?.name || 'Appointment'}` : (a.serviceName || a.service?.name || 'Appointment'),
        start: a.start || a.startTime,
        end: a.end || a.endTime,
        extendedProps: {
          providerName: a.providerName || a.provider?.name,
          providerId: a.providerId || a.provider?.id,
          serviceName: a.serviceName || a.service?.name,
          durationMinutes: a.service?.durationMinutes || a.durationMinutes,
          customerName: a.customerName || a.customer?.name,
          icsPath: a.icsPath,
        },
      }))
      setEvents(mapped)
    } catch (e) {
      console.error('Failed to fetch events', e)
      setEvents([])
    }
  }

  const fetchBlocks = async (startIso: string, endIso: string) => {
    // Only staff can load admin time-off; quietly ignore for public view
    try {
      const token = getAccessToken()
      if (!token) { setBlockEvents([]); setBlockWindows([]); return }
      const all: any[] = await AdminApi.listTimeOff(businessSlug!)
      const start = new Date(startIso).getTime()
      const end = new Date(endIso).getTime()
  const bizWide = (all || []).filter((t: any) => !t.provider && !t.providerId && (t.business || t.businessId))
      const overlappingBiz = bizWide.filter((t: any) => {
        const s = new Date(t.startTime || t.start || t.begin || t.from).getTime()
        const e = new Date(t.endTime || t.end || t.finish || t.to).getTime()
        return !(isNaN(s) || isNaN(e)) && s < end && e > start
      })
      const blocksBiz = overlappingBiz.map((t: any) => ({
        id: `block-${t.id}`,
        start: t.startTime || t.start || t.begin || t.from,
        end: t.endTime || t.end || t.finish || t.to,
        display: 'background' as const,
        classNames: ['be-blocked'],
        extendedProps: { reason: t.reason, timeOffId: t.id },
        overlap: false,
        editable: false,
      }))
      // Provider-specific blocks: show all (visual legend distinguishes them)
      const provBlocksAll = (all || []).filter((t: any) => (t.providerId || t.provider?.id))
      const overlappingProv = provBlocksAll.filter((t: any) => {
        const s = new Date(t.startTime || t.start || t.begin || t.from).getTime()
        const e = new Date(t.endTime || t.end || t.finish || t.to).getTime()
        return !(isNaN(s) || isNaN(e)) && s < end && e > start
      })
      const provNameById = new Map(providers.map(p => [p.id, p.name]))
      const blocksProv = overlappingProv.map((t: any) => ({
        id: `block-prov-${t.id}`,
        start: t.startTime || t.start || t.begin || t.from,
        end: t.endTime || t.end || t.finish || t.to,
        display: 'background' as const,
        classNames: ['be-blocked-prov'],
        extendedProps: { reason: t.reason, timeOffId: t.id, providerId: Number(t.providerId || t.provider?.id), providerName: provNameById.get(Number(t.providerId || t.provider?.id)) },
        overlap: false,
        editable: false,
      }))
      const allBlocks = [...blocksBiz, ...blocksProv]
      setBlockEvents(allBlocks)
      setBlockWindows(allBlocks.map(b => ({
        id: Number((b as any)?.extendedProps?.timeOffId),
        start: new Date((b as any).start),
        end: new Date((b as any).end),
        reason: (b as any)?.extendedProps?.reason,
        providerId: (b as any)?.extendedProps?.providerId,
        providerName: (b as any)?.extendedProps?.providerName,
      })))
    } catch (e) {
      console.warn('Failed to fetch business-wide blocks (time-off)', e)
      setBlockEvents([])
      setBlockWindows([])
    }
  }

  const updateSearchParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  return (
    <div className="p-4 grid gap-3">
      <div>
        <Card className="p-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1">
              <span className="text-xs text-gray-600">Service</span>
              <Select
                className="min-w-[220px]"
                value={serviceId}
                onChange={(e) => {
                  const v = e.target.value
                  setServiceId(v)
                  updateSearchParam('serviceId', v)
                  const api = (calRef.current as any)?.getApi?.()
                  const view = api?.view
                  if (view) fetchEvents(view.currentStart.toISOString(), view.currentEnd.toISOString())
                }}
                disabled={loadingConfig}
              >
                <option value="">All</option>
                {services.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}{s.durationMinutes ? ` (${s.durationMinutes} min)` : ''}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-gray-600">Provider</span>
              <Select
                className="min-w-[220px]"
                value={providerId}
                onChange={(e) => {
                  const v = e.target.value
                  setProviderId(v)
                  updateSearchParam('providerId', v)
                  const api = (calRef.current as any)?.getApi?.()
                  const view = api?.view
                  if (view) fetchEvents(view.currentStart.toISOString(), view.currentEnd.toISOString())
                }}
                disabled={loadingConfig}
              >
                <option value="">All</option>
                {providers.map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </Select>
            </label>
            <div className="flex items-center gap-2 ml-2">
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'outline'}
                onClick={() => setViewMode('calendar')}
              >Calendar</Button>
              <Button
                variant={viewMode === 'agenda' ? 'default' : 'outline'}
                onClick={() => setViewMode('agenda')}
              >Agenda</Button>
            </div>
          </div>
          {/* Legend for block types */}
          <div className="mt-3 flex items-center gap-4 text-[11px] text-gray-600">
            <div className="flex items-center gap-2">
              <span className="inline-block w-8 h-3 border be-blocked" style={{ borderColor: '#d1d5db' }} />
              <span>Business-wide block</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-8 h-3 border be-blocked-prov" style={{ borderColor: '#d1d5db' }} />
              <span>Provider block</span>
            </div>
          </div>
        </Card>
      </div>

      {viewMode === 'agenda' && (
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => (calRef.current as any)?.getApi?.().prev?.()}>Prev</Button>
            <Button variant="outline" onClick={() => (calRef.current as any)?.getApi?.().today?.()}>Today</Button>
            <Button variant="outline" onClick={() => (calRef.current as any)?.getApi?.().next?.()}>Next</Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">
              {(() => {
                try { return (calRef.current as any)?.getApi?.().view?.title || '' } catch { return '' }
              })()}
            </div>
            <label className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Search customer</span>
              <Input
                placeholder="Type a name..."
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
                className="h-8"
              />
            </label>
          </div>
        </div>
      )}

      {!canView ? (
        <Card className="bg-yellow-50 border-yellow-200 text-yellow-800 text-sm">This dashboard is private for this business.</Card>
      ) : null}

      {viewMode === 'calendar' && !canEdit && canView ? (
        <Card className="bg-yellow-50 border-yellow-200 text-yellow-800 text-xs p-2">Read-only: selection and edits are disabled for this business.</Card>
      ) : null}

      <div className={viewMode === 'agenda' ? 'hidden' : ''}>
        <FullCalendar
          ref={calRef as any}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={headerToolbar as any}
          businessHours={workHours ? Object.entries(workHours).flatMap(([dow, blocks]) =>
            (blocks as Array<{start:string;end:string}>).map(b => ({ daysOfWeek: [Number(dow)], startTime: b.start, endTime: b.end }))
          ) : undefined}
          selectable={canEdit}
          selectMirror
          editable={canEdit}
          events={[...events, ...blockEvents]}
          eventDidMount={(info) => {
            // Add tooltip for blocked background events
            const classes = info.event.classNames || []
            if (classes.includes('be-blocked') || classes.includes('be-blocked-prov')) {
              const reason = (info.event.extendedProps as any)?.reason
              const provName = (info.event.extendedProps as any)?.providerName
              const base = provName ? `Blocked (${provName})` : 'Blocked'
              info.el.setAttribute('title', reason ? `${base}: ${reason}` : base)
              // Make background event clickable for deletion
              info.el.style.pointerEvents = 'auto'
              info.el.style.cursor = 'pointer'
              info.el.addEventListener('click', async (e) => {
                e.stopPropagation()
                const blockId = Number((info.event.extendedProps as any)?.timeOffId)
                if (!blockId) return
                const ok = window.confirm('Delete this blocked time?')
                if (!ok) return
                try {
                  await AdminApi.deleteTimeOff(businessSlug!, blockId)
                  const api = (calRef.current as any)?.getApi?.()
                  const view = api?.view
                  if (view) {
                    const start = view.currentStart.toISOString()
                    const end = view.currentEnd.toISOString()
                    fetchEvents(start, end)
                    fetchBlocks(start, end)
                  }
                } catch (err) {
                  alert('Failed to delete blocked time')
                }
              })
            }
          }}
          selectAllow={(arg) => {
            const start = arg.start
            if (start.getTime() < Date.now()) return false
            // Blocked business-wide windows should not be selectable
            const isBlocked = blockWindows.some(b => {
              if (b.providerId) {
                // Only block selection for provider-specific blocks when that provider is selected
                return providerId && Number(providerId) === b.providerId && b.start <= start && start < b.end
              }
              return b.start <= start && start < b.end
            })
            return isWithinWorkHours(start) && !isBlocked
          }}
          select={canEdit ? (arg) => {
            if (arg.start.getTime() < Date.now() || !isWithinWorkHours(arg.start)) return
            // remember last selection for block usage
            try { lastSelectionRef.current = { start: arg.start, end: arg.end || new Date(arg.start.getTime() + 60*60*1000) } } catch {}
            setQuickStart(arg.start)
            setQuickServiceId(serviceId || '')
            setQuickProviderId(providerId || '')
            setQName('')
            setQEmail('')
            setQPhone('')
            setQNotes('')
            setQError(null)
            setQuickOpen(true)
          } : undefined}
          eventContent={(arg) => {
            const icsPath: string | undefined = (arg.event.extendedProps as any)?.icsPath
            return (
              <div className="fc-event-title-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div className="fc-event-title fc-sticky">{arg.event.title}</div>
                {icsPath ? (
                  <a
                    href={`${API_BASE}${icsPath}`}
                    onClick={(e) => { e.stopPropagation(); }}
                    className="text-[10px] px-1 py-0.5 rounded bg-white/70 hover:bg-white text-gray-700 border"
                    title="Download .ics"
                  >
                    .ics
                  </a>
                ) : null}
              </div>
            )
          }}
          eventClick={canEdit ? async (info) => {
            const id = Number(info.event.id || (info.event.extendedProps as any)?.id)
            if (!id) return
            const confirmed = window.confirm('Cancel this appointment?')
            if (!confirmed) return
            try {
              await cancelAppointment(businessSlug!, id)
              const view = info.view
              const start = view.currentStart.toISOString()
              const end = view.currentEnd.toISOString()
              fetchEvents(start, end)
            } catch (e) {
              console.error(e)
              alert('Could not cancel appointment')
            }
          } : undefined}
          eventDrop={async (info) => {
            if (!canEdit) { info.revert(); return }
            const id = Number(info.event.id || (info.event.extendedProps as any)?.id)
            if (!id) return
            try {
              await rescheduleAppointment(businessSlug!, id, info.event.start!.toISOString())
              const view = info.view
              const start = view.currentStart.toISOString()
              const end = view.currentEnd.toISOString()
              fetchEvents(start, end)
            } catch (e: any) {
              console.error(e)
              if (String(e?.message || '').includes('Overlapping')) {
                alert('The new time overlaps with another appointment')
              } else {
                alert('Could not reschedule appointment')
              }
              info.revert()
            }
          }}
          eventResize={async (info) => {
            if (!canEdit) { info.revert(); return }
            const id = Number(info.event.id || (info.event.extendedProps as any)?.id)
            if (!id) return
            try {
              await rescheduleAppointment(businessSlug!, id, info.event.start!.toISOString())
              const view = info.view
              const start = view.currentStart.toISOString()
              const end = view.currentEnd.toISOString()
              fetchEvents(start, end)
            } catch (e) {
              console.error(e)
              info.revert()
            }
          }}
          dateClick={canEdit ? (arg) => {
            // Prevent quick booking on blocked business windows
            const isBlocked = blockWindows.some(b => {
              if (b.providerId) {
                return providerId && Number(providerId) === b.providerId && b.start <= arg.date && arg.date < b.end
              }
              return b.start <= arg.date && arg.date < b.end
            })
            if (isBlocked) return
            setQuickStart(arg.date)
            setQuickServiceId(serviceId || '')
            setQuickProviderId(providerId || '')
            setQName('')
            setQEmail('')
            setQPhone('')
            setQNotes('')
            setQError(null)
            setQuickOpen(true)
          } : undefined}
          datesSet={(arg) => {
            if (!canView) return
            const start = arg.start.toISOString()
            const end = arg.end.toISOString()
            fetchEvents(start, end)
            fetchBlocks(start, end)
          }}
          height="80vh"
        />
      </div>

      {viewMode === 'agenda' && (
        <AgendaView
          events={events.filter(e => {
            const q = searchCustomer.trim().toLowerCase()
            if (!q) return true
            const t = (e.title || '').toLowerCase()
            const c = (e.extendedProps?.customerName || '').toLowerCase()
            return t.includes(q) || c.includes(q)
          }) as any}
          canEdit={canEdit}
          onCancel={async (evt) => {
            if (!canEdit) return
            const id = Number(evt.id)
            if (!id) return
            const confirmed = window.confirm('Cancel this appointment?')
            if (!confirmed) return
            try {
              await cancelAppointment(businessSlug!, id)
              const api = (calRef.current as any)?.getApi?.()
              const view = api?.view
              if (view) fetchEvents(view.currentStart.toISOString(), view.currentEnd.toISOString())
            } catch (e) {
              console.error(e)
              alert('Could not cancel appointment')
            }
          }}
          onReschedule={(evt) => {
            if (!canEdit) return
            setResEvent(evt)
            try {
              setResProviderId(String((evt.extendedProps || {}).providerId || ''))
            } catch { setResProviderId('') }
            setResStart(toLocalDateTimeInputValue(new Date(evt.start)))
            setResError(null)
            setResOpen(true)
          }}
          blocks={blockWindows}
          onDeleteBlock={async (id) => {
            const ok = window.confirm('Delete this blocked time?')
            if (!ok) return
            try {
              await AdminApi.deleteTimeOff(businessSlug!, id)
              const api = (calRef.current as any)?.getApi?.()
              const view = api?.view
              if (view) {
                const start = view.currentStart.toISOString()
                const end = view.currentEnd.toISOString()
                fetchEvents(start, end)
                fetchBlocks(start, end)
              }
            } catch (e) {
              alert('Failed to delete blocked time')
            }
          }}
        />
      )}

      {/* Quick booking modal */}
      <Modal
        open={quickOpen}
        onClose={() => {
          setQuickOpen(false)
          try { (calRef.current as any)?.getApi?.().unselect?.() } catch {}
        }}
        title="Create appointment"
        size="lg"
      >
        <div className="grid gap-3">
          <div className="text-sm text-gray-700">
            {quickStart ? (
              <span>
                Selected start: {quickStart.toLocaleString()} {(() => {
                  const s = services.find(x => String(x.id) === String(quickServiceId))
                  if (!s || !s.durationMinutes) return null
                  return <span className="text-gray-500">• Duration {s.durationMinutes} min</span>
                })()}
              </span>
            ) : 'Select a time in the calendar'}
          </div>
          {isAdmin && (
            <div className="bg-blue-50 border border-blue-200 text-xs text-blue-800 rounded p-2">
              Admin: You can block a business-wide or provider-specific window using the button below.
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-xs text-gray-600">Service</span>
              <Select value={quickServiceId} onChange={(e) => setQuickServiceId(e.target.value)}>
                <option value="">Select a service</option>
                {services.map(s => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}{s.durationMinutes ? ` (${s.durationMinutes} min)` : ''}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-gray-600">Provider (optional)</span>
              <Select value={quickProviderId} onChange={(e) => setQuickProviderId(e.target.value)}>
                <option value="">Any</option>
                {providers.map(p => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </Select>
            </label>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <label className="grid gap-1">
              <span className="text-xs text-gray-600">Customer name</span>
              <Input value={qName} onChange={(e) => setQName(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-gray-600">Email</span>
              <Input type="email" value={qEmail} onChange={(e) => setQEmail(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-gray-600">Phone</span>
              <Input value={qPhone} onChange={(e) => setQPhone(e.target.value)} />
            </label>
          </div>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Notes</span>
            <Textarea value={qNotes} onChange={(e) => setQNotes(e.target.value)} className="min-h-[80px]" />
          </label>
          {qError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{qError}</div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              onClick={() => {
                setQuickOpen(false)
                try { (calRef.current as any)?.getApi?.().unselect?.() } catch {}
              }}
              variant="outline"
            >
              Cancel
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => {
                  const def = defaultBlockWindow()
                  setBlockStart(toLocalDateTimeInputValue(def.start))
                  setBlockEnd(toLocalDateTimeInputValue(def.end))
                  setBlockProviderId('')
                  setBlockReason('')
                  setBlockError(null)
                  setBlockOpen(true)
                }}
              >Block time</Button>
            )}
            <Button
              onClick={async () => {
                if (!quickStart || !quickServiceId || !qName) {
                  setQError('Select service, time and enter customer name')
                  return
                }
                // Prevent creating inside a business-wide block
                if (quickStart && blockWindows.some(b => {
                  if (b.providerId) {
                    return quickProviderId && Number(quickProviderId) === b.providerId && b.start <= quickStart && quickStart < b.end
                  }
                  return b.start <= quickStart && quickStart < b.end
                })) {
                  setQError('Selected time is blocked business-wide')
                  return
                }
                setQError(null)
                setQLoading(true)
                try {
                  await createAppointment(businessSlug!, {
                    serviceId: Number(quickServiceId),
                    providerId: quickProviderId ? Number(quickProviderId) : undefined,
                    startTime: quickStart.toISOString(),
                    customerName: qName,
                    customerEmail: qEmail || undefined,
                    customerPhone: qPhone || undefined,
                    notes: qNotes || undefined,
                  })
                  const api = (calRef.current as any)?.getApi?.()
                  const view = api?.view
                  if (view) {
                    const start = view.currentStart.toISOString()
                    const end = view.currentEnd.toISOString()
                    fetchEvents(start, end)
                    fetchBlocks(start, end)
                  }
                  setQuickOpen(false)
                  try { (calRef.current as any)?.getApi?.().unselect?.() } catch {}
                } catch (e: any) {
                  setQError(e?.message || 'Could not create appointment')
                } finally {
                  setQLoading(false)
                }
              }}
              disabled={qLoading}
            >
              {qLoading ? 'Creating…' : 'Create appointment'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Admin: Business-wide block window modal */}
      <Modal
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
  title="Block time"
        size="lg"
      >
        <div className="grid gap-3">
          <div className="grid md:grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-xs text-gray-600">Start</span>
              <Input type="datetime-local" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-gray-600">End</span>
              <Input type="datetime-local" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} />
            </label>
          </div>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Provider (optional)</span>
            <Select value={blockProviderId} onChange={(e) => setBlockProviderId(e.target.value)}>
              <option value="">All (business-wide)</option>
              {providers.map(p => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Reason (optional)</span>
            <Input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} />
          </label>
          {blockError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{blockError}</div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setBlockOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                const s = new Date(blockStart)
                const e = new Date(blockEnd)
                if (isNaN(s.getTime()) || isNaN(e.getTime())) { setBlockError('Invalid date/time'); return }
                if (e <= s) { setBlockError('End must be after start'); return }
                if (s.getTime() < Date.now()) { setBlockError('Cannot block in the past'); return }
                if (!isWithinWorkHours(s) || !isWithinWorkHours(e)) { setBlockError('Selected time is outside work hours'); return }
                setBlockError(null)
                try {
                  await AdminApi.createTimeOff(businessSlug!, {
                    provider: blockProviderId ? { id: Number(blockProviderId) } : null,
                    startTime: s.toISOString(),
                    endTime: e.toISOString(),
                    reason: blockReason || undefined,
                  })
                  const api = (calRef.current as any)?.getApi?.()
                  const view = api?.view
                  if (view) {
                    const start = view.currentStart.toISOString()
                    const end = view.currentEnd.toISOString()
                    fetchEvents(start, end)
                    fetchBlocks(start, end)
                  }
                  setBlockOpen(false)
                } catch (err: any) {
                  setBlockError(err?.message || 'Failed to block time')
                }
              }}
              >Block</Button>
          </div>
        </div>
      </Modal>

      {/* Reschedule modal for Agenda actions */}
      <Modal
        open={resOpen}
        onClose={() => setResOpen(false)}
        title="Reschedule appointment"
        size="lg"
      >
        <div className="grid gap-3">
          <div className="text-sm text-gray-700">
            {resEvent ? (
              <span>
                {resEvent.title}
                {resEvent.extendedProps?.serviceName ? ` • ${resEvent.extendedProps.serviceName}` : ''}
                {resEvent.extendedProps?.providerName ? ` – ${resEvent.extendedProps.providerName}` : ''}
              </span>
            ) : null}
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-xs text-gray-600">New start</span>
              <Input type="datetime-local" value={resStart} onChange={(e) => setResStart(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-gray-600">Provider (optional)</span>
              <Select value={resProviderId} onChange={(e) => setResProviderId(e.target.value)}>
                <option value="">Keep</option>
                {providers.map(p => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </Select>
            </label>
          </div>
          {resError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{resError}</div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setResOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!resEvent || !resStart) return
                const d = new Date(resStart)
                if (isNaN(d.getTime())) { setResError('Invalid date/time'); return }
                if (d.getTime() < Date.now()) { setResError('Cannot reschedule to past time'); return }
                if (!isWithinWorkHours(d)) { setResError('Selected time is outside work hours'); return }
                if (blockWindows.some(b => b.start <= d && d < b.end)) { setResError('Selected time is blocked business-wide'); return }
                setResError(null)
                try {
                  await rescheduleAppointment(
                    businessSlug!,
                    Number(resEvent.id),
                    d.toISOString(),
                    resProviderId ? Number(resProviderId) : undefined,
                  )
                  const api = (calRef.current as any)?.getApi?.()
                  const view = api?.view
                  if (view) fetchEvents(view.currentStart.toISOString(), view.currentEnd.toISOString())
                  setResOpen(false)
                } catch (e: any) {
                  alert(e?.message || 'Could not reschedule')
                }
              }}
            >Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

type EventItem = {
  id: string
  title: string
  start: string
  end: string
  extendedProps?: any
}

function AgendaView({
  events,
  canEdit,
  onCancel,
  onReschedule,
  blocks,
  onDeleteBlock,
}: {
  events: EventItem[]
  canEdit: boolean
  onCancel: (evt: EventItem) => void
  onReschedule: (evt: EventItem) => void
  blocks?: Array<{ start: Date; end: Date; reason?: string }>
  onDeleteBlock?: (id: number) => void
}) {
  // Group by date, then sort by hour
  const groups = useMemo(() => {
    const byDate = new Map<string, EventItem[]>()
    for (const e of events) {
      const d = new Date(e.start)
      const key = d.toISOString().slice(0, 10)
      const arr = byDate.get(key) || []
      arr.push(e)
      byDate.set(key, arr)
    }
    // Sort each day's events by start
    const entries = Array.from(byDate.entries()).sort(([a],[b]) => a.localeCompare(b))
    return entries.map(([dateStr, items]) => {
      const sorted = items.sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      // Determine hour range from events for compactness
      const minH = Math.min(...sorted.map(e => new Date(e.start).getHours()))
      const maxH = Math.max(...sorted.map(e => new Date(e.end).getHours()))
      const hours: number[] = []
      for (let h = minH; h <= Math.max(minH, maxH); h++) hours.push(h)
      return { dateStr, hours, items: sorted }
    })
  }, [events])

  const fmtDate = (isoDate: string) => {
    try { return new Date(isoDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) } catch { return isoDate }
  }
  const fmtTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // Prepare block list grouped by date
  const blocksByDate = useMemo(() => {
    const arr = (blocks || []).slice().sort((a,b) => a.start.getTime() - b.start.getTime())
    const map = new Map<string, Array<{ start: Date; end: Date; reason?: string }>>()
    for (const b of arr) {
      const key = new Date(b.start).toISOString().slice(0,10)
      const list = map.get(key) || []
      list.push(b)
      map.set(key, list)
    }
    return map
  }, [blocks])

  return (
    <div className="mt-4">
      {groups.length === 0 ? (
        <Card className="p-4 text-sm text-gray-600">No appointments in range.</Card>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.dateStr} className="">
              <div className="text-sm font-semibold text-gray-700 mb-2">{fmtDate(g.dateStr)}</div>
              {/* Business-wide blocks for this date */}
              {(() => {
                const dayBlocks = blocksByDate.get(g.dateStr) || []
                if (!dayBlocks.length) return null
                return (
                  <div className="mb-2 grid gap-1">
                    {dayBlocks.map((b, idx) => (
                      <div key={idx} className="text-xs text-gray-700 border rounded p-2 bg-gray-50 flex items-center justify-between"
                           style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgba(107,114,128,0.20) 0px, rgba(107,114,128,0.20) 12px, rgba(156,163,175,0.20) 12px, rgba(156,163,175,0.20) 24px)' }}>
                        <div>
                          <span className="font-medium">Blocked</span>
                          <span className="ml-2 text-gray-600">{fmtTime(b.start)}–{fmtTime(b.end)}</span>
                          {b.reason ? <span className="ml-2 text-gray-600">• {b.reason}</span> : null}
                        </div>
                        {onDeleteBlock ? (
                          <Button variant="outline" className="h-6 px-2 text-[10px]" onClick={() => onDeleteBlock((b as any).id)}>Delete</Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )
              })()}
              <div className="grid">
                {g.hours.map((h) => {
                  const hourStart = new Date(g.dateStr + 'T' + String(h).padStart(2,'0') + ':00:00')
                  const hourEnd = new Date(g.dateStr + 'T' + String(h).padStart(2,'0') + ':59:59')
                  const inHour = g.items.filter(e => {
                    const s = new Date(e.start)
                    return s >= hourStart && s <= hourEnd
                  })
                  return (
                    <div key={h} className="flex items-start gap-3 py-2 border-b">
                      <div className="w-16 shrink-0 text-xs text-gray-500 pt-1">{fmtTime(hourStart)}</div>
                      <div className="flex flex-col gap-2 w-full">
                        {inHour.length === 0 ? (
                          <div className="text-xs text-gray-400">—</div>
                        ) : inHour.map((e) => (
                          <div key={e.id} className="border rounded p-2 text-xs flex items-center justify-between">
                            <div className="truncate mr-2">
                              <div className="font-medium text-gray-800 truncate">{e.title}</div>
                              <div className="text-gray-500">
                                {e.extendedProps?.providerName || ''}
                                {e.extendedProps?.serviceName ? (
                                  <span className="ml-1 text-gray-500">• {e.extendedProps.serviceName}</span>
                                ) : null}
                                {e.extendedProps?.durationMinutes ? (
                                  <span className="ml-1 text-gray-500">({e.extendedProps.durationMinutes}m)</span>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                              <div className="text-[10px] text-gray-500 whitespace-nowrap">{fmtTime(new Date(e.start))}–{fmtTime(new Date(e.end))}</div>
                              {e.extendedProps?.icsPath ? (
                                <a
                                  href={`${API_BASE}${e.extendedProps.icsPath}`}
                                  className="text-[10px] px-1 py-0.5 rounded bg-white hover:bg-gray-50 border"
                                  title="Download .ics"
                                  onClick={ev => ev.stopPropagation()}
                                >.ics</a>
                              ) : null}
                              {canEdit && (
                                <>
                                  <Button variant="outline" onClick={() => onReschedule(e)} className="h-6 px-2 text-[10px]">Reschedule</Button>
                                  <Button variant="outline" onClick={() => onCancel(e)} className="h-6 px-2 text-[10px]">Cancel</Button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
