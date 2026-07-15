import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        className,
      )}
      {...props}
    />
  )
}
