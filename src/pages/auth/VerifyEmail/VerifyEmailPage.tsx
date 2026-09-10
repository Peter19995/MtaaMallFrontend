import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { verifyEmailRequest } from '@api/modules/auth.api'
import { securityError } from '../SecurityPage'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [verified, setVerified] = useState(false)
  const token = params.get('token')
  return <main className="mx-auto max-w-lg space-y-5 px-5 py-16"><h1 className="text-3xl font-bold">Verify your email</h1>
    <p>Confirm mailbox ownership to continue using MtaaMall.</p>
    {message && <p role="status">{message}</p>}
    {token && !verified && <button className="rounded-xl bg-slate-900 px-5 py-3 text-white" disabled={busy} onClick={async () => {
      setBusy(true)
      try { await verifyEmailRequest(token); setVerified(true); setMessage('Email verified successfully.'); window.history.replaceState({}, '', '/verify-email') }
      catch (error) { setMessage(securityError(error)) } finally { setBusy(false) }
    }}>Verify email</button>}
    <Link className="block underline" to="/security">Return to account security</Link>
  </main>
}
