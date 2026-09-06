import { Link } from 'react-router-dom'
import { ShoppingBagIcon, ShoppingCartIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@hooks/useAuth'

const CustomerProfilePage = () => {
  const { user } = useAuth()

  return (
    <main className="min-h-[70vh] bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-3xl border border-border bg-white p-6 shadow-lg sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserCircleIcon className="h-10 w-10" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Customer profile</p>
              <h1 className="text-2xl font-bold text-text">{user?.name}</h1>
              <p className="text-sm text-text-tertiary">@{user?.username}</p>
            </div>
          </div>

          {user?.email && (
            <div className="mt-6 rounded-2xl bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Email</p>
              <p className="mt-1 text-sm text-text">{user.email}</p>
            </div>
          )}

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link to="/products" className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white">
              <ShoppingBagIcon className="h-5 w-5" /> Continue shopping
            </Link>
            <Link to="/cart" className="flex items-center justify-center gap-2 rounded-xl border-2 border-primary px-4 py-3 text-sm font-semibold text-primary">
              <ShoppingCartIcon className="h-5 w-5" /> View cart
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}

export default CustomerProfilePage
