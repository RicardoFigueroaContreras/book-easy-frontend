import React from 'react'
import { cn } from '../../lib/utils'

export type ToastVariant = 'info' | 'success' | 'error'

export function Toast({
  title,
  description,
  variant = 'info',
  onClose,
}: {
  title: string
  description?: string
  variant?: ToastVariant
  onClose?: () => void
}) {
  const color =
    variant === 'success'
      ? 'bg-green-50 border-green-200 text-green-800'
      : variant === 'error'
      ? 'bg-red-50 border-red-200 text-red-800'
      : 'bg-sky-50 border-sky-200 text-sky-800'

  return (
    <div className={cn('w-80 rounded-md border p-3 shadow-sm', color)} role="status">
      <div className="font-medium text-sm">{title}</div>
      {description && <div className="text-xs mt-1 opacity-90">{description}</div>}
      {onClose && (
        <button className="mt-2 text-xs underline" onClick={onClose} aria-label="Cerrar">
          Cerrar
        </button>
      )}
    </div>
  )
}
