import { onAuthStateChanged } from 'firebase/auth'
import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import type { UserProfile } from '@/types/domain'
import { getUserProfile, loginWithEmail, logoutUser } from './api'

export interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  login: (email: string, password: string) => Promise<UserProfile | null>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) {
      setProfile(null)
      return
    }
    setProfile(await getUserProfile(auth.currentUser.uid))
  }, [])

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      // Keep loading true until profile is resolved so RequireAuth never
      // sees "signed in, no profile" and bounces to /forbidden.
      setLoading(true)
      setUser(nextUser)
      try {
        setProfile(nextUser ? await getUserProfile(nextUser.uid) : null)
      } finally {
        setLoading(false)
      }
    })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      login: async (email, password) => {
        setLoading(true)
        try {
          const credential = await loginWithEmail(email, password)
          const nextProfile = await getUserProfile(credential.user.uid)
          setUser(credential.user)
          setProfile(nextProfile)
          return nextProfile
        } finally {
          setLoading(false)
        }
      },
      logout: async () => {
        await logoutUser()
        setUser(null)
        setProfile(null)
      },
      refreshProfile,
    }),
    [loading, profile, refreshProfile, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
