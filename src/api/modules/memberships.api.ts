import api from '../config/axios.config'

export type Membership = {
  id: number; user_id: number; username: string; full_name?: string | null; email?: string | null; role: string
  status: 'invited' | 'active' | 'suspended' | 'revoked'
  business_id: string | null; business_name: string; branch_scope: 'all' | 'selected' | null; branch_ids: number[]
}
export type BusinessInvitation = {
  id: string; business_id: string; business_name: string; email: string; role: string
  branch_scope: 'all' | 'selected'; branch_ids: number[]
  status: 'pending' | 'accepted' | 'expired' | 'revoked'; expires_at: string; invited_by_user_id: number
  accepted_at: string | null; revoked_at: string | null; created_at: string
}
export type Memberships = { business_memberships: Membership[]; platform_memberships: Membership[] }
export type Scope = 'business' | 'platform'
export const myMemberships = async () => (await api.get<Memberships>('/memberships/me')).data
export const listMemberships = async (scope: Scope) => (await api.get<Membership[]>(`/memberships/${scope}`, { params: { limit: 500 } })).data
export const inviteMember = async (scope: Scope, body: { username: string; role: string; branch_id: number | null; reason: string }) =>
  (await api.post<Membership>(`/memberships/${scope}`, body)).data
export type PlatformAdminInvitation = { email: string; username: string; full_name?: string; phone?: string; platform_role: string; reason: string }
export const invitePlatformAdmin = async (body: PlatformAdminInvitation) =>
  (await api.post('/platform/admins', body)).data
export const changeMember = async (scope: Scope, id: number, action: 'role' | 'status', body: Record<string, unknown>) =>
  (await api.patch<Membership>(`/memberships/${scope}/${id}/${action}`, body)).data
export const acceptMembership = async (scope: Scope, id: number) =>
  (await api.post<Membership>(`/memberships/me/${scope}/${id}/accept`)).data

export const listBusinessMembers = async () => (await api.get<Membership[]>('/business/members', { params: { limit: 500 } })).data
export const listBusinessInvitations = async () => (await api.get<BusinessInvitation[]>('/business/invitations')).data
export const inviteBusinessEmployee = async (body: { email: string; role: string; branch_scope: 'all' | 'selected'; branch_ids: number[]; reason: string }) =>
  (await api.post<BusinessInvitation>('/business/invitations', body)).data
export const acceptBusinessInvitation = async (token: string) =>
  (await api.post<Membership>(`/business/invitations/${encodeURIComponent(token)}/accept`)).data
export const updateBusinessMemberRole = async (id: number, role: string, reason: string) =>
  (await api.put<Membership>(`/business/members/${id}/role`, { role, reason })).data
export const updateBusinessMemberBranches = async (id: number, branch_scope: 'all' | 'selected', branch_ids: number[], reason: string) =>
  (await api.put<Membership>(`/business/members/${id}/branches`, { branch_scope, branch_ids, reason })).data
export const setBusinessMemberAccess = async (id: number, action: 'suspend' | 'reactivate', reason: string) =>
  (await api.post<Membership>(`/business/members/${id}/${action}`, { reason })).data
export const revokeBusinessMember = async (id: number, reason: string) =>
  (await api.delete<Membership>(`/business/members/${id}`, { params: { reason } })).data
