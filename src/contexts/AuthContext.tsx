import { createContext, useState, useEffect, ReactNode } from 'react'
import { getMeRequest, logoutRequest, type UserResponse } from '@api/modules/auth.api'
import { hasNamedPermission } from '../utils/authorization'
import { authorizationFingerprint } from '../utils/authorization'
import { useQueryClient } from '@tanstack/react-query'
import { setActiveApiContext } from '@api/config/axios.config'
import axios from 'axios'

export type AuthUser = {
  identity?: UserResponse['identity']
  selected_context?: string
  customer_profile?: UserResponse['customer_profile']
  workspaces?: UserResponse['workspaces']
  membership_id?: number | null
  platform_permissions?: string[]
  business_permissions?: string[]
  business_id?: string | null
  business_status?: UserResponse['business_status']
  business_capabilities?: UserResponse['business_capabilities']
  branch_scope?: UserResponse['branch_scope']
  allowed_branch_ids?: number[]
  context?: string
  business_memberships?: UserResponse['business_memberships']
  platform_memberships?: UserResponse['platform_memberships']
  id: string
  name: string
  username: string
  role: string
  roles?: string[]
  permissions?: string[]
  email?: string
  phone?: string
}

type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  login: (user: AuthUser, accessToken: string, refreshToken: string) => void
  logout: () => void
  refreshIdentity: () => Promise<AuthUser>
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
  setActiveApiContext(null)
  localStorage.removeItem(AUTH_USER_KEY)
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export const toAuthUser = (me: UserResponse): AuthUser => {
  const roles = me.roles ?? []

  return {
    identity: me.identity,
    selected_context: me.selected_context ?? me.context,
    customer_profile: me.customer_profile,
    workspaces: me.workspaces ?? [],
    membership_id: me.membership_id,
    platform_permissions: me.platform_permissions ?? [],
    business_permissions: me.business_permissions ?? [],
    business_id: me.business_id,
    business_status: me.business_status,
    business_capabilities: me.business_capabilities ?? {},
    branch_scope: me.branch_scope,
    allowed_branch_ids: me.allowed_branch_ids ?? [],
    context: me.selected_context ?? me.context,
    business_memberships: me.business_memberships ?? [],
    platform_memberships: me.platform_memberships ?? [],
    id: String(me.id),
    name: me.full_name?.trim() ? me.full_name : me.username,
    username: me.username,
    role: roles[0] ?? 'unassigned',
    roles,
    permissions: me.permissions ?? [],
    email: me.email ?? undefined,
    phone: me.phone ?? undefined
  }
}


const persistAuth = (user: AuthUser) => {
  if (user.context) setActiveApiContext(user.context)
  // Keep authority in memory only. This marker restores the server session;
  // /users/me remains the source of roles and permissions after every reload.
  localStorage.setItem(AUTH_USER_KEY, user.id)
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export const AuthProvider = ({ children }: Props) => {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if ((event.key === 'auth_context' || event.key === AUTH_USER_KEY) && event.oldValue !== event.newValue) {
        queryClient.clear()
        // Re-read server authority before rendering another tab's new context.
        window.location.reload()
      }
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [queryClient])
  const refreshIdentity = async () => {
    const next = toAuthUser(await getMeRequest())
    persistAuth(next); setUser(next); return next
  }
  useEffect(() => {
    let mounted = true
    localStorage.removeItem(ACCESS_TOKEN_KEY); localStorage.removeItem(REFRESH_TOKEN_KEY)
    if (!localStorage.getItem(AUTH_USER_KEY)) { setIsLoading(false); return }
    getMeRequest().then(me => {
      if (mounted) { const next = toAuthUser(me); persistAuth(next); setUser(next) }
    }).catch((error) => {
      // A 403 belongs to the selected workspace and is handled by the API
      // interceptor. Only a failed identity session signs the person out.
      if (mounted && axios.isAxiosError(error) && error.response?.status === 401) {
        clearStoredAuth(); setUser(null)
      }
    })
      .finally(() => { if (mounted) setIsLoading(false) })
    return () => { mounted = false }
  }, [])
  useEffect(() => {
    if (!user) return
    let disposed = false
    const check = async () => {
      try {
        const next = toAuthUser(await getMeRequest())
        if (!disposed && authorizationFingerprint(next) !== authorizationFingerprint(user)) {
          queryClient.clear(); persistAuth(next); setUser(next)
        }
      } catch (error) {
        if (!disposed && axios.isAxiosError(error) && error.response?.status === 401) {
          queryClient.clear(); clearStoredAuth(); setUser(null)
        }
      }
    }
    const interval = window.setInterval(check, 30000)
    window.addEventListener('focus', check)
    return () => { disposed = true; window.clearInterval(interval); window.removeEventListener('focus', check) }
  }, [user, queryClient])
  const login = (next: AuthUser, _accessToken: string, _refreshToken: string) => {
    queryClient.clear(); persistAuth(next); setUser(next)
  }
  const logout = () => {
    void logoutRequest().finally(() => { queryClient.clear(); clearStoredAuth(); setUser(null); window.location.assign('/login') })
  }
  const hasPermission = (permission: string) => hasNamedPermission(user, permission)
  return <AuthContext.Provider value={{ user, isLoading, login, logout, refreshIdentity, hasPermission }}>{children}</AuthContext.Provider>
}
