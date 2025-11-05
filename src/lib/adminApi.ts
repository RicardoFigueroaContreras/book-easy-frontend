import { API_BASE } from '../config'
import { bearerAuthHeader, clearTokens, setAccessToken } from './adminAuth'

async function refreshAccessToken() {
  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Refresh failed')
  const data = await res.json()
  setAccessToken(data.accessToken)
  return data
}

async function req(path: string, init?: RequestInit) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(bearerAuthHeader() || {}),
    ...(init?.headers || {} as any)
  }
  let res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (res.status === 401) {
    try {
      await refreshAccessToken()
      const retryHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        ...(bearerAuthHeader() || {}),
        ...(init?.headers || {} as any)
      }
      res = await fetch(`${API_BASE}${path}`, { ...init, headers: retryHeaders })
    } catch (e) {
      clearTokens()
      throw e
    }
  }
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`
    try { const e = await res.json(); if (e?.error) msg = e.error } catch {}
    throw new Error(msg)
  }
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return res.json()
  return res.text()
}

export const AdminApi = {
  // Services
  listServices: (slug: string) => req(`/api/admin/${slug}/services`),
  createService: (slug: string, body: any) => req(`/api/admin/${slug}/services`, { method: 'POST', body: JSON.stringify(body) }),
  updateService: (slug: string, id: number, body: any) => req(`/api/admin/${slug}/services/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteService: (slug: string, id: number) => req(`/api/admin/${slug}/services/${id}`, { method: 'DELETE' }),

  // Providers
  listProviders: (slug: string) => req(`/api/admin/${slug}/providers`),
  createProvider: (slug: string, body: any) => req(`/api/admin/${slug}/providers`, { method: 'POST', body: JSON.stringify(body) }),
  updateProvider: (slug: string, id: number, body: any) => req(`/api/admin/${slug}/providers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProvider: (slug: string, id: number) => req(`/api/admin/${slug}/providers/${id}`, { method: 'DELETE' }),
  rotateProviderIcsToken: (slug: string, id: number) => req(`/api/admin/${slug}/providers/${id}/rotate-ics-token`, { method: 'POST' }),

  // Work hours
  listWorkHours: (slug: string) => req(`/api/admin/${slug}/work-hours`),
  createWorkHours: (slug: string, body: any) => req(`/api/admin/${slug}/work-hours`, { method: 'POST', body: JSON.stringify(body) }),
  deleteWorkHours: (slug: string, id: number) => req(`/api/admin/${slug}/work-hours/${id}`, { method: 'DELETE' }),

  // Time off (absences)
  listTimeOff: (slug: string) => req(`/api/admin/${slug}/time-off`),
  createTimeOff: (slug: string, body: any) => req(`/api/admin/${slug}/time-off`, { method: 'POST', body: JSON.stringify(body) }),
  deleteTimeOff: (slug: string, id: number) => req(`/api/admin/${slug}/time-off/${id}`, { method: 'DELETE' }),

  // Customers
  listCustomers: (slug: string, q?: string, page?: number, size?: number, sort?: string) => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (page != null) params.set('page', String(page))
    if (size != null) params.set('size', String(size))
    if (sort) params.set('sort', sort)
    const qs = params.toString()
    return req(`/api/admin/${slug}/customers${qs ? `?${qs}` : ''}`)
  },
  getCustomer: (slug: string, id: number) => req(`/api/admin/${slug}/customers/${id}`),
  updateCustomer: (slug: string, id: number, body: any) => req(`/api/admin/${slug}/customers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCustomer: (slug: string, id: number) => req(`/api/admin/${slug}/customers/${id}`, { method: 'DELETE' }),
  getCustomerAppointmentCount: (slug: string, id: number) => req(`/api/admin/${slug}/customers/${id}/appointment-count`),
  getCustomerAppointmentCounts: (slug: string, ids: number[]) => req(`/api/admin/${slug}/customers/appointment-counts`, { method: 'POST', body: JSON.stringify({ ids }) }),

  // Reports
  getReport: (slug: string, from: string, to: string) => req(`/api/admin/${slug}/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),

  // Appointment status
  setAppointmentStatus: (slug: string, id: number, status: string, note?: string) => req(`/api/admin/${slug}/appointments/${id}/status`, { method: 'POST', body: JSON.stringify({ status, note }) }),

  // Settings
  getSettings: (slug: string) => req(`/api/admin/${slug}/settings`),
  updateSettings: (slug: string, body: any) => req(`/api/admin/${slug}/settings`, { method: 'PUT', body: JSON.stringify(body) }),

  // Staff
  listStaff: (slug: string) => req(`/api/admin/${slug}/staff`),
  inviteStaff: (slug: string, body: any, baseUrl?: string) => req(`/api/admin/${slug}/staff/invite`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: baseUrl ? { 'X-Base-Url': baseUrl } : undefined,
  }),
  activateStaff: (slug: string, id: number) => req(`/api/admin/${slug}/staff/${id}/activate`, { method: 'POST' }),
  deactivateStaff: (slug: string, id: number) => req(`/api/admin/${slug}/staff/${id}/deactivate`, { method: 'POST' }),
  resendInvite: (slug: string, id: number, baseUrl?: string) => req(`/api/admin/${slug}/staff/${id}/resend-invite`, {
    method: 'POST',
    headers: baseUrl ? { 'X-Base-Url': baseUrl } : undefined,
  }),
}

export function providerIcsUrl(slug: string, providerId: number, token: string) {
  return `${API_BASE}/api/public/${slug}/providers/${providerId}/ics?token=${encodeURIComponent(token)}`
}
