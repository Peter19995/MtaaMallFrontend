import { FormEvent, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { acceptPlatformInvitationRequest } from '@api/modules/auth.api'

export default function AcceptInvitationPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('')
    if (!token) return setError('This invitation link is incomplete.')
    if (password !== confirm) return setError('Passwords do not match.')
    setPending(true)
    try { await acceptPlatformInvitationRequest(token, password); setDone(true) }
    catch (cause) { setError(axios.isAxiosError(cause) && typeof cause.response?.data?.detail === 'string' ? cause.response.data.detail : 'Invitation could not be accepted.') }
    finally { setPending(false) }
  }
  return <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4">
    <section className="w-full max-w-md rounded-3xl border border-border bg-white p-8 shadow-2xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Platform invitation</p>
      <h1 className="mt-2 text-2xl font-bold">{done ? 'Invitation accepted' : 'Secure your account'}</h1>
      {done ? <><p className="mt-3 text-sm text-text-secondary">Your platform role is active. Sign in with the username from your invitation.</p><Link className="mt-6 inline-flex w-full justify-center rounded-xl bg-primary px-4 py-3 font-semibold text-white" to="/login">Continue to sign in</Link></> :
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block text-sm">Password<input className="mt-1 w-full rounded-xl border border-border px-3 py-2.5" type="password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} /></label>
        <label className="block text-sm">Confirm password<input className="mt-1 w-full rounded-xl border border-border px-3 py-2.5" type="password" minLength={6} required value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
        <p className="text-xs text-text-tertiary">Use at least 6 characters.</p>
        {error && <p className="rounded-xl bg-error/10 p-3 text-sm text-error" role="alert">{error}</p>}
        <button className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white disabled:opacity-60" disabled={pending}>{pending ? 'Activating…' : 'Accept invitation'}</button>
      </form>}
    </section>
  </main>
}
