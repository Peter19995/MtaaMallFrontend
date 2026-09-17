import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCardIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { Link, useParams } from 'react-router-dom'

import { useAuth } from '@hooks/useAuth'
import { useSiteDialog } from '@components/common'
import { getBusiness, listBusinesses } from '@api/modules/businesses.api'
import { reauthenticateRequest } from '@api/modules/auth.api'
import {
  activateMpesaConfiguration,
  disablePaymentPilotBusiness,
  enablePaymentPilotBusiness,
  getBusinessPaymentBranches,
  getMpesaConfiguration,
  getPaymentAudit,
  getPaymentRollout,
  saveMpesaConfiguration,
  suspendMpesaConfiguration,
  testMpesaConfiguration,
  updatePaymentRollout,
  type MpesaConfiguration,
  type PaymentRolloutStatus,
} from '@api/modules/platformPayments.api'

const panel = 'rounded-2xl border border-border bg-white shadow-sm'
const input = 'mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15'
const primary = 'rounded-xl bg-primary-dark px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
const secondary = 'rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-text-secondary transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50'

const emptyForm: MpesaConfiguration = {
  environment: 'sandbox', merchant_type: 'paybill', shortcode: '',
  transaction_type: 'CustomerPayBillOnline', callback_url: '', reason: '',
}

const errorText = (error: unknown) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: unknown; detail?: unknown } } }).response
    const detail = response?.data?.detail
    const detailMessage = typeof detail === 'object' && detail && 'message' in detail
      ? (detail as { message?: unknown }).message
      : detail
    return typeof response?.data?.message === 'string'
      ? response.data.message
      : typeof detailMessage === 'string'
        ? detailMessage
        : 'The request could not be completed.'
  }
  return error instanceof Error ? error.message : 'The request could not be completed.'
}

const requiresReauthentication = (error: unknown) => {
  if (typeof error !== 'object' || !error || !('response' in error)) return false
  const response = (error as { response?: { status?: number; data?: Record<string, unknown> } }).response
  const data = response?.data
  const detail = data?.detail
  return data?.reauthentication_required === true ||
    (typeof detail === 'object' && detail !== null &&
      (detail as Record<string, unknown>).reauthentication_required === true) ||
    (response?.status === 403 && errorText(error).toLowerCase().includes('recent authentication'))
}

export default function PlatformMpesaPage() {
  const { id: routeBusinessId } = useParams<{ id: string }>()
  const { hasPermission } = useAuth()
  const dialog = useSiteDialog()
  const queryClient = useQueryClient()
  const [scope, setScope] = useState<'system' | 'business'>(routeBusinessId ? 'business' : 'system')
  const [businessId, setBusinessId] = useState(routeBusinessId ?? '')
  const [form, setForm] = useState<MpesaConfiguration>(emptyForm)
  const selectedBusinessId = scope === 'business' ? businessId || null : null

  useEffect(() => {
    if (routeBusinessId) { setScope('business'); setBusinessId(routeBusinessId) }
  }, [routeBusinessId])

  const businesses = useQuery({
    queryKey: ['platform-businesses-for-payments'],
    queryFn: () => listBusinesses(),
    enabled: hasPermission('platform.payments.read'),
  })
  const account = useQuery({
    queryKey: ['platform-mpesa', scope, selectedBusinessId],
    queryFn: () => getMpesaConfiguration(selectedBusinessId),
    enabled: scope === 'system' || Boolean(selectedBusinessId),
    retry: false,
  })
  const business = useQuery({
    queryKey: ['platform-business-payment-detail', selectedBusinessId],
    queryFn: () => getBusiness(selectedBusinessId!), enabled: Boolean(selectedBusinessId),
  })
  const branches = useQuery({
    queryKey: ['platform-business-payment-branches', selectedBusinessId],
    queryFn: () => getBusinessPaymentBranches(selectedBusinessId!), enabled: Boolean(selectedBusinessId),
  })
  const audit = useQuery({
    queryKey: ['platform-payment-audit', selectedBusinessId],
    queryFn: () => getPaymentAudit(selectedBusinessId),
  })
  const rollout = useQuery({
    queryKey: ['platform-payment-rollout'],
    queryFn: getPaymentRollout,
    enabled: scope === 'system' && hasPermission('platform.payments.read'),
  })

  useEffect(() => {
    if (!account.data) {
      setForm(emptyForm)
      return
    }
    setForm({
      environment: account.data.environment,
      merchant_type: account.data.merchant_type,
      shortcode: '',
      transaction_type: account.data.transaction_type,
      callback_url: account.data.callback_url ?? '',
      reason: '',
    })
  }, [account.data, scope, selectedBusinessId])

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['platform-mpesa', scope, selectedBusinessId] })
    await queryClient.invalidateQueries({ queryKey: ['platform-payment-audit', selectedBusinessId] })
  }
  const runSensitive = async <T,>(operation: () => Promise<T>): Promise<T> => {
    try {
      return await operation()
    } catch (error) {
      if (!requiresReauthentication(error)) throw error
      const password = await dialog.prompt({
        title: 'Confirm your identity',
        message: 'Enter your account password to authorize sensitive payment changes for the next 10 minutes.',
        inputLabel: 'Password',
        inputType: 'password',
        trim: false,
        minLength: 1,
        maxLength: 1024,
        confirmLabel: 'Continue',
      })
      if (password === null) throw error
      await reauthenticateRequest(password)
      return operation()
    }
  }
  const save = useMutation({
    mutationFn: (payload: MpesaConfiguration) => runSensitive(() => saveMpesaConfiguration(payload, selectedBusinessId)),
    onSuccess: async () => {
      setForm(current => ({ ...current, consumer_key: '', consumer_secret: '', passkey: '', reason: '' }))
      await refresh()
      await dialog.alert({ title: 'Configuration saved', message: 'Credentials remain write-only. Test this account before activation.' })
    },
  })
  const test = useMutation({ mutationFn: () => runSensitive(() => testMpesaConfiguration(selectedBusinessId)), onSuccess: refresh })
  const activate = useMutation({ mutationFn: (reason: string) => runSensitive(() => activateMpesaConfiguration(reason, selectedBusinessId)), onSuccess: refresh })
  const suspend = useMutation({ mutationFn: (reason: string) => runSensitive(() => suspendMpesaConfiguration(reason, selectedBusinessId)), onSuccess: refresh })
  const refreshRollout = () => queryClient.invalidateQueries({ queryKey: ['platform-payment-rollout'] })
  const changeRollout = useMutation({
    mutationFn: ({ mode, reason }: { mode: PaymentRolloutStatus['online_mode']; reason: string }) =>
      runSensitive(() => updatePaymentRollout(mode, reason)),
    onSuccess: refreshRollout,
  })
  const addPilot = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      runSensitive(() => enablePaymentPilotBusiness(id, reason)),
    onSuccess: refreshRollout,
  })
  const removePilot = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      runSensitive(() => disablePaymentPilotBusiness(id, reason)),
    onSuccess: refreshRollout,
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const secrets = [form.consumer_key, form.consumer_secret, form.passkey].filter(Boolean)
    if (secrets.length > 0 && secrets.length < 3) {
      void dialog.alert({ title: 'Complete the credential set', message: 'Consumer key, consumer secret, and passkey must be entered together.' })
      return
    }
    save.mutate({
      ...form,
      shortcode: form.shortcode?.trim() || undefined,
      consumer_key: form.consumer_key || undefined,
      consumer_secret: form.consumer_secret || undefined,
      passkey: form.passkey || undefined,
      callback_url: form.callback_url.trim(),
      reason: form.reason.trim(),
    })
  }

  const requestReason = async (action: 'activate' | 'suspend') => {
    const reason = await dialog.prompt({
      title: action === 'activate' ? 'Activate M-Pesa account' : 'Suspend M-Pesa account',
      message: action === 'activate' ? 'Confirm why this tested account should start processing payments.' : 'Payments using this account will stop immediately.',
      inputLabel: 'Audit reason', minLength: 3, maxLength: 500,
      confirmLabel: action === 'activate' ? 'Activate account' : 'Suspend account',
      tone: action === 'suspend' ? 'danger' : 'default',
    })
    if (!reason) return
    if (action === 'activate') activate.mutate(reason)
    else suspend.mutate(reason)
  }

  const requestRolloutMode = async (mode: PaymentRolloutStatus['online_mode']) => {
    const reason = await dialog.prompt({
      title: 'Change online M-Pesa audience',
      message: `Move online checkout to “${mode}”. This affects who can start new payments immediately.`,
      inputLabel: 'Audit and rollout reason', minLength: 3, maxLength: 500,
      confirmLabel: 'Change audience', tone: mode === 'disabled' ? 'danger' : 'default',
    })
    if (reason) changeRollout.mutate({ mode, reason })
  }

  const requestPilot = async (id: string, enabled: boolean) => {
    const reason = await dialog.prompt({
      title: enabled ? 'Add pilot business' : 'Remove pilot business',
      message: enabled ? 'Customers may use online M-Pesa for this seller while pilot mode is active.' : 'New online M-Pesa attempts for this seller will stop in pilot mode.',
      inputLabel: 'Audit reason', minLength: 3, maxLength: 500,
      confirmLabel: enabled ? 'Add to pilot' : 'Remove from pilot',
      tone: enabled ? 'default' : 'danger',
    })
    if (!reason) return
    if (enabled) addPilot.mutate({ id, reason })
    else removePilot.mutate({ id, reason })
  }

  const current = account.data
  const busy = save.isPending || test.isPending || activate.isPending || suspend.isPending
  const actionError = save.error ?? test.error ?? activate.error ?? suspend.error

  return <div className="mx-auto max-w-6xl space-y-6 pb-12">
    <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-primary-dark to-secondary-dark px-6 py-7 text-white shadow-xl sm:px-8">
      <div className="flex items-start gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15"><CreditCardIcon className="h-7 w-7" /></span><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Platform payments</p><h1 className="mt-1 text-3xl font-bold">M-Pesa configuration</h1><p className="mt-2 max-w-2xl text-sm text-white/80">Manage the system online account and each business POS account without exposing Daraja secrets.</p></div></div>
    </header>

    {!routeBusinessId && <section className={`${panel} p-5`}>
      <div className="flex flex-wrap gap-2">
        <button className={scope === 'system' ? primary : secondary} onClick={() => setScope('system')}>System online account</button>
        <button className={scope === 'business' ? primary : secondary} onClick={() => setScope('business')}>Business POS account</button>
      </div>
      {scope === 'business' && <label className="mt-5 block text-sm font-semibold text-text">Business<select className={input} value={businessId} onChange={event => setBusinessId(event.target.value)}><option value="">Select a business</option>{businesses.data?.map(business => <option value={business.public_id} key={business.public_id}>{business.display_name}</option>)}</select></label>}
    </section>}

    {scope === 'system' && rollout.data && <section className={`${panel} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-wider text-primary-dark">Controlled rollout</p><h2 className="mt-1 text-xl font-bold text-text">Online payment audience</h2><p className="mt-1 max-w-2xl text-sm text-text-secondary">Provider activation and customer availability are separate. Start with internal users, then selected sellers, before general release.</p></div>
        <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-bold uppercase text-primary-dark">{rollout.data.online_mode}</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">{(['disabled', 'internal', 'pilot', 'all'] as const).map(mode => <button key={mode} className={rollout.data?.online_mode === mode ? primary : secondary} disabled={!hasPermission('platform.payments.activate') || changeRollout.isPending} onClick={() => void requestRolloutMode(mode)}>{mode === 'disabled' ? 'Disabled' : mode === 'internal' ? 'Internal users' : mode === 'pilot' ? 'Pilot sellers' : 'All customers'}</button>)}</div>
      {rollout.data.readiness && <div className="mt-5 grid gap-3 sm:grid-cols-4">{[
        ['Reconciled', rollout.data.readiness.reconciled ? 'Yes' : 'Action needed'],
        ['Online paid', rollout.data.readiness.successful_online_total],
        ['Ledger gross', rollout.data.readiness.online_ledger_gross_total],
        ['Open alerts', String(rollout.data.readiness.open_operational_alerts)],
      ].map(([label, value]) => <div className="rounded-xl bg-background p-3" key={label}><p className="text-xs text-text-tertiary">{label}</p><p className="mt-1 font-bold text-text">{value}</p></div>)}</div>}
      {rollout.data.online_mode === 'pilot' && <div className="mt-6 border-t border-border pt-5"><h3 className="font-bold text-text">Pilot businesses</h3><div className="mt-3 flex gap-3"><select className={input} value={businessId} onChange={event => setBusinessId(event.target.value)}><option value="">Select business to add</option>{businesses.data?.filter(item => !rollout.data?.pilot_businesses.some(pilot => pilot.business_id === item.public_id)).map(item => <option value={item.public_id} key={item.public_id}>{item.display_name}</option>)}</select><button className={primary} disabled={!businessId || addPilot.isPending} onClick={() => void requestPilot(businessId, true)}>Add pilot</button></div><div className="mt-3 space-y-2">{rollout.data.pilot_businesses.map(item => <div className="flex items-center justify-between rounded-xl bg-background p-3" key={item.business_id}><div><p className="font-semibold text-text">{item.business_name}</p><p className="text-xs text-text-tertiary">{item.reason}</p></div><button className={secondary} disabled={removePilot.isPending} onClick={() => void requestPilot(item.business_id, false)}>Remove</button></div>)}{rollout.data.pilot_businesses.length === 0 && <p className="text-sm text-text-secondary">No pilot businesses enabled.</p>}</div></div>}
      {(changeRollout.error || addPilot.error || removePilot.error) && <p role="alert" className="mt-4 rounded-xl bg-error/5 p-3 text-sm text-error">{errorText(changeRollout.error ?? addPilot.error ?? removePilot.error)}</p>}
    </section>}

    {selectedBusinessId && business.data && <section className={`${panel} flex flex-wrap items-center justify-between gap-4 p-5`}>
      <div><p className="text-xs font-bold uppercase tracking-wider text-primary-dark">Business POS account</p><h2 className="mt-1 text-xl font-bold text-text">{business.data.business.display_name}</h2><p className="text-sm text-text-secondary">{business.data.business.legal_name} · {business.data.business.status}</p></div>
      <Link className={secondary} to={`/platform/businesses?business=${selectedBusinessId}`}>View business</Link>
    </section>}

    {(scope === 'system' || businessId) && <div className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.3fr]">
      <section className={`${panel} p-5`}>
        <div className="flex items-center justify-between gap-3"><div><h2 className="font-bold text-text">Account status</h2><p className="mt-1 text-sm text-text-secondary">Non-secret provider details only.</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${current?.status === 'active' ? 'bg-success-light text-success-dark' : 'bg-background text-text-secondary'}`}>{current?.status ?? 'Not configured'}</span></div>
        {account.isLoading && <p className="mt-5 text-sm text-text-secondary">Loading configuration…</p>}
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">{[
          ['Environment', current?.environment ?? '—'], ['Merchant type', current?.merchant_type ?? '—'],
          ['Shortcode', current?.shortcode ?? '—'], ['Credentials', current?.credentials_configured ? `Configured · v${current.credential_version}` : 'Not configured'],
          ['Default online', current?.scope === 'platform' ? (current.is_default ? 'Yes' : 'No') : 'Not applicable'],
          ['Latest test', current?.last_test_status ?? 'Not tested'],
        ].map(([label, value]) => <div className="rounded-xl bg-background p-3" key={label}><dt className="text-xs text-text-tertiary">{label}</dt><dd className="mt-1 font-bold text-text">{value}</dd></div>)}</dl>
        <div className="mt-3 rounded-xl bg-background p-3"><p className="text-xs text-text-tertiary">Account callback URL</p><p className="mt-1 break-all text-sm font-semibold text-text">{current?.callback_url ?? 'Not configured'}</p><p className="mt-1 text-xs text-text-secondary">This account-specific address links callbacks to the correct system or business account.</p></div>
        {hasPermission('platform.payments.test') && <button disabled={!current || busy} className={`${secondary} mt-5 w-full`} onClick={() => test.mutate()}>{test.isPending ? 'Testing with Daraja…' : 'Test credentials'}</button>}
        <div className="mt-3 flex gap-3">{hasPermission('platform.payments.activate') && <button disabled={!current || current.last_test_status !== 'passed' || busy} className={`${primary} flex-1`} onClick={() => void requestReason('activate')}>Activate</button>}{hasPermission('platform.payments.suspend') && <button disabled={!current || current.status !== 'active' || busy} className={`${secondary} flex-1`} onClick={() => void requestReason('suspend')}>Suspend</button>}</div>
      </section>

      <section className={`${panel} p-5 sm:p-6`}>
        <div className="flex items-start gap-3"><ShieldCheckIcon className="h-6 w-6 text-primary-dark" /><div><h2 className="font-bold text-text">{current ? 'Update configuration' : 'Configure account'}</h2><p className="mt-1 text-sm text-text-secondary">Leave all credential fields empty to keep the stored secret. Entering credentials replaces them and requires another test.</p></div></div>
        {hasPermission('platform.payments.configure') ? <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <label className="text-sm font-semibold text-text">Environment<select className={input} value={form.environment} onChange={event => setForm({ ...form, environment: event.target.value as MpesaConfiguration['environment'] })}><option value="sandbox">Sandbox</option><option value="production">Production</option></select></label>
          <label className="text-sm font-semibold text-text">Merchant type<select className={input} value={form.merchant_type} onChange={event => setForm({ ...form, merchant_type: event.target.value as MpesaConfiguration['merchant_type'] })}><option value="paybill">PayBill</option><option value="till">Till / Buy Goods</option></select></label>
          <label className="text-sm font-semibold text-text">Shortcode<input className={input} required={!current} minLength={2} value={form.shortcode ?? ''} placeholder={current ? `Leave blank to keep ${current.shortcode}` : 'Enter shortcode'} onChange={event => setForm({ ...form, shortcode: event.target.value })} /></label>
          <label className="text-sm font-semibold text-text">Transaction type<input className={input} required value={form.transaction_type} onChange={event => setForm({ ...form, transaction_type: event.target.value })} /></label>
          <label className="text-sm font-semibold text-text sm:col-span-2">Public callback URL<input className={input} required type="url" inputMode="url" placeholder="https://api.example.com" value={form.callback_url} onChange={event => setForm({ ...form, callback_url: event.target.value })} /><span className="mt-1 block text-xs font-normal text-text-secondary">Enter the public HTTPS API address. The system adds this account’s secure callback path automatically.</span></label>
          <label className="text-sm font-semibold text-text">Consumer key<input className={input} type="password" autoComplete="new-password" value={form.consumer_key ?? ''} onChange={event => setForm({ ...form, consumer_key: event.target.value })} /></label>
          <label className="text-sm font-semibold text-text">Consumer secret<input className={input} type="password" autoComplete="new-password" value={form.consumer_secret ?? ''} onChange={event => setForm({ ...form, consumer_secret: event.target.value })} /></label>
          <label className="text-sm font-semibold text-text sm:col-span-2">Passkey<input className={input} type="password" autoComplete="new-password" value={form.passkey ?? ''} onChange={event => setForm({ ...form, passkey: event.target.value })} /></label>
          <label className="text-sm font-semibold text-text sm:col-span-2">Audit reason<textarea className={input} required minLength={3} maxLength={500} rows={3} value={form.reason} onChange={event => setForm({ ...form, reason: event.target.value })} /></label>
          {actionError && <p role="alert" className="rounded-xl bg-error/5 p-3 text-sm text-error sm:col-span-2">{errorText(actionError)}</p>}
          <button className={`${primary} sm:col-span-2`} disabled={busy || form.reason.trim().length < 3}>{save.isPending ? 'Saving securely…' : current && form.consumer_key ? 'Save and rotate credentials' : 'Save configuration'}</button>
        </form> : <p className="mt-5 rounded-xl bg-background p-4 text-sm text-text-secondary">Your role has read-only access to payment configuration.</p>}
      </section>
    </div>}

    {selectedBusinessId && <section className={`${panel} p-5`}><h2 className="font-bold text-text">Enabled POS branches</h2><p className="mt-1 text-sm text-text-secondary">M-Pesa availability follows each branch payment mode.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{branches.data?.map(branch => <div key={branch.id} className="flex items-center justify-between rounded-xl bg-background p-3"><div><p className="font-semibold text-text">{branch.name}</p><p className="text-xs text-text-tertiary">{branch.code}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${branch.mpesa_enabled ? 'bg-success-light text-success-dark' : 'bg-white text-text-secondary'}`}>{branch.mpesa_enabled ? 'Enabled' : 'Not enabled'}</span></div>)}{branches.data?.length === 0 && <p className="text-sm text-text-secondary">No branches found.</p>}</div></section>}

    <section className={`${panel} p-5`}><h2 className="font-bold text-text">Audit history</h2><p className="mt-1 text-sm text-text-secondary">Configuration changes, tests, activation and suspension are recorded here.</p><div className="mt-4 divide-y divide-border">{audit.data?.slice(0, 10).map(event => <div className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm" key={event.id}><div><p className="font-semibold text-text">{event.action.replace('platform.payments.', '').replaceAll('_', ' ')}</p><p className="text-xs text-text-tertiary">Actor #{event.actor_user_id ?? 'system'}</p></div><time className="text-xs text-text-secondary">{new Date(event.created_at).toLocaleString()}</time></div>)}{audit.data?.length === 0 && <p className="py-4 text-sm text-text-secondary">No payment configuration activity yet.</p>}</div></section>
  </div>
}
