import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  exchangeSocialTicketRequest,
  getMeRequest
} from '@api/modules/auth.api'
import { setActiveApiContext } from '@api/config/axios.config'
import { toAuthUser } from '@contexts/AuthContext'
import { useAuth } from '@hooks/useAuth'
import brandLogo from '@/assets/mtaamall-logo.svg'

const PROFILE_COMPLETION_KEY = 'social_profile_completion'

const SocialAuthCallbackPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const started = useRef(false)
  const [message, setMessage] = useState('Completing your secure sign-in…')
  const [failed, setFailed] = useState(false)
  const [needsProfile, setNeedsProfile] = useState(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const ticket = searchParams.get('ticket')
    const providerError = searchParams.get('error')
    if (!ticket || providerError) {
      setFailed(true)
      setMessage(providerError === 'social_auth_cancelled'
        ? 'Social sign-in was cancelled.'
        : 'This social sign-in link is invalid or has expired.')
      return
    }

    exchangeSocialTicketRequest(ticket).then(async result => {
      if (result.status === 'profile_completion_required') {
        sessionStorage.setItem(PROFILE_COMPLETION_KEY, JSON.stringify({
          token: result.profile_completion_token,
          expiresAt: Date.now() + result.expires_in * 1000,
          profile: result.profile
        }))
        setNeedsProfile(true)
        setMessage('Your provider identity is verified. Complete your customer profile to continue.')
        return
      }
      setActiveApiContext('customer')
      const me = await getMeRequest()
      login(toAuthUser(me), result.access_token, result.refresh_token)
      navigate('/account', { replace: true })
    }).catch(() => {
      setFailed(true)
      setMessage('Social sign-in could not be completed. Please start again.')
    })
  }, [login, navigate, searchParams])

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <section className="mx-auto max-w-md rounded-3xl border border-border bg-white p-8 text-center shadow-xl">
        <img src={brandLogo} alt="MtaaMall" className="mx-auto mb-5 h-16 w-auto" />
        {!failed && !needsProfile && (
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
        <h1 className="text-xl font-bold text-text">
          {failed ? 'Sign-in not completed' : needsProfile ? 'Customer profile required' : 'Signing you in'}
        </h1>
        <p className="mt-3 text-sm text-text-secondary">{message}</p>
        {failed && (
          <Link
            to="/login"
            className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white"
          >
            Return to sign in
          </Link>
        )}
        {needsProfile && (
          <p className="mt-5 rounded-xl bg-primary/10 px-4 py-3 text-xs text-primary">
            Your secure profile-completion ticket is ready for the customer registration step.
          </p>
        )}
      </section>
    </main>
  )
}

export default SocialAuthCallbackPage
