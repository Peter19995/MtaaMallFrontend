// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { listInStockProductsRequest, listCategoriesRequest, type ProductResponse } from '@api/modules/products.api'
import HomePage from './HomePage'
vi.mock('@api/modules/products.api', () => ({ listInStockProductsRequest: vi.fn(), listCategoriesRequest: vi.fn() }))
const product = { id: 1, name: 'Everyday tea', category_name: 'Groceries', price: 0, stock_quantity: 4, is_active: true } as ProductResponse
function Location() { return <output data-testid="location">{useLocation().pathname + useLocation().search}</output> }
function show() { render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><HomePage /><Location /></MemoryRouter></QueryClientProvider>) }
beforeEach(() => { vi.mocked(listInStockProductsRequest).mockResolvedValue([product]); vi.mocked(listCategoriesRequest).mockResolvedValue([{ id: 1, name: 'Groceries' }]) })
afterEach(() => { cleanup(); vi.resetAllMocks() })
it('uses real catalog data and does not advertise missing prices as free products', async () => {
  show()
  expect(await screen.findByText('Everyday tea')).toBeInTheDocument()
  expect(screen.getByText('Price to be confirmed')).toBeInTheDocument()
  expect(screen.getByText('In stock · Explore options')).toBeInTheDocument()
  expect(screen.queryByText(/interior design/i)).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Bring your business to MtaaMall/ })).toHaveAttribute('href', '/register?type=business')
  expect(screen.getByRole('link', { name: 'Groceries' })).toHaveAttribute('href', '/products?category=Groceries')
})
it('sends an encoded search to the catalog', async () => {
  show()
  fireEvent.change(screen.getByLabelText('Search the mall'), { target: { value: ' tea & coffee ' } })
  fireEvent.submit(screen.getByRole('search'))
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/products?search=tea%20%26%20coffee'))
})
it('shows an honest empty state without fabricated products', async () => {
  vi.mocked(listInStockProductsRequest).mockResolvedValue([])
  show()
  expect(await screen.findByText('The shelves are getting ready.')).toBeInTheDocument()
  expect(screen.queryByText('Everyday tea')).not.toBeInTheDocument()
})
it('allows retry after catalog failure', async () => {
  vi.mocked(listInStockProductsRequest).mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce([product])
  show()
  fireEvent.click(await screen.findByRole('button', { name: 'Retry' }))
  expect(await screen.findByText('Everyday tea')).toBeInTheDocument()
})
