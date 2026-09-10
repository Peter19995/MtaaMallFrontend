import api from '../config/axios.config'
import { isAxiosError } from 'axios'

async function withApiMessage<T>(operation: Promise<{ data: T }>): Promise<T> {
  try { return (await operation).data }
  catch (error) {
    if (isAxiosError(error)) {
      const body = error.response?.data
      const detail = body?.detail ?? body?.message
      if (typeof detail === 'string') throw new Error(detail)
    }
    throw error
  }
}

export type ApprovalKind = 'discount' | 'refund' | 'stock_writeoff'
export type Approval = {
  id: string; kind: ApprovalKind; status: 'pending' | 'executed' | 'rejected'; reason: string
  branch_id: number; requested_by_user_id: number; decided_by_user_id?: number
  payload: Record<string, unknown>; snapshot: Record<string, unknown>; result?: Record<string, unknown>
  decision_reason?: string; created_at: string; expires_at: string
}
export type AuditEvent = {
  id: string; actor_user_id?: number; actor_kind: string; business_id?: string; branch_id?: number
  action: string; resource_type: string; resource_id: string; before: unknown; after: unknown
  details: unknown; created_at: string
}
export const listAudit = async (platform: boolean, offset: number, action: string) =>
  withApiMessage(api.get<AuditEvent[]>(`/${platform ? 'platform' : 'business'}/audit`, { params: { offset, limit: 50, action: action || undefined } }))
export const listApprovals = async (offset: number) => withApiMessage(api.get<Approval[]>('/business/approvals', { params: { offset, limit: 50 } }))
export const requestApproval = async (kind: ApprovalKind, reason: string, payload: unknown) =>
  withApiMessage(api.post<Approval>('/business/approvals', { kind, reason, payload }))
export const decideApproval = async (id: string, decision: 'approve' | 'reject', reason: string) =>
  withApiMessage(api.post<Approval>(`/business/approvals/${id}/decision`, { decision, reason }))
