import { twMerge } from 'tailwind-merge'

// Ligera utilidad de cn compatible con shadcn
export function cn(...inputs: any[]) {
  return twMerge(
    // aplanar y filtrar falsy
    ...inputs
      .flat(Infinity)
      .filter(Boolean)
      .map((x) => (typeof x === 'string' ? x : ''))
  )
}

export function formatMoneyCents(cents: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
    (cents || 0) / 100
  )
}
