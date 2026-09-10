import { FormEvent, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { requestPasswordResetRequest, confirmPasswordResetRequest } from '@api/modules/auth.api'
import { securityError } from '../SecurityPage'
import brandLogo from '@/assets/mtaamall-logo.svg'

type Notice = { kind: 'success' | 'error'; text: string } | null

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setNotice(null)
    try {
      if (token) {
        await confirmPasswordResetRequest({ token, new_password: password })
        setPassword('')
        setNotice({ kind: 'success', text: 'Password reset. Sign in again. MFA remains enabled.' })
        window.history.replaceState({}, '', '/reset-password')
      } else {
        await requestPasswordResetRequest({ email })
        setNotice({ kind: 'success', text: 'If an account uses that email, reset instructions will be sent.' })
      }
    } catch (error) {
      setNotice({ kind: 'error', text: securityError(error) })
    } finally {
      setBusy(false)
    }
  }

  return <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4 py-10 sm:px-6 lg:px-8">
    <div aria-hidden="true" className="absolute -right-36 -top-36 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
    <div aria-hidden="true" className="absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-secondary/15 blur-3xl" />
    <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-3xl" />

    <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center lg:max-w-6xl">
      <div className="grid w-full overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-[0_28px_80px_rgba(30,43,50,0.14)] backdrop-blur-xl lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-text p-10 text-white lg:flex lg:flex-col lg:justify-between" aria-label="Password recovery information">
          <div aria-hidden="true" className="absolute -right-16 top-12 h-52 w-52 rounded-full border-[34px] border-primary/10" />
          <div aria-hidden="true" className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-secondary/10 blur-2xl" />
          <Link to="/" className="relative z-10 inline-flex w-fit rounded-2xl bg-white px-4 py-3 shadow-lg"><img src={brandLogo} alt="MtaaMall home" className="h-10 w-auto" /></Link>
          <div className="relative z-10 py-12"><span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary-light"><ShieldCheckIcon className="h-4 w-4" />Secure recovery</span><h1 className="mt-5 text-4xl font-bold leading-tight">Get back to shopping safely.</h1><p className="mt-4 max-w-sm leading-7 text-white/65">Reset your MtaaMall password through a secure, time-limited link. Your orders, carts and account details stay protected.</p></div>
          <div className="relative z-10 flex items-center gap-3 border-t border-white/10 pt-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-success/15 text-success-light"><CheckCircleIcon className="h-5 w-5" /></span><div><p className="text-sm font-semibold">Privacy protected</p><p className="text-xs text-white/50">We never reveal whether an email is registered.</p></div></div>
        </section>

        <section className="flex items-center px-6 py-10 sm:px-10 lg:px-14 lg:py-16">
          <div className="mx-auto w-full max-w-md">
            <Link to="/" className="mb-8 inline-flex lg:hidden"><img src={brandLogo} alt="MtaaMall home" className="h-11 w-auto" /></Link>
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/15 text-primary-dark"><LockClosedIcon className="h-7 w-7" /></span>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary-dark">Account recovery</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-text">{token ? 'Choose a new password' : 'Forgot your password?'}</h2>
            <p className="mt-3 text-sm leading-6 text-text-secondary">{token ? 'Create a new password with at least 6 characters to secure your account.' : 'Enter your email and we’ll send password-reset instructions if it matches an account.'}</p>

            <form onSubmit={submit} className="mt-8 space-y-5">
              {token ? <label className="block text-sm font-semibold text-text">New password<div className="relative mt-2"><LockClosedIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-tertiary" /><input className="w-full rounded-xl border border-border bg-background/60 py-3 pl-12 pr-12 text-text outline-none transition placeholder:text-text-tertiary focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10" required type={showPassword ? 'text' : 'password'} minLength={6} value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" placeholder="At least 6 characters" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-text-tertiary transition hover:bg-primary/5 hover:text-primary-dark">{showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}</button></div></label> : <label className="block text-sm font-semibold text-text">Email address<div className="relative mt-2"><EnvelopeIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-tertiary" /><input className="w-full rounded-xl border border-border bg-background/60 py-3 pl-12 pr-4 text-text outline-none transition placeholder:text-text-tertiary focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10" required type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" /></div></label>}
              <button className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-5 py-3.5 font-bold text-white shadow-lg shadow-primary/15 transition hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60" disabled={busy}>{busy ? 'Please wait…' : token ? 'Reset password' : 'Send reset instructions'}{!busy && <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-1" />}</button>
            </form>

            {notice && <div role="status" className={`mt-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${notice.kind === 'success' ? 'border-success/20 bg-success-light/30 text-success-dark' : 'border-error/20 bg-error-light/30 text-error-dark'}`}><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-current text-xs">{notice.kind === 'success' ? '✓' : '!'}</span><span>{notice.text}</span></div>}
            <Link className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-text-secondary transition hover:text-primary-dark" to="/login"><ArrowLeftIcon className="h-4 w-4" />Back to sign in</Link>
          </div>
        </section>
      </div>
    </div>
  </main>
}
