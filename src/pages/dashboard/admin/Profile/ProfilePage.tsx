import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import {
  BuildingStorefrontIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  ClockIcon,
  IdentificationIcon,
  KeyIcon,
  UserCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { Button, TextArea, TextInput } from '@components/common'
import { getMyBusinessRequest, updateMyBusinessRequest } from '@api/modules/businesses.api'
import { changePasswordRequest, getMeRequest } from '@api/modules/auth.api'
import { updateUserRequest } from '@api/modules/users.api'

const errorMessage = (error: unknown, fallback: string) => {
  if (!isAxiosError(error)) return error instanceof Error ? error.message : fallback
  const data = error.response?.data as { message?: string; detail?: string } | undefined
  return data?.message || data?.detail || fallback
}

const ProfilePage = () => {
  const queryClient = useQueryClient()
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [businessForm, setBusinessForm] = useState({ name: '', business_type: '', email: '', phone: '', description: '' })
  const [ownerForm, setOwnerForm] = useState({ full_name: '', email: '', phone: '' })
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' })

  const businessQuery = useQuery({ queryKey: ['businesses', 'me'], queryFn: getMyBusinessRequest })
  const userQuery = useQuery({ queryKey: ['users', 'me'], queryFn: () => getMeRequest() })

  useEffect(() => {
    if (!businessQuery.data) return
    setBusinessForm({
      name: businessQuery.data.name,
      business_type: businessQuery.data.business_type,
      email: businessQuery.data.email ?? '',
      phone: businessQuery.data.phone ?? '',
      description: businessQuery.data.description ?? ''
    })
  }, [businessQuery.data])

  useEffect(() => {
    if (!userQuery.data) return
    setOwnerForm({ full_name: userQuery.data.full_name ?? '', email: userQuery.data.email, phone: userQuery.data.phone ?? '' })
  }, [userQuery.data])

  const businessMutation = useMutation({
    mutationFn: () => updateMyBusinessRequest({ ...businessForm, email: businessForm.email || undefined, phone: businessForm.phone || undefined, description: businessForm.description || undefined }),
    onSuccess: () => {
      setNotice({ type: 'success', text: 'Business profile updated successfully.' })
      queryClient.invalidateQueries({ queryKey: ['businesses', 'me'] })
    },
    onError: (error) => setNotice({ type: 'error', text: errorMessage(error, 'Could not update business profile.') })
  })

  const ownerMutation = useMutation({
    mutationFn: () => updateUserRequest(userQuery.data!.id, ownerForm),
    onSuccess: () => {
      setNotice({ type: 'success', text: 'Personal details updated successfully.' })
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] })
    },
    onError: (error) => setNotice({ type: 'error', text: errorMessage(error, 'Could not update personal details.') })
  })

  const passwordMutation = useMutation({
    mutationFn: () => changePasswordRequest({ old_password: passwordForm.old_password, new_password: passwordForm.new_password }),
    onSuccess: () => {
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' })
      setNotice({ type: 'success', text: 'Password changed successfully.' })
    },
    onError: (error) => setNotice({ type: 'error', text: errorMessage(error, 'Could not change password.') })
  })

  const submitPassword = (event: FormEvent) => {
    event.preventDefault()
    setNotice(null)
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setNotice({ type: 'error', text: 'New password and confirmation do not match.' })
      return
    }
    passwordMutation.mutate()
  }

  if (businessQuery.isLoading || userQuery.isLoading) {
    return <div className="p-8 text-center text-sm text-text-secondary">Loading profile...</div>
  }

  const business = businessQuery.data
  const user = userQuery.data
  const status = business?.status ?? 'pending'

  return (
    <div className="space-y-6 p-6">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-secondary p-6 text-white shadow-lg">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              <BuildingStorefrontIcon className="h-8 w-8" />
            </div>
            <div><p className="text-sm text-white/75">Business profile</p><h1 className="text-2xl font-bold">{business?.name ?? 'My business'}</h1><p className="mt-1 text-sm text-white/75">{user?.full_name || user?.username}</p></div>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold capitalize ring-1 ring-white/20">
            {status === 'approved' ? <CheckBadgeIcon className="h-5 w-5" /> : <ClockIcon className="h-5 w-5" />}{status}
          </span>
        </div>
      </div>

      {notice && <div className={`flex items-center gap-2 rounded-xl border p-4 text-sm ${notice.type === 'success' ? 'border-success/20 bg-success/5 text-success' : 'border-error/20 bg-error/5 text-error'}`}>{notice.type === 'success' ? <CheckCircleIcon className="h-5 w-5" /> : <XCircleIcon className="h-5 w-5" />}{notice.text}</div>}

      {(businessQuery.isError || userQuery.isError) && <div className="rounded-xl border border-error/20 bg-error/5 p-4 text-sm text-error">Could not load all profile information. Refresh the page and try again.</div>}

      <div className="grid gap-6 xl:grid-cols-3">
        <form onSubmit={(event) => { event.preventDefault(); setNotice(null); businessMutation.mutate() }} className="space-y-5 rounded-2xl border border-border bg-white p-6 shadow-sm xl:col-span-2">
          <div className="flex items-center gap-3"><BuildingStorefrontIcon className="h-6 w-6 text-primary" /><div><h2 className="font-semibold text-text">Business information</h2><p className="text-xs text-text-tertiary">Information customers use to identify and contact your business.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2"><TextInput label="Business name" value={businessForm.name} onChange={(e) => setBusinessForm((v) => ({ ...v, name: e.target.value }))} required /><TextInput label="Business type" value={businessForm.business_type} onChange={(e) => setBusinessForm((v) => ({ ...v, business_type: e.target.value }))} required /></div>
          <div className="grid gap-4 sm:grid-cols-2"><TextInput label="Business email" type="email" value={businessForm.email} onChange={(e) => setBusinessForm((v) => ({ ...v, email: e.target.value }))} /><TextInput label="Business phone" value={businessForm.phone} onChange={(e) => setBusinessForm((v) => ({ ...v, phone: e.target.value }))} placeholder="0791335490" /></div>
          <TextArea label="Business description" rows={5} value={businessForm.description} onChange={(e) => setBusinessForm((v) => ({ ...v, description: e.target.value }))} placeholder="Tell customers what your business offers..." />
          <div className="grid gap-3 rounded-xl bg-background p-4 sm:grid-cols-2"><div><p className="text-xs text-text-tertiary">Registration number</p><p className="mt-1 font-medium text-text">{business?.registration_number}</p></div><div><p className="text-xs text-text-tertiary">Registered branches</p><p className="mt-1 font-medium text-text">{business?.branches.length ?? 0}</p></div></div>
          <Button type="submit" loading={businessMutation.isPending}>Save Business Profile</Button>
        </form>

        <div className="space-y-6">
          <form onSubmit={(event) => { event.preventDefault(); setNotice(null); ownerMutation.mutate() }} className="space-y-4 rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3"><UserCircleIcon className="h-6 w-6 text-primary" /><div><h2 className="font-semibold text-text">Personal details</h2><p className="text-xs text-text-tertiary">Your account contact information.</p></div></div>
            <TextInput label="Full name" value={ownerForm.full_name} onChange={(e) => setOwnerForm((v) => ({ ...v, full_name: e.target.value }))} />
            <TextInput label="Email" type="email" value={ownerForm.email} onChange={(e) => setOwnerForm((v) => ({ ...v, email: e.target.value }))} required />
            <TextInput label="Phone" value={ownerForm.phone} onChange={(e) => setOwnerForm((v) => ({ ...v, phone: e.target.value }))} />
            <div className="rounded-xl bg-background p-3"><p className="flex items-center gap-2 text-xs text-text-tertiary"><IdentificationIcon className="h-4 w-4" />Username</p><p className="mt-1 text-sm font-medium text-text">{user?.username}</p></div>
            <Button type="submit" loading={ownerMutation.isPending}>Save Personal Details</Button>
          </form>

          <form onSubmit={submitPassword} className="space-y-4 rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3"><KeyIcon className="h-6 w-6 text-primary" /><div><h2 className="font-semibold text-text">Change password</h2><p className="text-xs text-text-tertiary">Use a strong password you do not use elsewhere.</p></div></div>
            <TextInput label="Current password" type="password" value={passwordForm.old_password} onChange={(e) => setPasswordForm((v) => ({ ...v, old_password: e.target.value }))} required />
            <TextInput label="New password" type="password" value={passwordForm.new_password} onChange={(e) => setPasswordForm((v) => ({ ...v, new_password: e.target.value }))} required />
            <TextInput label="Confirm new password" type="password" value={passwordForm.confirm_password} onChange={(e) => setPasswordForm((v) => ({ ...v, confirm_password: e.target.value }))} required />
            <Button type="submit" loading={passwordMutation.isPending}>Change Password</Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
