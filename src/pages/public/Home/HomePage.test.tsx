// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { listCategoriesRequest } from '@api/modules/products.api'
import { listMarketplaceProductsRequest, type MarketplaceProduct } from '@api/modules/marketplace.api'
import HomePage from './HomePage'
vi.mock('@api/modules/products.api', () => ({ listCategoriesRequest: vi.fn() }))
vi.mock('@api/modules/marketplace.api', () => ({ listMarketplaceProductsRequest: vi.fn() }))
const product = {
  product: { public_id: 'catalog-1', name: 'Everyday tea', brand: 'MtaaMall' },
  offers: [{
    business_id: 'business-1', business_name: 'Shop One', business_product_id: 'listing-1',
    business_variant_id: 'variant-1', variant: {}, sku: 'TEA-1', price: '0.00', currency: 'KES',
    available: true, available_quantity: 4, fulfillment_branch_id: 'branch-1', fulfillment_branch_name: 'Main'
  }]
} as MarketplaceProduct
function Location() { return <output data-testid="location">{useLocation().pathname + useLocation().search}</output> }
function show() { render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><HomePage /><Location /></MemoryRouter></QueryClientProvider>) }
beforeEach(() => { vi.mocked(listMarketplaceProductsRequest).mockResolvedValue([product]); vi.mocked(listCategoriesRequest).mockResolvedValue([{ id: 1, name: 'Groceries' }]) })
afterEach(() => { cleanup(); vi.resetAllMocks() })
it('uses real catalog data and does not advertise missing prices as free products', async () => {
  show()
  expect(await screen.findByText('Everyday tea')).toBeInTheDocument()
  expect(screen.getByText('Price to be confirmed')).toBeInTheDocument()
  expect(screen.getByText('1 seller · Explore options')).toBeInTheDocument()
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
  vi.mocked(listMarketplaceProductsRequest).mockResolvedValue([])
  show()
  expect(await screen.findByText('The shelves are getting ready.')).toBeInTheDocument()
  expect(screen.queryByText('Everyday tea')).not.toBeInTheDocument()
})
it('allows retry after catalog failure', async () => {
  vi.mocked(listMarketplaceProductsRequest).mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce([product])
  show()
  fireEvent.click(await screen.findByRole('button', { name: 'Retry' }))
  expect(await screen.findByText('Everyday tea')).toBeInTheDocument()
})
