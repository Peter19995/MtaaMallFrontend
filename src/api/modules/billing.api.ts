import api from '@api/config/axios.config'

export type BillingAssessment = {
  public_id: string
  status: 'provisional' | 'final' | 'adjustment'
  usage_total: string
  fee_before_tax: string
  tax_amount: string
  final_fee: string
  summary: Record<string, unknown>
  lines?: {
    public_id: string
    billing_event_id: string
    event_type: string
    channel: string
    branch_id: number | null
    occurred_at: string
    payment_methods: string[]
    offline: boolean
    line_type: string
    basis_amount: string
    final_fee: string
    explanation: string
  }[]
}
export type BillingPeriod = {
  public_id: string
  period_type: string
  timezone: string
  currency: string
  starts_at: string
  ends_at: string
  grace_ends_at: string
  status: 'open' | 'calculating' | 'review' | 'closed'
  provisional_usage_total: string
  provisional_fee_total: string
  recognized_event_count: number
  incomplete_event_count: number
  late_event_count: number
  closed_at: string | null
  assessment: BillingAssessment | null
}
export type BillingReviewItem = {
  public_id: string
  period_id: string
  reason_code: string
  details: Record<string, unknown>
  detected_at: string
}
export type SellerWallet = {
  business_id: string; business_name: string; currency: string
  ledger_balance: string; available_amount: string
  active_reserve_amount: string; projected_reserve_amount: string
  pending_settlement_amount: string; negative_balance: string; paid_amount: string
}
export type BillingInvoice = {
  public_id: string; invoice_number: string; currency: string
  period_start: string; period_end: string
  status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'disputed' | 'void'
  is_shadow: boolean; subtotal: string; tax_amount: string; total_amount: string
  credit_total: string; paid_total: string; balance_due: string; pending_payment_total: string
  issued_at: string | null; due_at: string | null; paid_at: string | null
  disputed_at: string | null; dispute_reason: string | null; dispute_resolution: string | null
  etims_status: string
  lines?: { public_id: string; description: string; period_start: string; period_end: string; subtotal: string; tax_amount: string; total_amount: string }[]
  payments?: { public_id: string; amount: string; provider: string; status: string; provider_receipt: string | null; paid_at: string | null; created_at: string }[]
  credit_notes?: { public_id: string; credit_note_number: string; amount: string; reason: string; status: string; issued_at: string }[]
}
export type BillingRule = {
  public_id: string; code: string; event_type: string; channel: string; calculation_basis: string
  business_type: string | null; service_category_key: string | null; currency: string
  free_allowance: string; fixed_amount: string; percentage_rate: string; minimum_fee: string
  maximum_fee: string | null; marginal_brackets: { up_to: string | null; percentage_rate: string }[]
  priority: number; tax_treatment: string; effective_from: string; effective_to: string | null
  configuration: Record<string, unknown>; is_enabled: boolean
}
export type BillingPlanVersion = {
  public_id: string; version_number: number; status: 'draft' | 'shadow' | 'active' | 'retired'
  currency: string; timezone: string; effective_from: string; effective_to: string | null
  configuration: Record<string, unknown>; activated_at: string | null; rules: BillingRule[]
}
export type BillingPlan = {
  public_id: string; code: string; name: string; description: string | null
  status: 'active' | 'archived'; archived_at: string | null
  charging_mode: 'disabled' | 'shadow' | 'live'; charges_enabled: boolean; is_default: boolean
  agreement_count: number; can_delete: boolean
  versions: BillingPlanVersion[]
}
export type BillingPlanOverview = {
  plan_id: string; currency: string; linked_business_count: number
  active_agreement_count: number; assessment_count: number
  usage_total: string; assessed_revenue: string; finalized_revenue: string
  provisional_revenue: string
  linked_businesses: {
    business_id: string; business_name: string; business_status: string
    agreement_id: string; agreement_status: string; plan_version_number: number
    effective_from: string; effective_to: string | null
    assessed_revenue: string; currency: string
  }[]
}
export type BillingAgreement = {
  public_id: string; business_id: string; business_name: string; plan_version_id: string
  plan_name: string; version_number: number; agreement_type: string; status: string
  currency: string; effective_from: string; effective_to: string | null
  custom_terms: Record<string, unknown>; charges_enabled: boolean
}
export type BillingPreview = {
  rule_code: string; calculation_mode: string; calculation_basis: string; currency: string
  event_basis_amount: string; period_usage_after: string; free_allowance_applied: string
  taxable_basis: string; percentage_fee: string; fixed_fee: string; fee_before_tax: string
  tax_amount: string; final_fee: string; shadow_only: boolean; explanation: string
  bracket_breakdown: { lower_bound: string; upper_bound: string | null; percentage_rate: string; usage: string; fee: string }[]
}
export type BillingReconciliation = {
  currency: string; assessment_total: string; invoiced_assessment_total: string
  uninvoiced_assessment_total: string; invoice_total: string; completed_payment_total: string
  credit_total: string; balance_due: string; open_periods: number; open_reviews: number
  invoice_counts: Record<string, number>; payment_counts: Record<string, number>
  issues: { kind: string; invoice_id: string; invoice_number: string; expected: string; actual: string }[]
  is_reconciled: boolean
}
export type BillingAuditEvent = {
  id: string; action: string; resource_type: string; resource_id: string
  actor_user_id: number | null; actor_kind: string; context: string
  before: Record<string, unknown> | null; after: Record<string, unknown> | null
  details: Record<string, unknown>; created_at: string
}

export const listBusinessBillingPeriods = async () =>
  (await api.get<BillingPeriod[]>('/billing/periods')).data
export const getBusinessSellerWallet = async () =>
  (await api.get<SellerWallet>('/billing/wallet')).data
export const getBusinessBillingPeriod = async (id: string) =>
  (await api.get<BillingPeriod>(`/billing/periods/${encodeURIComponent(id)}`)).data
export const listPlatformBillingPeriods = async (businessId: string) =>
  (await api.get<BillingPeriod[]>(`/platform/billing/businesses/${encodeURIComponent(businessId)}/periods`)).data
export const calculateCurrentBillingPeriod = async (businessId: string) =>
  (await api.post<BillingPeriod>(`/platform/billing/businesses/${encodeURIComponent(businessId)}/periods/calculate-current`)).data
export const calculateBillingPeriod = async (businessId: string, periodId: string) =>
  (await api.post<BillingPeriod>(`/platform/billing/businesses/${encodeURIComponent(businessId)}/periods/${encodeURIComponent(periodId)}/calculate`)).data
export const closeBillingPeriod = async (businessId: string, periodId: string) =>
  (await api.post<BillingPeriod>(`/platform/billing/businesses/${encodeURIComponent(businessId)}/periods/${encodeURIComponent(periodId)}/close`)).data
export const processLateBillingEvents = async (businessId: string) =>
  (await api.post<{ processed: boolean; period: BillingPeriod | null }>(`/platform/billing/businesses/${encodeURIComponent(businessId)}/late-events/process`)).data
export const listBusinessBillingReviews = async () =>
  (await api.get<BillingReviewItem[]>('/billing/review-queue')).data
export const listPlatformBillingReviews = async (businessId: string) =>
  (await api.get<BillingReviewItem[]>(`/platform/billing/businesses/${encodeURIComponent(businessId)}/review-queue`)).data
export const resolvePlatformBillingReview = async (businessId: string, itemId: string, resolutionNote: string) =>
  (await api.post<{ public_id: string; status: string }>(`/platform/billing/businesses/${encodeURIComponent(businessId)}/review-queue/${encodeURIComponent(itemId)}/resolve`, { resolution_note: resolutionNote })).data
export const listBusinessBillingInvoices = async () =>
  (await api.get<BillingInvoice[]>('/billing/invoices')).data
export const listPlatformBillingInvoices = async (businessId: string) =>
  (await api.get<BillingInvoice[]>(`/platform/billing/businesses/${encodeURIComponent(businessId)}/invoices`)).data
export const createMonthlyBillingInvoice = async (businessId: string, year: number, month: number, dueDays = 14) =>
  (await api.post<BillingInvoice>(`/platform/billing/businesses/${encodeURIComponent(businessId)}/invoices/monthly`, { year, month, due_days: dueDays })).data
export const issueBillingInvoice = async (businessId: string, invoiceId: string) =>
  (await api.post<BillingInvoice>(`/platform/billing/businesses/${encodeURIComponent(businessId)}/invoices/${encodeURIComponent(invoiceId)}/issue`)).data
export const addBillingCreditNote = async (businessId: string, invoiceId: string, amount: string, reason: string) =>
  (await api.post(`/platform/billing/businesses/${encodeURIComponent(businessId)}/invoices/${encodeURIComponent(invoiceId)}/credit-notes`, { amount, reason })).data
export const resolveBillingInvoiceDispute = async (businessId: string, invoiceId: string, reason: string) =>
  (await api.post<BillingInvoice>(`/platform/billing/businesses/${encodeURIComponent(businessId)}/invoices/${encodeURIComponent(invoiceId)}/resolve-dispute`, { reason })).data
export const disputeBillingInvoice = async (invoiceId: string, reason: string) =>
  (await api.post<BillingInvoice>(`/billing/invoices/${encodeURIComponent(invoiceId)}/dispute`, { reason })).data
export const payBillingInvoiceMpesa = async (invoiceId: string, phoneNumber: string, amount?: string) =>
  (await api.post(`/billing/invoices/${encodeURIComponent(invoiceId)}/payments/mpesa`, {
    phone_number: phoneNumber, ...(amount ? { amount } : {}),
  }, { headers: { 'Idempotency-Key': crypto.randomUUID() } })).data

export const listBillingPlans = async () =>
  (await api.get<BillingPlan[]>('/platform/billing/plans')).data
export const getBillingPlanOverview = async (planId: string) =>
  (await api.get<BillingPlanOverview>(`/platform/billing/plans/${encodeURIComponent(planId)}/overview`)).data
export const createBillingPlan = async (body: { code?: string; name: string; description?: string }) =>
  (await api.post<BillingPlan>('/platform/billing/plans', body)).data
export const updateBillingPlan = async (planId: string, body: { name: string; description?: string }) =>
  (await api.put<BillingPlan>(`/platform/billing/plans/${encodeURIComponent(planId)}`, body)).data
export const duplicateBillingPlan = async (planId: string, name: string) =>
  (await api.post<BillingPlan>(`/platform/billing/plans/${encodeURIComponent(planId)}/duplicate`, { name })).data
export const archiveBillingPlan = async (planId: string) =>
  (await api.post<BillingPlan>(`/platform/billing/plans/${encodeURIComponent(planId)}/archive`)).data
export const deleteBillingPlan = async (planId: string) =>
  api.delete(`/platform/billing/plans/${encodeURIComponent(planId)}`)
export const createBillingPlanVersion = async (planId: string, body: { currency: string; timezone: string; effective_from: string; configuration?: Record<string, unknown> }) =>
  (await api.post<BillingPlanVersion>(`/platform/billing/plans/${encodeURIComponent(planId)}/versions`, body)).data
export const createBillingRule = async (versionId: string, body: Record<string, unknown>) =>
  (await api.post<BillingRule>(`/platform/billing/versions/${encodeURIComponent(versionId)}/rules`, body)).data
export const updateBillingRule = async (ruleId: string, body: Record<string, unknown>) =>
  (await api.put<BillingRule>(`/platform/billing/rules/${encodeURIComponent(ruleId)}`, body)).data
export const deleteBillingRule = async (ruleId: string) =>
  api.delete(`/platform/billing/rules/${encodeURIComponent(ruleId)}`)
export const archiveBillingRule = async (ruleId: string) =>
  (await api.post<BillingRule>(`/platform/billing/rules/${encodeURIComponent(ruleId)}/archive`)).data
export const reactivateBillingRule = async (ruleId: string) =>
  (await api.post<BillingRule>(`/platform/billing/rules/${encodeURIComponent(ruleId)}/reactivate`)).data
export const publishBillingVersionShadow = async (versionId: string) =>
  (await api.post<BillingPlanVersion>(`/platform/billing/versions/${encodeURIComponent(versionId)}/publish-shadow`)).data
export const previewBillingPrice = async (body: Record<string, unknown>) =>
  (await api.post<BillingPreview>('/platform/billing/pricing-preview', body)).data
export const listBillingAgreements = async (businessId: string) =>
  (await api.get<BillingAgreement[]>(`/platform/billing/businesses/${encodeURIComponent(businessId)}/agreements`)).data
export const createBillingAgreement = async (businessId: string, body: Record<string, unknown>) =>
  (await api.post<BillingAgreement>(`/platform/billing/businesses/${encodeURIComponent(businessId)}/agreements`, body)).data
export const endBillingAgreement = async (businessId: string, agreementId: string) =>
  (await api.post(`/platform/billing/businesses/${encodeURIComponent(businessId)}/agreements/${encodeURIComponent(agreementId)}/end`)).data
export const getBillingReconciliation = async (businessId: string) =>
  (await api.get<BillingReconciliation>(`/platform/billing/businesses/${encodeURIComponent(businessId)}/reconciliation`)).data
export const getBillingAuditHistory = async (businessId: string) =>
  (await api.get<BillingAuditEvent[]>(`/platform/billing/businesses/${encodeURIComponent(businessId)}/audit`)).data
