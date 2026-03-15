import { FormEvent, useState, useEffect } from 'react'
import axios from 'axios'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  EnvelopeIcon,
  LockClosedIcon,
  ArrowRightIcon,
  SparklesIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@hooks/useAuth'
import { getMeRequest, loginRequest } from '@api/modules/auth.api'
import { AppTheme } from '@constants/theme'
import brandLogo from '@/assets/business-logo.svg'

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

const resolveUserRole = (me: {
  is_superuser: boolean
  roles?: string[]
  permissions?: string[]
}) => {
  const roles = me.roles ?? []
  const permissions = me.permissions ?? []

  if (me.is_superuser || roles.includes('admin')) {
    return {
      role: 'admin',
      roles
    }
  }

  // The current backend can return an authenticated admin user without RBAC metadata.
  // This keeps the existing dashboard accessible until explicit role assignment is in place.
  if (roles.length === 0 && permissions.length === 0) {
    return {
      role: 'admin',
      roles: ['admin']
    }
  }

  return {
    role: roles[0] ?? 'staff',
    roles
  }
}

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [email, setEmail] = useState('admin@julianinteriors.com')
  const [password, setPassword] = useState('ChangeMe@123')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  // Password strength indicator
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null)

  useEffect(() => {
    if (password && password !== 'ChangeMe@123') {
      const hasUpperCase = /[A-Z]/.test(password)
      const hasLowerCase = /[a-z]/.test(password)
      const hasNumbers = /\d/.test(password)
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
      const length = password.length

      const strength = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length

      if (length < 6) setPasswordStrength('weak')
      else if (strength >= 3 && length >= 8) setPasswordStrength('strong')
      else if (strength >= 2 && length >= 6) setPasswordStrength('medium')
      else setPasswordStrength('weak')
    } else {
      setPasswordStrength(null)
    }
  }, [password])

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
      const { role, roles } = resolveUserRole(me)

      login(
        {
          id: String(me.id),
          name: me.full_name?.trim() ? me.full_name : me.username,
          email: me.email,
          roles,
          role
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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/20 blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-secondary/20 blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/2 left-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      </div>

      {/* Floating Orbs */}
      <motion.div
        animate={{
          y: [0, -20, 0],
          x: [0, 10, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-20 left-20 h-32 w-32 rounded-full bg-primary/10 blur-2xl"
      />
      <motion.div
        animate={{
          y: [0, 20, 0],
          x: [0, -10, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute bottom-20 right-20 h-32 w-32 rounded-full bg-secondary/10 blur-2xl"
      />

      {/* Main Content */}
      <div className="relative w-full max-w-6xl px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Brand Message */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="hidden lg:block"
          >
            <div className="max-w-lg mx-auto">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 px-4 py-2 mb-6"
              >
                <ShieldCheckIcon className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Secure Access
                </span>
              </motion.div>

              <h1 className="text-4xl font-bold text-text mb-4">
                Welcome back to{' '}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Julian Interiors
                </span>
              </h1>

              <p className="text-lg text-text-secondary mb-8">
                Access your comprehensive dashboard to manage projects, track inventory, 
                handle sales, and monitor business performance.
              </p>

              {/* Feature List */}
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="space-y-4"
              >
                {[
                  { icon: BuildingOfficeIcon, text: 'Project Management & Tracking' },
                  { icon: UserGroupIcon, text: 'Team Collaboration Tools' },
                  { icon: ShieldCheckIcon, text: 'Enterprise-Grade Security' },
                ].map((feature, index) => {
                  const Icon = feature.icon
                  return (
                    <motion.div
                      key={index}
                      variants={fadeInUp}
                      className="flex items-center gap-3"
                    >
                      <div className="p-2 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-text-secondary">{feature.text}</span>
                    </motion.div>
                  )
                })}
              </motion.div>

              {/* Stats */}
              <div className="mt-8 grid grid-cols-3 gap-4">
                {[
                  { label: 'Active Users', value: '150+' },
                  { label: 'Projects', value: '300+' },
                  { label: 'Uptime', value: '99.9%' },
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="text-center p-3 bg-white/50 backdrop-blur-sm rounded-xl border border-border"
                  >
                    <p className="text-xl font-bold text-primary">{stat.value}</p>
                    <p className="text-xs text-text-tertiary mt-1">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Side - Login Form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto"
          >
            <div className="relative">
              {/* Decorative Elements */}
              <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-primary/10 blur-xl" />
              <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-secondary/10 blur-xl" />

              {/* Form Container */}
              <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl border border-border p-8 shadow-2xl">
                {/* Logo/Brand */}
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="text-center mb-8"
                >
                  <img
                    src={brandLogo}
                    alt="Julian Interiors logo"
                    className="mx-auto mb-4 h-20 w-auto rounded-full border border-primary/10 bg-white p-1 shadow-lg"
                  />
                  <h2 className="text-2xl font-bold text-text">
                    Sign in to your account
                  </h2>
                  <p className="mt-2 text-sm text-text-secondary">
                    Access your personalized dashboard
                  </p>
                </motion.div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Email Field */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-text-secondary">
                      Email or username
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <EnvelopeIcon className={`h-4 w-4 transition-colors ${
                          emailFocused ? 'text-primary' : 'text-text-tertiary'
                        }`} />
                      </div>
                      <input
                        type="text"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                        className="w-full pl-9 pr-3 py-2.5 bg-background border-2 border-border rounded-xl 
                                 text-text placeholder-text-tertiary/50
                                 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 
                                 transition-all"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-text-secondary">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <LockClosedIcon className={`h-4 w-4 transition-colors ${
                          passwordFocused ? 'text-primary' : 'text-text-tertiary'
                        }`} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => setPasswordFocused(false)}
                        className="w-full pl-9 pr-10 py-2.5 bg-background border-2 border-border rounded-xl 
                                 text-text placeholder-text-tertiary/50
                                 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 
                                 transition-all"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-tertiary hover:text-primary transition-colors"
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    <AnimatePresence>
                      {passwordStrength && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1 bg-background rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                  width: passwordStrength === 'weak' ? '33%' : 
                                         passwordStrength === 'medium' ? '66%' : '100%'
                                }}
                                className={`h-full rounded-full ${
                                  passwordStrength === 'weak' ? 'bg-error' :
                                  passwordStrength === 'medium' ? 'bg-warning' : 'bg-success'
                                }`}
                              />
                            </div>
                            <span className={`text-xs font-medium ${
                              passwordStrength === 'weak' ? 'text-error' :
                              passwordStrength === 'medium' ? 'text-warning' : 'text-success'
                            }`}>
                              {passwordStrength === 'weak' && 'Weak'}
                              {passwordStrength === 'medium' && 'Medium'}
                              {passwordStrength === 'strong' && 'Strong'}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 transition-colors"
                      />
                      <span className="text-xs text-text-secondary group-hover:text-primary transition-colors">
                        Remember me
                      </span>
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-primary hover:text-primary-dark transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="relative w-full group overflow-hidden rounded-xl bg-gradient-to-r from-primary to-secondary p-0.5 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-60"
                  >
                    <span className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-primary transition-all group-hover:bg-transparent group-hover:text-white disabled:bg-primary/10">
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Signing in...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign in</span>
                          <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </span>
                  </button>

                  {/* Error Message */}
                  <AnimatePresence>
                    {errorMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2 p-3 rounded-lg bg-error/10 border border-error/20 text-error"
                      >
                        <XCircleIcon className="h-4 w-4 flex-shrink-0" />
                        <p className="text-xs">{errorMessage}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>

                {/* Demo Credentials */}
                <div className="mt-6 p-4 rounded-xl bg-background border border-border">
                  <p className="text-xs font-medium text-text-secondary flex items-center gap-1 mb-2">
                    <SparklesIcon className="h-3 w-3 text-primary" />
                    Demo credentials (pre-filled)
                  </p>
                  <div className="space-y-1 text-xs text-text-tertiary">
                    <p>Email: admin@julianinteriors.com</p>
                    <p>Password: ChangeMe@123</p>
                  </div>
                </div>

                {/* API Endpoint Info */}
                <p className="mt-4 text-center text-[10px] text-text-tertiary">
                  Secure connection to API endpoint at `/api/v1/auth/login`
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
