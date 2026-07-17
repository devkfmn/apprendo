import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { adminConsolePath } from '@/lib/adminPath'
import { profileIsAdmin } from '@/lib/utils'

/**
 * Silent hotkey for admins only: Ctrl/Cmd+Shift+A → admin console.
 * Non-admins get no feedback (does not reveal the console).
 */
export function useAdminHotkey() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const canAdmin = profileIsAdmin(profile)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!canAdmin) return
      const modifier = event.ctrlKey || event.metaKey
      if (!modifier || !event.shiftKey) return
      if (event.key.toLowerCase() !== 'a') return
      if (event.altKey) return
      event.preventDefault()
      navigate(adminConsolePath())
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canAdmin, navigate])
}
