import { useEffect, useState } from 'react'
import {
  listSocialProvidersRequest,
  startSocialLoginRequest,
  type SocialProvider
} from '@api/modules/auth.api'

export const SOCIAL_AUTH_MODE_KEY = 'social_auth_mode'

type Props = {
  mode?: 'signin' | 'link'
  compact?: boolean
  excludeProviders?: SocialProvider['provider'][]
}

const providerMark: Record<SocialProvider['provider'], string> = {
  google: 'G',
  facebook: 'f',
  apple: '●'
}

export default function SocialLoginButtons({ mode = 'signin', compact = false, excludeProviders = [] }: Props) {
  const [providers, setProviders] = useState<SocialProvider[]>([])
  const [busy, setBusy] = useState<SocialProvider['provider'] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    listSocialProvidersRequest()
      .then(items => { if (active) setProviders(items) })
      .catch(() => { if (active) setProviders([]) })
    return () => { active = false }
  }, [])

  const visibleProviders = providers.filter(provider => !excludeProviders.includes(provider.provider))
  if (!visibleProviders.length) return null

  const start = async (provider: SocialProvider['provider']) => {
    setBusy(provider)
    setError('')
    try {
      sessionStorage.setItem(SOCIAL_AUTH_MODE_KEY, mode)
      const result = await startSocialLoginRequest(provider)
      window.location.assign(result.authorization_url)
    } catch {
      setBusy(null)
      setError(`${provider[0].toUpperCase()}${provider.slice(1)} sign-in is unavailable right now.`)
    }
  }

  return (
    <section aria-label={mode === 'link' ? 'Connect a social account' : 'Customer social sign in'}>
      {mode === 'signin' && (
        <div className="my-5 flex items-center gap-3 text-xs text-text-tertiary">
          <span className="h-px flex-1 bg-divider" />
          <span>Customers can also continue with</span>
          <span className="h-px flex-1 bg-divider" />
        </div>
      )}
      <div className={compact ? 'flex flex-wrap gap-2' : 'grid gap-2 sm:grid-cols-3'}>
        {visibleProviders.map(provider => (
          <button
            key={provider.provider}
            type="button"
            disabled={busy !== null}
            onClick={() => start(provider.provider)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-semibold text-text shadow-sm transition hover:border-primary/50 hover:bg-primary/5 disabled:opacity-60"
          >
            <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-background font-bold text-primary-dark">
              {providerMark[provider.provider]}
            </span>
            {busy === provider.provider ? 'Opening…' : provider.display_name}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-error">{error}</p>}
    </section>
  )
}
