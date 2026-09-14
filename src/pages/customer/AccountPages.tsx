import { FormEvent, useContext, useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRightIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  MapPinIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@hooks/useAuth'
import { CartContext } from '@contexts/CartContext'
import { accountGet, accountPost, accountPut, accountDelete, getOnlineMpesaIntent, initiateOnlineMpesa, AccountAddress, AccountOrder, AccountPayment, ReturnRequest, type OnlinePaymentIntent } from '@api/modules/account.api'
import type { UserResponse } from '@api/modules/auth.api'
import { useSiteDialog } from '@components/common'

const panel = 'rounded-2xl border border-border/80 bg-surface p-5 shadow-[0_12px_36px_rgba(30,43,50,0.06)]'
const input = 'mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-text outline-none transition placeholder:text-text-tertiary focus:border-primary focus:ring-4 focus:ring-primary/10'
const button = 'rounded-xl bg-primary-dark px-5 py-2.5 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-primary disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50'
export const money = (value: number, currency = 'KES') => new Intl.NumberFormat('en-KE', { style: 'currency', currency }).format(value)
const errorText = (e: any) => String(e?.response?.data?.message || e?.response?.data?.detail || e?.message || 'Please try again.')
function useAccount<T>(path: string) {
  const { user } = useAuth()
  return useQuery({ queryKey: ['customer-account', user?.id, path], queryFn: () => accountGet<T>(path), enabled: Boolean(user) })
}
function QueryState({ query }: { query: any }) {
  if (query.isPending) return <div role="status" className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-text-secondary"><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />Loading your account…</div>
  if (query.isError) return <p role="alert" className="rounded-xl border border-error/20 bg-error-light/30 px-4 py-3 text-sm text-error-dark">{errorText(query.error)} <button onClick={() => query.refetch()} className="font-semibold underline underline-offset-2">Retry</button></p>
  return null
}

const shoppingLinks = [
  { to: '/account/orders', label: 'My orders', icon: ClipboardDocumentListIcon },
  { to: '/account/cart', label: 'My cart', icon: ShoppingBagIcon },
]

export function AccountLayout() {
  const { user } = useAuth()
  const shopperName = user?.name?.trim() || user?.username || 'Shopper'
  return <main className="relative min-h-[75vh] overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4 pb-14 pt-24 sm:px-6 lg:px-8">
    <div aria-hidden="true" className="absolute -right-28 top-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
    <div aria-hidden="true" className="absolute -left-28 bottom-8 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
    <div className="relative mx-auto max-w-7xl">
      <header className="relative mb-7 overflow-hidden rounded-3xl bg-text px-6 py-7 text-white shadow-[0_18px_50px_rgba(30,43,50,0.16)] sm:px-8 sm:py-8">
        <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div><span className="inline-flex rounded-full bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary-light">Customer account</span><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Welcome, {shopperName}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/70 sm:text-base">Manage your details, deliveries, purchases and rewards from one simple place.</p></div>
          <Link className="group inline-flex w-fit items-center gap-2 rounded-xl bg-secondary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-secondary/20 transition hover:-translate-y-0.5 hover:bg-secondary-dark" to="/products">Continue shopping<ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-1" /></Link>
        </div>
        <div aria-hidden="true" className="absolute right-10 top-1/2 hidden h-36 w-36 -translate-y-1/2 rounded-full border-[28px] border-white/5 lg:block" />
      </header>
      <nav aria-label="Customer account" className="mb-6 flex gap-2 rounded-2xl border border-border/80 bg-white/90 p-2 shadow-sm backdrop-blur sm:w-fit">{shoppingLinks.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} aria-label={label} className={({ isActive }) => `flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition sm:flex-none ${isActive ? 'bg-primary-dark text-white shadow-md shadow-primary/15' : 'text-text-secondary hover:bg-primary/5 hover:text-primary-dark'}`}><Icon className="h-5 w-5" />{label}</NavLink>)}</nav>
      <section className="min-w-0 space-y-5"><Outlet /></section>
    </div>
  </main>
}

export function AccountOverview() {
  const orders = useAccount<AccountOrder[]>('/orders?skip=0')
  const cart = useContext(CartContext)
  const recentOrders = orders.data?.slice(0, 4) ?? []
  const cartItems = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
  return <div className="space-y-6">
    <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-dark">Shopping overview</p><h2 className="mt-1 text-2xl font-bold text-text sm:text-3xl">Your orders and carts</h2><p className="mt-2 text-text-secondary">Pick up where you left off or check the progress of a recent purchase.</p></div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
      <section className={panel + ' p-0'} aria-labelledby="recent-orders-heading"><header className="flex items-center justify-between gap-4 border-b border-divider px-5 py-5 sm:px-6"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary-dark"><ClipboardDocumentListIcon className="h-6 w-6" /></span><div><h3 id="recent-orders-heading" className="font-bold text-text">Recent orders</h3><p className="text-sm text-text-secondary">Latest purchases and progress</p></div></div><Link to="/account/orders" className="text-sm font-bold text-primary-dark hover:underline">View all</Link></header><div className="p-5 sm:p-6"><QueryState query={orders} />{!orders.isPending && !orders.isError && recentOrders.length === 0 && <div className="py-8 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary-dark"><ShoppingBagIcon className="h-7 w-7" /></span><h4 className="mt-4 font-bold text-text">No orders yet</h4><p className="mt-1 text-sm text-text-secondary">Explore the mall and place your first order.</p><Link to="/products" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-dark px-4 py-2.5 text-sm font-bold text-white">Start shopping<ArrowRightIcon className="h-4 w-4" /></Link></div>}{recentOrders.length > 0 && <div className="divide-y divide-divider">{recentOrders.map(order => <Link to={'/account/orders/' + order.id} key={order.id} className="group flex items-center gap-4 py-4 first:pt-0 last:pb-0"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background text-text-secondary"><ShoppingBagIcon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block truncate font-semibold text-text">Order #{order.id} · {order.business_name}</span><span className="block text-xs text-text-tertiary">{new Date(order.created_at).toLocaleDateString()} · {order.items.length} items</span></span><span className="text-right"><span className="block font-bold text-text">{money(order.total_amount, order.currency)}</span><span className="text-xs capitalize text-primary-dark">{order.status}</span></span><ArrowRightIcon className="h-4 w-4 text-text-tertiary transition group-hover:translate-x-1" /></Link>)}</div>}</div></section>
      <section className="overflow-hidden rounded-2xl bg-text p-6 text-white shadow-[0_18px_45px_rgba(30,43,50,0.16)]" aria-labelledby="cart-summary-heading"><div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-primary-light"><ShoppingBagIcon className="h-7 w-7" /></span><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{cart?.carts.length ?? 0} seller{(cart?.carts.length ?? 0) === 1 ? '' : 's'}</span></div><h3 id="cart-summary-heading" className="mt-7 text-xl font-bold">Your cart</h3>{cart?.isBusy ? <p role="status" className="mt-2 text-sm text-white/65">Syncing your cart…</p> : <><p className="mt-2 text-sm text-white/65">{cartItems ? `${cartItems} item${cartItems === 1 ? '' : 's'} ready for checkout` : 'Your cart is ready for something new.'}</p><p className="mt-6 text-3xl font-bold">{money(cart?.total ?? 0)}</p></>}<Link to="/account/cart" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-white transition hover:bg-secondary-dark">Open my cart<ArrowRightIcon className="h-4 w-4" /></Link></section>
    </div>
  </div>
}

export function AccountProfile() {
  const q = useAccount<UserResponse>('/profile')
  const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fields = new FormData(e.currentTarget); setBusy(true); setNotice('')
    try { await accountPut('/profile', { phone: fields.get('phone'), full_name: fields.get('full_name') || null }); await q.refetch(); setNotice('Profile saved.') }
    catch (e) { setNotice(errorText(e)) } finally { setBusy(false) }
  }
  const profileName = q.data?.full_name?.trim() || q.data?.username || ''
  const initial = profileName.charAt(0).toUpperCase() || 'M'
  return <div className="space-y-5">
    <section className={panel + ' overflow-hidden p-0'} aria-labelledby="profile-heading">
      <div className="border-b border-divider bg-gradient-to-r from-primary/10 via-white to-secondary/10 px-5 py-6 sm:px-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary-dark text-2xl font-bold text-white shadow-lg shadow-primary/20">{initial}</div><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-dark">Personal details</p><h2 id="profile-heading" className="mt-1 text-2xl font-bold text-text">Your profile</h2><p className="mt-1 text-sm text-text-secondary">Keep your contact information current for smoother orders and delivery updates.</p></div></div></div>
      <div className="p-5 sm:p-7"><QueryState query={q} />{q.data && <form onSubmit={submit} className="space-y-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-border/70 bg-background px-4 py-3"><span className="font-semibold text-text">@{q.data.username}</span>{q.data.email && <><span className="hidden h-1 w-1 rounded-full bg-text-tertiary sm:block" /><span className="text-sm text-text-secondary">{q.data.email}</span></>}</div>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block text-sm font-semibold text-text">Phone number<span className="ml-1 text-error">*</span><input className={input} name="phone" defaultValue={q.data.phone ?? ''} required minLength={5} maxLength={30} autoComplete="tel" /><span className="mt-1.5 block text-xs font-normal text-text-tertiary">Used for delivery and important order updates.</span></label>
          <label className="block text-sm font-semibold text-text">Display name <span className="font-normal text-text-tertiary">(optional)</span><input className={input} name="full_name" defaultValue={q.data.full_name ?? ''} maxLength={120} autoComplete="name" /><span className="mt-1.5 block text-xs font-normal text-text-tertiary">The friendly name shown in your account.</span></label>
        </div>
        <div className="flex flex-wrap items-center gap-4 border-t border-divider pt-5"><button className={button} disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>{notice && <p role="status" className={`text-sm font-medium ${notice === 'Profile saved.' ? 'text-success-dark' : 'text-error-dark'}`}>{notice}</p>}</div>
      </form>}</div>
    </section>
    <section className="grid gap-4 sm:grid-cols-2" aria-label="Account shortcuts"><Link to="/account/orders" className="group rounded-2xl border border-border/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary-dark"><ClipboardDocumentListIcon className="h-6 w-6" /></span><div><h3 className="font-bold text-text">Your orders</h3><p className="text-sm text-text-secondary">Track purchases and view details</p></div><ArrowRightIcon className="ml-auto h-5 w-5 text-text-tertiary transition group-hover:translate-x-1 group-hover:text-primary-dark" /></div></Link><Link to="/account/addresses" className="group rounded-2xl border border-border/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-secondary/50 hover:shadow-md"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary/10 text-secondary-dark"><MapPinIcon className="h-6 w-6" /></span><div><h3 className="font-bold text-text">Saved addresses</h3><p className="text-sm text-text-secondary">Make checkout quicker next time</p></div><ArrowRightIcon className="ml-auto h-5 w-5 text-text-tertiary transition group-hover:translate-x-1 group-hover:text-secondary-dark" /></div></Link></section>
  </div>
}

export function AccountAddresses() {
  const siteDialog = useSiteDialog()
  const q = useAccount<AccountAddress[]>('/addresses'); const [editing, setEditing] = useState<AccountAddress | null>(null)
  const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false); const [version, setVersion] = useState(0)
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fields = Object.fromEntries(new FormData(e.currentTarget)); setBusy(true); setNotice('')
    try { if (editing) await accountPut('/addresses/' + editing.id, fields); else await accountPost('/addresses', fields); setEditing(null); setVersion(v => v + 1); await q.refetch() }
    catch (e) { setNotice(errorText(e)) } finally { setBusy(false) }
  }
  const remove = async (id: string) => { if (!await siteDialog.confirm({ title: 'Remove saved address?', message: 'Existing order addresses will stay unchanged.', confirmLabel: 'Remove address', tone: 'danger' })) return; setBusy(true); try { await accountDelete('/addresses/' + id); await q.refetch() } catch (e) { setNotice(errorText(e)) } finally { setBusy(false) } }
  return <><h2 className="text-xl font-semibold">Address book</h2><QueryState query={q} /><div className="grid gap-3 sm:grid-cols-2">{q.data?.map(a => <article key={a.id} className={panel}><h3 className="font-semibold">{a.label}</h3><p>{a.recipient} · {a.phone}</p><p className="text-slate-500">{a.address}, {a.city}, {a.country}</p><div className="mt-3 flex gap-4"><button className="underline" onClick={() => setEditing(a)}>Edit</button><button className="underline" disabled={busy} onClick={() => remove(a.id)}>Remove</button></div></article>)}</div>
    {q.data?.length === 0 && <p>No saved addresses yet.</p>}<form key={(editing?.id ?? 'new') + version} onSubmit={submit} className={panel + ' space-y-3'}><h3 className="font-semibold">{editing ? 'Edit address' : 'Add an address'}</h3><div className="grid gap-3 sm:grid-cols-2">{(['label', 'recipient', 'phone', 'address', 'city', 'country'] as const).map(key => <label key={key} className="block capitalize">{key === 'country' ? 'Country code (e.g. KE)' : key}<input className={input} name={key} defaultValue={editing?.[key] ?? (key === 'country' ? 'KE' : '')} required maxLength={key === 'country' ? 2 : key === 'address' ? 500 : key === 'phone' ? 30 : key === 'label' ? 60 : 100} /></label>)}</div><button className={button} disabled={busy}>Save address</button>{editing && <button type="button" className="ml-3 underline" onClick={() => setEditing(null)}>Cancel</button>}<p role="status">{notice}</p></form></>
}

export function AccountOrders() {
  const [page, setPage] = useState(0); const q = useAccount<AccountOrder[]>('/orders?skip=' + page * 25)
  return <><h2 className="text-xl font-semibold">Order history</h2><QueryState query={q} />{q.data?.length === 0 && <p>No orders on this page.</p>}{q.data?.map(o => <Link to={'/account/orders/' + o.id} key={o.id} className={panel + ' flex flex-wrap justify-between gap-3'}><div><h3 className="font-semibold">Order #{o.id} · {o.business_name}</h3><p className="text-sm text-slate-500">{new Date(o.created_at).toLocaleDateString()} · {o.items.length} lines</p></div><div className="text-right"><p className="font-semibold">{money(o.total_amount, o.currency)}</p><p className="text-sm capitalize">{o.status}</p></div></Link>)}<Pagination page={page} setPage={setPage} hasNext={q.data?.length === 25} /></>
}
function Pagination({ page, setPage, hasNext }: { page: number; setPage: (p: number) => void; hasNext: boolean }) {
  return <div className="flex gap-4"><button disabled={page === 0} className="disabled:opacity-40" onClick={() => setPage(page - 1)}>Previous</button><span>Page {page + 1}</span><button disabled={!hasNext} className="disabled:opacity-40" onClick={() => setPage(page + 1)}>Next</button></div>
}

export function AccountOrderDetails() {
  const { id } = useParams(); const q = useAccount<AccountOrder>('/orders/' + id)
  const returns = useAccount<ReturnRequest[]>('/returns'); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false)
  const existing = returns.data?.find(r => String(r.order_id) === id)
  const submit = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); setBusy(true); const fields = Object.fromEntries(new FormData(e.currentTarget)); try { await accountPost('/orders/' + id + '/returns', fields); await returns.refetch(); setNotice('Request submitted for review. No refund has been issued yet.') } catch (e) { setNotice(errorText(e)) } finally { setBusy(false) } }
  return <><Link to="/account/orders" className="text-sm underline">← All orders</Link><QueryState query={q} />{q.data && <><div className={panel}><div className="mb-4 flex flex-wrap justify-between"><h2 className="text-xl font-semibold">Order #{q.data.id}</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-sm capitalize">{q.data.status}</span></div><p>{q.data.business_name} · {new Date(q.data.created_at).toLocaleString()}</p><ul className="my-5 divide-y">{q.data.items.map(i => <li className="flex justify-between gap-4 py-3" key={i.id}><span>{i.product_name} × {i.quantity}</span><span>{money(i.total_price, q.data.currency)}</span></li>)}</ul><p className="text-right text-lg font-semibold">Total {money(q.data.total_amount, q.data.currency)}</p><div className="mt-5 text-sm text-slate-600">{q.data.delivery_address ? <><h3 className="font-semibold">Delivery address</h3><p>{q.data.delivery_address.recipient} · {q.data.delivery_address.phone}</p><p>{q.data.delivery_address.address}, {q.data.delivery_address.city}</p></> : <p>Collection from the seller’s storefront.</p>}</div><Link className="mt-4 inline-block underline" to="/account/payments">Payment history</Link></div>
    <div className={panel}><h3 className="font-semibold">Return or refund</h3><p className="mb-3 text-sm text-slate-500">Requests are reviewed by the seller. Submission does not issue a refund.</p>{existing ? <p>Request #{existing.id}: <strong>{existing.status}</strong></p> : ['paid', 'shipped', 'delivered'].includes(q.data.status) ? <form onSubmit={submit} className="space-y-3"><label className="block">Request type<select name="kind" className={input}><option value="return">Return</option><option value="refund">Refund</option></select></label><label className="block">Reason<textarea className={input} name="reason" required minLength={10} maxLength={2000} /></label><button className={button} disabled={busy || returns.isPending || returns.isError}>Submit request</button></form> : <p className="text-sm">Requests become available after an order is paid, shipped or delivered.</p>}<p role="status">{notice}</p></div></>}</>
}

export function AccountPayments() {
  const [page, setPage] = useState(0); const q = useAccount<AccountPayment[]>('/payments?skip=' + page * 25)
  const payments = q.data ?? []; const completed = payments.filter(payment => ['paid', 'completed', 'confirmed'].includes(payment.status.toLowerCase()))
  const paidTotal = completed.reduce((total, payment) => total + payment.amount, 0)
  return <div className="space-y-5"><header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-dark">Account activity</p><h2 className="mt-1 text-2xl font-bold text-text sm:text-3xl">Payment history</h2><p className="mt-2 text-sm text-text-secondary">Review payments connected to your MtaaMall orders.</p></div><Link to="/account/orders" className="inline-flex w-fit items-center gap-2 text-sm font-bold text-primary-dark hover:underline">View my orders<ArrowRightIcon className="h-4 w-4" /></Link></header><QueryState query={q} />{q.data && <><div className="grid gap-4 sm:grid-cols-3"><article className={panel + ' flex items-center gap-4'}><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary-dark"><CreditCardIcon className="h-6 w-6" /></span><div><p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Records</p><p className="text-2xl font-bold text-text">{payments.length}</p></div></article><article className={panel + ' flex items-center gap-4'}><span className="grid h-11 w-11 place-items-center rounded-xl bg-success-light/60 text-success-dark"><CheckCircleIcon className="h-6 w-6" /></span><div><p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Confirmed</p><p className="text-2xl font-bold text-text">{completed.length}</p></div></article><article className={panel + ' flex items-center gap-4'}><span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary/10 text-secondary-dark"><BanknotesIcon className="h-6 w-6" /></span><div><p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Paid total</p><p className="text-lg font-bold text-text">{money(paidTotal, completed[0]?.currency)}</p></div></article></div>{payments.length === 0 ? <section className={panel + ' py-12 text-center'}><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary-dark"><CreditCardIcon className="h-7 w-7" /></span><h3 className="mt-4 font-bold text-text">No payment records yet</h3><p className="mt-1 text-sm text-text-secondary">Payments will appear here after they are recorded against an order.</p><Link to="/products" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-dark px-4 py-2.5 text-sm font-bold text-white">Browse products<ArrowRightIcon className="h-4 w-4" /></Link></section> : <section className={panel + ' overflow-hidden p-0'}><div className="border-b border-divider px-5 py-4"><h3 className="font-bold text-text">Transactions</h3><p className="text-xs text-text-tertiary">Pending entries have not yet been confirmed.</p></div><div className="divide-y divide-divider">{payments.map(payment => { const isPaid = ['paid', 'completed', 'confirmed'].includes(payment.status.toLowerCase()); return <article className="flex flex-col gap-3 px-5 py-4 transition hover:bg-background/70 sm:flex-row sm:items-center" key={payment.id}><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${isPaid ? 'bg-success-light/60 text-success-dark' : 'bg-warning-light/60 text-warning-dark'}`}>{isPaid ? <CheckCircleIcon className="h-6 w-6" /> : <CreditCardIcon className="h-6 w-6" />}</span><div className="min-w-0 flex-1"><Link className="font-bold text-text hover:text-primary-dark hover:underline" to={'/account/orders/' + payment.order_id}>Order #{payment.order_id}</Link><p className="truncate text-sm text-text-secondary">{payment.business_name} · {payment.method}</p><p className="text-xs text-text-tertiary">{new Date(payment.created_at).toLocaleString()}</p></div><div className="sm:text-right"><p className="font-bold text-text">{money(payment.amount, payment.currency)}</p><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${isPaid ? 'bg-success-light/60 text-success-dark' : 'bg-warning-light/60 text-warning-dark'}`}>{payment.status}</span></div></article>})}</div></section>}<Pagination page={page} setPage={setPage} hasNext={payments.length === 25} /></>}</div>
}

export function AccountReturns() {
  const q = useAccount<ReturnRequest[]>('/returns')
  return <><h2 className="text-xl font-semibold">Returns & refunds</h2><QueryState query={q} />{q.data?.length === 0 && <p>No requests yet. Open an eligible order to submit a request.</p>}{q.data?.map(r => <article key={r.id} className={panel}><Link className="font-semibold underline" to={'/account/orders/' + r.order_id}>Order #{r.order_id}</Link><p className="capitalize">{r.kind} · {r.status}</p><p className="mt-2 text-sm text-slate-500">{r.reason}</p></article>)}</>
}

export function AccountLoyalty() {
  const q = useAccount<{ balances: { business_id: string; business_name: string; points: number; tier: string }[]; transactions: { id: number; business_name: string; points: number; description: string; created_at: string }[] }>('/loyalty')
  return <><h2 className="text-xl font-semibold">Loyalty points</h2><p className="text-sm text-slate-500">Each business has its own loyalty balance. Points are not combined across sellers.</p><QueryState query={q} />{q.data?.balances.length === 0 && <p>No loyalty points yet.</p>}<div className="grid gap-3 sm:grid-cols-2">{q.data?.balances.map(b => <article className={panel} key={b.business_id}><h3>{b.business_name}</h3><p className="my-2 text-3xl font-bold">{b.points} <span className="text-sm font-normal">points</span></p><p className="capitalize">{b.tier}</p></article>)}</div>{q.data?.transactions.map(t => <article className={panel} key={t.id}><p>{t.business_name} · {t.points > 0 ? '+' : ''}{t.points} points</p><p className="text-sm text-slate-500">{t.description} · {new Date(t.created_at).toLocaleDateString()}</p></article>)}</>
}

export function AccountCheckout() {
  const { user } = useAuth(); const cart = useContext(CartContext)!; const [params] = useSearchParams(); const navigate = useNavigate(); const cache = useQueryClient()
  type PaymentFlow = { orderId: number; businessName: string; total: number; currency: string; idempotencyKey: string; intentId?: string; phase: 'initiating' | 'error' }
  const storageKey = `mtaamall:online-mpesa:${user?.id ?? 'anonymous'}`
  const addresses = useAccount<AccountAddress[]>('/addresses'); const [address, setAddress] = useState(''); const [phone, setPhone] = useState(user?.phone ?? ''); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('')
  const [paymentFlow, setPaymentFlow] = useState<PaymentFlow | null>(() => { try { const raw = sessionStorage.getItem(storageKey); return raw ? JSON.parse(raw) as PaymentFlow : null } catch { return null } })
  const selected = cart.carts.find(c => c.business_id === params.get('business')) ?? (cart.carts.length === 1 ? cart.carts[0] : undefined)
  const intent = useQuery({
    queryKey: ['online-mpesa-intent', paymentFlow?.intentId],
    queryFn: () => getOnlineMpesaIntent(paymentFlow!.intentId!),
    enabled: Boolean(paymentFlow?.intentId),
    refetchInterval: query => ['successful', 'failed', 'cancelled', 'timed_out'].includes((query.state.data as OnlinePaymentIntent | undefined)?.state ?? '') ? false : 3000,
  })
  useEffect(() => {
    if (!paymentFlow) sessionStorage.removeItem(storageKey)
    else sessionStorage.setItem(storageKey, JSON.stringify(paymentFlow))
  }, [paymentFlow, storageKey])
  useEffect(() => {
    if (intent.data?.state === 'successful') void cache.invalidateQueries({ queryKey: ['customer-account'] })
  }, [intent.data?.state, cache])
  useEffect(() => {
    if (paymentFlow?.phase === 'initiating' && !paymentFlow.intentId && !busy) {
      setPaymentFlow(current => current ? { ...current, phase: 'error' } : null)
      setNotice('This checkout was restored without repeating the STK Push. Choose Retry payment only if you want a new prompt.')
    }
  }, [paymentFlow?.phase, paymentFlow?.intentId, busy])
  if (!user) return <Navigate to="/login" replace />
  const newKey = () => window.crypto.randomUUID()
  const startIntent = async (flow: PaymentFlow) => {
    setBusy(true); setNotice(''); setPaymentFlow({ ...flow, phase: 'initiating', intentId: undefined })
    try {
      const result = await initiateOnlineMpesa(flow.orderId, phone, flow.idempotencyKey)
      setPaymentFlow({ ...flow, phase: 'initiating', intentId: result.public_id })
    } catch (e) {
      setPaymentFlow({ ...flow, phase: 'error', intentId: undefined }); setNotice(errorText(e))
    } finally { setBusy(false) }
  }
  const submit = async (e: FormEvent) => { e.preventDefault(); if (!selected) return; setBusy(true); setNotice(''); try {
    const order = await accountPost<AccountOrder>('/checkout', { business_id: selected.business_id, address_id: address || null, payment_method: 'mpesa' })
    const flow: PaymentFlow = { orderId: order.id, businessName: selected.business_name, total: order.total_amount, currency: selected.currency, idempotencyKey: newKey(), phase: 'initiating' }
    setPaymentFlow(flow); sessionStorage.setItem(storageKey, JSON.stringify(flow))
    await cache.invalidateQueries({ queryKey: ['customer-account'] }); await cart.refresh(); await startIntent(flow)
  } catch (e) { setNotice(errorText(e)); setBusy(false) } }
  const retry = () => { if (!paymentFlow) return; void startIntent({ ...paymentFlow, idempotencyKey: newKey(), phase: 'initiating', intentId: undefined }) }
  const finish = () => { setPaymentFlow(null); navigate('/account/orders/' + paymentFlow?.orderId) }
  const state = intent.data?.state
  const stateTitle = state === 'successful' ? 'Paid' : state === 'cancelled' ? 'Cancelled' : state === 'timed_out' ? 'Timed out' : state === 'failed' ? 'Payment failed' : state === 'pending_customer' ? 'Check your phone' : state === 'unknown' ? 'Awaiting confirmation' : paymentFlow?.phase === 'error' ? 'Retry available' : 'Initiating'
  const stateText = state === 'successful' ? `Payment confirmed${intent.data?.mpesa_receipt_number ? ` · Receipt ${intent.data.mpesa_receipt_number}` : ''}.` : state === 'cancelled' ? 'You cancelled the M-Pesa request. Your order remains unpaid.' : state === 'timed_out' ? 'The M-Pesa request timed out. Your order remains unpaid.' : state === 'failed' ? (intent.data?.result_description || 'M-Pesa could not complete this payment. Your order remains unpaid.') : state === 'unknown' ? 'The provider result is still being verified. Do not start another payment yet.' : state === 'pending_customer' ? `Approve the request sent to ${intent.data.phone_masked}. We will confirm it automatically.` : paymentFlow?.phase === 'error' ? 'The request could not be started. Review the message below before retrying.' : 'Securely connecting to M-Pesa. Do not refresh or close this page.'
  if (paymentFlow) return <div className="space-y-5"><section className={panel + ' text-center'}><span className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${state === 'successful' ? 'bg-success-light text-success-dark' : ['cancelled','timed_out','failed'].includes(state ?? '') || paymentFlow.phase === 'error' ? 'bg-error-light text-error-dark' : 'bg-primary/10 text-primary-dark'}`}>{state === 'successful' ? <CheckCircleIcon className="h-9 w-9" /> : <CreditCardIcon className={`h-8 w-8 ${!state || ['created','initiating','pending_customer','unknown'].includes(state) ? 'animate-pulse' : ''}`} />}</span><p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-primary-dark">Order #{paymentFlow.orderId} · {paymentFlow.businessName}</p><h2 className="mt-2 text-2xl font-bold text-text">{stateTitle}</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-text-secondary">{stateText}</p>{state === 'pending_customer' && <p className="mt-2 text-xs font-bold uppercase tracking-wider text-primary-dark">Awaiting confirmation</p>}<p className="mt-5 text-xl font-bold text-text">{money(paymentFlow.total, paymentFlow.currency)}</p>{intent.isError && <p role="alert" className="mt-4 text-sm text-error-dark">{errorText(intent.error)}</p>}{notice && <p role="alert" className="mt-4 text-sm text-error-dark">{notice}</p>}<div className="mt-6 flex flex-wrap justify-center gap-3">{state === 'successful' && <button className={button} onClick={finish}>View paid order</button>}{(intent.data?.retry_available || paymentFlow.phase === 'error') && <button className={button} disabled={busy} onClick={retry}>{busy ? 'Initiating…' : 'Retry payment'}</button>}<Link className="rounded-xl border border-border px-5 py-2.5 font-semibold text-text-secondary" to={'/account/orders/' + paymentFlow.orderId}>View order</Link></div>{intent.data?.retry_available && <p className="mt-3 text-xs font-semibold text-text-tertiary">Retry available — a new STK prompt is sent only when you choose Retry payment.</p>}</section></div>
  return <div className={panel}><h2 className="text-xl font-semibold">Checkout with M-Pesa</h2>{cart.isBusy && <p role="status">Loading cart…</p>}{cart.error && <p role="alert">{cart.error}</p>}{!selected ? <p className="mt-4">Choose a seller’s cart to check out. <Link className="underline" to="/account/cart">View carts</Link></p> : <form onSubmit={submit} className="mt-4 space-y-4"><h3 className="font-semibold">{selected.business_name}</h3>{selected.items.map(i => <div className="flex justify-between gap-4" key={i.id}><span>{i.name} × {i.quantity}</span><span>{money(i.unit_price * i.quantity, selected.currency)}</span></div>)}<p className="border-t pt-3 text-lg font-semibold">Total {money(selected.total_amount, selected.currency)}</p><p className="text-sm text-text-secondary">Prices and stock are checked again when you place the order. MtaaMall’s secure online M-Pesa account processes this payment.</p><label className="block font-semibold text-text">M-Pesa phone number<input className={input} value={phone} onChange={e => setPhone(e.target.value)} required minLength={9} maxLength={20} inputMode="tel" autoComplete="tel" placeholder="07XXXXXXXX" /><span className="mt-1 block text-xs font-normal text-text-tertiary">Your account phone is filled in when available. You may use another valid Kenyan M-Pesa number.</span></label><QueryState query={addresses} /><label className="block">Fulfilment<select className={input} value={address} onChange={e => setAddress(e.target.value)}><option value="">Collect from seller’s storefront</option>{addresses.data?.map(a => <option value={a.id} key={a.id}>{a.label}: {a.address}, {a.city}</option>)}</select></label><p className="text-sm text-slate-500">For delivery, confirm arrangements with the seller. No delivery fee is added here.</p><Link className="inline-block underline" to="/account/addresses">Manage addresses</Link><label className="flex gap-2"><input type="checkbox" required />I confirm the seller, quantities, fulfilment and M-Pesa number.</label><button className={button} disabled={busy || cart.isBusy || Boolean(cart.error) || selected.items.some(i => !i.available)}>{busy ? 'Initiating…' : 'Place order and pay with M-Pesa'}</button><p role="alert">{notice}</p></form>}</div>
}
