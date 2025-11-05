import * as React from 'react'
import { cn } from '../../lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'border border-gray-300 rounded-md px-3 h-10 text-sm w-full focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-sky-300 focus:border-sky-400',
          className
        )}
        {...props}
      />
    )
  }
)
Select.displayName = 'Select'
