import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Toast, type ToastVariant } from './toast'

export type ToastItem = {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
}

type ToastContextType = {
  toast: (t: Omit<ToastItem, 'id'> & { id?: string; durationMs?: number }) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((t: Omit<ToastItem, 'id'> & { id?: string; durationMs?: number }) => {
    const id = t.id ?? Math.random().toString(36).slice(2)
    const item: ToastItem = { id, title: t.title, description: t.description, variant: t.variant }
    setItems((prev) => [...prev, item])
    const duration = t.durationMs ?? 3500
    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id))
    }, duration)
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
        {items.map((i) => (
          <Toast key={i.id} title={i.title} description={i.description} variant={i.variant} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
