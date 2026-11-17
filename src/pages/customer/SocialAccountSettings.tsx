import { FormEvent, useEffect, useState } from 'react'
import axios from 'axios'
import {
  addSocialPasswordRequest,
  closeSocialAccountRequest,
  listSocialIdentitiesRequest,
  unlinkSocialIdentityRequest,
  type SocialIdentity
} from '@api/modules/auth.api'
import { useAuth } from '@hooks/useAuth'
import SocialLoginButtons from '@pages/auth/SocialLoginButtons'

const errorText = (error: unknown) => {
  if (axios.isAxiosError(error) && typeof error.response?.data?.detail === 'string') return error.response.data.detail
  return 'The account change could not be completed.'
}

export default function SocialAccountSettings({ passwordEnabled }: { passwordEnabled: boolean }) {
  const { logout } = useAuth()
  const [identities, setIdentities] = useState<SocialIdentity[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showClose, setShowClose] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = () => {
    setLoading(true)
    listSocialIdentitiesRequest()
      .then(setIdentities)
      .catch(error => setNotice(errorText(error)))
      .finally(() => { setLoading(false); setBusy(false) })
  }
  useEffect(load, [])

  const unlink = async (identity: SocialIdentity) => {
    setBusy(true); setNotice('')
    try {
      const result = await unlinkSocialIdentityRequest(identity.provider)
      setNotice(result.message)
      load()
    } catch (error) { setNotice(errorText(error)); setBusy(false) }
  }

  const addPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const password = String(fields.get('password') ?? '')
    const confirmation = String(fields.get('confirmation') ?? '')
    if (password !== confirmation) { setNotice('Passwords do not match.'); return }
    setBusy(true); setNotice('')
    try { await addSocialPasswordRequest(password); logout() }
    catch (error) { setNotice(errorText(error)); setBusy(false) }
  }

  const close = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    setBusy(true); setNotice('')
    try {
      await closeSocialAccountRequest(String(fields.get('confirmation') ?? ''), String(fields.get('password') ?? '') || undefined)
      logout()
    } catch (error) { setNotice(errorText(error)); setBusy(false) }
  }

  return (
    <section className="rounded-2xl border border-border/80 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="sign-in-methods-heading">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-dark">Account access</p><h2 id="sign-in-methods-heading" className="mt-1 text-xl font-bold text-text">Sign-in methods</h2><p className="mt-1 text-sm text-text-secondary">Connect providers for recovery. Social sign-in always opens only your customer workspace.</p></div>
        {!passwordEnabled && <button type="button" onClick={() => setShowPassword(value => !value)} className="rounded-xl border border-primary/30 px-4 py-2 text-sm font-bold text-primary-dark hover:bg-primary/5">Add password</button>}
      </div>
      <div className="mt-5 space-y-3">
        {loading && <p className="text-sm text-text-secondary">Loading sign-in methods…</p>}
        {identities.map(identity => <article key={identity.public_id} className="flex flex-col gap-3 rounded-xl border border-border bg-background/60 p-4 sm:flex-row sm:items-center">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white font-bold text-primary-dark shadow-sm">{identity.display_name.charAt(0)}</span>
          <div className="min-w-0 flex-1"><p className="font-bold text-text">{identity.display_name}</p><p className="truncate text-xs text-text-secondary">{identity.provider_email || identity.profile_name || 'Connected account'}</p></div>
          <button type="button" disabled={busy} onClick={() => unlink(identity)} className="rounded-lg px-3 py-2 text-sm font-semibold text-error hover:bg-error/10 disabled:opacity-50">Disconnect</button>
        </article>)}
      </div>
      <div className="mt-5"><p className="mb-2 text-sm font-semibold text-text">Connect another account</p><SocialLoginButtons mode="link" compact excludeProviders={identities.map(item => item.provider)} /></div>
      {showPassword && !passwordEnabled && <form onSubmit={addPassword} className="mt-5 grid gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:grid-cols-2">
        <p className="sm:col-span-2 text-sm text-text-secondary">A password enables account recovery and authentication before joining a business workspace.</p>
        <input name="password" type="password" minLength={6} required placeholder="New password" className="rounded-xl border border-border bg-white px-3 py-2.5" />
        <input name="confirmation" type="password" minLength={6} required placeholder="Confirm password" className="rounded-xl border border-border bg-white px-3 py-2.5" />
        <button disabled={busy} className="sm:col-span-2 rounded-xl bg-primary-dark px-4 py-2.5 font-bold text-white disabled:opacity-50">Save password and sign out</button>
      </form>}
      {notice && <p role="status" className="mt-4 rounded-xl bg-background px-4 py-3 text-sm text-text-secondary">{notice}</p>}
      <div className="mt-7 border-t border-divider pt-5">
        <button type="button" onClick={() => setShowClose(value => !value)} className="text-sm font-semibold text-error">Close customer account</button>
        {showClose && <form onSubmit={close} className="mt-3 grid gap-3 rounded-xl border border-error/20 bg-error/5 p-4">
          <p className="text-sm text-text-secondary">This closes shopping access and anonymizes your profile. Active workspaces must be transferred first.</p>
          <input name="confirmation" required placeholder="Type CLOSE ACCOUNT" className="rounded-xl border border-border bg-white px-3 py-2.5" />
          {passwordEnabled && <input name="password" type="password" required placeholder="Current password" className="rounded-xl border border-border bg-white px-3 py-2.5" />}
          <button disabled={busy} className="w-fit rounded-xl bg-error px-4 py-2.5 font-bold text-white disabled:opacity-50">Permanently close account</button>
        </form>}
      </div>
    </section>
  )
}
