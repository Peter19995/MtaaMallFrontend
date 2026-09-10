import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { acceptBusinessInvitation } from '@api/modules/memberships.api'
import { useAuth } from '@hooks/useAuth'

export default function BusinessInvitationAcceptPage() {
  const { user, refreshIdentity } = useAuth()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const accept = async () => {
    if (!token) return setError('This invitation link is incomplete.')
    setPending(true); setError('')
    try { await acceptBusinessInvitation(token); await refreshIdentity(); setDone(true) }
    catch (cause) {
      const detail = axios.isAxiosError(cause) ? cause.response?.data?.detail || cause.response?.data?.message : null
      setError(typeof detail === 'string' ? detail : 'The invitation could not be accepted.')
    } finally { setPending(false) }
  }
  return <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-slate-100 px-4">
    <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Business invitation</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">{done ? 'Welcome to the team' : 'Join a business workspace'}</h1>
      {done ? <><p className="mt-3 text-sm text-slate-600">Your membership is active. Choose the new business from your workspace list to continue.</p><Link className="mt-6 inline-flex w-full justify-center rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white" to="/account/workspaces">Choose workspace</Link></> : <>
        <p className="mt-3 text-sm text-slate-600">You are signed in as <strong>{user?.email || user?.username}</strong>. This must match the email address that received the invitation.</p>
        {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
        <button className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-60" disabled={pending || !token} onClick={accept}>{pending ? 'Accepting invitation…' : 'Accept invitation'}</button>
      </>}
    </section>
  </main>
}
