import { useTenantState } from '@hooks/useTenantState'
import { isBusinessReadOnly, statusLabels } from '@utils/businessLifecycle'

export default function BusinessStatusNotice() {
  const query = useTenantState()
  const status = query.data?.business_status
  const localPosEnabled = query.data?.business_capabilities?.local_pos_enabled === true
  if (!status || status === 'active') return null
  return <div role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
    <strong>{statusLabels[status]} business.</strong>{' '}{isBusinessReadOnly(status)
      ? 'Management changes and sales are disabled. Authorized order and report history remains readable.'
      : localPosEnabled
        ? 'Local POS is available now. Complete verification to publish products and receive online orders and payments.'
        : 'You can complete business setup. Local POS is currently disabled; online selling requires platform activation.'}
  </div>
}
