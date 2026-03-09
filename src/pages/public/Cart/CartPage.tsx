import { useContext, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@components/common'
import { CartContext } from '@contexts/CartContext'

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 2
  }).format(amount)

const CartPage = () => {
  const cart = useContext(CartContext)

  if (!cart) {
    throw new Error('CartContext is required for CartPage.')
  }

  const cartItemsCount = useMemo(
    () => cart.items.reduce((sum, item) => sum + item.quantity, 0),
    [cart.items]
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 text-text">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shopping cart</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {cartItemsCount} {cartItemsCount === 1 ? 'item' : 'items'} selected.
          </p>
        </div>
        <Button variant="outline" onClick={cart.clear} disabled={cart.items.length === 0}>
          Clear cart
        </Button>
      </div>

      {cart.items.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-sm text-text-secondary">Your cart is empty.</p>
          <Link to="/" className="mt-4 inline-block text-sm font-medium text-primary hover:text-primary-dark">
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
          <div className="space-y-3">
            {cart.items.map((item) => (
              <article key={item.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-text">{item.name}</h2>
                    <p className="mt-1 text-xs text-text-tertiary">
                      Qty {item.quantity} • Unit {formatCurrency(item.price)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-text">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                    <button
                      type="button"
                      onClick={() => cart.removeItem(item.id)}
                      className="mt-2 rounded border border-border px-2 py-1 text-[11px] text-text-secondary hover:border-error hover:text-error"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="h-fit rounded-xl border border-border bg-surface p-4 lg:sticky lg:top-24">
            <h3 className="text-sm font-semibold text-text">Order summary</h3>
            <div className="mt-3 border-t border-divider pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Subtotal</span>
                <span className="font-semibold text-text">{formatCurrency(cart.total)}</span>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Link to="/checkout">
                <Button fullWidth>Proceed to checkout</Button>
              </Link>
              <Link to="/">
                <Button fullWidth variant="outline">Continue shopping</Button>
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

export default CartPage
