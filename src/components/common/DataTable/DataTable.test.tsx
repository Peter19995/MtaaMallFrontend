// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { DataTable, type Column } from './DataTable'

type StockRow = { product: string; quantity: number }

const columns: Column<StockRow>[] = [
  { key: 'product', header: 'Product', sortable: true },
  { key: 'quantity', header: 'Stock', sortable: true }
]

const rowValues = () =>
  screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0].textContent)

afterEach(cleanup)

it('sorts text and numeric columns in both directions', () => {
  render(
    <DataTable
      columns={columns}
      data={[
        { product: 'Sugar', quantity: 2 },
        { product: 'Apples', quantity: 12 },
        { product: 'Bread', quantity: 5 }
      ]}
    />
  )

  fireEvent.click(screen.getByRole('button', { name: /Product/ }))
  expect(rowValues()).toEqual(['Apples', 'Bread', 'Sugar'])
  fireEvent.click(screen.getByRole('button', { name: /Product/ }))
  expect(rowValues()).toEqual(['Sugar', 'Bread', 'Apples'])

  fireEvent.click(screen.getByRole('button', { name: /Stock/ }))
  expect(rowValues()).toEqual(['Sugar', 'Bread', 'Apples'])
  fireEvent.click(screen.getByRole('button', { name: /Stock/ }))
  expect(rowValues()).toEqual(['Apples', 'Bread', 'Sugar'])
})
