import api from '@api/config/axios.config'

export type MpesaProviderAccount = {
  public_id: string
  provider: 'mpesa'
  scope: 'platform' | 'business'
  purpose: 'online' | 'pos'
  business_id: string | null
  environment: 'sandbox' | 'production'
  merchant_type: 'paybill' | 'till'
  shortcode: string
  transaction_type: string
  credential_version: number
  credentials_configured: boolean
  status: 'draft' | 'testing' | 'active' | 'inactive' | 'retired'
  is_default: boolean
  last_tested_at: string | null
  last_test_status: string | null
  created_at: string
  updated_at: string
}

export type MpesaConfiguration = {
  environment: 'sandbox' | 'production'
  merchant_type: 'paybill' | 'till'
  shortcode?: string
  transaction_type: string
  consumer_key?: string
  consumer_secret?: string
  passkey?: string
  reason: string
}

export type PaymentTransaction = {
  public_id: string; business_id: string; business_name: string; order_id: number
  provider_account_id: string | null; merchant: string | null; channel: 'online' | 'pos'
  provider: string; amount: string; currency: string; phone_masked: string | null
  state: string; attempt_number: number; checkout_request_id: string | null
  mpesa_receipt_number: string | null; result_code: string | null
  result_description: string | null; created_at: string; completed_at: string | null
  reconciliation_attempt_count: number; last_reconciled_at: string | null
  review_required: boolean; review_reason: string | null
}
export type PaymentAuditEvent = {
  id: string; business_id: string | null; actor_user_id: number | null; action: string
  resource_id: string | null; before: Record<string, unknown> | null
  after: Record<string, unknown> | null; details: Record<string, unknown> | null; created_at: string
}
export type ReconciliationItem = {
  id: number; provider: string; checkout_request_id: string | null
  processing_status: string; received_at: string; processed_at: string | null; error_message: string | null
}
export type PaymentMetrics = {
  window_hours: number; initiation_success_rate: number; payment_success_rate: number
  average_callback_delay_seconds: number | null; pending_transactions: number
  reconciliation_failures: number; unmatched_callbacks: number; open_alerts: number
}
export type PaymentAlert = {
  public_id: string; business_id: string | null; business_name: string | null
  payment_intent_id: string | null; alert_type: string; severity: 'warning' | 'critical'
  status: 'open' | 'resolved'; message: string; occurrence_count: number
  first_occurred_at: string; last_occurred_at: string; resolved_at: string | null
  resolution_note: string | null
}
export type BusinessPaymentBranch = {
  id: number; name: string; code: string; is_active: boolean; mpesa_enabled: boolean
}
export type SettlementSummary = {
  business_id: string; business_name: string; currency: string; entry_count: number
  gross_amount: string; provider_fee: string; platform_commission: string
  adjustment_amount: string; net_amount: string; available_amount: string
}
export type BusinessSettlement = {
  public_id: string; business_id: string; business_name: string
  settlement_number: string; currency: string
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'paid'
  period_start: string | null; period_end: string
  gross_amount: string; provider_fee: string; platform_commission: string
  adjustment_amount: string; net_amount: string; item_count: number
  requested_by_user_id: number; submitted_at: string | null
  approved_by_user_id: number | null; approved_at: string | null
  paid_at: string | null; external_payout_reference: string | null
}
export type CommissionPolicy = {
  public_id: string | null; business_id: string; name: string
  percentage_rate: string; fixed_fee: string
  provider_fee_percentage: string; provider_fee_fixed: string
  is_active: boolean; effective_from: string | null; effective_to: string | null
}
export type PaymentRolloutStatus = {
  online_mode: 'disabled' | 'internal' | 'pilot' | 'all'
  reason: string
  updated_by_user_id: number | null
  updated_at: string
  pilot_businesses: Array<{
    business_id: string; business_name: string; reason: string; enabled_at: string
  }>
  readiness?: {
    reconciled: boolean; successful_intents: number
    broken_payment_order_links: number; missing_online_ledger_entries: number
    successful_online_total: string; online_ledger_gross_total: string
    online_to_ledger_difference: string; open_operational_alerts: number
    legacy_environment_accounts: number
  }
}

const accountPath = (businessId?: string | null) => businessId
  ? `/platform/businesses/${encodeURIComponent(businessId)}/payments/mpesa`
  : '/platform/payments/mpesa/system'

export const getMpesaConfiguration = async (businessId?: string | null) =>
  (await api.get<MpesaProviderAccount>(accountPath(businessId))).data

export const saveMpesaConfiguration = async (
  body: MpesaConfiguration,
  businessId?: string | null
) => (await api.put<MpesaProviderAccount>(accountPath(businessId), body)).data

export const testMpesaConfiguration = async (businessId?: string | null) =>
  (await api.post<MpesaProviderAccount>(`${accountPath(businessId)}/test`)).data

export const activateMpesaConfiguration = async (reason: string, businessId?: string | null) =>
  (await api.post<MpesaProviderAccount>(`${accountPath(businessId)}/activate`, { reason })).data

export const suspendMpesaConfiguration = async (reason: string, businessId?: string | null) =>
  (await api.post<MpesaProviderAccount>(`${accountPath(businessId)}/suspend`, { reason })).data

export const rotateSystemMpesaCredentials = async (
  body: { consumer_key: string; consumer_secret: string; passkey: string; reason: string }
) => (await api.post<MpesaProviderAccount>(
  '/platform/payments/mpesa/system/rotate-credentials', body
)).data

export const getPaymentTransactions = async (params?: { channel?: string; state?: string; business_id?: string }) =>
  (await api.get<PaymentTransaction[]>('/platform/payments/transactions', { params })).data
export const getPaymentAudit = async (businessId?: string | null) =>
  (await api.get<PaymentAuditEvent[]>('/platform/payments/audit', { params: businessId ? { business_id: businessId } : undefined })).data
export const getPaymentReconciliation = async () =>
  (await api.get<{ payment_intents: PaymentTransaction[]; callback_events: ReconciliationItem[] }>('/platform/payments/reconciliation')).data
export const reconcilePayment = async (intentId: string) =>
  (await api.post<{ status: string; payment_intent: PaymentTransaction }>(`/platform/payments/reconciliation/${intentId}`)).data
export const getPaymentMetrics = async (hours = 24) =>
  (await api.get<PaymentMetrics>('/platform/payments/metrics', { params: { hours } })).data
export const getPaymentAlerts = async () =>
  (await api.get<PaymentAlert[]>('/platform/payments/alerts', { params: { status: 'open' } })).data
export const resolvePaymentAlert = async (alertId: string, note: string) =>
  (await api.post<PaymentAlert>(`/platform/payments/alerts/${alertId}/resolve`, { note })).data
export const getBusinessPaymentBranches = async (businessId: string) =>
  (await api.get<BusinessPaymentBranch[]>(`/platform/businesses/${encodeURIComponent(businessId)}/payments/mpesa/branches`)).data
export const getSettlementSummaries = async () =>
  (await api.get<SettlementSummary[]>('/platform/settlement-wallets')).data
export const listSettlements = async () =>
  (await api.get<BusinessSettlement[]>('/platform/settlements')).data
export const prepareSettlement = async (businessId: string, currency: string) =>
  (await api.post<BusinessSettlement>('/platform/settlements', {
    business_id: businessId, currency, cutoff: new Date().toISOString()
  })).data
export const submitSettlement = async (settlementId: string) =>
  (await api.post<BusinessSettlement>(`/platform/settlements/${settlementId}/submit`)).data
export const approveSettlement = async (settlementId: string) =>
  (await api.post<BusinessSettlement>(`/platform/settlements/${settlementId}/approve`)).data
export const rejectSettlement = async (settlementId: string, reason: string) =>
  (await api.post<BusinessSettlement>(`/platform/settlements/${settlementId}/reject`, { reason })).data
export const markSettlementPaid = async (
  settlementId: string, externalPayoutReference: string, payoutNote?: string
) => (await api.post<BusinessSettlement>(`/platform/settlements/${settlementId}/mark-paid`, {
  external_payout_reference: externalPayoutReference, payout_note: payoutNote
})).data
export const getCommissionPolicy = async (businessId: string) =>
  (await api.get<CommissionPolicy>(`/platform/businesses/${businessId}/commission-policy`)).data
export const saveCommissionPolicy = async (
  businessId: string,
  body: { name: string; percentage_rate: number; fixed_fee: number; provider_fee_percentage: number; provider_fee_fixed: number }
) => (await api.put<CommissionPolicy>(`/platform/businesses/${businessId}/commission-policy`, body)).data
export const getPaymentRollout = async () =>
  (await api.get<PaymentRolloutStatus>('/platform/payments/rollout')).data
export const updatePaymentRollout = async (
  onlineMode: PaymentRolloutStatus['online_mode'], reason: string
) => (await api.put<PaymentRolloutStatus>('/platform/payments/rollout', {
  online_mode: onlineMode, reason
})).data
export const enablePaymentPilotBusiness = async (businessId: string, reason: string) =>
  (await api.put<PaymentRolloutStatus>(
    `/platform/payments/rollout/businesses/${encodeURIComponent(businessId)}`, { reason }
  )).data
export const disablePaymentPilotBusiness = async (businessId: string, reason: string) =>
  (await api.delete<PaymentRolloutStatus>(
    `/platform/payments/rollout/businesses/${encodeURIComponent(businessId)}`, { data: { reason } }
  )).data
