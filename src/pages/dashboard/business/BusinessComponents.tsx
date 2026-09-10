import { useState, type FormEvent } from 'react'
import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@hooks/useAuth'
import { changeBusinessStatus, submitMyBusiness, getBusinessAudit, type Business, type BusinessProfile, type BusinessStatus } from '@api/modules/businesses.api'
import { allowedStatusChanges, needsReason, statusLabels } from '@utils/businessLifecycle'

export const panel = 'rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6'
export const button = 'rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50'
export const secondary = 'rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium disabled:opacity-50'
const input = 'mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm disabled:bg-gray-50 disabled:text-gray-500'
export const businessError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data
    const details = body?.errors?.map((item: { field?: string; message?: string }) =>
      [item.field, item.message].filter(Boolean).join(': ')).join('; ')
    return details || body?.message || body?.detail || 'Unable to reach the API. Please try again.'
  }
  return 'Unable to complete the request. Please try again.'
}
export const ErrorNotice = ({ error }: { error: unknown }) =>
  <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{businessError(error)}</p>
export const StatusBadge = ({ status }: { status: BusinessStatus }) => {
  const color = status === 'active' ? 'bg-green-100 text-green-800' :
    ['suspended', 'rejected', 'closed'].includes(status) ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${color}`}>{statusLabels[status]}</span>
}
export const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : '—'

const fields: { key: keyof BusinessProfile; label: string; required?: boolean; max?: number; type?: string }[] = [
  { key: 'legal_name', label: 'Legal name', required: true, max: 255 },
  { key: 'display_name', label: 'Display name', required: true, max: 255 },
  { key: 'registration_number', label: 'Registration number', max: 100 },
  { key: 'tax_number', label: 'Tax number', max: 100 },
  { key: 'business_type', label: 'Business type', required: true, max: 100 },
  { key: 'email', label: 'Business email (optional)', type: 'email' },
  { key: 'phone', label: 'Business phone (optional)', type: 'tel', max: 30 },
  { key: 'address', label: 'Address (optional)', max: 2000 },
  { key: 'country', label: 'Country code', required: true, max: 2 },
  { key: 'currency', label: 'Currency code', required: true, max: 3 },
  { key: 'timezone', label: 'Timezone', required: true, max: 100 },
  { key: 'description', label: 'Description (optional)', max: 2000 },
]

export const BusinessForm = ({ business, disabled = false, pending, onSave, workspace = false }: {
  business?: Business; disabled?: boolean; pending: boolean;
  workspace?: boolean;
  onSave: (profile: BusinessProfile) => void
}) => {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map(field => [field.key,
    String(business?.[field.key] ?? ({ country: 'KE', currency: 'KES', timezone: 'Africa/Nairobi', business_type: 'retail' } as Record<string, string>)[field.key] ?? '')
  ])))
  const registrationLocked = Boolean(business && !['draft', 'rejected'].includes(business.status))
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const payload = Object.fromEntries(fields.filter(field => !(registrationLocked && field.key === 'registration_number'))
      .map(field => [field.key, values[field.key].trim() || null])) as BusinessProfile
    onSave(payload)
  }
  const renderField = (field: typeof fields[number]) => <label key={field.key} className={`text-sm font-medium text-text-secondary ${field.key === 'description' || field.key === 'address' ? 'business-field-wide' : ''}`}>
    {field.label}{field.required && <span aria-hidden="true"> *</span>}
    {workspace && ['description', 'address'].includes(field.key)
      ? <textarea aria-label={field.label} className={input} rows={field.key === 'description' ? 3 : 2} maxLength={field.max} value={values[field.key]} onChange={event => setValues(previous => ({ ...previous, [field.key]: event.target.value }))} />
      : <input aria-label={field.label} className={input} type={field.type ?? 'text'} required={field.required}
        maxLength={field.max} minLength={['legal_name', 'display_name', 'business_type'].includes(field.key) ? 2 : undefined}
        disabled={registrationLocked && field.key === 'registration_number'} value={values[field.key]}
        onChange={event => setValues(previous => ({ ...previous, [field.key]: event.target.value }))} />}
  </label>
  const groups = [
    { title: 'Business identity', description: 'The essentials that identify your business.', keys: ['legal_name', 'display_name', 'business_type', 'registration_number', 'tax_number', 'description'] },
    { title: 'Contact information', description: 'How customers and our team can reach you.', keys: ['email', 'phone', 'address'] },
    { title: 'Regional preferences', description: 'Your location, trading currency and local time.', keys: ['country', 'currency', 'timezone'] },
  ]
  return <form onSubmit={submit} className={workspace ? 'business-profile-form' : 'space-y-5'}>
    {workspace ? groups.map((group, index) => <section key={group.title} className="business-form-section">
      <div className="business-section-heading"><span className="business-section-number">0{index + 1}</span><div><h3>{group.title}</h3><p>{group.description}</p></div></div>
      <fieldset disabled={disabled || pending} aria-label={group.title} className="business-field-grid">
        {group.keys.map(key => renderField(fields.find(field => field.key === key)!))}
      </fieldset>
      {index === 0 && registrationLocked && <p className="business-field-note">Registration number is locked after submission.</p>}
      {index === 2 && <p className="business-field-note">Use country and currency codes such as KE and KES, and a timezone such as Africa/Nairobi.</p>}
    </section>) : <>
    <fieldset disabled={disabled || pending} className="grid gap-4 sm:grid-cols-2">
      {fields.map(renderField)}
    </fieldset>
    <p className="text-xs text-text-secondary">Country and currency use ISO codes, for example KE and KES. Use an IANA timezone such as Africa/Nairobi.</p>
    {registrationLocked && <p className="text-xs text-text-secondary">Registration number is locked after submission.</p>}
    </>}
    <div className={workspace ? 'business-save-bar' : undefined}>
      {workspace && <p>{disabled ? 'This profile is currently read-only.' : 'Changes are only applied when you save.'}</p>}
      {!disabled && <button className={workspace ? 'business-primary-button' : button} disabled={pending} type="submit">{pending ? 'Saving…' : business ? 'Save business profile' : 'Create draft business'}</button>}
    </div>
  </form>
}

export const BusinessDetails = ({ business }: { business: Business }) => <section className={panel}>
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div><h2 className="text-xl font-semibold">{business.display_name}</h2><p className="text-sm text-text-secondary">{business.legal_name}</p></div>
    <StatusBadge status={business.status} />
  </div>
  <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
    {Object.entries({ 'Public business ID': business.public_id, 'Registration': business.registration_number,
      'Tax number': business.tax_number, 'Registration contact': business.owner?.username ?? 'Not recorded',
      'Email': business.email, 'Phone': business.phone, 'Address': business.address,
      'Country / currency': `${business.country} / ${business.currency}`, 'Timezone': business.timezone,
      'Created': formatDate(business.created_at), 'Approved': formatDate(business.approved_at),
      'Approved by user': business.approved_by_user_id, 'Suspended': formatDate(business.suspended_at)
    }).map(([label, value]) => <div key={label}><dt className="text-xs text-text-secondary">{label}</dt><dd className="mt-1 break-words">{value ?? '—'}</dd></div>)}
  </dl>
  {business.rejection_reason && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">Rejection reason: {business.rejection_reason}</p>}
  <p className="mt-4 text-sm text-text-secondary">{business.branches.length} registered branch(es)</p>
</section>

const actionLabels: Record<BusinessStatus, string> = {
  draft: 'Return to draft', pending_verification: 'Submit for verification', active: 'Activate business',
  rejected: 'Reject application', suspended: 'Suspend business', closed: 'Close business permanently'
}
export const LifecycleActions = ({ business, own = false }: { business: Business; own?: boolean }) => {
  const { user } = useAuth()
  const client = useQueryClient()
  const [target, setTarget] = useState<BusinessStatus | ''>('')
  const [reason, setReason] = useState('')
  const actions = allowedStatusChanges(business.status, user, own)
  const change = useMutation({
    mutationFn: () => own ? submitMyBusiness(target as BusinessStatus) : changeBusinessStatus(business.public_id, target as BusinessStatus, reason.trim() || undefined),
    onSuccess: async () => { setTarget(''); setReason(''); await client.invalidateQueries({ queryKey: ['businesses'] }); await client.invalidateQueries({ queryKey: ['tenant-state'] }) },
    onError: () => { void client.invalidateQueries({ queryKey: ['businesses'] }) }
  })
  return <section className={panel}>
    <h2 className="font-semibold">{own ? 'Verification' : 'Lifecycle decision'}</h2>
    <p className="mt-2 text-sm text-text-secondary">{own ? 'Save your legal and contact information before submitting. Only platform staff can approve your business.' : 'Decisions are recorded in the audit history. Only transitions allowed by your permissions are available.'}</p>
    {!actions.length && <p className="mt-4 text-sm">{business.status === 'closed' ? 'This business is permanently closed.' : 'No status changes available for this account.'}</p>}
    {!target && <div className="mt-4 flex flex-wrap gap-3">{actions.map(value => <button key={value} className={secondary} onClick={() => { change.reset(); setTarget(value) }}>{value === 'active' && business.status === 'suspended' ? 'Reactivate business' : actionLabels[value]}</button>)}</div>}
    {target && <form className="mt-4 space-y-3" onSubmit={event => { event.preventDefault(); change.mutate() }}>
      <h3 className="font-medium">Confirm: {actionLabels[target]}</h3>
      <p className="text-sm">{target === 'closed' ? 'This cannot be reversed. Historical records will remain, but management and sales will be disabled.' : target === 'suspended' ? 'Sales and management writes will stop. Authorized historical reads remain available.' : `Status will change from ${statusLabels[business.status]} to ${statusLabels[target]}.`}</p>
      {!own && <label className="block text-sm">Decision reason {needsReason(target) ? '(required)' : '(optional)'}<textarea aria-label="Decision reason" className={input} value={reason} maxLength={1000} required={needsReason(target)} onChange={event => setReason(event.target.value)} /></label>}
      {change.isError && <ErrorNotice error={change.error} />}
      <div className="flex gap-3"><button className={button} disabled={change.isPending || !actions.includes(target) || (needsReason(target) && !reason.trim())}>{change.isPending ? 'Applying…' : 'Confirm decision'}</button><button type="button" className={secondary} disabled={change.isPending} onClick={() => setTarget('')}>Cancel</button></div>
    </form>}
    {change.isSuccess && <p role="status" className="mt-3 text-sm text-green-800">Business status updated.</p>}
  </section>
}

export const AuditHistory = ({ businessId }: { businessId: string }) => {
  const { user } = useAuth()
  const [offset, setOffset] = useState(0)
  const query = useQuery({ queryKey: ['businesses', 'audit', user?.id, businessId, offset], queryFn: () => getBusinessAudit(businessId, offset) })
  return <section className={panel}><h2 className="font-semibold">Status audit history</h2>
    {query.isPending && <p className="mt-3">Loading history…</p>}
    {query.isError && <ErrorNotice error={query.error} />}
    {query.data?.length === 0 && <p className="mt-3 text-sm text-text-secondary">No status records on this page.</p>}
    <ol className="mt-4 divide-y divide-border">{query.data?.map(record => <li key={record.id} className="py-3 text-sm">
      <p className="font-medium">{record.from_status ? statusLabels[record.from_status] : 'Created'} → {statusLabels[record.to_status]}</p>
      <p className="mt-1">{record.reason || 'No reason supplied'}</p><p className="mt-1 text-xs text-text-secondary">{formatDate(record.created_at)} · {record.actor_user_id ? `User #${record.actor_user_id}` : 'System'} · {record.source}</p>
    </li>)}</ol>
    <div className="mt-4 flex items-center gap-3"><button className={secondary} disabled={offset === 0 || query.isFetching} onClick={() => setOffset(offset - 25)}>Previous</button><span className="text-xs">Page {offset / 25 + 1}</span><button className={secondary} disabled={query.isFetching || (query.data?.length ?? 0) < 25} onClick={() => setOffset(offset + 25)}>Next</button></div>
  </section>
}
