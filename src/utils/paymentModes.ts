const EXTERNAL_POS_PAYMENT_CODES = new Set(['mpesa', 'm-pesa'])

export const requiresExternalPosPayment = (code?: string | null): boolean =>
  EXTERNAL_POS_PAYMENT_CODES.has((code ?? '').trim().toLowerCase())
