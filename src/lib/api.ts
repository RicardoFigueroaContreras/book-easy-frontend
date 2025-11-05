import { API_BASE } from '../config'

export type BusinessConfig = {
  business: {
    slug: string
    name: string
    tz: string
    brandPrimaryColor?: string | null
    logoUrl?: string | null
    bookingPublic?: boolean
    dashboardPublic?: boolean
    dashboardEditable?: boolean
  }
  providers: { id: number; name: string }[]
  services: { id: number; name: string; durationMinutes: number; priceCents: number }[]
}

export type Slot = { start: string; end: string; providerId: number; remaining?: number }

export type AppointmentCreateResponse = { id: number; icsPath?: string }

export async function getPublicConfig(businessSlug: string): Promise<BusinessConfig> {
  const res = await fetch(`${API_BASE}/api/public/${businessSlug}/config`)
  if (!res.ok) throw new Error(`Error fetching config: ${res.status}`)
  return res.json()
}

export async function getAvailability(
  businessSlug: string,
  serviceId: number,
  date: string,
  providerId?: number
): Promise<Slot[]> {
  const q = new URLSearchParams({ serviceId: String(serviceId), date })
  if (providerId) q.set('providerId', String(providerId))
  const res = await fetch(`${API_BASE}/api/public/${businessSlug}/availability?${q.toString()}`)
  if (!res.ok) throw new Error(`Error fetching availability: ${res.status}`)
  const data = await res.json()
  return data.slots as Slot[]
}

export type CreateAppointmentReq = {
  serviceId: number
  providerId?: number
  startTime: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  notes?: string
}

export async function createAppointment(businessSlug: string, body: CreateAppointmentReq): Promise<AppointmentCreateResponse> {
  const res = await fetch(`${API_BASE}/api/public/${businessSlug}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let msg = `Error creating appointment: ${res.status}`
    try {
      const e = await res.json()
      if (e?.error) msg = e.error
    } catch {}
    throw new Error(msg)
  }
  return res.json()
}

export async function cancelAppointment(businessSlug: string, id: number, reason?: string) {
  const res = await fetch(`${API_BASE}/api/public/${businessSlug}/appointments/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  if (!res.ok) {
    let msg = `Error canceling appointment: ${res.status}`
    try { const e = await res.json(); if (e?.error) msg = e.error } catch {}
    throw new Error(msg)
  }
  return res.json()
}

export async function rescheduleAppointment(
  businessSlug: string,
  id: number,
  startTime: string,
  providerId?: number
) {
  const res = await fetch(`${API_BASE}/api/public/${businessSlug}/appointments/${id}/reschedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startTime, providerId }),
  })
  if (!res.ok) {
    let msg = `Error rescheduling appointment: ${res.status}`
    try { const e = await res.json(); if (e?.error) msg = e.error } catch {}
    throw new Error(msg)
  }
  return res.json()
}
