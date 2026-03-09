import { FormEvent, useContext, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button, TextInput } from '@components/common'
import { CartContext } from '@contexts/CartContext'

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 2
  }).format(amount)

const CheckoutPage = () => {
  const cart = useContext(CartContext)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')

  if (!cart) {
    throw new Error('CartContext is required for CheckoutPage.')
  }

  const cartItemsCount = useMemo(
    () => cart.items.reduce((sum, item) => sum + item.quantity, 0),
    [cart.items]
  )

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (cart.items.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    if (!fullName.trim() || !phone.trim() || !location.trim()) {
      toast.error('Please fill customer details before placing order')
      return
    }

    cart.clear()
    setFullName('')
    setPhone('')
    setLocation('')
    setNotes('')
    toast.success('Order placed successfully. Our team will contact you shortly.')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 text-text">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Confirm your details and place your online order.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <form className="space-y-4 rounded-xl border border-border bg-surface p-4" onSubmit={onSubmit}>
          <TextInput
            label="Full name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
          <TextInput
            label="Phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
          />
          <TextInput
            label="Delivery location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            required
          />
          <TextInput
            label="Order notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          <div className="pt-2">
            <Button type="submit" fullWidth disabled={cart.items.length === 0}>
              Place order
            </Button>
          </div>
        </form>

        <aside className="h-fit rounded-xl border border-border bg-surface p-4 lg:sticky lg:top-24">
          <h3 className="text-sm font-semibold text-text">Order summary</h3>
          <p className="mt-1 text-xs text-text-tertiary">
            {cartItemsCount} {cartItemsCount === 1 ? 'item' : 'items'}
          </p>
          <div className="mt-4 space-y-2">
            {cart.items.length === 0 ? (
              <p className="rounded-md border border-dashed border-border bg-background px-3 py-4 text-xs text-text-tertiary">
                Your cart is empty.
              </p>
            ) : (
              cart.items.map((item) => (
                <div key={item.id} className="rounded-md border border-border bg-background px-3 py-2">
                  <p className="text-xs font-medium text-text">{item.name}</p>
                  <p className="mt-1 text-[11px] text-text-tertiary">
                    Qty {item.quantity} • {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 border-t border-divider pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Total</span>
              <span className="font-semibold text-text">{formatCurrency(cart.total)}</span>
            </div>
          </div>
          <Link
            to="/"
            className="mt-4 inline-block text-xs font-medium text-primary hover:text-primary-dark"
          >
            Back to shop
          </Link>
        </aside>
      </div>
    </div>
  )
}

export default CheckoutPage
