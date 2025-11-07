import { useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'
import { useToast } from '../../components/ui/toaster'
import { createAppointment, getAvailability, getPublicConfig, type Slot } from '../../lib/api'
import { getAccessToken, parseJwtClaims } from '../../lib/adminAuth'

type Service = { id: number; name: string; durationMinutes: number; priceCents: number }
// Service enriched with buffers when coming from API
type ServiceWithBuffer = Service & { bufferBefore?: number; bufferAfter?: number }
type Provider = { id: number; name: string }

const STRINGS: Record<string, { title: string; welcome: string; service: string; provider: string; date: string; noAvail: string; confirm: string; serviceAvail: string; providerAvail: (name?: string) => string }> = {
  es: {
    title: 'Reserva',
    welcome: 'Reserva tu cita',
    service: 'Servicio',
    provider: 'Profesional (opcional)',
    date: 'Fecha',
    noAvail: 'No hay disponibilidad',
    confirm: 'Confirmar',
    serviceAvail: 'Horarios disponibles',
    providerAvail: (name?: string) => `Horarios disponibles de ${name || 'profesional'}`,
  },
  en: {
    title: 'Booking',
    welcome: 'Book your appointment',
    service: 'Service',
    provider: 'Provider (optional)',
    date: 'Date',
    noAvail: 'No availability',
    confirm: 'Confirm',
    serviceAvail: 'Available times',
    providerAvail: (name?: string) => `Available times (${name || 'provider'})`,
  },
}

export default function Booking() {
  const { businessSlug = 'barber-demo' } = useParams()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [configLoading, setConfigLoading] = useState(true)
  const [services, setServices] = useState<ServiceWithBuffer[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [serviceId, setServiceId] = useState<number | ''>('')
  const [providerId, setProviderId] = useState<number | ''>('')
  const [date, setDate] = useState('')
  const [slotsAll, setSlotsAll] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successId, setSuccessId] = useState<number | null>(null)
  const [locale, setLocale] = useState<string>('en')
  const [themeColor, setThemeColor] = useState<string>('')
  const [bizTexts, setBizTexts] = useState<{ welcome?: string | null; instructions?: string | null; logoUrl?: string | null } | null>(null)
  const [bookingPublic, setBookingPublic] = useState<boolean>(true)
  const [bizTz, setBizTz] = useState<string | undefined>(undefined)
  const embed = searchParams.get('embed') === '1'

  function formatPrice(cents?: number) {
    if (cents == null) return ''
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100)
    } catch {
      return `$${(cents / 100).toFixed(2)}`
    }
  }

  // Load public config (services, providers)
  useEffect(() => {
    // remember last used business slug for redirects from bare routes
    try { localStorage.setItem('lastBusinessSlug', businessSlug) } catch {}
    let mounted = true
    setConfigLoading(true)
    getPublicConfig(businessSlug)
      .then((c) => {
        if (!mounted) return
  setServices(c.services as any)
        setProviders(c.providers as any)
        setBizTexts({
          welcome: (c.business as any)?.publicWelcomeText,
          instructions: (c.business as any)?.bookingInstructions,
          logoUrl: (c.business as any)?.logoUrl,
        })
        setBookingPublic(Boolean((c.business as any)?.bookingPublic ?? true))
        setBizTz((c.business as any)?.tz)
    const requestedLang = searchParams.get('lang') || undefined
    const defLocale = (c.business as any)?.defaultLocale || 'en'
        const lang = (requestedLang || defLocale).split('-')[0]
        setLocale(lang)
        const color = searchParams.get('color') || (c.business as any)?.brandPrimaryColor || '#0ea5e9'
        setThemeColor(String(color))
        document.documentElement.style.setProperty('--brand-primary', String(color))
        const seoTitle = (c.business as any)?.seoTitle || `${(c.business as any)?.name || ''} – ${STRINGS[lang]?.title || 'Booking'}`
        const seoDesc = (c.business as any)?.seoDescription || (STRINGS[lang]?.welcome || '')
        document.title = seoTitle
        let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
        if(!meta){ meta = document.createElement('meta'); meta.setAttribute('name','description'); document.head.appendChild(meta) }
        meta!.setAttribute('content', seoDesc)
      })
      .catch((e) => setError((e as any)?.message || String(e)))
      .finally(() => setConfigLoading(false))
    return () => {
      mounted = false
    }
  }, [businessSlug])

  // Load availability when criteria change
  useEffect(() => {
    setSelectedSlot(null)
    if (!serviceId || !date) {
      setSlotsAll([])
      return
    }
    let mounted = true
    ;(async () => {
      try {
        if (providerId) {
          const filtered = await getAvailability(businessSlug, Number(serviceId), date, Number(providerId))
          if (mounted) { setSlotsAll(filtered) }
        } else {
          const all = await getAvailability(businessSlug, Number(serviceId), date, undefined)
          if (mounted) { setSlotsAll(all) }
        }
      } catch (e: any) {
        if (mounted) setError(e.message)
      }
    })()
    return () => {
      mounted = false
    }
  }, [businessSlug, serviceId, providerId, date])

  const handleConfirm = async () => {
    setError(null)
    setSuccessId(null)
    if (!serviceId || !selectedSlot || !customerName) {
      setError('Select a service, a time slot, and enter customer name')
      return
    }
    setLoading(true)
    try {
      const res = await createAppointment(businessSlug, {
        serviceId: Number(serviceId),
        providerId: selectedSlot.providerId,
        startTime: selectedSlot.start,
        customerName,
        customerEmail,
        customerPhone,
        notes,
      })
      setSuccessId(res.id)
      toast({ title: 'Appointment created', description: `ID #${res.id}`, variant: 'success' })
    } catch (e: any) {
      const msg = e.message || 'Could not create appointment'
      setError(msg)
      toast({ title: 'Failed to create appointment', description: msg, variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Flat lists to render side-by-side (time • provider)
  const provNameById = useMemo(() => new Map(providers.map(p => [p.id, p.name])), [providers])
  const flatSlotsAll = useMemo(() => {
    return [...slotsAll]
      .sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .map(s => ({
        ...s,
        timeLabel: new Date(s.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: bizTz || undefined }),
        providerName: provNameById.get(s.providerId),
      }))
  }, [slotsAll, provNameById, bizTz])

  const selectedService = useMemo(() => services.find(s => s.id === Number(serviceId)), [services, serviceId])
  const totalMinutes = (selectedService?.durationMinutes || 0) + (selectedService?.bufferBefore || 0) + (selectedService?.bufferAfter || 0)

  // Determine if an authenticated staff member for this business is present (bypass private)
  const isStaffHere = (() => {
    const token = getAccessToken()
    const claims = parseJwtClaims(token)
    const role = (claims?.role || claims?.claims?.role) as string | undefined
    const biz = (claims?.biz || claims?.claims?.biz) as string | undefined
    if (!role || !biz) return false
    return biz === businessSlug
  })()

  const disabledForm = !bookingPublic && !isStaffHere

  return (
    <div className={embed ? '' : 'max-w-3xl'}>
      <div className={embed ? '' : 'card p-6'}>
        {bizTexts?.logoUrl && !embed && (
          <img src={bizTexts.logoUrl} alt="logo" className="h-10 mb-3" />
        )}
        <h1 className="text-2xl font-semibold mb-2 text-brand">
          {bizTexts?.welcome || STRINGS[locale]?.welcome || 'Book your appointment'}
        </h1>
        {!embed && (
          <p className="text-sm text-gray-600 mb-4">{bizTexts?.instructions || 'Select a service, choose a time, and confirm your details.'}</p>
        )}
        {!embed && <p className="text-xs text-gray-500 mb-6">Business: {businessSlug}</p>}

      {!bookingPublic && !isStaffHere && (
        <div className="mb-4 text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded p-3">
          This booking page is private for this business.
          <div className="mt-2">
              <a href={`/login`} className="underline">Staff sign in</a>
          </div>
        </div>
      )}
        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3" aria-live="polite">{error}</div>
        )}
        {successId && (
          <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3" aria-live="polite">
            Appointment created! ID #{successId}
          </div>
        )}

        <div className="grid gap-4" aria-disabled={disabledForm}>
          {disabledForm ? (
            <div className="text-sm text-gray-600">Booking is disabled; staff may sign in to manage appointments.</div>
          ) : null}
          <label className="grid gap-1">
            <span className="text-sm">{STRINGS[locale]?.service || 'Service'}</span>
            <Select
              value={serviceId as any}
              onChange={(e) => setServiceId((e.target as HTMLSelectElement).value ? Number((e.target as HTMLSelectElement).value) : '')}
              disabled={configLoading || disabledForm}
            >
              <option value="">Select a service</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({(s.durationMinutes + (s.bufferBefore || 0) + (s.bufferAfter || 0))} min)
                </option>
              ))}
            </Select>
            {selectedService && (
              <span className="text-xs text-gray-500">Duration: {selectedService.durationMinutes} min · Buffers: {(selectedService.bufferBefore||0)}/{(selectedService.bufferAfter||0)} min · Total: {totalMinutes} min {selectedService?.priceCents ? `· ${formatPrice(selectedService.priceCents)}` : ''}</span>
            )}
          </label>

          <label className="grid gap-1">
            <span className="text-sm">{STRINGS[locale]?.provider || 'Provider (optional)'}</span>
            <Select
              value={providerId as any}
              onChange={(e) => setProviderId((e.target as HTMLSelectElement).value ? Number((e.target as HTMLSelectElement).value) : '')}
              disabled={configLoading || disabledForm}
            >
              <option value="">Any</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm">{STRINGS[locale]?.date || 'Date'}</span>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={disabledForm}
            />
          </label>

          {date && serviceId && (
            <div className="grid gap-2">
              <span className="text-sm">{STRINGS[locale]?.serviceAvail || 'Available times'}</span>
              {flatSlotsAll.length === 0 ? (
                <span className="text-sm text-gray-500">{STRINGS[locale]?.noAvail || 'No availability'}</span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {flatSlotsAll.map((s) => (
                    <button
                      key={'all:' + s.start + ':' + s.providerId}
                      type="button"
                      onClick={() => setSelectedSlot(s)}
                      className={`h-8 px-3 rounded-full border text-xs transition-colors ${
                        selectedSlot?.start === s.start && selectedSlot?.providerId === s.providerId
                          ? 'bg-brand text-white border-brand'
                          : 'bg-white hover:bg-gray-50 border-gray-300'
                      }`}
                      title={typeof s.remaining === 'number' ? (locale==='es' ? (s.remaining===1? 'Queda 1 cupo' : `Quedan ${s.remaining} cupos`) : (s.remaining===1? '1 spot left' : `${s.remaining} spots left`)) : undefined}
                      disabled={disabledForm}
                    >
                      {s.timeLabel}{!providerId && s.providerName ? ` • ${s.providerName}` : ''}
                      {typeof s.remaining === 'number' ? (
                        <span className="ml-2 text-[10px] text-gray-500">{locale==='es' ? `${s.remaining} cupo${s.remaining===1?'':'s'}` : `${s.remaining} spot${s.remaining===1?'':'s'}`}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <hr className="my-2 border-gray-200" />
          <div className="grid gap-2 md:grid-cols-3">
            <label className="grid gap-1">
              <span className="text-sm">Name</span>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={disabledForm}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Email</span>
              <Input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                disabled={disabledForm}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Phone</span>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                disabled={disabledForm}
              />
            </label>
          </div>

          <label className="grid gap-1">
            <span className="text-sm">Notes</span>
            <Textarea
              className="min-h-[80px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={disabledForm}
            />
          </label>

          {selectedSlot && typeof selectedSlot.remaining === 'number' && (
            <div className="text-xs text-gray-600 -mt-2 mb-1">
              {locale==='es' ? (selectedSlot.remaining===1? 'Queda 1 cupo para este horario' : `Quedan ${selectedSlot.remaining} cupos para este horario`) : (selectedSlot.remaining===1? '1 spot left for this time' : `${selectedSlot.remaining} spots left for this time`) }
            </div>
          )}
          <div>
            <Button onClick={handleConfirm} disabled={disabledForm || loading || !serviceId || !date || !selectedSlot || !customerName} className="w-full md:w-auto">
              {loading ? 'Creating…' : (STRINGS[locale]?.confirm || 'Confirm')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
