// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import {
  createCategoryRequest,
  deleteCategoryRequest,
  listCategoriesRequest,
  updateCategoryRequest,
} from '@api/modules/products.api'
import ProductCategoriesPage from './ProductCategoriesPage'

const permissions = ['products.read', 'products.create', 'products.update', 'products.delete']
vi.mock('@hooks/useAuth', () => ({
  useAuth: () => ({
    user: { business_status: 'active', permissions },
    hasPermission: (permission: string) => permissions.includes(permission),
  }),
}))
vi.mock('@api/modules/products.api', () => ({
  listCategoriesRequest: vi.fn(),
  createCategoryRequest: vi.fn(),
  updateCategoryRequest: vi.fn(),
  deleteCategoryRequest: vi.fn(),
}))

const category = { id: 4, name: 'Furniture', description: 'Tables and chairs' }
const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><MemoryRouter><ProductCategoriesPage /></MemoryRouter></QueryClientProvider>)

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(listCategoriesRequest).mockResolvedValue([category])
  vi.mocked(createCategoryRequest).mockResolvedValue({ id: 5, name: 'Electronics', description: 'Devices' })
  vi.mocked(updateCategoryRequest).mockResolvedValue({ ...category, name: 'Home furniture' })
  vi.mocked(deleteCategoryRequest).mockResolvedValue(undefined)
})
afterEach(cleanup)

it('lists categories and reuses the category form for create and edit actions', async () => {
  mount()
  expect(await screen.findByText('Furniture')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'View Furniture' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Delete Furniture' })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Add category' }))
  expect(screen.getByRole('dialog', { name: 'Add category' })).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Category name'), { target: { value: 'Electronics' } })
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Devices' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create category' }))
  await waitFor(() => expect(createCategoryRequest).toHaveBeenCalledWith({ name: 'Electronics', description: 'Devices' }))

  fireEvent.click(screen.getByRole('button', { name: 'Edit Furniture' }))
  expect(screen.getByRole('dialog', { name: 'Edit category' })).toBeInTheDocument()
  expect(screen.getByLabelText('Category name')).toHaveValue('Furniture')
  fireEvent.change(screen.getByLabelText('Category name'), { target: { value: 'Home furniture' } })
  fireEvent.click(screen.getByRole('button', { name: 'Update category' }))
  await waitFor(() => expect(updateCategoryRequest).toHaveBeenCalledWith(4, { name: 'Home furniture', description: 'Tables and chairs' }))
})
