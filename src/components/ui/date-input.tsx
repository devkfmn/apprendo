import { useEffect, useId, useRef, useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn, isoToDisplayDate, parseDisplayDate, toDateInputValue } from '@/lib/utils'

type DateInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange' | 'defaultValue'
> & {
  /** Stored value as `yyyy-mm-dd` (or empty). */
  value?: string
  onChange?: (isoDate: string) => void
  onBlur?: InputHTMLAttributes<HTMLInputElement>['onBlur']
}

/**
 * Date field that always displays and accepts `dd/mm/yyyy`.
 * Emits/stores `yyyy-mm-dd` for forms. Includes a native calendar control for picking.
 */
export function DateInput({
  id,
  value = '',
  onChange,
  onBlur,
  className,
  disabled,
  name,
  required,
  ...rest
}: DateInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const pickerRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState(() => isoToDisplayDate(value))
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    setText(isoToDisplayDate(value))
    setInvalid(false)
  }, [value])

  const commitText = (nextText: string) => {
    if (!nextText.trim()) {
      setInvalid(false)
      setText('')
      onChange?.('')
      return
    }
    const iso = parseDisplayDate(nextText)
    if (!iso) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    setText(isoToDisplayDate(iso))
    onChange?.(iso)
  }

  return (
    <div className={cn('relative', className)}>
      <Input
        {...rest}
        id={inputId}
        name={name}
        disabled={disabled}
        required={required}
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        autoComplete="off"
        value={text}
        aria-invalid={invalid || undefined}
        className={cn('pr-10', invalid && 'outline outline-2 outline-offset-2 outline-danger')}
        onChange={(event) => {
          setText(event.target.value)
          setInvalid(false)
        }}
        onBlur={(event) => {
          commitText(event.target.value)
          onBlur?.(event)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commitText((event.target as HTMLInputElement).value)
          }
        }}
      />
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden
        disabled={disabled}
        value={toDateInputValue(value)}
        className="pointer-events-none absolute inset-0 opacity-0"
        onChange={(event) => {
          const iso = event.target.value
          setInvalid(false)
          setText(isoToDisplayDate(iso))
          onChange?.(iso)
        }}
      />
      <button
        type="button"
        disabled={disabled}
        tabIndex={-1}
        aria-label="Kalender öffnen"
        className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded text-ink-muted hover:bg-brand-soft hover:text-brand disabled:opacity-50"
        onClick={() => {
          const el = pickerRef.current
          if (!el) return
          try {
            el.showPicker?.()
          } catch {
            el.click()
          }
        }}
      >
        <Calendar className="size-4" />
      </button>
    </div>
  )
}
