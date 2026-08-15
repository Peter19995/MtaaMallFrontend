import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowPathIcon,
  CubeIcon,
  PencilIcon,
  PlusIcon,
  TagIcon,
  TrashIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { Button, Select, TextInput } from '@components/common'
import {
  createCategoryRequest,
  createVariantOptionRequest,
  createVariantOptionValueRequest,
  deleteVariantOptionRequest,
  deleteVariantOptionValueRequest,
  listCategoriesRequest,
  listVariantOptionsRequest,
  updateVariantOptionRequest,
  updateVariantOptionValueRequest
} from '@api/modules/products.api'

type VariantOptionValueFormState = {
  value: string
  displayValue: string
  sortOrder: string
}

const EMPTY_VARIANT_OPTION_VALUE: VariantOptionValueFormState = {
  value: '',
  displayValue: '',
  sortOrder: '0'
}

type VariantOptionEditState = {
  optionId: number | null
  optionName: string
  optionType: string
  error: string | null
}

type VariantOptionValueEditState = {
  optionId: number | null
  valueId: number | null
  value: string
  displayValue: string
  sortOrder: string
  error: string | null
}

const EMPTY_VARIANT_OPTION_EDIT_STATE: VariantOptionEditState = {
  optionId: null,
  optionName: '',
  optionType: 'select',
  error: null
}

const EMPTY_VARIANT_OPTION_VALUE_EDIT_STATE: VariantOptionValueEditState = {
  optionId: null,
  valueId: null,
  value: '',
  displayValue: '',
  sortOrder: '0',
  error: null
}

const buildVariantOptionValuePayload = (
  optionValue: VariantOptionValueFormState,
  fallbackSortOrder: number
) => {
  const cleanedValue = optionValue.value.trim()

  if (!cleanedValue) {
    throw new Error('Value is required.')
  }

  const sortOrder =
    optionValue.sortOrder.trim() === ''
      ? fallbackSortOrder
      : Number.parseInt(optionValue.sortOrder, 10)

  if (Number.isNaN(sortOrder)) {
    throw new Error('Sort order must be a valid number.')
  }

  return {
    value: cleanedValue,
    display_value: optionValue.displayValue.trim() || undefined,
    sort_order: sortOrder
  }
}

const ProductSettingsPage = () => {
  const queryClient = useQueryClient()
  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [variantOptionName, setVariantOptionName] = useState('')
  const [variantOptionType, setVariantOptionType] = useState('select')
  const [variantOptionValues, setVariantOptionValues] = useState<VariantOptionValueFormState[]>([
    { ...EMPTY_VARIANT_OPTION_VALUE }
  ])
  const [variantOptionError, setVariantOptionError] = useState<string | null>(null)
  const [editingOption, setEditingOption] = useState<VariantOptionEditState>(
    EMPTY_VARIANT_OPTION_EDIT_STATE
  )
  const [editingValue, setEditingValue] = useState<VariantOptionValueEditState>(
    EMPTY_VARIANT_OPTION_VALUE_EDIT_STATE
  )
  const [newValueDrafts, setNewValueDrafts] = useState<Record<number, VariantOptionValueFormState>>(
    {}
  )
  const [newValueErrors, setNewValueErrors] = useState<Record<number, string | null>>({})

  const categoriesQuery = useQuery({
    queryKey: ['products', 'categories'],
    queryFn: listCategoriesRequest
  })

  const variantOptionsQuery = useQuery({
    queryKey: ['products', 'variant-options'],
    queryFn: listVariantOptionsRequest
  })

  const variantTypeOptions = useMemo(
    () => [
      { label: 'Select', value: 'select' },
      { label: 'Radio', value: 'radio' },
      { label: 'Swatch', value: 'swatch' },
      { label: 'Button', value: 'button' }
    ],
    []
  )

  const invalidateVariantOptionQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['products', 'variant-options'] })
  }

  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!categoryName.trim()) {
        throw new Error('Category name is required.')
      }

      return createCategoryRequest({
        name: categoryName.trim(),
        description: categoryDescription.trim() || undefined
      })
    },
    onSuccess: () => {
      setCategoryError(null)
      setCategoryName('')
      setCategoryDescription('')
      queryClient.invalidateQueries({ queryKey: ['products', 'categories'] })
    },
    onError: (error: Error) => {
      setCategoryError(error.message || 'Could not create category.')
    }
  })

  const createVariantOptionMutation = useMutation({
    mutationFn: async () => {
      const cleanedValues = variantOptionValues
        .reduce<ReturnType<typeof buildVariantOptionValuePayload>[]>((values, optionValue, index) => {
          if (!optionValue.value.trim()) {
            return values
          }

          values.push(buildVariantOptionValuePayload(optionValue, index))
          return values
        }, [])

      if (!variantOptionName.trim()) {
        throw new Error('Variant option name is required.')
      }
      if (cleanedValues.length === 0) {
        throw new Error('Add at least one value for the variant option.')
      }

      return createVariantOptionRequest({
        option_name: variantOptionName.trim(),
        option_type: variantOptionType,
        values: cleanedValues
      })
    },
    onSuccess: () => {
      setVariantOptionError(null)
      setVariantOptionName('')
      setVariantOptionType('select')
      setVariantOptionValues([{ ...EMPTY_VARIANT_OPTION_VALUE }])
      invalidateVariantOptionQueries()
    },
    onError: (error: Error) => {
      setVariantOptionError(error.message || 'Could not create variant option.')
    }
  })

  const updateVariantOptionMutation = useMutation({
    mutationFn: async ({
      optionId,
      optionName,
      optionType
    }: {
      optionId: number
      optionName: string
      optionType: string
    }) => {
      if (!optionName.trim()) {
        throw new Error('Variant option name is required.')
      }

      return updateVariantOptionRequest(optionId, {
        option_name: optionName.trim(),
        option_type: optionType
      })
    },
    onSuccess: () => {
      setEditingOption(EMPTY_VARIANT_OPTION_EDIT_STATE)
      invalidateVariantOptionQueries()
    },
    onError: (error: Error) => {
      setEditingOption((previous) => ({
        ...previous,
        error: error.message || 'Could not update variant option.'
      }))
    }
  })

  const deleteVariantOptionMutation = useMutation({
    mutationFn: async (optionId: number) => {
      await deleteVariantOptionRequest(optionId)
    },
    onSuccess: (_, optionId) => {
      setEditingOption((previous) =>
        previous.optionId === optionId ? EMPTY_VARIANT_OPTION_EDIT_STATE : previous
      )
      setEditingValue((previous) =>
        previous.optionId === optionId ? EMPTY_VARIANT_OPTION_VALUE_EDIT_STATE : previous
      )
      setNewValueDrafts((previous) => {
        const next = { ...previous }
        delete next[optionId]
        return next
      })
      setNewValueErrors((previous) => {
        const next = { ...previous }
        delete next[optionId]
        return next
      })
      invalidateVariantOptionQueries()
    },
    onError: (error: Error) => {
      setEditingOption((previous) => ({
        ...previous,
        error: error.message || 'Could not delete variant option.'
      }))
    }
  })

  const createVariantOptionValueMutation = useMutation({
    mutationFn: async ({
      optionId,
      optionValue,
      fallbackSortOrder
    }: {
      optionId: number
      optionValue: VariantOptionValueFormState
      fallbackSortOrder: number
    }) =>
      createVariantOptionValueRequest(
        optionId,
        buildVariantOptionValuePayload(optionValue, fallbackSortOrder)
      ),
    onSuccess: (_, { optionId }) => {
      setNewValueErrors((previous) => ({
        ...previous,
        [optionId]: null
      }))
      setNewValueDrafts((previous) => ({
        ...previous,
        [optionId]: { ...EMPTY_VARIANT_OPTION_VALUE }
      }))
      invalidateVariantOptionQueries()
    },
    onError: (error: Error, { optionId }) => {
      setNewValueErrors((previous) => ({
        ...previous,
        [optionId]: error.message || 'Could not add variant option value.'
      }))
    }
  })

  const updateVariantOptionValueMutation = useMutation({
    mutationFn: async ({
      valueId,
      optionValue,
      fallbackSortOrder
    }: {
      valueId: number
      optionValue: VariantOptionValueFormState
      fallbackSortOrder: number
    }) =>
      updateVariantOptionValueRequest(
        valueId,
        buildVariantOptionValuePayload(optionValue, fallbackSortOrder)
      ),
    onSuccess: () => {
      setEditingValue(EMPTY_VARIANT_OPTION_VALUE_EDIT_STATE)
      invalidateVariantOptionQueries()
    },
    onError: (error: Error) => {
      setEditingValue((previous) => ({
        ...previous,
        error: error.message || 'Could not update variant option value.'
      }))
    }
  })

  const deleteVariantOptionValueMutation = useMutation({
    mutationFn: async (valueId: number) => {
      await deleteVariantOptionValueRequest(valueId)
    },
    onSuccess: (_, valueId) => {
      setEditingValue((previous) =>
        previous.valueId === valueId ? EMPTY_VARIANT_OPTION_VALUE_EDIT_STATE : previous
      )
      invalidateVariantOptionQueries()
    },
    onError: (error: Error) => {
      setEditingValue((previous) => ({
        ...previous,
        error: error.message || 'Could not delete variant option value.'
      }))
    }
  })

  const updateVariantOptionValue = (
    index: number,
    key: keyof VariantOptionValueFormState,
    value: string
  ) => {
    setVariantOptionValues((previous) =>
      previous.map((optionValue, optionIndex) =>
        optionIndex === index ? { ...optionValue, [key]: value } : optionValue
      )
    )
  }

  const addVariantOptionValue = () => {
    setVariantOptionValues((previous) => [...previous, { ...EMPTY_VARIANT_OPTION_VALUE }])
  }

  const removeVariantOptionValue = (index: number) => {
    setVariantOptionValues((previous) =>
      previous.length === 1
        ? [{ ...EMPTY_VARIANT_OPTION_VALUE }]
        : previous.filter((_, optionIndex) => optionIndex !== index)
    )
  }

  const startEditingOption = (optionId: number, optionName: string, optionType: string) => {
    setEditingOption({
      optionId,
      optionName,
      optionType,
      error: null
    })
  }

  const startEditingValue = ({
    optionId,
    valueId,
    value,
    displayValue,
    sortOrder
  }: {
    optionId: number
    valueId: number
    value: string
    displayValue: string
    sortOrder: number
  }) => {
    setEditingValue({
      optionId,
      valueId,
      value,
      displayValue,
      sortOrder: String(sortOrder),
      error: null
    })
  }

  const updateNewValueDraft = (
    optionId: number,
    key: keyof VariantOptionValueFormState,
    value: string
  ) => {
    setNewValueDrafts((previous) => ({
      ...previous,
      [optionId]: {
        ...(previous[optionId] ?? EMPTY_VARIANT_OPTION_VALUE),
        [key]: value
      }
    }))
  }

  const onSubmitCategory = (event: FormEvent) => {
    event.preventDefault()
    setCategoryError(null)
    createCategoryMutation.mutate()
  }

  const onSubmitVariantOption = (event: FormEvent) => {
    event.preventDefault()
    setVariantOptionError(null)
    createVariantOptionMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-white to-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="flex items-center gap-2 text-2xl font-bold text-text">
            <CubeIcon className="h-6 w-6 text-primary" />
            Product Settings
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage reusable product configuration such as categories and variant options.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <p className="text-xs text-text-tertiary">Categories</p>
            <p className="mt-2 text-2xl font-semibold text-text">
              {categoriesQuery.data?.length ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <p className="text-xs text-text-tertiary">Variant Options</p>
            <p className="mt-2 text-2xl font-semibold text-text">
              {variantOptionsQuery.data?.length ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <p className="text-xs text-text-tertiary">Option Values</p>
            <p className="mt-2 text-2xl font-semibold text-text">
              {(variantOptionsQuery.data ?? []).reduce((sum, option) => sum + option.values.length, 0)}
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-xl border border-border bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <TagIcon className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-text">Categories</h2>
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              Create product categories used throughout the catalog.
            </p>

            <form onSubmit={onSubmitCategory} className="mt-5 space-y-4">
              <TextInput
                label="Category Name"
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="e.g., Curtains, Seats, Furniture"
                required
              />
              <TextInput
                label="Description"
                value={categoryDescription}
                onChange={(event) => setCategoryDescription(event.target.value)}
                placeholder="Optional category description"
              />
              <div className="flex items-center gap-3">
                <Button type="submit" loading={createCategoryMutation.isPending}>
                  Create Category
                </Button>
                {categoryError && (
                  <span className="flex items-center gap-1 text-xs text-error">
                    <XCircleIcon className="h-4 w-4" />
                    {categoryError}
                  </span>
                )}
              </div>
            </form>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text">Existing Categories</h3>
                {categoriesQuery.isFetching && (
                  <span className="text-xs text-text-tertiary">Refreshing...</span>
                )}
              </div>
              {categoriesQuery.isLoading ? (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-secondary">
                  <ArrowPathIcon className="h-4 w-4 animate-spin text-primary" />
                  Loading categories...
                </div>
              ) : (
                <div className="grid gap-3">
                  {(categoriesQuery.data ?? []).map((category) => (
                    <div
                      key={category.id}
                      className="rounded-xl border border-border bg-background px-4 py-3"
                    >
                      <p className="font-medium text-text">{category.name}</p>
                      <p className="mt-1 text-sm text-text-secondary">
                        {category.description?.trim() || 'No description'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-xl border border-border bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <CubeIcon className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-text">Variant Options</h2>
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              Create reusable option groups like color, size, or material.
            </p>

            <form onSubmit={onSubmitVariantOption} className="mt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput
                  label="Option Name"
                  value={variantOptionName}
                  onChange={(event) => setVariantOptionName(event.target.value)}
                  placeholder="e.g., Color"
                  required
                />
                <Select
                  label="Option Type"
                  options={variantTypeOptions}
                  value={variantOptionType}
                  onChange={(event) => setVariantOptionType(String(event.target.value))}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text">Option Values</p>
                    <p className="text-xs text-text-secondary">
                      Add the selectable values for this option.
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={addVariantOptionValue}>
                    <PlusIcon className="h-4 w-4" />
                    Add Value
                  </Button>
                </div>

                {variantOptionValues.map((optionValue, index) => (
                  <div
                    key={`settings-option-value-${index}`}
                    className="grid gap-3 rounded-xl border border-border bg-background p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_auto]"
                  >
                    <TextInput
                      label="Value"
                      value={optionValue.value}
                      onChange={(event) => updateVariantOptionValue(index, 'value', event.target.value)}
                      placeholder="e.g., Blue"
                    />
                    <TextInput
                      label="Display Value"
                      value={optionValue.displayValue}
                      onChange={(event) =>
                        updateVariantOptionValue(index, 'displayValue', event.target.value)
                      }
                      placeholder="Optional label"
                    />
                    <TextInput
                      label="Sort Order"
                      type="number"
                      min={0}
                      value={optionValue.sortOrder}
                      onChange={(event) =>
                        updateVariantOptionValue(index, 'sortOrder', event.target.value)
                      }
                    />
                    <div className="flex items-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeVariantOptionValue(index)}
                      >
                        <TrashIcon className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" loading={createVariantOptionMutation.isPending}>
                  Save Variant Option
                </Button>
                {variantOptionError && (
                  <span className="flex items-center gap-1 text-xs text-error">
                    <XCircleIcon className="h-4 w-4" />
                    {variantOptionError}
                  </span>
                )}
              </div>
            </form>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text">Existing Variant Options</h3>
                {variantOptionsQuery.isFetching && (
                  <span className="text-xs text-text-tertiary">Refreshing...</span>
                )}
              </div>
              {variantOptionsQuery.isLoading ? (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-secondary">
                  <ArrowPathIcon className="h-4 w-4 animate-spin text-primary" />
                  Loading variant options...
                </div>
              ) : (
                <div className="grid gap-3">
                  {(variantOptionsQuery.data ?? []).map((option) => (
                    <div key={option.id} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-text">{option.option_name}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-text-tertiary">
                            {option.option_type}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            {option.values.length} values
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              startEditingOption(option.id, option.option_name, option.option_type)
                            }
                          >
                            <PencilIcon className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            loading={
                              deleteVariantOptionMutation.isPending &&
                              deleteVariantOptionMutation.variables === option.id
                            }
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete the "${option.option_name}" option and all of its values?`
                                )
                              ) {
                                deleteVariantOptionMutation.mutate(option.id)
                              }
                            }}
                          >
                            <TrashIcon className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>

                      {editingOption.optionId === option.id && (
                        <div className="mt-4 rounded-xl border border-border bg-white p-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            <TextInput
                              label="Option Name"
                              value={editingOption.optionName}
                              onChange={(event) =>
                                setEditingOption((previous) => ({
                                  ...previous,
                                  optionName: event.target.value,
                                  error: null
                                }))
                              }
                            />
                            <Select
                              label="Option Type"
                              options={variantTypeOptions}
                              value={editingOption.optionType}
                              onChange={(event) =>
                                setEditingOption((previous) => ({
                                  ...previous,
                                  optionType: String(event.target.value),
                                  error: null
                                }))
                              }
                            />
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <Button
                              type="button"
                              size="sm"
                              loading={
                                updateVariantOptionMutation.isPending &&
                                updateVariantOptionMutation.variables?.optionId === option.id
                              }
                              onClick={() =>
                                updateVariantOptionMutation.mutate({
                                  optionId: option.id,
                                  optionName: editingOption.optionName,
                                  optionType: editingOption.optionType
                                })
                              }
                            >
                              Save Changes
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingOption(EMPTY_VARIANT_OPTION_EDIT_STATE)}
                            >
                              Cancel
                            </Button>
                            {editingOption.error && (
                              <span className="flex items-center gap-1 text-xs text-error">
                                <XCircleIcon className="h-4 w-4" />
                                {editingOption.error}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 space-y-3">
                        {option.values.map((value, valueIndex) => {
                          const isEditingValue =
                            editingValue.optionId === option.id && editingValue.valueId === value.id

                          return (
                            <div key={value.id} className="rounded-xl border border-border bg-white p-3">
                              {isEditingValue ? (
                                <>
                                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px]">
                                    <TextInput
                                      label="Value"
                                      value={editingValue.value}
                                      onChange={(event) =>
                                        setEditingValue((previous) => ({
                                          ...previous,
                                          value: event.target.value,
                                          error: null
                                        }))
                                      }
                                    />
                                    <TextInput
                                      label="Display Value"
                                      value={editingValue.displayValue}
                                      onChange={(event) =>
                                        setEditingValue((previous) => ({
                                          ...previous,
                                          displayValue: event.target.value,
                                          error: null
                                        }))
                                      }
                                    />
                                    <TextInput
                                      label="Sort Order"
                                      type="number"
                                      min={0}
                                      value={editingValue.sortOrder}
                                      onChange={(event) =>
                                        setEditingValue((previous) => ({
                                          ...previous,
                                          sortOrder: event.target.value,
                                          error: null
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="mt-3 flex flex-wrap items-center gap-3">
                                    <Button
                                      type="button"
                                      size="sm"
                                      loading={
                                        updateVariantOptionValueMutation.isPending &&
                                        updateVariantOptionValueMutation.variables?.valueId ===
                                          value.id
                                      }
                                      onClick={() =>
                                        updateVariantOptionValueMutation.mutate({
                                          valueId: value.id,
                                          optionValue: {
                                            value: editingValue.value,
                                            displayValue: editingValue.displayValue,
                                            sortOrder: editingValue.sortOrder
                                          },
                                          fallbackSortOrder: valueIndex
                                        })
                                      }
                                    >
                                      Save Value
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        setEditingValue(EMPTY_VARIANT_OPTION_VALUE_EDIT_STATE)
                                      }
                                    >
                                      Cancel
                                    </Button>
                                    {editingValue.error && (
                                      <span className="flex items-center gap-1 text-xs text-error">
                                        <XCircleIcon className="h-4 w-4" />
                                        {editingValue.error}
                                      </span>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-medium text-text">
                                      {value.display_value || value.value}
                                    </p>
                                    <p className="mt-1 text-xs text-text-tertiary">
                                      Raw value: {value.value} • Sort order: {value.sort_order}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        startEditingValue({
                                          optionId: option.id,
                                          valueId: value.id,
                                          value: value.value,
                                          displayValue: value.display_value ?? '',
                                          sortOrder: value.sort_order
                                        })
                                      }
                                    >
                                      <PencilIcon className="h-4 w-4" />
                                      Edit
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      loading={
                                        deleteVariantOptionValueMutation.isPending &&
                                        deleteVariantOptionValueMutation.variables === value.id
                                      }
                                      onClick={() => {
                                        if (
                                          window.confirm(
                                            `Delete "${value.display_value || value.value}" from ${
                                              option.option_name
                                            }?`
                                          )
                                        ) {
                                          deleteVariantOptionValueMutation.mutate(value.id)
                                        }
                                      }}
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}

                        {option.values.length === 0 && (
                          <div className="rounded-xl border border-dashed border-border bg-white px-4 py-3 text-sm text-text-secondary">
                            No values yet. Add the first value below.
                          </div>
                        )}
                      </div>

                      <div className="mt-4 rounded-xl border border-dashed border-border bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-text">Add New Value</p>
                            <p className="text-xs text-text-secondary">
                              Extend this option without recreating it.
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px]">
                          <TextInput
                            label="Value"
                            value={(newValueDrafts[option.id] ?? EMPTY_VARIANT_OPTION_VALUE).value}
                            onChange={(event) =>
                              updateNewValueDraft(option.id, 'value', event.target.value)
                            }
                            placeholder="e.g., Navy Blue"
                          />
                          <TextInput
                            label="Display Value"
                            value={
                              (newValueDrafts[option.id] ?? EMPTY_VARIANT_OPTION_VALUE).displayValue
                            }
                            onChange={(event) =>
                              updateNewValueDraft(option.id, 'displayValue', event.target.value)
                            }
                            placeholder="Optional label"
                          />
                          <TextInput
                            label="Sort Order"
                            type="number"
                            min={0}
                            value={
                              (newValueDrafts[option.id] ?? EMPTY_VARIANT_OPTION_VALUE).sortOrder
                            }
                            onChange={(event) =>
                              updateNewValueDraft(option.id, 'sortOrder', event.target.value)
                            }
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <Button
                            type="button"
                            size="sm"
                            loading={
                              createVariantOptionValueMutation.isPending &&
                              createVariantOptionValueMutation.variables?.optionId === option.id
                            }
                            onClick={() =>
                              createVariantOptionValueMutation.mutate({
                                optionId: option.id,
                                optionValue: newValueDrafts[option.id] ?? EMPTY_VARIANT_OPTION_VALUE,
                                fallbackSortOrder: option.values.length
                              })
                            }
                          >
                            <PlusIcon className="h-4 w-4" />
                            Add Value
                          </Button>
                          {newValueErrors[option.id] && (
                            <span className="flex items-center gap-1 text-xs text-error">
                              <XCircleIcon className="h-4 w-4" />
                              {newValueErrors[option.id]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  )
}

export default ProductSettingsPage
