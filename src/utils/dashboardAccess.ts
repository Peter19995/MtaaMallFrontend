import type { Principal } from './businessLifecycle'
import { canAccessWorkspace, canonicalDashboardPath } from './experiences'

// Legacy bookmarks receive exactly the new route's permission policy.
export const canAccessDashboard = (user: Principal | null, path: string) =>
  Boolean(user && canAccessWorkspace(user, canonicalDashboardPath(user, path)))
