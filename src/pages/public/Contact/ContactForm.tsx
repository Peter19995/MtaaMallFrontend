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
      <Select
        id="serviceType"
        name="serviceType"
        label="Service type"
        defaultValue=""
        options={[
          { label: 'Select a service', value: '' },
          { label: 'Interior design', value: 'interior_design' },
          { label: 'Curtain installation', value: 'curtain_installation' },
          { label: 'Furniture customization', value: 'furniture_customization' },
          { label: 'Wall painting', value: 'wall_painting' },
          { label: 'Post-construction cleaning', value: 'post_construction_cleaning' },
          { label: 'Other', value: 'other' },
        ]}
      />
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
