import { Outlet } from 'react-router-dom'
import { useAdminHotkey } from '@/features/admin/useAdminHotkey'

export function RootLayout() {
  useAdminHotkey()
  return <Outlet />
}
