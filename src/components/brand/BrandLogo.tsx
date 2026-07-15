import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

type BrandLogoProps = {
  to?: string
  className?: string
  showWordmark?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: { mark: 'size-7', text: 'text-xl' },
  md: { mark: 'size-9', text: 'text-2xl' },
  lg: { mark: 'size-12', text: 'text-3xl' },
} as const

export function BrandLogo({
  to = '/',
  className,
  showWordmark = true,
  size = 'md',
}: BrandLogoProps) {
  const sizes = sizeMap[size]
  const content = (
    <>
      <img
        src="/logo.png"
        alt=""
        width={48}
        height={48}
        className={cn(sizes.mark, 'shrink-0 rounded-[22%]')}
        decoding="async"
      />
      {showWordmark ? (
        <span className={cn('font-display font-bold text-brand', sizes.text)}>Apprendo</span>
      ) : (
        <span className="sr-only">Apprendo</span>
      )}
    </>
  )

  return (
    <Link
      to={to}
      className={cn('inline-flex items-center gap-2.5 no-underline', className)}
      aria-label="Apprendo"
    >
      {content}
    </Link>
  )
}
