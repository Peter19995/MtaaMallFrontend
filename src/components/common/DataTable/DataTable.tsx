import { ReactNode } from 'react'
import clsx from 'clsx'

export interface Column<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => ReactNode
  align?: 'left' | 'center' | 'right'
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
  return (
    <div className={clsx('overflow-hidden rounded-lg border border-border bg-surface', className)}>
      <table className="min-w-full divide-y divide-divider text-xs sm:text-sm">
        <thead className="bg-background">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key as string}
                className={clsx(
                  'px-3 py-2 text-left font-medium uppercase tracking-wide text-[11px] text-text-tertiary',
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right'
                )}
              >
                {column.header}
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
          {data.map((row, index) => (
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
      </table>
    </div>
  )
}

export default DataTable

