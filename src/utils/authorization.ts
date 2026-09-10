// Role labels never imply permissions. The API supplies the effective grants.
export const hasNamedPermission = (
  user: { permissions?: string[] } | null | undefined,
  permission: string
): boolean => Boolean(user?.permissions?.includes(permission))

// Compare the whole effective scope, not role labels. A branch reassignment or
// suspension must also discard cached operational data and mounted forms.
export const authorizationFingerprint = (user: {
  context?: string; membership_id?: number | null; business_id?: string | null
  business_status?: string | null; branch_scope?: string | null
  permissions?: string[]; roles?: string[]; allowed_branch_ids?: number[]
}): string => JSON.stringify({
  context: user.context, membership: user.membership_id, business: user.business_id,
  status: user.business_status, scope: user.branch_scope,
  permissions: [...(user.permissions ?? [])].sort(), roles: [...(user.roles ?? [])].sort(),
  branches: [...(user.allowed_branch_ids ?? [])].sort((a, b) => a - b)
})
