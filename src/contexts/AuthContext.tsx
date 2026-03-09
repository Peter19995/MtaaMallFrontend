import { createContext, useState, useEffect, ReactNode } from 'react'

export type AuthUser = {
  id: string
  name: string
  role: string
  roles?: string[]
  email: string
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

export const AuthProvider = ({ children }: Props) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('auth_user')
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as AuthUser
        if (parsedUser?.id && parsedUser?.email) {
          setUser(parsedUser)
        } else {
          localStorage.removeItem('auth_user')
        }
      } catch {
        localStorage.removeItem('auth_user')
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
      }
    }
    setIsLoading(false)
  }, [])

  const login = (nextUser: AuthUser, accessToken: string, refreshToken: string) => {
    localStorage.setItem('auth_user', JSON.stringify(nextUser))
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    setUser(nextUser)
  }

  const logout = () => {
    localStorage.removeItem('auth_user')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
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
