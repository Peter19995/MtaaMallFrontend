import { ReactNode, useMemo, useState } from 'react'
import clsx from 'clsx'

export interface Column<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => ReactNode
  footer?: ReactNode | ((rows: T[]) => ReactNode)
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  sortValue?: (row: T) => string | number | boolean | null | undefined
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  getRowKey?: (row: T, index: number) => string | number
  emptyState?: ReactNode
  className?: string
}

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  emptyState,
  className
}: DataTableProps<T>) {
  const hasFooter = columns.some((column) => column.footer !== undefined)
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const sortedData = useMemo(() => {
    if (!sort) return data
    const column = columns.find((candidate) => String(candidate.key) === sort.key)
    if (!column) return data

    const valueFor = (row: T) =>
      column.sortValue
        ? column.sortValue(row)
        : (row as Record<string, unknown>)[String(column.key)] as
            | string
            | number
            | boolean
            | null
            | undefined

    return [...data].sort((left, right) => {
      const leftValue = valueFor(left)
      const rightValue = valueFor(right)
      if (leftValue == null && rightValue == null) return 0
      if (leftValue == null) return 1
      if (rightValue == null) return -1

      const comparison =
        typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), undefined, {
              numeric: true,
              sensitivity: 'base'
            })
      return sort.direction === 'asc' ? comparison : -comparison
    })
  }, [columns, data, sort])

  const changeSort = (key: string) => {
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    )
  }

  return (
    <div className={clsx('overflow-hidden rounded-lg border border-border bg-surface', className)}>
      <table className="min-w-full divide-y divide-divider text-xs sm:text-sm">
        <thead className="bg-background">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key as string}
                aria-sort={
                  column.sortable && sort?.key === String(column.key)
                    ? sort.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : column.sortable
                      ? 'none'
                      : undefined
                }
                className={clsx(
                  'px-3 py-2 text-left font-medium uppercase tracking-wide text-[11px] text-text-tertiary',
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right'
                )}
              >
                {column.sortable ? (
                  <button
                    type="button"
                    onClick={() => changeSort(String(column.key))}
                    className={clsx(
                      'inline-flex items-center gap-1.5 transition hover:text-primary-dark',
                      column.align === 'right' && 'ml-auto'
                    )}
                  >
                    <span>{column.header}</span>
                    <span aria-hidden="true" className="text-[10px] text-text-tertiary">
                      {sort?.key === String(column.key)
                        ? sort.direction === 'asc'
                          ? '▲'
                          : '▼'
                        : '↕'}
                    </span>
                  </button>
                ) : column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-divider bg-surface">
          {data.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-6 text-center text-[11px] text-text-tertiary"
              >
                {emptyState ?? 'No records to display.'}
              </td>
            </tr>
          )}
          {sortedData.map((row, index) => (
            <tr
              key={getRowKey?.(row, index) ?? index}
              className="hover:bg-background/60 transition-colors"
            >
              {columns.map((column) => (
                <td
                  key={column.key as string}
                  className={clsx(
                    'px-3 py-2 text-text-secondary',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                >
                  {column.render
                    ? column.render(row)
                    : // @ts-expect-error index access is allowed here for generic rows
                      (row[column.key] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {hasFooter && (
          <tfoot className="border-t border-divider bg-background/80">
            <tr>
              {columns.map((column) => (
                <td
                  key={column.key as string}
                  className={clsx(
                    'px-3 py-3 font-medium text-text',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                >
                  {typeof column.footer === 'function'
                    ? column.footer(sortedData)
                    : column.footer ?? null}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

export default DataTable
