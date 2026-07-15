import { PageHeader } from '@/components/layout/PageHeader'

export function StubPage({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <p className="rounded-lg border border-dashed border-line bg-panel p-6 text-ink-muted">TODO</p>
    </>
  )
}
