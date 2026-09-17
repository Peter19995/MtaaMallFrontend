// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { BusinessForm, LifecycleActions } from './BusinessComponents'
import MyBusinessPage from './MyBusinessPage'
import PlatformBusinessesPage from './PlatformBusinessesPage'
import { SiteDialogProvider } from '@components/common'
import { changeBusinessStatus, getMyBusiness, getMyBusinessDocuments, updateMyBusiness, listBusinesses, createBusiness } from '@api/modules/businesses.api'
import type { Business } from '@api/modules/businesses.api'

const identity = vi.hoisted(() => ({ user: { id: '1', roles: ['root_system_admin'], permissions: ['platform.businesses.read', 'platform.businesses.suspend'] } }))
vi.mock('@hooks/useAuth', () => ({ useAuth: () => ({ user: identity.user, hasPermission: (permission: string) => identity.user.permissions.includes(permission) }) }))
vi.mock('@api/modules/businesses.api', () => ({ changeBusinessStatus: vi.fn(), decideBusiness: vi.fn(), submitMyBusiness: vi.fn(), getBusinessAudit: vi.fn(), getMyBusiness: vi.fn(), getMyBusinessDocuments: vi.fn(), submitMyBusinessDocument: vi.fn(), updateMyBusiness: vi.fn(), listBusinesses: vi.fn(), getBusiness: vi.fn(), createBusiness: vi.fn() }))
const business: Business = {
  id: '29b781db-836c-4b13-9017-677dabdefe96', public_id: '29b781db-836c-4b13-9017-677dabdefe96',
  legal_name: 'Example Ltd', display_name: 'Example Shop', slug: 'example-shop', status: 'active',
  country: 'KE', currency: 'KES', timezone: 'Africa/Nairobi', business_type: 'retail',
  rejection_reason: null, created_by_user_id: 1, approved_by_user_id: 1, approved_at: null,
  suspended_at: null, created_at: '2026-09-06T09:00:00Z', updated_at: null, owner: null, branches: []
}
const mount = (element: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><MemoryRouter><SiteDialogProvider>{element}</SiteDialogProvider></MemoryRouter></QueryClientProvider>)
beforeEach(() => { vi.resetAllMocks(); vi.mocked(getMyBusinessDocuments).mockResolvedValue([]); identity.user.roles = ['root_system_admin']; identity.user.permissions = ['platform.businesses.read', 'platform.businesses.suspend'] })
afterEach(cleanup)

describe('business screens', () => {
  it('requires a nonblank reason and explicit confirmation, preserving the UUID', async () => {
    vi.mocked(changeBusinessStatus).mockResolvedValue({ ...business, status: 'suspended' })
    mount(<LifecycleActions business={business} />)
    fireEvent.click(screen.getByRole('button', { name: 'Suspend business' }))
    expect(screen.getByRole('button', { name: 'Confirm decision' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Decision reason'), { target: { value: 'Compliance review' } })
    expect(changeBusinessStatus).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm decision' }))
    await waitFor(() => expect(changeBusinessStatus).toHaveBeenCalledWith(business.public_id, 'suspended', 'Compliance review'))
  })
  it('never calls the API when a decision is cancelled', () => {
    mount(<LifecycleActions business={business} />)
    fireEvent.click(screen.getByRole('button', { name: 'Suspend business' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(changeBusinessStatus).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Confirm decision' })).not.toBeInTheDocument()
  })
  it('hides activation and suspension controls from an owner', () => {
    identity.user.roles = ['business_owner']; identity.user.permissions = ['business.settings.update']
    mount(<LifecycleActions business={{ ...business, status: 'pending_verification' }} own />)
    expect(screen.queryByRole('button', { name: 'Activate business' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Suspend business' })).not.toBeInTheDocument()
  })
  it('renders suspended profiles read-only while keeping identity visible', async () => {
    identity.user.roles = ['business_owner']; identity.user.permissions = ['business.settings.read', 'business.settings.update']
    vi.mocked(getMyBusiness).mockResolvedValue({ ...business, status: 'suspended' })
    mount(<MyBusinessPage />)
    expect(within(await screen.findByRole('region', { name: 'Business overview' })).getByText('Example Shop')).toBeVisible()
    expect(screen.getByLabelText('Legal name')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Save business profile' })).not.toBeInTheDocument()
    expect(updateMyBusiness).not.toHaveBeenCalled()
  })
  it('sends profile fields only and omits locked registration number', () => {
    const save = vi.fn()
    mount(<BusinessForm business={business} pending={false} onSave={save} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save business profile' }))
    expect(save).toHaveBeenCalledOnce()
    expect(save.mock.calls[0][0]).not.toHaveProperty('id')
    expect(save.mock.calls[0][0]).not.toHaveProperty('status')
    expect(save.mock.calls[0][0]).not.toHaveProperty('registration_number')
  })
  it('groups profile fields and saves edits through the existing API', async () => {
    identity.user.roles = ['business_owner']; identity.user.permissions = ['business.settings.read', 'business.settings.update']
    vi.mocked(getMyBusiness).mockResolvedValue({ ...business, status: 'pending_verification', email: 'shop@example.com' })
    vi.mocked(updateMyBusiness).mockResolvedValue({ ...business, status: 'pending_verification', display_name: 'Updated shop' })
    mount(<MyBusinessPage />)
    expect(await screen.findByRole('heading', { name: 'Your business is in review' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Contact information' })).toBeInTheDocument()
    expect(screen.getByLabelText('Business email (optional)')).toHaveValue('shop@example.com')
    expect(screen.getByLabelText('Registration number')).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Updated shop' } })
    fireEvent.change(screen.getByLabelText('Description (optional)'), { target: { value: 'A local store.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save business profile' }))
    await waitFor(() => expect(updateMyBusiness).toHaveBeenCalledOnce())
    expect(vi.mocked(updateMyBusiness).mock.calls[0][0]).toMatchObject({ display_name: 'Updated shop', description: 'A local store.' })
    expect(vi.mocked(updateMyBusiness).mock.calls[0][0]).not.toHaveProperty('registration_number')
    expect(await screen.findByText('Profile saved successfully.')).toBeInTheDocument()
  })
  it('hides editing and branch navigation without their named permissions', async () => {
    identity.user.roles = ['business_owner']; identity.user.permissions = ['business.settings.read']
    vi.mocked(getMyBusiness).mockResolvedValue(business)
    mount(<MyBusinessPage />)
    expect(await screen.findByText('You’re ready for business')).toBeInTheDocument()
    expect(screen.getByLabelText('Legal name')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Save business profile' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Manage branches' })).not.toBeInTheDocument()
  })
  it('keeps the business ID available and confirms copying', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    vi.mocked(getMyBusiness).mockResolvedValue(business)
    mount(<MyBusinessPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Copy business ID' }))
    expect(writeText).toHaveBeenCalledWith(business.public_id)
    expect(await screen.findByText('Business ID copied.')).toBeInTheDocument()
  })
  it('creates independent drafts without owner or authority fields', async () => {
    identity.user.permissions.push('platform.businesses.create')
    vi.mocked(listBusinesses).mockResolvedValue([])
    // Leave mutation pending to inspect the request without a detail query.
    vi.mocked(createBusiness).mockImplementation(() => new Promise(() => {}))
    mount(<PlatformBusinessesPage />)
    fireEvent.click(screen.getByRole('button', { name: 'New business' }))
    fireEvent.change(screen.getByLabelText('Legal name'), { target: { value: 'New Company Ltd' } })
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'New Company' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create draft business' }))
    await waitFor(() => expect(createBusiness).toHaveBeenCalledOnce())
    const payload = vi.mocked(createBusiness).mock.calls[0][0]
    expect(payload).toMatchObject({ legal_name: 'New Company Ltd', display_name: 'New Company', email: null, country: 'KE' })
    expect(payload).not.toHaveProperty('owner_id')
    expect(payload).not.toHaveProperty('status')
  })
  it('shows API errors and a retry action instead of an empty success state', async () => {
    vi.mocked(getMyBusiness).mockRejectedValue(new Error('Network unavailable'))
    mount(<MyBusinessPage />)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})
