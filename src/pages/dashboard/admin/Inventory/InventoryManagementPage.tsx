import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, DataTable, Select, TextInput, type Column } from '@components/common'
import { listProductsRequest } from '@api/modules/products.api'
import { listBranchesRequest } from '@api/modules/branches.api'
import {
  createRestockRequest,
  createStockCountRequest,
  getDefaultValuationMethodRequest,
  getInventoryDashboardRequest,
  getSupportedValuationMethodsRequest,
  updateDefaultValuationMethodRequest,
  type InventoryDashboardAlert,
  type InventoryValuationMethod,
  type ProductStockStatusResponse,
  type RestockResponse,
  type StockCountResponse
} from '@api/modules/inventory.api'

type RestockFormState = {
  branchId: string
  restockDate: string
  rows: RestockRowState[]
}

type RestockRowState = {
  id: string
  productId: string
  quantity: string
  buyingPrice: string
  sellingPrice: string
  maxOfferAmount: string
  maxOfferPercent: string
  maxOfferMode: 'amount' | 'percent'
  notes: string
}

type StockCountFormState = {
  productId: string
  countDate: string
  physicalStock: string
  applyAdjustment: boolean
  location: string
  notes: string
}

const today = new Date().toISOString().slice(0, 10)

const formatNumber = (value: number): string => {
  const rounded = Math.round(value * 100) / 100
  return Number.isFinite(rounded) ? String(rounded) : '0'
}

const toSafeNumber = (value: string): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const createRestockRow = (): RestockRowState => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  productId: '',
  quantity: '1',
  buyingPrice: '0',
  sellingPrice: '0',
  maxOfferAmount: '0',
  maxOfferPercent: '0',
  maxOfferMode: 'amount',
  notes: ''
})

const syncMaxOffer = (row: RestockRowState): RestockRowState => {
  const quantity = toSafeNumber(row.quantity)
  const sellingPrice = toSafeNumber(row.sellingPrice)
  const totalSelling = quantity * sellingPrice

  if (row.maxOfferMode === 'amount') {
    const amount = toSafeNumber(row.maxOfferAmount)
    const percent = totalSelling > 0 ? (amount / totalSelling) * 100 : 0
    return { ...row, maxOfferPercent: formatNumber(percent) }
  }

  const percent = toSafeNumber(row.maxOfferPercent)
  const amount = totalSelling > 0 ? (percent / 100) * totalSelling : 0
  return { ...row, maxOfferAmount: formatNumber(amount) }
}

const createEmptyRestockForm = (): RestockFormState => ({
  branchId: '',
  restockDate: today,
  rows: [createRestockRow()]
})

const EMPTY_STOCK_COUNT_FORM: StockCountFormState = {
  productId: '',
  countDate: today,
  physicalStock: '0',
  applyAdjustment: false,
  location: 'main',
  notes: ''
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 2
  }).format(amount)

const InventoryManagementPage = () => {
  const queryClient = useQueryClient()
  const statusLimit = 50
  const recentLimit = 10
  const [showRestockForm, setShowRestockForm] = useState(false)
  const [showStockCountForm, setShowStockCountForm] = useState(false)
  const [restockForm, setRestockForm] = useState<RestockFormState>(createEmptyRestockForm())
  const [stockCountForm, setStockCountForm] = useState<StockCountFormState>(EMPTY_STOCK_COUNT_FORM)
  const [valuationBranchId, setValuationBranchId] = useState<string>('')
  const [selectedValuationMethod, setSelectedValuationMethod] = useState<string>('')
  const [restockError, setRestockError] = useState<string | null>(null)
  const [stockCountError, setStockCountError] = useState<string | null>(null)
  const [valuationMethodError, setValuationMethodError] = useState<string | null>(null)

  const productsQuery = useQuery({
    queryKey: ['products', 'inventory-select'],
    queryFn: () => listProductsRequest({ limit: 200 })
  })

  const branchesQuery = useQuery({
    queryKey: ['branches', 'inventory-select'],
    queryFn: listBranchesRequest
  })

  const inventoryDashboardQuery = useQuery({
    queryKey: ['inventory', 'dashboard', statusLimit, recentLimit],
    queryFn: () =>
      getInventoryDashboardRequest({
        status_limit: statusLimit,
        recent_limit: recentLimit
      })
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

  const branchOptions = useMemo(
    () => [
      { label: 'Select branch', value: '' },
      ...((branchesQuery.data ?? []).map((branch) => ({
        label: `${branch.name} (${branch.code})`,
        value: String(branch.id)
      })) || [])
    ],
    [branchesQuery.data]
  )

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

  const updateRestockRow = (
    rowId: string,
    updater: (row: RestockRowState) => RestockRowState
  ) => {
    setRestockForm((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => (row.id === rowId ? updater(row) : row))
    }))
  }

  const updateRestockRowField = (
    rowId: string,
    field: 'productId' | 'quantity' | 'buyingPrice' | 'sellingPrice' | 'notes',
    value: string
  ) => {
    updateRestockRow(rowId, (row) => {
      const next = { ...row, [field]: value } as RestockRowState
      if (field === 'quantity' || field === 'sellingPrice') {
        return syncMaxOffer(next)
      }
      return next
    })
  }

  const updateRestockRowMaxOfferAmount = (rowId: string, value: string) => {
    updateRestockRow(rowId, (row) =>
      syncMaxOffer({ ...row, maxOfferMode: 'amount', maxOfferAmount: value })
    )
  }

  const updateRestockRowMaxOfferPercent = (rowId: string, value: string) => {
    updateRestockRow(rowId, (row) =>
      syncMaxOffer({ ...row, maxOfferMode: 'percent', maxOfferPercent: value })
    )
  }

  const addRestockRow = () => {
    setRestockForm((prev) => ({
      ...prev,
      rows: [...prev.rows, createRestockRow()]
    }))
  }

  const removeRestockRow = (rowId: string) => {
    setRestockForm((prev) => ({
      ...prev,
      rows: prev.rows.length > 1 ? prev.rows.filter((row) => row.id !== rowId) : prev.rows
    }))
  }

  const restockTotals = useMemo(() => {
    return restockForm.rows.reduce(
      (acc, row) => {
        const quantity = toSafeNumber(row.quantity)
        const buyingPrice = toSafeNumber(row.buyingPrice)
        const sellingPrice = toSafeNumber(row.sellingPrice)
        acc.totalBuying += quantity * buyingPrice
        acc.totalSelling += quantity * sellingPrice
        acc.expectedProfit += quantity * (sellingPrice - buyingPrice)
        return acc
      },
      {
        totalBuying: 0,
        totalSelling: 0,
        expectedProfit: 0
      }
    )
  }, [restockForm.rows])

  const getProductOptionsForRow = (rowId: string, currentProductId: string) => {
    const selectedInOtherRows = new Set(
      restockForm.rows
        .filter((row) => row.id !== rowId && row.productId)
        .map((row) => row.productId)
    )

    return [
      { label: 'Select product', value: '' },
      ...((productsQuery.data ?? [])
        .filter((product) => {
          const productId = String(product.id)
          return productId === currentProductId || !selectedInOtherRows.has(productId)
        })
        .map((product) => ({
          label: `${product.name} (${product.sku})`,
          value: String(product.id)
        })) || [])
    ]
  }

  const createRestockMutation = useMutation({
    mutationFn: async (payload: RestockFormState) => {
      const branchId = Number(payload.branchId)

      if (!branchId) {
        throw new Error('Please select a branch.')
      }
      if (!payload.rows.length) {
        throw new Error('Add at least one product row.')
      }

      const items = payload.rows.map((row, index) => {
        const productId = Number(row.productId)
        const quantity = Number(row.quantity)
        const buyingPrice = Number(row.buyingPrice)
        const sellingPrice = Number(row.sellingPrice)
        const maxOfferAmount = Number(row.maxOfferAmount)

        if (!productId) {
          throw new Error(`Row ${index + 1}: select a product.`)
        }
        if (Number.isNaN(quantity) || quantity < 1) {
          throw new Error(`Row ${index + 1}: quantity must be 1 or more.`)
        }
        if (Number.isNaN(buyingPrice) || buyingPrice < 0) {
          throw new Error(`Row ${index + 1}: buying price must be 0 or more.`)
        }
        if (Number.isNaN(sellingPrice) || sellingPrice < 0) {
          throw new Error(`Row ${index + 1}: selling price must be 0 or more.`)
        }
        if (Number.isNaN(maxOfferAmount) || maxOfferAmount < 0) {
          throw new Error(`Row ${index + 1}: max offer must be 0 or more.`)
        }

        return {
          product_id: productId,
          quantity,
          buying_price: buyingPrice,
          selling_price: sellingPrice,
          max_offer: maxOfferAmount,
          notes: row.notes.trim() || undefined
        }
      })

      return createRestockRequest({
        branch_id: branchId,
        restock_date: payload.restockDate,
        items
      })
    },
    onSuccess: () => {
      setRestockForm(createEmptyRestockForm())
      setRestockError(null)
      setShowRestockForm(false)
      queryClient.invalidateQueries({ queryKey: ['inventory', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['products', 'inventory-select'] })
    },
    onError: (error: Error) => {
      setRestockError(error.message || 'Could not create restock.')
    }
  })

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

  const createStockCountMutation = useMutation({
    mutationFn: async (payload: StockCountFormState) => {
      const productId = Number(payload.productId)
      const physicalStock = Number(payload.physicalStock)

      if (!productId) {
        throw new Error('Please select a product.')
      }
      if (Number.isNaN(physicalStock) || physicalStock < 0) {
        throw new Error('Physical stock must be 0 or more.')
      }

      return createStockCountRequest({
        product_id: productId,
        count_date: payload.countDate,
        physical_stock: physicalStock,
        apply_adjustment: payload.applyAdjustment,
        location: payload.location.trim() || 'main',
        notes: payload.notes.trim() || undefined
      })
    },
    onSuccess: () => {
      setStockCountForm(EMPTY_STOCK_COUNT_FORM)
      setStockCountError(null)
      setShowStockCountForm(false)
      queryClient.invalidateQueries({ queryKey: ['inventory', 'dashboard'] })
    },
    onError: (error: Error) => {
      setStockCountError(error.message || 'Could not create stock count.')
    }
  })

  const summary = useMemo(() => {
    const dashboardSummary = inventoryDashboardQuery.data?.summary
    return {
      totalValue: dashboardSummary?.total_stock_value ?? 0,
      lowStock: dashboardSummary?.low_stock_items ?? 0,
      categories: dashboardSummary?.tracked_categories ?? 0,
      totalProducts: dashboardSummary?.total_products ?? 0,
      outOfStock: dashboardSummary?.out_of_stock_items ?? 0
    }
  }, [inventoryDashboardQuery.data?.summary])

  const selectedValuationMethodInfo = useMemo(
    () => (valuationMethodsQuery.data ?? []).find((method) => method.method === selectedValuationMethod),
    [selectedValuationMethod, valuationMethodsQuery.data]
  )

  const stockStatusColumns: Column<ProductStockStatusResponse>[] = [
    {
      key: 'product_name',
      header: 'Product',
      render: (row) => (
        <div>
          <p className="font-medium text-text">{row.product_name}</p>
          <p className="text-[11px] text-text-tertiary">SKU: {row.sku}</p>
        </div>
      )
    },
    {
      key: 'category_name',
      header: 'Category',
      render: (row) => row.category_name ?? 'Uncategorized'
    },
    {
      key: 'stock_quantity',
      header: 'Stock',
      render: (row) => (
        <span className={row.is_low_stock ? 'text-warning-dark' : 'text-text-secondary'}>
          {row.stock_quantity} (reorder {row.reorder_level})
        </span>
      )
    },
    {
      key: 'selling_price',
      header: 'Sell price',
      render: (row) => formatCurrency(row.selling_price),
      align: 'right'
    },
    {
      key: 'in_stock_value',
      header: 'Stock value',
      render: (row) => formatCurrency(row.in_stock_value),
      align: 'right'
    }
  ]

  const restocksColumns: Column<RestockResponse>[] = [
    { key: 'restock_date', header: 'Date' },
    { key: 'product_name', header: 'Product' },
    { key: 'quantity', header: 'Qty', align: 'right' },
    {
      key: 'branch_name',
      header: 'Branch',
      render: (row) => row.branch_name ?? 'Unassigned'
    },
    {
      key: 'new_stock',
      header: 'New stock',
      align: 'right'
    }
  ]

  const stockCountsColumns: Column<StockCountResponse>[] = [
    { key: 'count_date', header: 'Date' },
    { key: 'product_name', header: 'Product' },
    { key: 'physical_stock', header: 'Physical', align: 'right' },
    { key: 'system_stock', header: 'System', align: 'right' },
    {
      key: 'variance',
      header: 'Variance',
      align: 'right',
      render: (row) => (
        <span className={row.variance === 0 ? 'text-text-secondary' : 'text-warning-dark'}>
          {row.variance}
        </span>
      )
    }
  ]

  const alertsColumns: Column<InventoryDashboardAlert>[] = [
    {
      key: 'severity',
      header: 'Severity',
      render: (row) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
            row.severity === 'critical'
              ? 'bg-error-light text-error-dark'
              : row.severity === 'warning'
                ? 'bg-warning-light text-warning-dark'
                : 'bg-divider text-text-tertiary'
          }`}
        >
          {row.severity}
        </span>
      )
    },
    {
      key: 'type',
      header: 'Type'
    },
    {
      key: 'message',
      header: 'Message'
    }
  ]

  const onSubmitRestock = (event: FormEvent) => {
    event.preventDefault()
    setRestockError(null)
    createRestockMutation.mutate(restockForm)
  }

  const onSubmitStockCount = (event: FormEvent) => {
    event.preventDefault()
    setStockCountError(null)
    createStockCountMutation.mutate(stockCountForm)
  }

  const onSubmitValuationMethod = (event: FormEvent) => {
    event.preventDefault()
    setValuationMethodError(null)
    updateValuationMethodMutation.mutate()
  }

  return (
    <div className="space-y-6 text-text">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Inventory operations</h1>
          <p className="text-xs text-text-tertiary sm:text-sm">
            Manage restocks, stock counts, and live stock status.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowStockCountForm((prev) => !prev)}>
            {showStockCountForm ? 'Close stock count' : 'New stock count'}
          </Button>
          <Button onClick={() => setShowRestockForm((prev) => !prev)}>
            {showRestockForm ? 'Close restock form' : 'New restock'}
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Total stock value</p>
          <p className="mt-2 text-xl font-semibold">{formatCurrency(summary.totalValue)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Low stock items</p>
          <p className="mt-2 text-xl font-semibold">{summary.lowStock}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Tracked categories</p>
          <p className="mt-2 text-xl font-semibold">{summary.categories}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Total products</p>
          <p className="mt-2 text-xl font-semibold">{summary.totalProducts}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Out of stock</p>
          <p className="mt-2 text-xl font-semibold">{summary.outOfStock}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Last refresh</p>
          <p className="mt-2 text-sm font-medium">
            {inventoryDashboardQuery.data?.generated_at
              ? new Date(inventoryDashboardQuery.data.generated_at).toLocaleString()
              : '--'}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-text">Default inventory strategy</h2>
        <p className="mt-1 text-xs text-text-tertiary">
          Set the default valuation method used for inventory adjustments and costing.
        </p>
        <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={onSubmitValuationMethod}>
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
            label="Valuation strategy"
            options={valuationMethodOptions}
            value={selectedValuationMethod}
            onChange={(event) => setSelectedValuationMethod(String(event.target.value))}
            required
          />
          <div className="rounded-md border border-border bg-background px-3 py-2 text-xs text-text-secondary sm:text-sm">
            <p className="font-medium text-text">Current default</p>
            <p className="mt-1">
              {defaultValuationMethodQuery.data?.default_method
                ? defaultValuationMethodQuery.data.default_method
                : defaultValuationMethodQuery.isLoading
                  ? 'Loading...'
                  : '--'}
            </p>
            {selectedValuationMethodInfo?.description ? (
              <p className="mt-1 text-text-tertiary">{selectedValuationMethodInfo.description}</p>
            ) : null}
          </div>
          <div className="md:col-span-3 flex items-center gap-2">
            <Button type="submit" loading={updateValuationMethodMutation.isPending}>
              Save strategy
            </Button>
            {updateValuationMethodMutation.isSuccess ? (
              <p className="text-xs text-success">Strategy updated.</p>
            ) : null}
            {valuationMethodError ? <p className="text-xs text-error">{valuationMethodError}</p> : null}
          </div>
        </form>
      </section>

      {showRestockForm ? (
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-text">Create restock</h2>
          <p className="mt-1 text-xs text-text-tertiary">
            Reorder level is managed in Product Management, not in restocks.
          </p>
          <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={onSubmitRestock}>
            <TextInput
              label="Restock date"
              type="date"
              value={restockForm.restockDate}
              onChange={(event) =>
                setRestockForm((prev) => ({ ...prev, restockDate: event.target.value }))
              }
              required
            />
            <Select
              label="Branch"
              options={branchOptions}
              value={restockForm.branchId}
              onChange={(event) =>
                setRestockForm((prev) => ({ ...prev, branchId: String(event.target.value) }))
              }
              required
            />
            <div className="hidden md:block" />

            <div className="md:col-span-3 space-y-3">
              {restockForm.rows.map((row, index) => {
                const quantity = toSafeNumber(row.quantity)
                const buyingPrice = toSafeNumber(row.buyingPrice)
                const sellingPrice = toSafeNumber(row.sellingPrice)
                const totalBuyingAmount = quantity * buyingPrice
                const totalSellingAmount = quantity * sellingPrice
                const expectedProfit = totalSellingAmount - totalBuyingAmount

                return (
                  <div key={row.id} className="rounded-lg border border-border bg-background p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold text-text-secondary">Product row {index + 1}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRestockRow(row.id)}
                        disabled={restockForm.rows.length === 1}
                      >
                        Remove
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <Select
                        label="Product"
                        options={getProductOptionsForRow(row.id, row.productId)}
                        value={row.productId}
                        onChange={(event) =>
                          updateRestockRowField(row.id, 'productId', String(event.target.value))
                        }
                        required
                      />
                      <TextInput
                        label="Quantity"
                        type="number"
                        min={1}
                        value={row.quantity}
                        onChange={(event) =>
                          updateRestockRowField(row.id, 'quantity', event.target.value)
                        }
                        required
                      />
                      <TextInput
                        label="Buying price (1 unit)"
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.buyingPrice}
                        onChange={(event) =>
                          updateRestockRowField(row.id, 'buyingPrice', event.target.value)
                        }
                        required
                      />
                      <TextInput
                        label="Selling price (1 unit)"
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.sellingPrice}
                        onChange={(event) =>
                          updateRestockRowField(row.id, 'sellingPrice', event.target.value)
                        }
                        required
                      />
                      <TextInput
                        label="Total buying amount"
                        value={formatCurrency(totalBuyingAmount)}
                        readOnly
                      />
                      <TextInput
                        label="Total selling amount"
                        value={formatCurrency(totalSellingAmount)}
                        readOnly
                      />
                      <TextInput
                        label="Expected profit"
                        value={formatCurrency(expectedProfit)}
                        readOnly
                      />
                      <TextInput
                        label="Max offer (amount)"
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.maxOfferAmount}
                        onChange={(event) =>
                          updateRestockRowMaxOfferAmount(row.id, event.target.value)
                        }
                      />
                      <TextInput
                        label="Max offer (%)"
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.maxOfferPercent}
                        onChange={(event) =>
                          updateRestockRowMaxOfferPercent(row.id, event.target.value)
                        }
                      />
                      <div className="md:col-span-3">
                        <TextInput
                          label="Notes"
                          value={row.notes}
                          onChange={(event) =>
                            updateRestockRowField(row.id, 'notes', event.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                )
              })}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="outline" onClick={addRestockRow}>
                  Add product row
                </Button>
                <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-secondary sm:text-sm">
                  <p>Total buying: <span className="font-semibold text-text">{formatCurrency(restockTotals.totalBuying)}</span></p>
                  <p>Total selling: <span className="font-semibold text-text">{formatCurrency(restockTotals.totalSelling)}</span></p>
                  <p>Expected profit: <span className="font-semibold text-text">{formatCurrency(restockTotals.expectedProfit)}</span></p>
                </div>
              </div>
            </div>

            <div className="md:col-span-3 flex items-center gap-2">
              <Button type="submit" loading={createRestockMutation.isPending}>
                Save restock
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowRestockForm(false)
                  setRestockForm(createEmptyRestockForm())
                  setRestockError(null)
                }}
              >
                Cancel
              </Button>
              {restockError ? <p className="text-xs text-error">{restockError}</p> : null}
            </div>
          </form>
        </section>
      ) : null}

      {showStockCountForm ? (
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-text">Create stock count</h2>
          <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={onSubmitStockCount}>
            <Select
              label="Product"
              options={[
                { label: 'Select product', value: '' },
                ...((productsQuery.data ?? []).map((product) => ({
                  label: `${product.name} (${product.sku})`,
                  value: String(product.id)
                })) || [])
              ]}
              value={stockCountForm.productId}
              onChange={(event) =>
                setStockCountForm((prev) => ({ ...prev, productId: String(event.target.value) }))
              }
            />
            <TextInput
              label="Count date"
              type="date"
              value={stockCountForm.countDate}
              onChange={(event) =>
                setStockCountForm((prev) => ({ ...prev, countDate: event.target.value }))
              }
              required
            />
            <TextInput
              label="Physical stock"
              type="number"
              min={0}
              value={stockCountForm.physicalStock}
              onChange={(event) =>
                setStockCountForm((prev) => ({ ...prev, physicalStock: event.target.value }))
              }
              required
            />
            <TextInput
              label="Location"
              value={stockCountForm.location}
              onChange={(event) =>
                setStockCountForm((prev) => ({ ...prev, location: event.target.value }))
              }
            />
            <TextInput
              label="Notes"
              value={stockCountForm.notes}
              onChange={(event) =>
                setStockCountForm((prev) => ({ ...prev, notes: event.target.value }))
              }
            />
            <label className="mt-6 inline-flex items-center gap-2 text-xs text-text-secondary sm:text-sm">
              <input
                type="checkbox"
                checked={stockCountForm.applyAdjustment}
                onChange={(event) =>
                  setStockCountForm((prev) => ({ ...prev, applyAdjustment: event.target.checked }))
                }
                className="h-4 w-4 rounded border border-border text-primary focus:ring-primary"
              />
              Apply adjustment immediately
            </label>
            <div className="md:col-span-3 flex items-center gap-2">
              <Button type="submit" loading={createStockCountMutation.isPending}>
                Save stock count
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowStockCountForm(false)
                  setStockCountForm(EMPTY_STOCK_COUNT_FORM)
                  setStockCountError(null)
                }}
              >
                Cancel
              </Button>
              {stockCountError ? <p className="text-xs text-error">{stockCountError}</p> : null}
            </div>
          </form>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text">Stock status</h2>
        <DataTable
          columns={stockStatusColumns}
          data={inventoryDashboardQuery.data?.stock_status ?? []}
          getRowKey={(row) => row.product_id}
          emptyState={inventoryDashboardQuery.isLoading ? 'Loading stock status…' : 'No stock records found.'}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-text">Recent restocks</h2>
          <DataTable
            columns={restocksColumns}
            data={inventoryDashboardQuery.data?.recent_restocks ?? []}
            getRowKey={(row) => row.id}
            emptyState={inventoryDashboardQuery.isLoading ? 'Loading restocks…' : 'No restocks yet.'}
          />
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-text">Recent stock counts</h2>
          <DataTable
            columns={stockCountsColumns}
            data={inventoryDashboardQuery.data?.recent_stock_counts ?? []}
            getRowKey={(row) => row.id}
            emptyState={inventoryDashboardQuery.isLoading ? 'Loading stock counts…' : 'No stock counts yet.'}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text">Alerts</h2>
        <DataTable
          columns={alertsColumns}
          data={inventoryDashboardQuery.data?.alerts ?? []}
          getRowKey={(row, index) => `${row.type}-${row.product_id ?? index}`}
          emptyState={inventoryDashboardQuery.isLoading ? 'Loading alerts…' : 'No active alerts.'}
        />
      </section>
    </div>
  )
}

export default InventoryManagementPage
