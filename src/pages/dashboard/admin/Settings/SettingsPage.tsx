import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  CalculatorIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { Button, Select } from '@components/common'
import { listBranchesRequest } from '@api/modules/branches.api'
import {
  getDefaultValuationMethodRequest,
  getSupportedValuationMethodsRequest,
  updateDefaultValuationMethodRequest,
  type InventoryValuationMethod
} from '@api/modules/inventory.api'

const SettingsPage = () => {
  const queryClient = useQueryClient()
  const [valuationBranchId, setValuationBranchId] = useState<string>('')
  const [selectedValuationMethod, setSelectedValuationMethod] = useState<string>('')
  const [valuationMethodError, setValuationMethodError] = useState<string | null>(null)

  const branchesQuery = useQuery({
    queryKey: ['branches', 'settings-select'],
    queryFn: listBranchesRequest
  })

  const valuationMethodsQuery = useQuery({
    queryKey: ['inventory', 'valuation-methods'],
    queryFn: getSupportedValuationMethodsRequest
  })

  const defaultValuationMethodQuery = useQuery({
    queryKey: ['inventory', 'valuation-method', valuationBranchId],
    queryFn: () =>
      getDefaultValuationMethodRequest({
        branch_id: valuationBranchId ? Number(valuationBranchId) : undefined
      })
  })

  useEffect(() => {
    setSelectedValuationMethod(defaultValuationMethodQuery.data?.default_method ?? '')
  }, [defaultValuationMethodQuery.data?.default_method])

  const valuationBranchOptions = useMemo(
    () => [
      { label: 'All branches (global default)', value: '' },
      ...((branchesQuery.data ?? []).map((branch) => ({
        label: `${branch.name} (${branch.code})`,
        value: String(branch.id)
      })) || [])
    ],
    [branchesQuery.data]
  )

  const valuationMethodOptions = useMemo(
    () => [
      { label: 'Select strategy', value: '' },
      ...((valuationMethodsQuery.data ?? []).map((method) => ({
        label: `${method.name} (${method.method})`,
        value: method.method
      })) || [])
    ],
    [valuationMethodsQuery.data]
  )

  const selectedValuationMethodInfo = useMemo(
    () => (valuationMethodsQuery.data ?? []).find((method) => method.method === selectedValuationMethod),
    [selectedValuationMethod, valuationMethodsQuery.data]
  )

  const updateValuationMethodMutation = useMutation({
    mutationFn: async () => {
      if (!selectedValuationMethod) {
        throw new Error('Please select a valuation strategy.')
      }

      return updateDefaultValuationMethodRequest({
        branch_id: valuationBranchId ? Number(valuationBranchId) : undefined,
        default_method: selectedValuationMethod as InventoryValuationMethod
      })
    },
    onSuccess: () => {
      setValuationMethodError(null)
      queryClient.invalidateQueries({ queryKey: ['inventory', 'valuation-method'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'dashboard'] })
    },
    onError: (error: Error) => {
      setValuationMethodError(error.message || 'Could not update valuation strategy.')
    }
  })

  const onSubmitValuationMethod = (event: FormEvent) => {
    event.preventDefault()
    setValuationMethodError(null)
    updateValuationMethodMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-white to-background p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <Cog6ToothIcon className="h-6 w-6 text-primary" />
          Settings
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Configure inventory defaults across branches
        </p>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="max-w-4xl"
      >
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CalculatorIcon className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold text-text">Inventory Valuation Strategy</h2>
          </div>

          <form onSubmit={onSubmitValuationMethod} className="grid gap-4 md:grid-cols-3">
            <Select
              label="Scope"
              options={valuationBranchOptions}
              value={valuationBranchId}
              onChange={(event) => {
                setValuationBranchId(String(event.target.value))
                setValuationMethodError(null)
              }}
            />
            <Select
              label="Valuation Method"
              options={valuationMethodOptions}
              value={selectedValuationMethod}
              onChange={(event) => setSelectedValuationMethod(String(event.target.value))}
              required
            />

            <div className="bg-background rounded-lg p-3 border border-border">
              <p className="text-xs text-text-tertiary">Current Default</p>
              <p className="text-sm font-semibold text-text mt-1">
                {defaultValuationMethodQuery.data?.default_method
                  ? defaultValuationMethodQuery.data.default_method
                  : defaultValuationMethodQuery.isLoading
                    ? 'Loading...'
                    : 'Not set'}
              </p>
              {selectedValuationMethodInfo?.description && (
                <p className="text-xs text-text-tertiary mt-2">{selectedValuationMethodInfo.description}</p>
              )}
            </div>

            <div className="md:col-span-3 flex items-center gap-3">
              <Button
                type="submit"
                loading={updateValuationMethodMutation.isPending}
                className="min-w-[120px]"
              >
                Save Strategy
              </Button>
              {updateValuationMethodMutation.isSuccess && (
                <span className="text-xs text-success flex items-center gap-1">
                  <CheckCircleIcon className="h-4 w-4" />
                  Strategy updated successfully
                </span>
              )}
              {valuationMethodError && (
                <span className="text-xs text-error flex items-center gap-1">
                  <XCircleIcon className="h-4 w-4" />
                  {valuationMethodError}
                </span>
              )}
            </div>
          </form>
        </div>
      </motion.section>
    </div>
  )
}

export default SettingsPage
