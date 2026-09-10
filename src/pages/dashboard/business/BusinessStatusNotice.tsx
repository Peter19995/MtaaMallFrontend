import { useTenantState } from '@hooks/useTenantState'
import { isBusinessReadOnly, statusLabels } from '@utils/businessLifecycle'

export default function BusinessStatusNotice() {
  const query = useTenantState()
  const status = query.data?.business_status
  if (!status || status === 'active') return null
  return <div role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
    <strong>{statusLabels[status]} business.</strong>{' '}{isBusinessReadOnly(status)
      ? 'Management changes and sales are disabled. Authorized order and report history remains readable.'
      : 'You can complete business setup. POS and new payments require platform activation.'}
  </div>
}
