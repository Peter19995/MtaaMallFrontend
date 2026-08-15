import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  SwatchIcon,
  PhotoIcon,
  SparklesIcon,
  PaintBrushIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { stylingApi } from '@api/modules/styling.api'
import { Button, DataTable, type Column } from '@components/common'
import type { ColorCombination, ExpertPick, InteriorTheme, SeatColor } from '@/types/styling.types'

type StylingTab = 'colors' | 'combinations' | 'themes' | 'expert'

const tabs: Array<{ id: StylingTab; label: string; icon: typeof SwatchIcon }> = [
  { id: 'colors', label: 'Seat Colors', icon: SwatchIcon },
  { id: 'combinations', label: 'Color Combinations', icon: SparklesIcon },
  { id: 'themes', label: 'Themes', icon: PaintBrushIcon },
  { id: 'expert', label: 'Expert Picks', icon: PhotoIcon }
]

export const StylingManagementPage = () => {
  const [activeTab, setActiveTab] = useState<StylingTab>('colors')

  const { data: seatColors = [], isLoading: seatColorsLoading } = useQuery({
    queryKey: ['admin', 'styling', 'seat-colors'],
    queryFn: () => stylingApi.getSeatColors(false)
  })

  const { data: combinations = [], isLoading: combinationsLoading } = useQuery({
    queryKey: ['admin', 'styling', 'combinations'],
    queryFn: () => stylingApi.getCombinations({ limit: 100 })
  })

  const { data: themes = [], isLoading: themesLoading } = useQuery({
    queryKey: ['admin', 'styling', 'themes'],
    queryFn: () => stylingApi.getThemes(false)
  })

  const { data: expertPicks = [], isLoading: expertPicksLoading } = useQuery({
    queryKey: ['admin', 'styling', 'expert-picks'],
    queryFn: () => stylingApi.getExpertPicks(false, 100)
  })

  const seatColorColumns: Array<Column<SeatColor>> = useMemo(
    () => [
      {
        key: 'name',
        header: 'Color',
        render: (row) => (
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-full border border-border"
              style={{ backgroundColor: row.hex_code }}
            />
            <span className="font-medium text-text">{row.name}</span>
          </div>
        )
      },
      {
        key: 'hex_code',
        header: 'Hex Code'
      },
      {
        key: 'display_order',
        header: 'Display Order'
      },
      {
        key: 'is_active',
        header: 'Status',
        render: (row) => (
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              row.is_active ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
            }`}
          >
            {row.is_active ? 'Active' : 'Inactive'}
          </span>
        )
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (row) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded p-1 text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
              onClick={() => toast('Edit seat color form can be wired next.')}
              aria-label={`Edit ${row.name}`}
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded p-1 text-text-secondary transition-colors hover:bg-error/10 hover:text-error"
              onClick={() => toast('Delete seat color action can be wired next.')}
              aria-label={`Delete ${row.name}`}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        )
      }
    ],
    []
  )

  const combinationColumns: Array<Column<ColorCombination>> = useMemo(
    () => [
      { key: 'name', header: 'Name' },
      {
        key: 'seat_color',
        header: 'Seat Color',
        render: (row) => row.seat_color?.name ?? `Color #${row.seat_color_id}`
      },
      {
        key: 'curtains',
        header: 'Curtains',
        render: (row) => row.curtain_recommendations?.length ?? 0,
        align: 'center'
      },
      {
        key: 'popularity',
        header: 'Popularity',
        render: (row) => row.popularity_score,
        align: 'center'
      }
    ],
    []
  )

  const themeColumns: Array<Column<InteriorTheme>> = useMemo(
    () => [
      { key: 'name', header: 'Theme' },
      {
        key: 'description',
        header: 'Description',
        render: (row) => row.description ?? '--'
      },
      {
        key: 'is_active',
        header: 'Status',
        render: (row) => (
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              row.is_active ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
            }`}
          >
            {row.is_active ? 'Active' : 'Inactive'}
          </span>
        )
      }
    ],
    []
  )

  const expertColumns: Array<Column<ExpertPick>> = useMemo(
    () => [
      { key: 'title', header: 'Title' },
      {
        key: 'theme',
        header: 'Theme',
        render: (row) => row.theme?.name ?? '--'
      },
      {
        key: 'is_featured',
        header: 'Featured',
        render: (row) => (row.is_featured ? 'Yes' : 'No'),
        align: 'center'
      },
      {
        key: 'created_at',
        header: 'Created',
        render: (row) => new Date(row.created_at).toLocaleDateString()
      }
    ],
    []
  )

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text">
          <SwatchIcon className="h-6 w-6 text-primary" />
          Styling Management
        </h1>
        <Button type="button" onClick={() => toast('Create form can be wired next.')}>
          <PlusIcon className="h-4 w-4" />
          Add New
        </Button>
      </motion.div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="rounded-xl border border-border bg-white p-4">
        {activeTab === 'colors' && (
          <DataTable
            columns={seatColorColumns}
            data={seatColors}
            getRowKey={(row) => row.id}
            emptyState={seatColorsLoading ? 'Loading seat colors...' : 'No seat colors found'}
          />
        )}

        {activeTab === 'combinations' && (
          <DataTable
            columns={combinationColumns}
            data={combinations}
            getRowKey={(row) => row.id}
            emptyState={combinationsLoading ? 'Loading combinations...' : 'No combinations found'}
          />
        )}

        {activeTab === 'themes' && (
          <DataTable
            columns={themeColumns}
            data={themes}
            getRowKey={(row) => row.id}
            emptyState={themesLoading ? 'Loading themes...' : 'No themes found'}
          />
        )}

        {activeTab === 'expert' && (
          <DataTable
            columns={expertColumns}
            data={expertPicks}
            getRowKey={(row) => row.id}
            emptyState={expertPicksLoading ? 'Loading expert picks...' : 'No expert picks found'}
          />
        )}
      </div>
    </div>
  )
}

export default StylingManagementPage
