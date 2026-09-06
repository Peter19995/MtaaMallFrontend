import { createContext, useState, useEffect, ReactNode } from 'react'
import { getMeRequest, refreshTokenRequest, type UserResponse } from '@api/modules/auth.api'

export type AuthUser = {
  id: string
  name: string
  username: string
  role: string
  roles?: string[]
  email?: string
}

type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  login: (user: AuthUser, accessToken: string, refreshToken: string) => void
  logout: () => void
  hasRole: (role: string) => boolean
  hasPermission: (_permission: string) => boolean
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

type Props = {
  children: ReactNode
}

const AUTH_USER_KEY = 'auth_user'
const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

const clearStoredAuth = () => {
  localStorage.removeItem(AUTH_USER_KEY)
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

const resolveUserRole = (me: Pick<UserResponse, 'is_superuser' | 'roles' | 'permissions'>) => {
  const roles = me.roles ?? []
  const permissions = me.permissions ?? []

  if (roles.includes('root_system_admin') || roles.includes('system_admin')) {
    return {
      role: roles.includes('root_system_admin') ? 'root_system_admin' : 'system_admin',
      roles
    }
  }

  if (roles.length === 0 && permissions.length === 0) {
    return {
      role: 'unassigned',
      roles: []
    }
  }

  return {
    role: roles[0] ?? 'staff',
    roles
  }
}

const toAuthUser = (me: UserResponse): AuthUser => {
  const { role, roles } = resolveUserRole(me)

  return {
    id: String(me.id),
    name: me.full_name?.trim() ? me.full_name : me.username,
    username: me.username,
    role,
    roles,
    email: me.email ?? undefined
  }
}

const persistAuth = (user: AuthUser, accessToken: string, refreshToken?: string | null) => {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)

  if (refreshToken && refreshToken.trim()) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }
}

export const AuthProvider = ({ children }: Props) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const restoreSession = async () => {
      const storedUser = localStorage.getItem(AUTH_USER_KEY)
      const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
      const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)

      if (!storedUser && !storedAccessToken && !storedRefreshToken) {
        if (isMounted) {
          setUser(null)
          setIsLoading(false)
        }
        return
      }

      if (!storedRefreshToken && !storedAccessToken) {
        clearStoredAuth()
        if (isMounted) {
          setUser(null)
          setIsLoading(false)
        }
        return
      }

      try {
        let nextAccessToken = storedAccessToken
        let nextRefreshToken = storedRefreshToken

        if (!nextAccessToken && nextRefreshToken) {
          const refreshed = await refreshTokenRequest({ refresh_token: nextRefreshToken })
          nextAccessToken = refreshed.access_token
          nextRefreshToken = refreshed.refresh_token || nextRefreshToken
        }

        if (!nextAccessToken) {
          throw new Error('No access token available.')
        }

        const me = await getMeRequest(nextAccessToken)
        const nextUser = toAuthUser(me)
        persistAuth(nextUser, nextAccessToken, nextRefreshToken)

        if (isMounted) {
          setUser(nextUser)
        }
      } catch {
        try {
          if (storedRefreshToken) {
            const refreshed = await refreshTokenRequest({ refresh_token: storedRefreshToken })
            const me = await getMeRequest(refreshed.access_token)
            const nextUser = toAuthUser(me)
            persistAuth(nextUser, refreshed.access_token, refreshed.refresh_token || storedRefreshToken)

            if (isMounted) {
              setUser(nextUser)
            }
            return
          }
        } catch {
          clearStoredAuth()
        }

        if (isMounted) {
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void restoreSession()

    return () => {
      isMounted = false
    }
  }, [])

  const login = (nextUser: AuthUser, accessToken: string, refreshToken: string) => {
    persistAuth(nextUser, accessToken, refreshToken)
    setUser(nextUser)
  }

  const logout = () => {
    clearStoredAuth()
    setUser(null)
  }

  const hasRole = (role: string) => {
    if (!user) {
      return false
    }

    return user.role === role || Boolean(user.roles?.includes(role))
  }

  const hasPermission = () => true

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        hasRole,
        hasPermission
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
