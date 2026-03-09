import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, DataTable, type Column } from '@components/common'
import {
  listProjectsRequest,
  type ProjectSummaryResponse,
  uploadProjectImagesRequest
} from '@api/modules/projects.api'

const ProjectsOperationsPage = () => {
  const queryClient = useQueryClient()
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  const projectsQuery = useQuery({
    queryKey: ['projects', 'admin', 'list'],
    queryFn: () => listProjectsRequest({ limit: 100 })
  })

  const currentProject = useMemo(
    () => (projectsQuery.data ?? []).find((project) => project.id === editingProjectId),
    [editingProjectId, projectsQuery.data]
  )

  const updateMediaMutation = useMutation({
    mutationFn: async () => {
      if (!editingProjectId) {
        throw new Error('Select a project first.')
      }
      if (imageFiles.length === 0) {
        throw new Error('Select at least one image to upload.')
      }
      await uploadProjectImagesRequest(editingProjectId, imageFiles)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', 'admin', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['projects', 'public'] })
      setEditingProjectId(null)
      setImageFiles([])
      setFormError(null)
    },
    onError: (error: Error) => {
      setFormError(error.message || 'Could not update project images.')
    }
  })

  const columns: Column<ProjectSummaryResponse>[] = [
    {
      key: 'name',
      header: 'Project',
      render: (row) => (
        <div>
          <p className="font-medium text-text">{row.name}</p>
          <p className="text-[11px] text-text-tertiary">{row.project_type}</p>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status'
    },
    {
      key: 'image_urls',
      header: 'Images',
      render: (row) => {
        const images = row.image_urls ?? []
        if (images.length === 0) {
          return <span className="text-[11px] text-text-tertiary">None</span>
        }
        return (
          <div className="flex items-center gap-2">
            <img src={images[0]} alt={row.name} className="h-8 w-8 rounded object-cover" />
            <span className="text-[11px] text-text-secondary">{images.length} image(s)</span>
          </div>
        )
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end">
          <button
            type="button"
            className="rounded border border-border px-2 py-1 text-[11px] text-text-secondary hover:bg-secondary-light"
            onClick={() => {
              setEditingProjectId(row.id)
              setImageFiles([])
              setFormError(null)
            }}
          >
            Manage images
          </button>
        </div>
      )
    }
  ]

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    updateMediaMutation.mutate()
  }

  return (
    <div className="space-y-6 text-text">
      <header>
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Projects media</h1>
        <p className="text-sm text-text-secondary">
          Upload multiple images for each project (optional).
        </p>
      </header>

      {currentProject ? (
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-text">Manage images: {currentProject.name}</h2>
          <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={onSubmit}>
            <div className="space-y-1.5 text-xs sm:text-sm md:col-span-2">
              {(currentProject.image_urls ?? []).length > 0 ? (
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-[11px] text-text-tertiary">
                    Existing images: {(currentProject.image_urls ?? []).length}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(currentProject.image_urls ?? []).slice(0, 5).map((url) => (
                      <img key={url} src={url} alt={currentProject.name} className="h-12 w-12 rounded object-cover" />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="rounded-md border border-border bg-background px-3 py-2 text-[11px] text-text-tertiary">
                  No images uploaded yet.
                </p>
              )}
            </div>
            <div className="space-y-1.5 text-xs sm:text-sm md:col-span-1">
              <label className="block font-medium text-text-secondary" htmlFor="project-image-files">
                Upload images (optional)
              </label>
              <input
                id="project-image-files"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => setImageFiles(Array.from(event.target.files ?? []))}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs sm:text-sm"
              />
              {imageFiles.length > 0 ? (
                <p className="text-[11px] text-text-tertiary">{imageFiles.length} file(s) selected.</p>
              ) : null}
            </div>
            <div className="md:col-span-3 flex items-center gap-2">
              <Button type="submit" loading={updateMediaMutation.isPending}>
                Save project images
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingProjectId(null)
                  setImageFiles([])
                  setFormError(null)
                }}
              >
                Cancel
              </Button>
              {formError ? <p className="text-xs text-error">{formError}</p> : null}
            </div>
          </form>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text">Projects</h2>
        <DataTable
          columns={columns}
          data={projectsQuery.data ?? []}
          getRowKey={(row) => row.id}
          emptyState={projectsQuery.isLoading ? 'Loading projects…' : 'No projects found.'}
        />
      </section>
    </div>
  )
}

export default ProjectsOperationsPage
