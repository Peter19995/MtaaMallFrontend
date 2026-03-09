import { FormEvent, useState } from 'react'
import axios from 'axios'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { getMeRequest, loginRequest } from '@api/modules/auth.api'

type LoginLocationState = {
  from?: {
    pathname?: string
  }
}

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiDetail = error.response?.data?.detail

    if (typeof apiDetail === 'string' && apiDetail.trim()) {
      return apiDetail
    }

    if (Array.isArray(apiDetail)) {
      const firstError = apiDetail[0]?.msg
      if (typeof firstError === 'string' && firstError.trim()) {
        return firstError
      }
    }

    if (typeof error.response?.data?.message === 'string') {
      return error.response.data.message
    }
  }

  return 'Sign in failed. Please check your credentials and try again.'
}

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [email, setEmail] = useState('admin@julianinteriors.com')
  const [password, setPassword] = useState('ChangeMe@123')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const tokens = await loginRequest({
        username: email.trim(),
        password
      })

      const me = await getMeRequest(tokens.access_token)
      const roles = me.roles ?? []

      login(
        {
          id: String(me.id),
          name: me.full_name?.trim() ? me.full_name : me.username,
          email: me.email,
          roles,
          role: me.is_superuser ? 'admin' : roles[0] ?? 'staff'
        },
        tokens.access_token,
        tokens.refresh_token
      )

      const locationState = location.state as LoginLocationState | null
      const redirectTo = locationState?.from?.pathname ?? '/dashboard/admin'
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-surface px-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-8 shadow-xl shadow-divider/60">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-text">
            Sign in to{' '}
            <span className="text-primary">
              Julian <span className="hidden sm:inline">Interiors</span>
            </span>
          </h1>
          <p className="mt-1 text-xs text-text-tertiary">
            Access your dashboard for projects, sales, inventory and more.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary">Email or username</label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none ring-primary/10 focus:bg-surface focus:ring"
              placeholder="you@julianinteriors.com or your username"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none ring-primary/10 focus:bg-surface focus:ring"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
          {errorMessage ? <p className="text-xs text-error">{errorMessage}</p> : null}
        </form>
        <p className="mt-4 text-center text-[11px] text-text-tertiary">
          Uses your live API endpoint at `/api/v1/auth/login`.
        </p>
      </div>
    </div>
  )
}

export default LoginPage
