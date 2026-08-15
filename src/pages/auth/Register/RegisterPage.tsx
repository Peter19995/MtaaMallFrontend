import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  BuildingOffice2Icon,
  CheckCircleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { Button, Select, TextInput } from '@components/common'
import { registerBusinessRequest } from '@api/modules/businesses.api'

const businessTypes = [
  { value: '', label: 'Select business type' },
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'retail_shop', label: 'Retail shop' },
  { value: 'wholesaler', label: 'Wholesaler' },
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'service_provider', label: 'Service provider' },
  { value: 'other', label: 'Other' },
]

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const errors = error.response?.data?.errors
    if (Array.isArray(errors) && errors.length > 0) {
      return errors
        .slice(0, 3)
        .map((item) => {
          const rawField = typeof item?.field === 'string' ? item.field : ''
          const field = rawField
            .replace(/^owner\./, '')
            .replace(/_/g, ' ')
            .replace(/^./, (letter: string) => letter.toUpperCase())
          const message = typeof item?.message === 'string'
            ? item.message.replace(/^Value error,\s*/i, '')
            : 'Invalid value'
          return field ? `${field}: ${message}` : message
        })
        .join(' ')
    }
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') return detail[0].msg
    if (typeof error.response?.data?.message === 'string') return error.response.data.message
  }
  return 'We could not submit the application. Please check your details and try again.'
}

const RegisterPage = () => {
  const [form, setForm] = useState({
    businessName: '', registrationNumber: '', businessType: '',
    fullName: '', email: '', phone: '', password: '', confirmPassword: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [applicationId, setApplicationId] = useState<number | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (form.password !== form.confirmPassword) {
      const message = 'The passwords do not match.'
      setSubmitError(message)
      toast.error(message)
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const result = await registerBusinessRequest({
        name: form.businessName.trim(),
        registration_number: form.registrationNumber.trim(),
        business_type: form.businessType,
        owner: {
          full_name: form.fullName.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim(),
          password: form.password,
        },
      })
      setApplicationId(result.id)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      const message = getErrorMessage(error)
      setSubmitError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (applicationId) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/10 px-4 pt-28 pb-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-white p-8 text-center shadow-xl">
          <CheckCircleIcon className="mx-auto h-16 w-16 text-success" />
          <h1 className="mt-5 text-3xl font-bold text-text">Application received</h1>
          <p className="mt-3 text-text-secondary">
            Your reference is <strong>#{applicationId}</strong>. We will verify your business before
            activating your account.
          </p>
          <div className="mt-6 rounded-xl bg-primary/5 p-4 text-sm text-text-secondary">
            After approval, you can add branches, locations, products, staff, online-shop details,
            and POS settings from your business dashboard.
          </div>
          <Link to="/" className="mt-7 inline-block text-sm font-semibold text-primary hover:underline">
            Return to MtaaMall
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/10 px-4 pt-24 pb-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-lg">
            <BuildingOffice2Icon className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-text sm:text-4xl">Start selling on MtaaMall</h1>
          <p className="mt-3 text-text-secondary">Create your business application in a few minutes.</p>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-secondary/10 p-3 text-xs text-text-secondary">
            <ShieldCheckIcon className="h-5 w-5 shrink-0 text-primary" />
            We only need the basics now. Add branches, products and POS settings after approval.
          </div>

          <h2 className="mb-4 text-lg font-semibold text-text">Business</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Business name" required value={form.businessName} onChange={(e) => update('businessName', e.target.value)} />
            <TextInput label="Registration number" required value={form.registrationNumber} onChange={(e) => update('registrationNumber', e.target.value)} />
            <div className="sm:col-span-2">
              <Select label="Business type" required options={businessTypes} value={form.businessType} onChange={(e) => update('businessType', e.target.value)} />
            </div>
          </div>

          <div className="my-7 border-t border-border" />
          <h2 className="mb-4 text-lg font-semibold text-text">Owner account</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Full name" required value={form.fullName} onChange={(e) => update('fullName', e.target.value)} />
            <TextInput label="Phone number" type="tel" required value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="0791335490 or +254791335490" helperText="Local and +254 formats are accepted" />
            <div className="sm:col-span-2">
              <TextInput label="Email address (optional)" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} helperText="You can add or change this later" />
            </div>
            <TextInput label="Password" type="password" required minLength={8} value={form.password} onChange={(e) => update('password', e.target.value)} helperText="Upper/lowercase, number and special character" />
            <TextInput label="Confirm password" type="password" required minLength={8} value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} />
          </div>

          {submitError && (
            <div role="alert" className="mt-6 rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error">
              {submitError}
            </div>
          )}

          <Button type="submit" size="lg" fullWidth loading={isSubmitting} className="mt-7">
            Submit for verification
          </Button>
          <p className="mt-4 text-center text-xs text-text-secondary">
            Already approved? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </main>
  )
}

export default RegisterPage
