import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type DialogContextValue = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialogContext() {
  const ctx = React.useContext(DialogContext)
  if (!ctx) throw new Error('Dialog components must be used within Dialog')
  return ctx
}

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>
  )
}

type DialogContentProps = React.ComponentProps<'dialog'> & {
  showClose?: boolean
}

const DialogContent = React.forwardRef<HTMLDialogElement, DialogContentProps>(
  ({ className, children, showClose = true, ...props }, ref) => {
    const { open, onOpenChange } = useDialogContext()
    const innerRef = React.useRef<HTMLDialogElement>(null)
    React.useImperativeHandle(ref, () => innerRef.current as HTMLDialogElement)

    React.useEffect(() => {
      const el = innerRef.current
      if (!el) return
      if (open && !el.open) el.showModal()
      if (!open && el.open) el.close()
    }, [open])

    return (
      <dialog
        ref={innerRef}
        className={cn(
          'fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line bg-panel p-6 text-foreground shadow-lg backdrop:bg-black/50',
          className,
        )}
        onClose={() => onOpenChange(false)}
        onClick={(e) => {
          if (e.target === innerRef.current) onOpenChange(false)
        }}
        {...props}
      >
        {children}
        {showClose ? (
          <button
            type="button"
            className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100"
            onClick={() => onOpenChange(false)}
            aria-label="Schliessen"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </dialog>
    )
  },
)
DialogContent.displayName = 'DialogContent'

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.ComponentProps<'h2'>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('text-lg leading-none font-semibold tracking-tight', className)}
      {...props}
    />
  ),
)
DialogTitle.displayName = 'DialogTitle'

const DialogDescription = React.forwardRef<HTMLParagraphElement, React.ComponentProps<'p'>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-ink-muted', className)} {...props} />
  ),
)
DialogDescription.displayName = 'DialogDescription'

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
