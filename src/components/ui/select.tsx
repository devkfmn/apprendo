import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
