import { describe, expect, it } from 'vitest'

import { requiresExternalPosPayment } from './paymentModes'

describe('requiresExternalPosPayment', () => {
  it.each(['MPESA', 'mpesa', 'M-Pesa', ' m-pesa '])(
    'requires follow-up processing for %s',
    (code) => {
      expect(requiresExternalPosPayment(code)).toBe(true)
    }
  )

  it.each(['CASH', 'CARD', 'BANK_TRANSFER', '', undefined])(
    'does not pay an immediate POS mode twice for %s',
    (code) => {
      expect(requiresExternalPosPayment(code)).toBe(false)
    }
  )
})
