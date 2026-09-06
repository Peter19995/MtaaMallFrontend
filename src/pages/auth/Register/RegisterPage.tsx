import { FormEvent, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import {
  BuildingStorefrontIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  UserIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { registerRequest, type AccountType } from '@api/modules/auth.api'
import brandLogo from '@/assets/business-logo.svg'

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') return detail[0].msg
    if (typeof error.response?.data?.message === 'string') return error.response.data.message
  }
  return 'Account creation failed. Please try again.'
}

const RegisterPage = () => {
  const [accountType, setAccountType] = useState<AccountType>('customer')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [created, setCreated] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setErrorMessage(null)
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      await registerRequest({
        account_type: accountType,
        full_name: accountType === 'business' ? fullName.trim() || undefined : undefined,
        username: username.trim(),
        email: accountType === 'business' ? email.trim() || undefined : undefined,
        phone: phone.trim() || undefined,
        password
      })
      setCreated(true)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (created) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4">
        <div className="w-full max-w-md rounded-3xl border border-border bg-white p-8 text-center shadow-2xl">
          <CheckCircleIcon className="mx-auto h-16 w-16 text-success" />
          <h1 className="mt-5 text-2xl font-bold text-text">Your account is ready</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Sign in to {accountType === 'business' ? 'manage your business' : 'continue shopping'}.
          </p>
          <Link to="/login" className="mt-6 inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-primary to-secondary px-4 py-3 text-sm font-semibold text-white">
            Continue to sign in
          </Link>
        </div>
      </div>
    )
  }

  const inputClass = 'w-full rounded-xl border-2 border-border bg-background px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/20'

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl rounded-3xl border border-border bg-white/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="text-center">
          <img src={brandLogo} alt="MtaaMall logo" className="mx-auto h-16 w-auto rounded-full" />
          <h1 className="mt-4 text-2xl font-bold text-text">Create your MtaaMall account</h1>
          <p className="mt-1 text-sm text-text-secondary">Choose how you plan to use MtaaMall.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Account type</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ['customer', UserIcon, 'Customer', 'Shop products and manage your purchases.'],
                ['business', BuildingStorefrontIcon, 'Business', 'Manage products, stock, POS and operations.']
              ] as const).map(([value, Icon, title, description]) => (
                <button key={value} type="button" onClick={() => setAccountType(value)} className={`rounded-2xl border-2 p-4 text-left transition ${accountType === value ? 'border-primary bg-primary/10 ring-2 ring-primary/10' : 'border-border hover:border-primary/40'}`}>
                  <Icon className="h-6 w-6 text-primary" />
                  <span className="mt-2 block text-sm font-semibold text-text">{title}</span>
                  <span className="mt-1 block text-xs text-text-secondary">{description}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-medium text-text-secondary">Username<input className={`${inputClass} mt-1`} value={username} onChange={(e) => setUsername(e.target.value)} pattern="[A-Za-z0-9_]+" minLength={3} maxLength={50} autoComplete="username" required /></label>
            {accountType === 'business' && <label className="text-xs font-medium text-text-secondary">Full name<input className={`${inputClass} mt-1`} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required /></label>}
            {accountType === 'business' && <label className="text-xs font-medium text-text-secondary">Email address <span className="font-normal text-text-tertiary">(optional)</span><input className={`${inputClass} mt-1`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>}
            <label className="text-xs font-medium text-text-secondary">Phone number {accountType === 'business' && <span className="font-normal text-text-tertiary">(optional)</span>}<input className={`${inputClass} mt-1`} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required={accountType === 'customer'} /></label>
            <label className="text-xs font-medium text-text-secondary">Password<span className="relative mt-1 block"><input className={`${inputClass} pr-10`} type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} autoComplete="new-password" required /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 px-3 text-text-tertiary hover:text-primary">{showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}</button></span></label>
            <label className="text-xs font-medium text-text-secondary">Confirm password<input className={`${inputClass} mt-1`} type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} autoComplete="new-password" required /></label>
          </div>

          <p className="text-xs text-text-tertiary">Use at least 8 characters with uppercase, lowercase, a number and a special character.</p>
          {errorMessage && <div className="flex items-center gap-2 rounded-xl border border-error/20 bg-error/10 p-3 text-xs text-error"><XCircleIcon className="h-5 w-5 flex-none" />{errorMessage}</div>}
          <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-gradient-to-r from-primary to-secondary px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{isSubmitting ? 'Creating account…' : `Create ${accountType} account`}</button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">Already have an account? <Link to="/login" className="font-semibold text-primary hover:text-primary-dark">Sign in</Link></p>
      </div>
    </div>
  )
}

export default RegisterPage
