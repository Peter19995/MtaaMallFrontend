import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowUpTrayIcon,
  CalculatorIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
  PhotoIcon,
  TrashIcon,
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
import {
  deleteSiteMediaAssetRequest,
  listSiteMediaGroupsRequest,
  listSiteMediaRequest,
  uploadSiteMediaRequest
} from '@api/modules/site-media.api'
import { resolveMediaUrl } from '@utils/media'

const formatDateTime = (value?: string) => {
  if (!value) return 'Unknown date'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString()
}

const SettingsPage = () => {
  const queryClient = useQueryClient()
  const [valuationBranchId, setValuationBranchId] = useState<string>('')
  const [selectedValuationMethod, setSelectedValuationMethod] = useState<string>('')
  const [valuationMethodError, setValuationMethodError] = useState<string | null>(null)

  const [siteMediaGroupName, setSiteMediaGroupName] = useState('heroImages')
  const [siteMediaFiles, setSiteMediaFiles] = useState<File[]>([])
  const [siteMediaFeedback, setSiteMediaFeedback] = useState<string | null>(null)
  const [siteMediaError, setSiteMediaError] = useState<string | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)

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

  const siteMediaQuery = useQuery({
    queryKey: ['site-media'],
    queryFn: listSiteMediaRequest
  })

  const siteMediaGroupsQuery = useQuery({
    queryKey: ['site-media', 'groups'],
    queryFn: listSiteMediaGroupsRequest
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

  const siteMediaGroupNames = useMemo(() => {
    return Array.from(new Set<string>([
      ...(siteMediaGroupsQuery.data ?? []),
      ...Object.keys(siteMediaQuery.data?.groups ?? {})
    ])).sort((left, right) => left.localeCompare(right))
  }, [siteMediaGroupsQuery.data, siteMediaQuery.data?.groups])

  useEffect(() => {
    if (!siteMediaGroupNames.length) {
      setSiteMediaGroupName('')
      return
    }

    if (!siteMediaGroupName.trim() || !siteMediaGroupNames.includes(siteMediaGroupName.trim())) {
      setSiteMediaGroupName(siteMediaGroupNames[0])
    }
  }, [siteMediaGroupName, siteMediaGroupNames])

  const activeSiteMediaGroupName = siteMediaGroupName.trim()
  const activeSiteMediaAssets = useMemo(
    () => (activeSiteMediaGroupName ? siteMediaQuery.data?.groups?.[activeSiteMediaGroupName] ?? [] : []),
    [activeSiteMediaGroupName, siteMediaQuery.data?.groups]
  )

  const siteMediaLoadError =
    (siteMediaQuery.error instanceof Error && siteMediaQuery.error.message) ||
    (siteMediaGroupsQuery.error instanceof Error && siteMediaGroupsQuery.error.message) ||
    null

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

  const uploadSiteMediaMutation = useMutation({
    mutationFn: async () => {
      const groupName = siteMediaGroupName.trim()

      if (!groupName) {
        throw new Error('Select a group before uploading.')
      }

      if (siteMediaFiles.length === 0) {
        throw new Error('Select at least one image to upload.')
      }

      return uploadSiteMediaRequest(groupName, siteMediaFiles)
    },
    onSuccess: () => {
      const fileCount = siteMediaFiles.length
      const groupName = siteMediaGroupName.trim()

      setSiteMediaError(null)
      setSiteMediaFeedback(
        `Uploaded ${fileCount} image${fileCount === 1 ? '' : 's'} to ${groupName}.`
      )
      setSiteMediaFiles([])
      setFileInputKey((current) => current + 1)
      queryClient.invalidateQueries({ queryKey: ['site-media'] })
      queryClient.invalidateQueries({ queryKey: ['site-media', 'groups'] })
    },
    onError: (error: Error) => {
      setSiteMediaFeedback(null)
      setSiteMediaError(error.message || 'Could not upload site media.')
    }
  })

  const deleteSiteMediaMutation = useMutation({
    mutationFn: async (assetId: number) => deleteSiteMediaAssetRequest(assetId),
    onSuccess: () => {
      setSiteMediaError(null)
      setSiteMediaFeedback('Image removed successfully.')
      queryClient.invalidateQueries({ queryKey: ['site-media'] })
      queryClient.invalidateQueries({ queryKey: ['site-media', 'groups'] })
    },
    onError: (error: Error) => {
      setSiteMediaFeedback(null)
      setSiteMediaError(error.message || 'Could not delete site media image.')
    }
  })

  const onSubmitValuationMethod = (event: FormEvent) => {
    event.preventDefault()
    setValuationMethodError(null)
    updateValuationMethodMutation.mutate()
  }

  const onSubmitSiteMedia = (event: FormEvent) => {
    event.preventDefault()
    setSiteMediaFeedback(null)
    setSiteMediaError(null)
    uploadSiteMediaMutation.mutate()
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
          Configure inventory defaults and manage site-wide media assets
        </p>
      </motion.div>

      <div className="max-w-6xl space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
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
                  <p className="text-xs text-text-tertiary mt-2">
                    {selectedValuationMethodInfo.description}
                  </p>
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

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
            <div className="flex flex-col gap-2 mb-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <PhotoIcon className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-sm font-semibold text-text">Site Media</h2>
                  <p className="text-xs text-text-tertiary">
                    Upload, review, and remove media by group name
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-secondary">
                {siteMediaGroupNames.length} group{siteMediaGroupNames.length === 1 ? '' : 's'} available
              </div>
            </div>

            <form onSubmit={onSubmitSiteMedia} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px]">
              <Select
                label="Group Name"
                options={
                  siteMediaGroupNames.length > 0
                    ? siteMediaGroupNames.map((groupName) => ({
                        label: groupName,
                        value: groupName
                      }))
                    : [{ label: 'No groups available', value: '' }]
                }
                value={siteMediaGroupName}
                onChange={(event) => {
                  setSiteMediaGroupName(String(event.target.value))
                  setSiteMediaFeedback(null)
                  setSiteMediaError(null)
                }}
                helperText="Select which site media group these images belong to."
                disabled={siteMediaGroupNames.length === 0}
              />

              <div className="space-y-1.5 text-xs sm:text-sm">
                <label className="block font-medium text-text-secondary" htmlFor="site-media-files">
                  Images
                </label>
                <input
                  key={fileInputKey}
                  id="site-media-files"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    setSiteMediaFiles(Array.from(event.target.files ?? []))
                    setSiteMediaFeedback(null)
                    setSiteMediaError(null)
                  }}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs text-text shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-primary-dark"
                />
                <p className="text-[11px] text-text-tertiary">
                  {siteMediaFiles.length > 0
                    ? `${siteMediaFiles.length} file${siteMediaFiles.length === 1 ? '' : 's'} selected`
                    : 'Select one or more images to upload.'}
                </p>
              </div>

              <div className="flex items-end">
                <Button
                  type="submit"
                  className="w-full"
                  loading={uploadSiteMediaMutation.isPending}
                  leftIcon={<ArrowUpTrayIcon className="h-4 w-4" />}
                  disabled={siteMediaGroupNames.length === 0}
                >
                  Upload Images
                </Button>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              {siteMediaGroupNames.map((groupName) => {
                const isActive = activeSiteMediaGroupName === groupName
                const assetCount = siteMediaQuery.data?.groups?.[groupName]?.length ?? 0

                return (
                  <Button
                    key={groupName}
                    variant={isActive ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setSiteMediaGroupName(groupName)
                      setSiteMediaFeedback(null)
                      setSiteMediaError(null)
                    }}
                    className="rounded-full"
                  >
                    {groupName} ({assetCount})
                  </Button>
                )
              })}
            </div>

            {(siteMediaFeedback || siteMediaError || siteMediaLoadError) && (
              <div className="mt-4 flex flex-col gap-2">
                {siteMediaFeedback && (
                  <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
                    {siteMediaFeedback}
                  </div>
                )}
                {(siteMediaError || siteMediaLoadError) && (
                  <div className="rounded-lg border border-error/30 bg-error-light/10 px-3 py-2 text-xs text-error">
                    {siteMediaError ?? siteMediaLoadError}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 rounded-xl border border-border bg-background/60 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text">
                    {activeSiteMediaGroupName || 'Select a media group'}
                  </h3>
                  <p className="text-xs text-text-tertiary mt-1">
                    {activeSiteMediaGroupName
                      ? `${activeSiteMediaAssets.length} asset${activeSiteMediaAssets.length === 1 ? '' : 's'} in this group`
                      : 'Choose a group above or type one to begin uploading.'}
                  </p>
                </div>
              </div>

              {siteMediaQuery.isLoading ? (
                <div className="py-10 text-sm text-text-secondary">Loading site media...</div>
              ) : activeSiteMediaAssets.length === 0 ? (
                <div className="py-10 text-sm text-text-secondary">
                  No images found for this group yet.
                </div>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {activeSiteMediaAssets
                    .slice()
                    .sort((left, right) => left.sort_order - right.sort_order)
                    .map((asset) => {
                      const imageUrl = resolveMediaUrl(asset.image_url) ?? asset.image_url

                      return (
                        <div
                          key={asset.id}
                          className="overflow-hidden rounded-xl border border-border bg-white shadow-sm"
                        >
                          <div className="aspect-[4/3] bg-background">
                            <img
                              src={imageUrl}
                              alt={asset.alt_text ?? `${asset.group_name} asset ${asset.id}`}
                              className="h-full w-full object-cover"
                            />
                          </div>

                          <div className="space-y-3 p-4">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-text line-clamp-1">
                                {asset.alt_text || `Asset #${asset.id}`}
                              </p>
                              <p className="text-xs text-text-tertiary">
                                Sort order: {asset.sort_order}
                              </p>
                              <p className="text-xs text-text-tertiary">
                                Added: {formatDateTime(asset.created_at)}
                              </p>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <a
                                href={imageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-medium text-primary hover:text-primary-dark"
                              >
                                Open image
                              </a>

                              <Button
                                variant="ghost"
                                size="sm"
                                loading={
                                  deleteSiteMediaMutation.isPending &&
                                  deleteSiteMediaMutation.variables === asset.id
                                }
                                onClick={() => {
                                  if (!window.confirm('Remove this image from site media?')) {
                                    return
                                  }

                                  setSiteMediaFeedback(null)
                                  setSiteMediaError(null)
                                  deleteSiteMediaMutation.mutate(asset.id)
                                }}
                                className="text-error hover:bg-error-light/10"
                                leftIcon={<TrashIcon className="h-4 w-4" />}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  )
}

export default SettingsPage
