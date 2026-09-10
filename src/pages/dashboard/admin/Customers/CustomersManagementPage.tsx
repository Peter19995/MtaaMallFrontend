import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  TrashIcon,
  UserCircleIcon,
  UserIcon,
  UsersIcon,
  XCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { Button, Checkbox, DataTable, TextInput, type Column } from '@components/common'
import {
  createCustomerRequest,
  deactivateCustomerRequest,
  getDefaultCashCustomerRequest,
  updateCustomerRequest,
  listCustomersRequest,
  type CustomerResponse
} from '@api/modules/customers.api'

type CustomerFormState = {
  email: string
  username: string
  fullName: string
  phone: string
  password: string
  avatar: string
  isActive: boolean
}

type FeedbackState = {
  type: 'success' | 'error'
  message: string
}

type ApiErrorItem = {
  message?: string
}

type ApiErrorResponse = {
  message?: string
  detail?: string | Array<{ msg?: string }>
  errors?: ApiErrorItem[]
}

const createEmptyCustomerForm = (): CustomerFormState => ({
  email: '',
  username: '',
  fullName: '',
  phone: '',
  password: '',
  avatar: '',
  isActive: true
})

const formatDateTime = (value?: string | null): string => {
  if (!value) {
    return '--'
  }

  return new Date(value).toLocaleString()
}

const getCustomerDisplayName = (customer: Pick<CustomerResponse, 'full_name' | 'username'>) => {
  return customer.full_name?.trim() || customer.username
}

const normalizeCustomerSource = (source?: string | null) => {
  return (source ?? '').trim().toLowerCase()
}

const getCustomerSourceLabel = (source?: string | null) => {
  const normalized = normalizeCustomerSource(source)

  if (normalized === 'system_default') {
    return 'System Default'
  }

  if (normalized === 'staff_created') {
    return 'Staff Created'
  }

  if (normalized === 'self_registered' || normalized === 'online_registered') {
    return 'Online Registered'
  }

  if (!normalized) {
    return 'Unknown Source'
  }

  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const getCustomerSourceBadgeClass = (source?: string | null) => {
  const normalized = normalizeCustomerSource(source)

  if (normalized === 'system_default') {
    return 'bg-secondary/10 text-secondary'
  }

  if (normalized === 'staff_created') {
    return 'bg-primary/10 text-primary'
  }

  if (normalized === 'self_registered' || normalized === 'online_registered') {
    return 'bg-warning/10 text-warning'
  }

  return 'bg-background text-text-tertiary'
}

const extractApiErrorMessage = (error: unknown, fallback: string): string => {
  if (!isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback
  }

  const responseData = error.response?.data as string | ApiErrorResponse | undefined

  if (typeof responseData === 'string' && responseData.trim()) {
    return responseData
  }

  if (typeof responseData === 'object' && responseData) {
    if (typeof responseData.message === 'string' && responseData.message.trim()) {
      return responseData.message
    }

    if (typeof responseData.detail === 'string' && responseData.detail.trim()) {
      return responseData.detail
    }

    if (Array.isArray(responseData.detail) && responseData.detail.length > 0) {
      const joinedDetails = responseData.detail
        .map((item) => item?.msg)
        .filter((message): message is string => Boolean(message))
        .join('; ')

      if (joinedDetails) {
        return joinedDetails
      }
    }

    if (Array.isArray(responseData.errors) && responseData.errors.length > 0) {
      const joinedErrors = responseData.errors
        .map((item) => item?.message)
        .filter((message): message is string => Boolean(message))
        .join('; ')

      if (joinedErrors) {
        return joinedErrors
      }
    }
  }

  if (error.response?.status) {
    return `Request failed with status code ${error.response.status}`
  }

  return error.message || fallback
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05
    }
  }
}

const CustomersManagementPage = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(createEmptyCustomerForm())
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null)
  const [deactivateCandidate, setDeactivateCandidate] = useState<CustomerResponse | null>(null)
  const [deactivateErrorMessage, setDeactivateErrorMessage] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)

  const customersQuery = useQuery({
    queryKey: ['customers', 'management', includeInactive],
    queryFn: () =>
      listCustomersRequest({
        include_inactive: includeInactive,
        limit: 200
      })
  })

  const defaultCashCustomerQuery = useQuery({
    queryKey: ['customers', 'default-cash'],
    queryFn: getDefaultCashCustomerRequest
  })

  const filteredCustomers = useMemo(() => {
    const customers = customersQuery.data ?? []
    const query = search.trim().toLowerCase()

    if (!query) {
      return customers
    }

    return customers.filter((customer) => {
      return (
        customer.email.toLowerCase().includes(query) ||
        customer.username.toLowerCase().includes(query) ||
        (customer.full_name ?? '').toLowerCase().includes(query) ||
        (customer.phone ?? '').toLowerCase().includes(query) ||
        getCustomerSourceLabel(customer.customer_source).toLowerCase().includes(query)
      )
    })
  }, [customersQuery.data, search])

  const stats = useMemo(() => {
    const customers = customersQuery.data ?? []

    return {
      total: customers.length,
      active: customers.filter((customer) => customer.is_active).length,
      inactive: customers.filter((customer) => !customer.is_active).length,
      cash: customers.filter((customer) => customer.is_cash_customer).length,
      viewOnly: customers.filter((customer) => customer.can_staff_edit === false).length
    }
  }, [customersQuery.data])

  const saveCustomerMutation = useMutation({
    mutationFn: async (payload: CustomerFormState) => {
      const email = payload.email.trim().toLowerCase()
      const username = payload.username.trim()
      const fullName = payload.fullName.trim() || undefined
      const phone = payload.phone.trim() || undefined
      const avatar = payload.avatar.trim() || undefined

      if (!email || !email.includes('@')) {
        throw new Error('Enter a valid customer email address.')
      }

      if (username.length < 3) {
        throw new Error('Username must be at least 3 characters.')
      }

      if (editingCustomerId !== null) {
        return updateCustomerRequest(editingCustomerId, {
          email,
          username,
          full_name: fullName,
          phone,
          avatar,
          is_active: payload.isActive
        })
      }

      const password = payload.password.trim()
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters for new customers.')
      }

      return createCustomerRequest({
        email,
        username,
        full_name: fullName,
        phone,
        password
      })
    },
    onSuccess: (customer) => {
      setFeedback({
        type: 'success',
        message:
          editingCustomerId !== null
            ? `Customer "${getCustomerDisplayName(customer)}" updated.`
            : `Customer "${getCustomerDisplayName(customer)}" created.`
      })
      setCustomerForm(createEmptyCustomerForm())
      setEditingCustomerId(null)
      setIsFormVisible(false)
      setTimeout(() => setFeedback(null), 3000)
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: extractApiErrorMessage(error, 'Failed to save customer.')
      })
    }
  })

  const toggleCustomerStatusMutation = useMutation({
    mutationFn: (input: { customerId: number; isActive: boolean }) =>
      updateCustomerRequest(input.customerId, {
        is_active: input.isActive
      }),
    onSuccess: (customer) => {
      setFeedback({
        type: 'success',
        message: `Customer "${getCustomerDisplayName(customer)}" updated.`
      })
      setTimeout(() => setFeedback(null), 3000)
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (error: unknown) => {
      setFeedback({
        type: 'error',
        message: extractApiErrorMessage(error, 'Failed to update customer status.')
      })
    }
  })

  const deactivateCustomerMutation = useMutation({
    mutationFn: (customerId: number) => deactivateCustomerRequest(customerId),
    onSuccess: (customer) => {
      setFeedback({
        type: 'success',
        message: `Customer "${getCustomerDisplayName(customer)}" deactivated.`
      })
      setDeactivateCandidate(null)
      setDeactivateErrorMessage(null)
      setTimeout(() => setFeedback(null), 3000)
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customers', 'default-cash'] })
    },
    onError: (error: unknown) => {
      const message = extractApiErrorMessage(error, 'Failed to deactivate customer.')
      setDeactivateErrorMessage(message)
      setFeedback({
        type: 'error',
        message
      })
    }
  })

  const onSubmitCustomer = (event: FormEvent) => {
    event.preventDefault()
    setFeedback(null)
    saveCustomerMutation.mutate(customerForm)
  }

  const onEditCustomer = (customer: CustomerResponse) => {
    if (customer.can_staff_edit === false) {
      setFeedback({
        type: 'error',
        message: `"${getCustomerDisplayName(customer)}" is customer-managed and cannot be edited by staff.`
      })
      return
    }

    setEditingCustomerId(customer.id)
    setCustomerForm({
      email: customer.email,
      username: customer.username,
      fullName: customer.full_name ?? '',
      phone: customer.phone ?? '',
      password: '',
      avatar: customer.avatar ?? '',
      isActive: customer.is_active
    })
    setIsFormVisible(true)
    setFeedback(null)
  }

  const openCreateForm = () => {
    setEditingCustomerId(null)
    setCustomerForm(createEmptyCustomerForm())
    setIsFormVisible(true)
    setFeedback(null)
  }

  const closeForm = () => {
    setEditingCustomerId(null)
    setCustomerForm(createEmptyCustomerForm())
    setIsFormVisible(false)
  }

  const customerColumns: Column<CustomerResponse>[] = [
    {
      key: 'customer',
      header: 'Customer',
      render: (customer) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <UserCircleIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-text">{getCustomerDisplayName(customer)}</p>
              {customer.is_cash_customer ? (
                <span className="inline-flex items-center rounded-full bg-secondary/10 px-2.5 py-0.5 text-[10px] font-medium text-secondary">
                  Default Cash
                </span>
              ) : null}
            </div>
            <p className="text-xs text-text-tertiary">{customer.email}</p>
            <p className="text-xs text-text-tertiary">@{customer.username}</p>
          </div>
        </div>
      )
    },
    {
      key: 'customer_source',
      header: 'Source',
      render: (customer) => (
        <div className="flex flex-col gap-2">
          <span
            className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${getCustomerSourceBadgeClass(
              customer.customer_source
            )}`}
          >
            {getCustomerSourceLabel(customer.customer_source)}
          </span>
          {customer.can_staff_edit === false ? (
            <span className="inline-flex items-center gap-1 text-xs text-warning">
              <LockClosedIcon className="h-3.5 w-3.5" />
              Staff view only
            </span>
          ) : null}
        </div>
      )
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (customer) => (
        <span className="inline-flex items-center gap-1 text-sm text-text-secondary">
          <PhoneIcon className="h-4 w-4 text-text-tertiary" />
          {customer.phone ?? 'No phone'}
        </span>
      )
    },
    {
      key: 'last_login',
      header: 'Last Login',
      render: (customer) => formatDateTime(customer.last_login)
    },
    {
      key: 'status',
      header: 'Status',
      render: (customer) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
            customer.is_active ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
          }`}
        >
          {customer.is_active ? (
            <CheckCircleIcon className="h-3 w-3" />
          ) : (
            <XCircleIcon className="h-3 w-3" />
          )}
          {customer.is_active ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (customer) => formatDateTime(customer.created_at)
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (customer) => {
        const isUpdatingCurrent =
          toggleCustomerStatusMutation.isPending &&
          toggleCustomerStatusMutation.variables?.customerId === customer.id
        const isDeactivatingCurrent =
          deactivateCustomerMutation.isPending &&
          deactivateCandidate?.id === customer.id

        return (
          <div className="flex items-center justify-end gap-2">
            {customer.can_staff_edit === false ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-2 text-xs text-text-tertiary">
                <EyeIcon className="h-4 w-4" />
                View Only
              </span>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="!px-3 !py-2"
                onClick={() => onEditCustomer(customer)}
              >
                <PencilIcon className="h-4 w-4" />
              </Button>
            )}

            {customer.can_staff_edit !== false && customer.is_active ? (
              <Button
                type="button"
                variant="outline"
                className="!border-error/20 !px-3 !py-2 !text-error hover:!bg-error/5"
                onClick={() => {
                  setDeactivateErrorMessage(null)
                  setDeactivateCandidate(customer)
                }}
                disabled={isDeactivatingCurrent}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            ) : null}

            {customer.can_staff_edit !== false && !customer.is_active ? (
              <Button
                type="button"
                variant="outline"
                className="!border-success/20 !px-3 !py-2 !text-success hover:!bg-success/5"
                onClick={() =>
                  toggleCustomerStatusMutation.mutate({
                    customerId: customer.id,
                    isActive: true
                  })
                }
                disabled={isUpdatingCurrent}
              >
                <CheckCircleIcon className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        )
      }
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-white to-background p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-text">
            <UsersIcon className="h-6 w-6 text-primary" />
            Customers
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Create staff customers, review online registrations, and respect customer-managed records
          </p>
        </div>

        <Button
          onClick={() => {
            if (isFormVisible) {
              closeForm()
              return
            }
            openCreateForm()
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white"
        >
          <PlusIcon className="h-4 w-4" />
          {isFormVisible ? 'Close Customer Form' : 'New Customer'}
        </Button>
      </motion.div>

      {defaultCashCustomerQuery.data ? (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl border border-secondary/20 bg-secondary/5 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-secondary/10 p-2">
              <UserIcon className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
                Default Cash Customer
              </p>
              <p className="mt-1 text-sm font-semibold text-text">
                {getCustomerDisplayName(defaultCashCustomerQuery.data)}
              </p>
              <p className="text-sm text-text-secondary">{defaultCashCustomerQuery.data.email}</p>
              <p className="mt-1 text-xs text-text-tertiary">
                Source: {getCustomerSourceLabel(defaultCashCustomerQuery.data.customer_source)}
              </p>
            </div>
          </div>
        </motion.section>
      ) : null}

      <motion.section
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5"
      >
        {[
          {
            label: 'Total Customers',
            value: stats.total,
            color: 'text-primary',
            bg: 'bg-primary/10',
            icon: UsersIcon
          },
          {
            label: 'Active',
            value: stats.active,
            color: 'text-success',
            bg: 'bg-success/10',
            icon: CheckCircleIcon
          },
          {
            label: 'Inactive',
            value: stats.inactive,
            color: 'text-error',
            bg: 'bg-error/10',
            icon: XCircleIcon
          },
          {
            label: 'Cash Customers',
            value: stats.cash,
            color: 'text-secondary',
            bg: 'bg-secondary/10',
            icon: UserCircleIcon
          },
          {
            label: 'View Only',
            value: stats.viewOnly,
            color: 'text-warning',
            bg: 'bg-warning/10',
            icon: LockClosedIcon
          }
        ].map((stat) => {
          const Icon = stat.icon

          return (
            <motion.div
              key={stat.label}
              variants={fadeInUp}
              className="rounded-xl border border-border bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${stat.bg}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.section>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-6 rounded-xl border p-4 ${
              feedback.type === 'success'
                ? 'border-success/20 bg-success/5 text-success'
                : 'border-error/20 bg-error/5 text-error'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              {feedback.type === 'success' ? (
                <CheckCircleIcon className="h-4 w-4" />
              ) : (
                <XCircleIcon className="h-4 w-4" />
              )}
              {feedback.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFormVisible && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-text">
                    {editingCustomerId !== null ? 'Edit Customer' : 'Create Customer'}
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Staff can edit staff-created customers. Online-registered customers stay view-only here.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-2 text-text-tertiary transition hover:bg-background hover:text-text"
                  onClick={closeForm}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={onSubmitCustomer} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput
                    label="Email"
                    type="email"
                    value={customerForm.email}
                    onChange={(event) =>
                      setCustomerForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                    placeholder="customer@example.com"
                  />
                  <TextInput
                    label="Username"
                    value={customerForm.username}
                    onChange={(event) =>
                      setCustomerForm((prev) => ({ ...prev, username: event.target.value }))
                    }
                    placeholder="customer_username"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput
                    label="Full Name"
                    value={customerForm.fullName}
                    onChange={(event) =>
                      setCustomerForm((prev) => ({ ...prev, fullName: event.target.value }))
                    }
                    placeholder="Jane Doe"
                  />
                  <TextInput
                    label="Phone"
                    value={customerForm.phone}
                    onChange={(event) =>
                      setCustomerForm((prev) => ({ ...prev, phone: event.target.value }))
                    }
                    placeholder="0712345678"
                  />
                </div>

                {editingCustomerId !== null ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextInput
                      label="Avatar URL"
                      value={customerForm.avatar}
                      onChange={(event) =>
                        setCustomerForm((prev) => ({ ...prev, avatar: event.target.value }))
                      }
                      placeholder="https://..."
                    />
                    <div className="flex items-end rounded-xl border border-border bg-background px-4 py-3">
                      <Checkbox
                        label="Customer is active"
                        checked={customerForm.isActive}
                        onChange={(event) =>
                          setCustomerForm((prev) => ({ ...prev, isActive: event.target.checked }))
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <TextInput
                    label="Password"
                    type="password"
                    value={customerForm.password}
                    onChange={(event) =>
                      setCustomerForm((prev) => ({ ...prev, password: event.target.value }))
                    }
                    placeholder="Minimum 6 characters"
                  />
                )}

                <div className="flex items-center gap-3">
                  <Button type="submit" loading={saveCustomerMutation.isPending}>
                    {editingCustomerId !== null ? 'Save Customer' : 'Create Customer'}
                  </Button>
                  <Button type="button" variant="outline" onClick={closeForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <section className="rounded-xl border border-border bg-white shadow-sm">
        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text">Customers List</h2>
              <p className="mt-1 text-xs text-text-tertiary">
                Search customer records, review source and activity, and manage only staff-editable accounts
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <TextInput
                label="Search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email, username, phone, source"
                className="min-w-[280px]"
              />
              <div className="rounded-lg border border-border bg-background px-4 py-2.5">
                <Checkbox
                  label="Include inactive"
                  checked={includeInactive}
                  onChange={(event) => setIncludeInactive(event.target.checked)}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => customersQuery.refetch()}
                loading={customersQuery.isFetching}
              >
                <ArrowPathIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DataTable
          columns={customerColumns}
          data={filteredCustomers}
          getRowKey={(customer) => customer.id}
          emptyState={
            customersQuery.isLoading ? (
              <div className="p-8 text-center">
                <ArrowPathIcon className="mx-auto mb-3 h-8 w-8 animate-spin text-primary/30" />
                <p className="text-sm text-text-secondary">Loading customers...</p>
              </div>
            ) : customersQuery.isError ? (
              <div className="p-8 text-center">
                <XCircleIcon className="mx-auto mb-3 h-10 w-10 text-error/40" />
                <p className="text-sm text-error">Could not load customers.</p>
              </div>
            ) : (
              <div className="p-8 text-center">
                <UsersIcon className="mx-auto mb-3 h-12 w-12 text-text-tertiary/30" />
                <p className="text-sm text-text-secondary">No customers found</p>
              </div>
            )
          }
        />
      </section>

      <AnimatePresence>
        {deactivateCandidate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => {
              if (!deactivateCustomerMutation.isPending) {
                setDeactivateCandidate(null)
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 18 }}
              className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-border bg-gradient-to-r from-error/10 via-white to-warning/10 px-6 py-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-error/10 ring-1 ring-error/15">
                    <ExclamationTriangleIcon className="h-7 w-7 text-error" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-error">
                      Deactivate Customer
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-text">
                      Disable this customer?
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      You are about to deactivate{' '}
                      <span className="font-semibold text-text">
                        {getCustomerDisplayName(deactivateCandidate)}
                      </span>
                      . They will stay in history, but you can hide them from active customer flows.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-6">
                {deactivateErrorMessage ? (
                  <div className="rounded-2xl border border-error/20 bg-error/5 px-4 py-3">
                    <p className="text-sm font-medium text-error">{deactivateErrorMessage}</p>
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-background px-4 py-3">
                    <p className="text-xs text-text-tertiary">Email</p>
                    <p className="mt-1 font-semibold text-text">{deactivateCandidate.email}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background px-4 py-3">
                    <p className="text-xs text-text-tertiary">Username</p>
                    <p className="mt-1 font-semibold text-text">@{deactivateCandidate.username}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background px-4 py-3">
                    <p className="text-xs text-text-tertiary">Source</p>
                    <p className="mt-1 font-semibold text-text">
                      {getCustomerSourceLabel(deactivateCandidate.customer_source)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background px-4 py-3">
                    <p className="text-xs text-text-tertiary">Staff Access</p>
                    <p className="mt-1 font-semibold text-text">
                      {deactivateCandidate.can_staff_edit === false ? 'View only' : 'Can edit'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeactivateCandidate(null)}
                  disabled={deactivateCustomerMutation.isPending}
                >
                  Keep Active
                </Button>
                <Button
                  type="button"
                  className="bg-error text-white hover:bg-error-dark"
                  loading={deactivateCustomerMutation.isPending}
                  onClick={() => {
                    setDeactivateErrorMessage(null)
                    deactivateCustomerMutation.mutate(deactivateCandidate.id)
                  }}
                >
                  Deactivate Customer
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CustomersManagementPage
