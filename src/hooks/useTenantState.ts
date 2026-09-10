import { useQuery } from '@tanstack/react-query'
import { getMeRequest } from '@api/modules/auth.api'
import { useAuth } from './useAuth'

export const useTenantState = () => {
  const { user } = useAuth()
  return useQuery({ queryKey: ['tenant-state', user?.id, user?.context], queryFn: () => getMeRequest(),
    enabled: Boolean(user?.permissions?.includes('self.profile.read')), staleTime: 10000,
    refetchInterval: 30000, refetchOnWindowFocus: true, retry: 1 })
}
