import { useContext, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingCartIcon,
  TrashIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ShoppingBagIcon,
  CreditCardIcon,
  XMarkIcon,
  PlusIcon,
  MinusIcon,
  GiftIcon,
  TruckIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@components/common'
import { CartContext } from '@contexts/CartContext'
import { AppTheme } from '@constants/theme'

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

const CartPage = () => {
  const cart = useContext(CartContext)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoApplied, setPromoApplied] = useState(false)

  if (!cart) {
    throw new Error('CartContext is required for CartPage.')
  }

  const cartItemsCount = useMemo(
    () => cart.items.reduce((sum, item) => sum + item.quantity, 0),
    [cart.items]
  )

  const subtotal = cart.total
  const shipping = subtotal > 5000 ? 0 : 500
  const tax = subtotal * 0.16 // 16% VAT
  const discount = promoApplied ? subtotal * 0.1 : 0 // 10% promo discount
  const total = subtotal + shipping + tax - discount

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return
    // This would need to be implemented in your cart context
    // cart.updateQuantity(itemId, newQuantity)
  }

  const handleApplyPromo = () => {
    if (promoCode.toUpperCase() === 'WELCOME10') {
      setPromoApplied(true)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-white to-background">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-text flex items-center gap-2">
                <ShoppingCartIcon className="h-8 w-8 text-primary" />
                Shopping Cart
              </h1>
              <p className="text-text-secondary mt-1">
                {cartItemsCount} {cartItemsCount === 1 ? 'item' : 'items'} in your cart
              </p>
            </div>
            
            {cart.items.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-2"
                >
                  <TrashIcon className="h-4 w-4" />
                  Clear Cart
                </Button>
                <Link to="/">
                  <Button variant="ghost" className="flex items-center gap-2">
                    <ArrowLeftIcon className="h-4 w-4" />
                    Continue Shopping
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        {cart.items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="inline-flex p-4 bg-primary/10 rounded-full mb-4">
              <ShoppingBagIcon className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-text mb-2">Your cart is empty</h2>
            <p className="text-text-secondary mb-6">Looks like you haven't added any items yet</p>
            <Link to="/">
              <Button size="lg" className="flex items-center gap-2">
                <ShoppingBagIcon className="h-4 w-4" />
                Start Shopping
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Cart Items */}
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="lg:col-span-2 space-y-4"
            >
              {cart.items.map((item) => (
                <motion.article
                  key={item.id}
                  variants={fadeInUp}
                  layout
                  className="group relative bg-white rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative p-4 flex flex-col sm:flex-row gap-4">
                    {/* Product Image Placeholder */}
                    <div className="sm:w-24 h-24 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg flex items-center justify-center">
                      <ShoppingBagIcon className="h-8 w-8 text-primary/30" />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-semibold text-text group-hover:text-primary transition-colors">
                            {item.name}
                          </h3>
                          <p className="text-sm text-text-tertiary mt-1">Unit Price: {formatCurrency(item.price)}</p>
                        </div>
                        <p className="text-xl font-bold text-primary">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-text-secondary">Quantity:</span>
                          <div className="flex items-center border border-border rounded-lg">
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              className="p-1.5 hover:bg-background rounded-l-lg transition-colors disabled:opacity-50"
                              disabled={item.quantity <= 1}
                            >
                              <MinusIcon className="h-3 w-3" />
                            </button>
                            <span className="px-3 py-1.5 text-sm font-medium border-x border-border">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              className="p-1.5 hover:bg-background rounded-r-lg transition-colors"
                            >
                              <PlusIcon className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => cart.removeItem(item.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-text-secondary hover:text-error hover:bg-error/5 rounded-lg transition-all"
                        >
                          <TrashIcon className="h-4 w-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}

              {/* Continue Shopping Link */}
              <div className="pt-4">
                <Link to="/" className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors group">
                  <ArrowLeftIcon className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                  Continue Shopping
                </Link>
              </div>
            </motion.div>

            {/* Order Summary */}
            <motion.aside
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:sticky lg:top-24 h-fit"
            >
              <div className="bg-white rounded-xl border border-border shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-primary/5 to-secondary/5 p-4 border-b border-border">
                  <h2 className="text-lg font-semibold text-text flex items-center gap-2">
                    <CreditCardIcon className="h-5 w-5 text-primary" />
                    Order Summary
                  </h2>
                </div>

                <div className="p-4 space-y-4">
                  {/* Promo Code */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Promo Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Enter code"
                        className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        disabled={promoApplied}
                      />
                      <Button
                        variant="outline"
                        onClick={handleApplyPromo}
                        disabled={!promoCode || promoApplied}
                        className="whitespace-nowrap"
                      >
                        Apply
                      </Button>
                    </div>
                    {promoApplied && (
                      <p className="text-xs text-success flex items-center gap-1">
                        <SparklesIcon className="h-3 w-3" />
                        10% discount applied!
                      </p>
                    )}
                  </div>

                  {/* Price Breakdown */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Subtotal</span>
                      <span className="font-medium text-text">{formatCurrency(subtotal)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Shipping</span>
                      {shipping === 0 ? (
                        <span className="text-success font-medium">Free</span>
                      ) : (
                        <span className="font-medium text-text">{formatCurrency(shipping)}</span>
                      )}
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Tax (16% VAT)</span>
                      <span className="font-medium text-text">{formatCurrency(tax)}</span>
                    </div>
                    
                    {discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">Discount</span>
                        <span className="text-error font-medium">-{formatCurrency(discount)}</span>
                      </div>
                    )}

                    <div className="border-t border-border pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-base font-semibold text-text">Total</span>
                        <span className="text-2xl font-bold text-primary">{formatCurrency(total)}</span>
                      </div>
                      <p className="text-xs text-text-tertiary mt-1">
                        Including all taxes and shipping
                      </p>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Link to="/checkout">
                    <Button 
                      size="lg" 
                      fullWidth 
                      className="relative overflow-hidden group mt-4"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        Proceed to Checkout
                        <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-primary to-primaryDark"
                        initial={{ x: '100%' }}
                        whileHover={{ x: 0 }}
                        transition={{ duration: 0.3 }}
                      />
                    </Button>
                  </Link>

                  {/* Trust Badges */}
                  <div className="grid grid-cols-3 gap-2 pt-4">
                    <div className="text-center">
                      <div className="inline-flex p-2 bg-primary/10 rounded-full mb-1">
                        <ShieldCheckIcon className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-[10px] text-text-tertiary">Secure Payment</p>
                    </div>
                    <div className="text-center">
                      <div className="inline-flex p-2 bg-primary/10 rounded-full mb-1">
                        <TruckIcon className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-[10px] text-text-tertiary">Fast Delivery</p>
                    </div>
                    <div className="text-center">
                      <div className="inline-flex p-2 bg-primary/10 rounded-full mb-1">
                        <GiftIcon className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-[10px] text-text-tertiary">Free Returns</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estimated Delivery */}
              <div className="mt-4 bg-background rounded-lg p-3 border border-border">
                <p className="text-xs text-text-secondary flex items-center gap-2">
                  <TruckIcon className="h-4 w-4 text-primary" />
                  Estimated delivery: 2-4 business days
                </p>
              </div>
            </motion.aside>
          </div>
        )}
      </div>

      {/* Clear Cart Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mb-4">
                  <TrashIcon className="h-8 w-8 text-error" />
                </div>
                <h3 className="text-xl font-bold text-text mb-2">Clear Cart?</h3>
                <p className="text-text-secondary mb-6">
                  Are you sure you want to remove all {cartItemsCount} items from your cart? This action cannot be undone.
                </p>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      cart.clear()
                      setShowClearConfirm(false)
                    }}
                    className="flex-1 bg-error text-white hover:bg-error-dark"
                  >
                    Clear Cart
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CartPage