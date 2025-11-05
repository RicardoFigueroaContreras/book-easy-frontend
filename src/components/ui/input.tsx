import * as React from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'border border-gray-300 rounded-md px-3 h-10 text-sm w-full focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-sky-300 focus:border-sky-400',
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'
