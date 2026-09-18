// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'

import { Select } from './Select'

afterEach(cleanup)

describe('Select', () => {
  it('renders a themed searchable list and reports the selected value', async () => {
    const selectedValues: string[] = []
    const onChange = (event: React.ChangeEvent<HTMLSelectElement>) => selectedValues.push(event.target.value)
    const options = Array.from({ length: 10 }, (_, index) => ({
      label: `Product ${index + 1}`,
      value: String(index + 1)
    }))

    render(<Select label="Product" value="" options={options} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /product/i }))
    const search = screen.getByPlaceholderText('Search options...')
    fireEvent.change(search, { target: { value: 'Product 9' } })

    expect(screen.queryByText('Product 1')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('option', { name: 'Product 9' }))

    expect(selectedValues).toEqual(['9'])
  })

  it('accepts option children for migrated dropdowns', async () => {
    const selectedValues: string[] = []
    const onChange = (event: React.ChangeEvent<HTMLSelectElement>) => selectedValues.push(event.target.value)

    render(
      <Select aria-label="Status" value="active" onChange={onChange}>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
      </Select>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Status' }))
    fireEvent.click(screen.getByRole('option', { name: 'Suspended' }))
    expect(selectedValues).toEqual(['suspended'])
  })
})
