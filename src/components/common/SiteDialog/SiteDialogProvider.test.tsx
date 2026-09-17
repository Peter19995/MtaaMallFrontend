// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { SiteDialogProvider, useSiteDialog } from './SiteDialogProvider'

const RefundPrompt = () => {
  const dialog = useSiteDialog()
  const [reason, setReason] = useState('')

  return (
    <>
      <button
        onClick={async () => {
          const value = await dialog.prompt({
            title: 'Request refund approval for sale #3',
            message: 'Provide a reason for this refund.',
            confirmLabel: 'Request approval',
            minLength: 3
          })
          setReason(value ?? 'cancelled')
        }}
      >
        Refund
      </button>
      <output>{reason}</output>
    </>
  )
}

const PasswordPrompt = () => {
  const dialog = useSiteDialog()
  return <button onClick={() => void dialog.prompt({
    title: 'Confirm your identity',
    message: 'Enter your password.',
    inputLabel: 'Password',
    inputType: 'password',
    trim: false,
    minLength: 1,
  })}>Reauthenticate</button>
}

describe('SiteDialogProvider', () => {
  it('collects a required reason in a themed application dialog', async () => {
    const user = userEvent.setup()
    render(
      <SiteDialogProvider>
        <RefundPrompt />
      </SiteDialogProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Refund' }))

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('heading', { name: 'Request refund approval for sale #3' })).toBeInTheDocument()

    const submit = screen.getByRole('button', { name: 'Request approval' })
    expect(submit).toBeDisabled()
    await user.type(screen.getByLabelText('Reason'), 'Customer returned the item')
    await user.click(submit)

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('Customer returned the item')).toBeInTheDocument()
  })

  it('uses a protected password input for reauthentication', async () => {
    const user = userEvent.setup()
    render(<SiteDialogProvider><PasswordPrompt /></SiteDialogProvider>)

    await user.click(screen.getByRole('button', { name: 'Reauthenticate' }))

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password')
  })
})
