import { downloadBusinessDocument } from '@api/modules/businesses.api'
import { useWorkspacePath } from '@hooks/useWorkspacePath'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BuildingOffice2Icon, BuildingStorefrontIcon, CheckIcon, ClipboardDocumentIcon, GlobeAltIcon, ShieldCheckIcon, ArrowUpRightIcon, LockClosedIcon, ClockIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@hooks/useAuth'
import { getMyBusiness, getMyBusinessDocuments, getMyBusinessOnboarding, submitMyBusinessDocument, updateMyBusiness, type BusinessStatus } from '@api/modules/businesses.api'
import { allowedStatusChanges, isBusinessReadOnly } from '@utils/businessLifecycle'
import { BusinessDetails, BusinessForm, LifecycleActions, ErrorNotice, StatusBadge, secondary } from './BusinessComponents'
import { Select } from '@components/common'
import './business-workspace.css'

const statusCopy: Record<BusinessStatus, { title: string; description: string }> = {
  draft: { title: 'Let’s get your business ready', description: 'Complete your profile, save your details and submit your business for review.' },
  pending_verification: { title: 'Your business is in review', description: 'Your application has been submitted. You can use local POS while platform staff review it. The online shop unlocks after activation.' },
  active: { title: 'You’re ready for business', description: 'Your business is active. Your team can use the tools available to their roles.' },
  rejected: { title: 'Your application needs attention', description: 'Review the feedback below. Return to draft, update your details and submit again when you’re ready.' },
  suspended: { title: 'Business operations are paused', description: 'Profile changes, POS and management updates are disabled. Authorized order and report history remains available.' },
  closed: { title: 'This business is closed', description: 'Your profile is read-only. Authorized historical records remain available, but this business cannot be reopened.' },
}

export default function MyBusinessPage() {
  const workspacePath = useWorkspacePath()
  const { user, hasPermission } = useAuth()
  const client = useQueryClient()
  const [copyStatus, setCopyStatus] = useState('')
  const [documentType, setDocumentType] = useState('registration_certificate')
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [downloadError, setDownloadError] = useState('')
  const query = useQuery({ queryKey: ['businesses', 'mine', user?.id], queryFn: getMyBusiness, refetchInterval: 30000 })
  const onboarding = useQuery({ queryKey: ['businesses', 'onboarding', user?.id], queryFn: () => getMyBusinessOnboarding(),
    enabled: user?.business_status === 'pending_verification' })
  const documents = useQuery({ queryKey: ['businesses', 'documents', user?.id], queryFn: getMyBusinessDocuments })
  const save = useMutation({ mutationFn: updateMyBusiness, onSuccess: async business => {
    client.setQueryData(['businesses', 'mine', user?.id], business)
    await client.invalidateQueries({ queryKey: ['tenant-state'] })
  }, onError: () => { void query.refetch() } })
  const submitDocument = useMutation({ mutationFn: submitMyBusinessDocument, onSuccess: async () => {
    setDocumentFile(null)
    await client.invalidateQueries({ queryKey: ['businesses', 'documents'] })
  } })
  const business = query.data
  const readOnly = business && (isBusinessReadOnly(business.status) || !hasPermission('business.settings.update'))
  const copyId = async () => {
    try { await navigator.clipboard.writeText(business!.public_id); setCopyStatus('Business ID copied.') }
    catch { setCopyStatus('Could not copy. Select the ID in Business record below.') }
  }
  return <div className="business-workspace">
    <header className="business-page-heading">
      <div><p className="business-eyebrow">YOUR PROFILE</p><h1>Business profile</h1><p>Manage your business identity, contact details and verification.</p></div>
      <Link to={workspacePath('/dashboard/business')} className="business-outline-button"><BuildingOffice2Icon aria-hidden="true" />Business overview</Link>
    </header>
    {query.isPending && <div className="business-loading" role="status"><span className="business-loading-line" /><span className="business-loading-line" />Loading your business…</div>}
    {query.isError && <div className="business-card"><ErrorNotice error={query.error} /><button className={secondary} onClick={() => query.refetch()}>Retry</button></div>}
    {business && !query.isError && <>
      <section className="business-identity-card" aria-label="Business overview">
        <div className="business-identity-top">
          <div className="business-avatar" aria-hidden="true">{business.display_name.slice(0, 2).toUpperCase()}</div>
          <div className="business-identity-name"><p className="business-eyebrow">BUSINESS ACCOUNT</p><h2>{business.display_name}</h2><p>{business.legal_name}<span aria-hidden="true"> · </span><span className="business-type">{business.business_type}</span></p></div>
          <StatusBadge status={business.status} />
        </div>
        <div className="business-identity-bottom">
          <span><GlobeAltIcon aria-hidden="true" />{business.country} <span className="business-dot">/</span> {business.currency} <span className="business-dot">·</span> {business.timezone}</span>
          <button onClick={copyId} className="business-copy-button"><ClipboardDocumentIcon aria-hidden="true" />Copy business ID</button>
        </div>
        {copyStatus && <p role="status" className="business-copy-status">{copyStatus}</p>}
      </section>
      <section className="business-card p-5" aria-label="Business capabilities">
        <p className="business-eyebrow">ENABLED SERVICES</p>
        <h2 className="mt-1 text-lg font-semibold">Business capabilities</h2>
        <p className="business-small-copy">Platform approval and these service switches both apply. A suspended or closed business remains read-only even when a switch is on.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[
          ['Local POS', business.local_pos_enabled], ['Storefront', business.storefront_enabled],
          ['Online orders', business.online_orders_enabled], ['Online payments', business.online_payments_enabled],
          ['Settlements', business.settlements_enabled],
        ].map(([label, enabled]) => <div key={String(label)} className={`rounded-xl border p-3 ${enabled ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}><p className="text-sm font-semibold">{label}</p><p className={`mt-1 text-xs ${enabled ? 'text-emerald-700' : 'text-slate-500'}`}>{enabled ? 'Enabled' : 'Not enabled'}</p></div>)}</div>
      </section>
      <div className="business-workspace-grid">
        <section className="business-card business-profile-card" id="business-profile">
          <header className="business-card-heading"><div><p className="business-eyebrow">BUSINESS DETAILS</p><h2>Business profile</h2><p>Keep your information accurate and up to date.</p></div><span className="business-edit-label">{readOnly ? <LockClosedIcon aria-hidden="true" /> : <ShieldCheckIcon aria-hidden="true" />}{readOnly ? 'Read-only' : 'Your information'}</span></header>
          {(save.isError || save.isSuccess) && <div className="business-save-feedback">{save.isError && <ErrorNotice error={save.error} />}{save.isSuccess && <p role="status"><CheckIcon aria-hidden="true" />Profile saved successfully.</p>}</div>}
          <BusinessForm workspace key={`${business.public_id}-${business.status}`} business={business} pending={save.isPending} disabled={Boolean(readOnly)} onSave={body => save.mutate(body)} />
        </section>
        <aside className="business-side-column" aria-label="Business status and information">
          <section className={`business-card business-verification-card business-verification-${business.status}`}>
            <div className="business-verification-icon">{business.status === 'active' ? <ShieldCheckIcon aria-hidden="true" /> : isBusinessReadOnly(business.status) ? <LockClosedIcon aria-hidden="true" /> : <ClockIcon aria-hidden="true" />}</div>
            <p className="business-eyebrow">VERIFICATION STATUS</p><h2>{statusCopy[business.status].title}</h2><p className="business-status-description">{statusCopy[business.status].description}</p>
            {onboarding.data && <p className="business-small-copy">Onboarding: <strong>{onboarding.data.status.replace(/_/g, ' ')}</strong> · Current step: {onboarding.data.current_step.replace(/_/g, ' ')}</p>}
            {business.rejection_reason && <p className="business-rejection" role="status">Review feedback: {business.rejection_reason}</p>}
            {!isBusinessReadOnly(business.status) && <ol className="business-steps" aria-label="Verification progress">
              <li className="is-complete"><span><CheckIcon aria-hidden="true" /></span><div><strong>Business account created</strong><p>Your workspace is set up.</p></div></li>
              <li className={business.status === 'active' ? 'is-complete' : 'is-current'}><span>{business.status === 'active' ? <CheckIcon aria-hidden="true" /> : '2'}</span><div><strong>{business.status === 'pending_verification' ? 'Application under review' : business.status === 'rejected' ? 'Update your application' : business.status === 'active' ? 'Application approved' : 'Complete your profile'}</strong><p>{business.status === 'pending_verification' ? 'Awaiting a platform decision.' : business.status === 'active' ? 'Reviewed by platform staff.' : 'Save your details before submitting.'}</p></div></li>
              <li className={business.status === 'active' ? 'is-complete' : ''}><span>{business.status === 'active' ? <CheckIcon aria-hidden="true" /> : '3'}</span><div><strong>Start trading</strong><p>POS and payments become available.</p></div></li>
            </ol>}
            {allowedStatusChanges(business.status, user, true).length > 0 && <div className="business-own-lifecycle"><LifecycleActions key={`${business.public_id}-${business.status}`} business={business} own /></div>}
          </section>
          <section className="business-card business-branches-card"><div className="business-side-heading"><BuildingStorefrontIcon aria-hidden="true" /><h2>Business locations</h2></div><p className="business-branch-count">{business.branches.length}<span>{business.branches.length === 1 ? 'registered branch' : 'registered branches'}</span></p><p className="business-small-copy">Organize your locations and the teams that run them.</p>{hasPermission('branches.read') && <Link to={workspacePath('/dashboard/admin/branches')} className="business-text-link">Manage branches<ArrowUpRightIcon aria-hidden="true" /></Link>}</section>
          <section className="business-card p-5"><div className="business-side-heading"><ClipboardDocumentIcon aria-hidden="true" /><h2>Verification documents</h2></div><p className="business-small-copy">Share registration evidence with the platform review team.</p>
            {documents.isError && <ErrorNotice error={documents.error} />}{downloadError && <p role="alert">{downloadError}</p>}
            <ul className="mt-3 space-y-2">{documents.data?.map(document => <li key={document.public_id} className="rounded-lg bg-slate-50 p-3 text-sm"><button className="font-semibold text-primary hover:underline" onClick={() => downloadBusinessDocument(document).catch(() => setDownloadError('Document unavailable; legacy links must be resubmitted.'))}>{document.file_name}</button><p className="mt-1 text-xs text-slate-500">{document.document_type.replaceAll('_', ' ')} · {document.status}</p></li>)}</ul>
            {['draft', 'pending_verification', 'rejected'].includes(business.status) && hasPermission('business.settings.update') && <form className="mt-4 space-y-3" onSubmit={event => { event.preventDefault(); documentFile && submitDocument.mutate({ document_type: documentType, file: documentFile }) }}>
              <Select aria-label="Document type" className="w-full rounded-lg border border-slate-200 p-2.5 text-sm" value={documentType} onChange={event => setDocumentType(event.target.value)}><option value="registration_certificate">Registration certificate</option><option value="tax_certificate">Tax certificate</option><option value="owner_identification">Owner identification</option><option value="business_permit">Business permit</option><option value="other">Other</option></Select>
              <input aria-label="Document image" required type="file" accept="image/png,image/jpeg" className="w-full text-sm" onChange={event => setDocumentFile(event.target.files?.[0] ?? null)} /><p className="text-xs text-slate-500">PNG or JPEG, maximum 5 MB. Files are validated and stored privately. PDF/office uploads are not enabled.</p>
              {submitDocument.isError && <ErrorNotice error={submitDocument.error} />}<button className="business-outline-button" disabled={submitDocument.isPending}>{submitDocument.isPending ? 'Submitting…' : 'Add document'}</button>
            </form>}
          </section>
          <details className="business-record"><summary>Business record <span>View details</span></summary><BusinessDetails business={business} /></details>
          <p className="business-privacy-note"><ShieldCheckIcon aria-hidden="true" />Business approval is managed by platform staff. Updating your profile does not change your verification status.</p>
        </aside>
      </div>
    </>}
  </div>
}
