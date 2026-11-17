import { FormEvent, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { completeSocialProfileRequest, getMeRequest, type SocialProfilePrefill } from '@api/modules/auth.api'
import { setActiveApiContext } from '@api/config/axios.config'
import { toAuthUser } from '@contexts/AuthContext'
import { useAuth } from '@hooks/useAuth'
import brandLogo from '@/assets/mtaamall-logo.svg'

export const SOCIAL_PROFILE_COMPLETION_KEY = 'social_profile_completion'

type PendingProfile = {
  token: string
  expiresAt: number
  profile: SocialProfilePrefill
}

const readPendingProfile = (): PendingProfile | null => {
  try {
    const raw = sessionStorage.getItem(SOCIAL_PROFILE_COMPLETION_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as PendingProfile
    if (!value.token || value.expiresAt <= Date.now()) {
      sessionStorage.removeItem(SOCIAL_PROFILE_COMPLETION_KEY)
      return null
    }
    return value
  } catch {
    sessionStorage.removeItem(SOCIAL_PROFILE_COMPLETION_KEY)
    return null
  }
}

export default function SocialProfileCompletionPage() {
  const pending = useMemo(readPendingProfile, [])
  const navigate = useNavigate()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState(pending?.profile.display_name ?? '')
  const [email, setEmail] = useState(pending?.profile.email ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!pending) return <Navigate to="/login" replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await completeSocialProfileRequest({
        profile_completion_token: pending.token,
        username: username.trim(),
        phone: phone.trim(),
        full_name: fullName.trim() || undefined,
        email: email.trim() || undefined
      })
      sessionStorage.removeItem(SOCIAL_PROFILE_COMPLETION_KEY)
      setActiveApiContext('customer')
      const me = await getMeRequest()
      login(toAuthUser(me), result.access_token, result.refresh_token)
      navigate('/account', { replace: true })
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && typeof requestError.response?.data?.detail === 'string') {
        setError(requestError.response.data.detail)
      } else {
        setError('Your customer profile could not be created. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  const input = 'mt-1 w-full rounded-xl border-2 border-border bg-background px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20'
  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4 py-10">
      <section className="mx-auto w-full max-w-lg rounded-3xl border border-border bg-white p-6 shadow-2xl sm:p-8">
        <Link to="/products" className="mx-auto block w-fit"><img src={brandLogo} alt="MtaaMall" className="h-16 w-auto" /></Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary-dark">Customer account</p>
        <h1 className="mt-2 text-2xl font-bold text-text">Complete your profile</h1>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          {pending.profile.provider} verified your identity. Add the details MtaaMall needs for shopping and deliveries.
        </p>
        <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-text">Username<input className={input} value={username} onChange={e => setUsername(e.target.value)} pattern="[A-Za-z0-9_]+" minLength={3} maxLength={50} autoComplete="username" required /></label>
          <label className="text-sm font-semibold text-text">Phone number<input className={input} value={phone} onChange={e => setPhone(e.target.value)} minLength={5} maxLength={30} autoComplete="tel" required /></label>
          <label className="text-sm font-semibold text-text">Full name <span className="font-normal text-text-tertiary">(optional)</span><input className={input} value={fullName} onChange={e => setFullName(e.target.value)} maxLength={255} autoComplete="name" /></label>
          <label className="text-sm font-semibold text-text">Email <span className="font-normal text-text-tertiary">(optional)</span><input className={input} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
          <p className="sm:col-span-2 rounded-xl bg-primary/5 px-4 py-3 text-xs leading-5 text-text-secondary">
            This creates only a personal customer profile. It never creates a business or grants administrative access.
          </p>
          {error && <p role="alert" className="sm:col-span-2 rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</p>}
          <button disabled={busy} className="sm:col-span-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-4 py-3 font-semibold text-white disabled:opacity-60">
            {busy ? 'Creating customer profile…' : 'Create customer profile'}
          </button>
        </form>
      </section>
    </main>
  )
}
