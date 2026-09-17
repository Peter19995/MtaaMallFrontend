import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import {
  ArrowRightIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import api from '@api/config/axios.config'
import { changePasswordRequest, logoutRequest } from '@api/modules/auth.api'
import { useAuth } from '@hooks/useAuth'
import brandLogo from '@/assets/mtaamall-logo.svg'
import { loginLanding } from '@utils/experiences'

type SecurityState = {
  email?: string
  email_required: boolean
  must_change_password: boolean
  mfa_required: boolean
  mfa_enabled: boolean
  mfa_needed: boolean
  verification_bypassed?: boolean
  ready: boolean
}

type SecurityCardProps = {
  icon: typeof ShieldCheckIcon
  title: string
  description?: string
  children: ReactNode
}

export const securityError = (error: unknown) =>
  isAxiosError(error)
    ? error.response?.data?.message ?? 'Request failed. Try again.'
    : error instanceof Error
      ? error.message
      : 'Request failed'

const SecurityCard = ({ icon: Icon, title, description, children }: SecurityCardProps) => (
  <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
    <div className="flex items-start gap-4 border-b border-divider bg-background/70 px-5 py-5 sm:px-6">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-dark">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-lg font-bold text-text">{title}</h2>
        {description && <p className="mt-1 text-sm leading-6 text-text-secondary">{description}</p>}
      </div>
    </div>
    <div className="p-5 sm:p-6">{children}</div>
  </section>
)

const ProgressItem = ({ complete, label, detail }: { complete: boolean; label: string; detail: string }) => (
  <li className="flex items-start gap-3">
    {complete ? (
      <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-success" />
    ) : (
      <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-secondary">
        <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
      </span>
    )}
    <div>
      <p className="text-sm font-semibold text-white">{label}</p>
      <p className="mt-0.5 text-xs leading-5 text-white/60">{detail}</p>
    </div>
  </li>
)

export default function SecurityPage() {
  const [state, setState] = useState<SecurityState | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [code, setCode] = useState('')
  const [secret, setSecret] = useState('')
  const [codes, setCodes] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const { refreshIdentity } = useAuth()
  const navigate = useNavigate()

  const reload = async () => {
    const next = (await api.get<SecurityState>('/auth/security/status')).data
    setState(next)
    setEmail(next.email ?? '')
  }

  useEffect(() => {
    reload()
      .catch(error => setError(securityError(error)))
      .finally(() => setLoading(false))
  }, [])

  const run = async (operation: () => Promise<void>) => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await operation()
    } catch (error) {
      setError(securityError(error))
    } finally {
      setBusy(false)
    }
  }

  const needsExistingMfa = state?.mfa_enabled && state.mfa_needed
  const input = 'mt-2 w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-text outline-none transition placeholder:text-text-tertiary/60 focus:border-primary focus:ring-4 focus:ring-primary/15'
  const primaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-text px-5 py-3 text-sm font-semibold text-white transition hover:bg-text/90 focus:outline-none focus:ring-4 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-40'
  const secondaryButton = 'inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-white px-5 py-3 text-sm font-semibold text-text transition hover:border-primary hover:text-primary-dark disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4 py-7 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <header className="mb-7 flex items-center justify-between">
          <Link to="/" aria-label="MtaaMall home" className="inline-flex rounded-lg focus:outline-none focus:ring-4 focus:ring-primary/20">
            <img src={brandLogo} alt="MtaaMall" className="h-10 w-auto sm:h-12" />
          </Link>
          <span className="hidden items-center gap-2 rounded-full border border-primary/25 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark sm:inline-flex">
            <ShieldCheckIcon className="h-4 w-4" />
            Secure account
          </span>
        </header>

        <div className="grid items-start gap-7 lg:grid-cols-[0.78fr_1.22fr]">
          <aside className="rounded-3xl bg-text p-6 text-white shadow-xl sm:p-8 lg:sticky lg:top-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-primary-light">
              <LockClosedIcon className="h-4 w-4" />
              Account protection
            </span>
            <h1 className="mt-6 text-3xl font-bold leading-tight sm:text-4xl">Keep your MtaaMall account secure.</h1>
            <p className="mt-4 text-sm leading-7 text-white/70">
              Complete the steps required for your account. Your shopping, business and platform access stay protected throughout setup.
            </p>

            <div className="my-7 h-px bg-white/10" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Your security checklist</p>
            <ul className="mt-5 space-y-5">
              <ProgressItem complete={Boolean(state && !state.email_required)} label="Email verified" detail="Confirm that the account belongs to you." />
              <ProgressItem complete={Boolean(state && !state.must_change_password)} label="Secure password" detail="Use a password with at least 6 characters." />
              {(state?.mfa_required || state?.mfa_enabled) && (
                <ProgressItem complete={Boolean(state?.mfa_enabled && !state?.mfa_needed)} label="Two-step verification" detail="Required for platform staff and business owners." />
              )}
            </ul>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold">Why am I seeing this?</p>
              <p className="mt-2 text-xs leading-5 text-white/60">MtaaMall requires extra protection before granting access to sensitive account or business features.</p>
            </div>
          </aside>

          <div className="space-y-5">
            <div className="px-1">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Security centre</p>
              <h2 className="mt-2 text-2xl font-bold text-text sm:text-3xl">{state?.ready ? 'Your account is protected' : 'Finish securing your account'}</h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">Follow the required steps below. Your progress is saved automatically.</p>
            </div>

            {error && (
              <div role="alert" className="flex gap-3 rounded-2xl border border-error/25 bg-error-light/35 p-4 text-sm text-error-dark">
                <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
            {message && (
              <div role="status" className="flex gap-3 rounded-2xl border border-primary/30 bg-info-light p-4 text-sm text-text">
                <CheckCircleIcon className="h-5 w-5 shrink-0 text-primary-dark" />
                <p>{message}</p>
              </div>
            )}

            {state?.verification_bypassed && (
              <div role="status" className="flex gap-3 rounded-2xl border border-warning/40 bg-warning-light/45 p-4 text-sm text-text">
                <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-warning-dark" />
                <p><strong>Development mode:</strong> Email and two-step verification are temporarily bypassed. This cannot be enabled in production.</p>
              </div>
            )}

            {loading && (
              <div className="flex min-h-40 items-center justify-center rounded-2xl border border-border bg-white">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="Loading security status" />
              </div>
            )}

            {!loading && !state && (
              <SecurityCard icon={LockClosedIcon} title="Sign in required" description="Sign in before managing your account security settings.">
                <Link to="/login" className={primaryButton}>Sign in to continue <ArrowRightIcon className="h-4 w-4" /></Link>
              </SecurityCard>
            )}

            {needsExistingMfa && (
              <SecurityCard icon={DevicePhoneMobileIcon} title="Two-step verification" description="Enter a current authenticator code or one of your unused recovery codes.">
                <form onSubmit={e => { e.preventDefault(); void run(async () => {
                  await api.post('/auth/security/mfa/verify', { code: code.trim() })
                  setCode('')
                  const user = await refreshIdentity()
                  navigate(loginLanding(user), { replace: true })
                }) }}>
                  <label className="block text-sm font-semibold text-text-secondary">Authenticator or recovery code<input aria-label="MFA code" className={input} value={code} onChange={e => setCode(e.target.value)} autoComplete="one-time-code" required maxLength={64} /></label>
                  <button className={`${primaryButton} mt-4`} disabled={busy}>Verify code <ArrowRightIcon className="h-4 w-4" /></button>
                  <p className="mt-4 text-xs leading-5 text-text-tertiary">Codes cannot be reused. Wait for the next authenticator code if you just used one. Password reset does not remove MFA.</p>
                </form>
              </SecurityCard>
            )}

            {state && !needsExistingMfa && (
              <>
                {state.email_required && (
                  <SecurityCard icon={EnvelopeIcon} title="Verify your email" description="We will send a secure verification link to this address.">
                    <form onSubmit={e => { e.preventDefault(); void run(async () => { await api.post('/auth/security/email/request', { email }); setMessage('If this address is available, verification instructions will be sent. Check your inbox, then refresh below.') }) }}>
                      <label className="block text-sm font-semibold text-text-secondary">Email address<input className={input} type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <button className={primaryButton} disabled={busy}>Send verification email</button>
                        <button type="button" className={secondaryButton} disabled={busy} onClick={() => void run(reload)}>I verified my email</button>
                      </div>
                    </form>
                  </SecurityCard>
                )}

                {state.must_change_password && (
                  <SecurityCard icon={KeyIcon} title="Replace your bootstrap password" description="Your initial administrator password cannot be used for normal operations.">
                    <form className="space-y-4" onSubmit={e => { e.preventDefault(); void run(async () => { await changePasswordRequest({ old_password: oldPassword, new_password: newPassword }); localStorage.removeItem('auth_user'); window.location.assign('/login') }) }}>
                      <label className="block text-sm font-semibold text-text-secondary">Current password<input className={input} type="password" autoComplete="current-password" required value={oldPassword} onChange={e => setOldPassword(e.target.value)} /></label>
                      <label className="block text-sm font-semibold text-text-secondary">New password<input className={input} type="password" autoComplete="new-password" minLength={6} required value={newPassword} onChange={e => setNewPassword(e.target.value)} /><span className="mt-2 block text-xs font-normal text-text-tertiary">Use at least 6 characters.</span></label>
                      <button className={primaryButton} disabled={busy}>Change password and sign out</button>
                    </form>
                  </SecurityCard>
                )}

                {!state.email_required && !state.must_change_password && state.mfa_needed && !state.mfa_enabled && (
                  <SecurityCard icon={DevicePhoneMobileIcon} title="Set up an authenticator" description="Add a time-based account in your authenticator app. Keep the setup key private.">
                    {!secret ? (
                      <button className={primaryButton} disabled={busy} onClick={() => void run(async () => { setSecret((await api.post('/auth/security/mfa/setup')).data.secret) })}>Generate setup key</button>
                    ) : (
                      <form onSubmit={e => { e.preventDefault(); void run(async () => { const result = (await api.post('/auth/security/mfa/confirm', { code: code.trim() })).data; setCodes(result.recovery_codes); setSecret(''); setCode(''); await reload() }) }}>
                        <p className="text-sm font-semibold text-text-secondary">Your private setup key</p>
                        <code className="mt-2 block break-all rounded-xl border border-border bg-background p-4 text-sm text-text">{secret}</code>
                        <label className="mt-4 block text-sm font-semibold text-text-secondary">Six-digit code<input aria-label="Confirm MFA code" className={input} inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" value={code} onChange={e => setCode(e.target.value)} placeholder="000000" /></label>
                        <button className={`${primaryButton} mt-4`} disabled={busy}>Enable MFA</button>
                      </form>
                    )}
                  </SecurityCard>
                )}
              </>
            )}

            {codes.length > 0 && (
              <section className="rounded-2xl border border-warning/60 bg-warning-light/50 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <KeyIcon className="h-6 w-6 shrink-0 text-warning-dark" />
                  <div><h2 className="font-bold text-text">Save these recovery codes now</h2><p className="mt-2 text-sm leading-6 text-text-secondary">Each works once. Store them in your password manager, separately from your authenticator. They will not be shown again.</p></div>
                </div>
                <pre className="mt-4 overflow-auto rounded-xl border border-warning/40 bg-white/80 p-4 text-sm text-text">{codes.join('\n')}</pre>
                <button className={`${primaryButton} mt-4`} onClick={() => setCodes([])}>I saved my recovery codes</button>
              </section>
            )}

            {state?.ready && !codes.length && (
              <div className="rounded-2xl border border-success/30 bg-success-light/30 p-5 sm:flex sm:items-center sm:justify-between sm:gap-5">
                <div className="flex items-start gap-3"><CheckCircleIcon className="h-6 w-6 shrink-0 text-success" /><div><p className="font-bold text-text">Security setup complete</p><p className="mt-1 text-sm text-text-secondary">You can safely continue to your MtaaMall account.</p></div></div>
                <button className={`${primaryButton} mt-4 shrink-0 sm:mt-0`} disabled={busy} onClick={() => void run(async () => { const user = await refreshIdentity(); navigate(loginLanding(user), { replace: true }) })}>Continue to my account <ArrowRightIcon className="h-4 w-4" /></button>
              </div>
            )}

            <div className="flex justify-center pb-3 pt-1">
              <button className="text-sm font-semibold text-text-secondary underline decoration-border underline-offset-4 transition hover:text-secondary" disabled={busy} onClick={() => void run(async () => { await logoutRequest(); localStorage.removeItem('auth_user'); window.location.assign('/login') })}>Sign out</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
