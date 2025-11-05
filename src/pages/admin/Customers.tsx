import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AdminApi } from '../../lib/adminApi'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { SkeletonRows } from '../../components/ui/skeleton'
import { Modal } from '../../components/ui/modal'
import { useToast } from '../../components/ui/toaster'

type Customer = { id: number; name: string; email?: string; phone?: string }

export default function CustomersPage() {
  const { businessSlug = 'barber-demo' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<Customer[]>([])
  const [q, setQ] = useState(searchParams.get('q') || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [blockedDelete, setBlockedDelete] = useState<Customer | null>(null)
  const [searchTick, setSearchTick] = useState(0)
  const [page, setPage] = useState(Number(searchParams.get('page') || 0))
  const [size, setSize] = useState(Number(searchParams.get('size') || 20))
  const [total, setTotal] = useState(0)
  const [sort, setSort] = useState(searchParams.get('sort') || 'name,asc')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
  const data = await AdminApi.listCustomers(businessSlug, q, page, size, sort)
  const arr = (data?.items ?? data) as Customer[]
  setItems(arr)
  setTotal(Number(data?.total ?? arr.length))
      // Fetch appointment counts in batch for visible customers
      try {
        const ids = arr.map(c => c.id)
        if (ids.length) {
          const res = await AdminApi.getCustomerAppointmentCounts(businessSlug, ids)
          const map: Record<number, number> = {}
          const obj = (res?.counts || {}) as Record<string, number>
          Object.keys(obj).forEach(k => { map[Number(k)] = Number(obj[k] || 0) })
          setCounts(map)
        } else {
          setCounts({})
        }
      } catch {}
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
      toast({ title: 'Failed to load customers', description: e?.message, variant: 'error' })
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [businessSlug, page, size, sort])

  // Debounced search: trigger load shortly after typing stops
  useEffect(() => {
    const t = setTimeout(() => {
      // Reset to first page when query changes
      setPage(0)
      setSearchTick((x) => x + 1)
      load()
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  // Persist q/page/size/sort to URL
  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (q) next.set('q', q); else next.delete('q')
    next.set('page', String(page))
    next.set('size', String(size))
    if (sort) next.set('sort', sort); else next.delete('sort')
    setSearchParams(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page, size, sort])

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Customers</h1>
      <Card>
        <div className="flex gap-3 items-end flex-wrap">
          <Input placeholder="Search by name/email" value={q} onChange={e => setQ(e.target.value)} className="max-w-sm" />
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Page size</span>
            <Select value={String(size)} onChange={(e) => { setPage(0); setSize(parseInt(e.target.value, 10) || 20) }}>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </Select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-gray-600">Sort</span>
            <Select value={sort} onChange={(e) => { setPage(0); setSort(e.target.value) }}>
              <option value="name,asc">Name · A→Z</option>
              <option value="name,desc">Name · Z→A</option>
              <option value="id,desc">Newest first</option>
              <option value="id,asc">Oldest first</option>
            </Select>
          </label>
          <Button variant="outline" onClick={load}>Search</Button>
        </div>
      </Card>
      <div className="flex items-center justify-between text-xs text-gray-600">
        <div>
          Showing {items.length ? (page * size + 1) : 0}-{page * size + items.length} of {total}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page<=0} onClick={() => setPage(p => Math.max(0, p-1))}>Prev</Button>
          <Button variant="outline" size="sm" disabled={(page+1)*size >= total} onClick={() => setPage(p => p+1)}>Next</Button>
        </div>
      </div>
      {loading ? (
        <div className="card"><SkeletonRows rows={5} /></div>
      ) : error ? (
        <div className="card text-red-600 p-3">{error}</div>
      ) : (
        <ul className="divide-y card">
          {items.map(c => (
            <li key={c.id} className="py-3 px-3 md:px-4 flex items-center justify-between">
              <div>
                <div className="font-medium flex items-center gap-2">
                  <span>{c.name}</span>
                  {counts[c.id] > 0 ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 border border-yellow-200" title={`${counts[c.id]} appointment(s)`}>
                      {counts[c.id]} appt
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-gray-600">{c.email} {c.phone}</div>
              </div>
              <div className="flex items-center gap-3">
                <Link className="underline" to={`/admin/${businessSlug}/customers/${c.id}`}>View</Link>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={deletingId === c.id}
                  onClick={() => {
                    if (counts[c.id] > 0) setBlockedDelete(c)
                    else setConfirmDelete(c)
                  }}
                  title={counts[c.id] > 0 ? `Warning: ${counts[c.id]} appointment(s) exist. You cannot delete until they are removed.` : undefined}
                >
                  {deletingId === c.id ? 'Deleting…' : 'Delete'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Delete blocked info modal */}
      <Modal open={!!blockedDelete} onClose={() => setBlockedDelete(null)} title="Cannot delete this customer">
        <p className="text-sm text-gray-700">
          {blockedDelete?.name} has existing appointments. You must cancel or remove those appointments before deleting the customer.
        </p>
        <div className="mt-2 text-xs text-gray-600">
          Tip: Open the dashboard filtered by this customer to review all appointments quickly.
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setBlockedDelete(null)}>Close</Button>
          {blockedDelete && (
            <a
              className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm bg-black text-white hover:opacity-90"
              href={`/${businessSlug}/dashboard?customerId=${encodeURIComponent(String(blockedDelete.id))}`}
              onClick={() => setBlockedDelete(null)}
            >
              Open Dashboard
            </a>
          )}
        </div>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete customer?">
        <p className="text-sm text-gray-600">This will permanently remove {confirmDelete?.name}. This action cannot be undone.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button onClick={async () => {
            if (!confirmDelete || !businessSlug) return
            const target = confirmDelete
            setDeletingId(target.id)
            setConfirmDelete(null)
            const prev = items
            setItems(prev.filter(x => x.id !== target.id))
            try {
              await AdminApi.deleteCustomer(businessSlug, target.id)
              toast({ title: 'Customer deleted', variant: 'success' })
            } catch (e: any) {
              setItems(prev) // restore
              const msg = e?.message || 'Failed to delete customer'
              toast({ title: 'Failed to delete', description: msg, variant: 'error' })
            } finally {
              setDeletingId(null)
            }
          }}>Delete</Button>
        </div>
      </Modal>
    </div>
  )
}
