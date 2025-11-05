import * as React from 'react'
import { cn } from '../../lib/utils'

export function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn('h-4 bg-gray-200 rounded animate-pulse', className)} />
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="divide-y card">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="py-3">
          <div className="space-y-2">
            <SkeletonLine className="w-1/3" />
            <SkeletonLine className="w-1/2" />
          </div>
        </li>
      ))}
    </ul>
  )
}
