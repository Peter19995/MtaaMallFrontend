import type { BusinessStatus } from '../api/modules/businesses.api'
import { hasNamedPermission } from './authorization'
import { workspaceLanding, type WorkspacePrincipal } from './experiences'

export const statusLabels: Record<BusinessStatus, string> = {
  draft: 'Draft', pending_verification: 'Pending verification', active: 'Active',
  suspended: 'Suspended', rejected: 'Rejected', closed: 'Closed'
}
export const transitions: Record<BusinessStatus, BusinessStatus[]> = {
  draft: ['pending_verification'], pending_verification: ['active', 'rejected'],
  active: ['suspended', 'closed'], suspended: ['active', 'closed'], rejected: ['draft'], closed: []
}
const transitionPermission: Record<BusinessStatus, string> = {
  draft: 'platform.businesses.review', pending_verification: 'platform.businesses.review',
  active: 'platform.businesses.activate', rejected: 'platform.businesses.review',
  suspended: 'platform.businesses.suspend', closed: 'platform.businesses.close'
}
export type Principal = WorkspacePrincipal
const platformRoles = ['root_system_admin', 'system_admin', 'business_manager', 'support_agent', 'platform_auditor']
export const isPlatformOperator = (user: Principal | null) =>
  Boolean(user?.roles?.some(role => platformRoles.includes(role)))
export const allowedStatusChanges = (status: BusinessStatus, user: Principal | null, own = false) =>
  transitions[status].filter(target => own
    ? ['draft', 'pending_verification'].includes(target) && hasNamedPermission(user, 'business.settings.update')
    : isPlatformOperator(user) && hasNamedPermission(user, transitionPermission[target]) &&
      (target !== 'active' || hasNamedPermission(user, 'platform.businesses.review')))
export const needsReason = (status: BusinessStatus) => ['rejected', 'suspended', 'closed'].includes(status)
export const isBusinessReadOnly = (status?: BusinessStatus | null) => status === 'suspended' || status === 'closed'
export const landingPage = workspaceLanding
