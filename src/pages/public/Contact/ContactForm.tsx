import { FormEvent, useState } from 'react'
import { TextInput, TextArea, Button, Select } from '@components/common'

export const ContactForm = () => {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setSubmitted(true)
    }, 900)
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/10 p-5">
        <h3 className="text-lg font-semibold text-success-dark">Message sent</h3>
        <p className="mt-2 text-sm text-text-secondary">
          Thanks for reaching out. Our team will contact you shortly with next steps.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => setSubmitted(false)}
        >
          Send another message
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextInput name="name" label="Full name" placeholder="Your name" required />
      <TextInput
        name="email"
        type="email"
        label="Email address"
        placeholder="you@example.com"
        required
      />
      <TextInput name="phone" label="Phone number" placeholder="+254 700 000 000" />
      <div className="space-y-1.5 text-xs sm:text-sm">
        <label htmlFor="serviceType" className="block font-medium text-text-secondary">
          Service type
        </label>
        <Select
          id="serviceType"
          name="serviceType"
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs sm:text-sm outline-none transition shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
          defaultValue=""
        >
          <option value="" disabled>
            Select a service
          </option>
          <option value="interior_design">Interior design</option>
          <option value="curtain_installation">Curtain installation</option>
          <option value="furniture_customization">Furniture customization</option>
          <option value="wall_painting">Wall painting</option>
          <option value="post_construction_cleaning">Post-construction cleaning</option>
          <option value="other">Other</option>
        </Select>
      </div>
      <TextArea
        name="message"
        label="How can we help?"
        placeholder="Tell us about your space, project, or requirements…"
        required
      />
      <Button type="submit" loading={submitting} className="mt-2">
        Send message
      </Button>
    </form>
  )
}

export default ContactForm
