import { useAuth } from './useAuth'
import { canonicalDashboardPath } from '../utils/experiences'

/** Shared operational screens link into the currently selected experience. */
export function useWorkspacePath() {
  const { user } = useAuth()
  return (path: string) => canonicalDashboardPath(user ?? {}, path)
}
