export function AppLoadingScreen({ label = 'Apprendo wird geladen…' }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center px-5">
      <div className="flex flex-col items-center gap-4 text-center">
        <img
          src="/logo.png"
          alt="Apprendo"
          width={72}
          height={72}
          className="size-16 animate-pulse rounded-[22%]"
        />
        <p className="font-display text-2xl font-bold text-brand">Apprendo</p>
        <p className="text-sm text-ink-muted">{label}</p>
      </div>
    </div>
  )
}
