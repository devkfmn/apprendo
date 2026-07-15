import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-24 w-full rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        className,
      )}
      {...props}
    />
  )
})
