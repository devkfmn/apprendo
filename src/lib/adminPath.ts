/**
 * Unlisted admin console path. Not linked in navigation.
 * Override with VITE_ADMIN_PATH (segment only, e.g. `ops` → `/ops`).
 */
export function adminConsolePath(): string {
  const raw = (import.meta.env.VITE_ADMIN_PATH as string | undefined)?.trim() || 'ops'
  const segment = raw.replace(/^\/+|\/+$/g, '') || 'ops'
  return `/${segment}`
}

export function isAdminConsolePath(pathname: string): boolean {
  const base = adminConsolePath()
  return pathname === base || pathname.startsWith(`${base}/`)
}
