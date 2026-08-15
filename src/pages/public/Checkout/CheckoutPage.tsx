import { FormEvent, useContext, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  ShoppingBagIcon,
  CreditCardIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  TruckIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import { Button, TextInput } from '@components/common'
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

const CheckoutPage = () => {
  const cart = useContext(CartContext)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showOrderSuccess, setShowOrderSuccess] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  if (!cart) {
    throw new Error('CartContext is required for CheckoutPage.')
  }

  const cartItemsCount = useMemo(
    () => cart.items.reduce((sum, item) => sum + item.quantity, 0),
    [cart.items]
  )

  const subtotal = cart.total
  const shipping = subtotal > 5000 ? 0 : 500
  const tax = subtotal * 0.16 // 16% VAT
  const total = subtotal + shipping + tax

  const validateForm = () => {
    if (!fullName.trim()) {
      toast.error('Please enter your full name', {
        icon: '👤',
        style: {
          borderRadius: '10px',
          background: AppTheme.colors.errorSoft,
          color: AppTheme.colors.errorDark,
        }
      })
      return false
    }
    if (!phone.trim() || phone.length < 10) {
      toast.error('Please enter a valid phone number', {
        icon: '📱',
        style: {
          borderRadius: '10px',
          background: AppTheme.colors.errorSoft,
          color: AppTheme.colors.errorDark,
        }
      })
      return false
    }
    if (!location.trim()) {
      toast.error('Please enter your delivery location', {
        icon: '📍',
        style: {
          borderRadius: '10px',
          background: AppTheme.colors.errorSoft,
          color: AppTheme.colors.errorDark,
        }
      })
      return false
    }
    if (!agreedToTerms) {
      toast.error('Please agree to the terms and conditions', {
        icon: '📋',
        style: {
          borderRadius: '10px',
          background: AppTheme.colors.errorSoft,
          color: AppTheme.colors.errorDark,
        }
      })
      return false
    }
    return true
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (cart.items.length === 0) {
      toast.error('Your cart is empty', {
        icon: '🛒',
        style: {
          borderRadius: '10px',
          background: AppTheme.colors.errorSoft,
          color: AppTheme.colors.errorDark,
        }
      })
      return
    }

    if (!validateForm()) return

    setIsSubmitting(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))

    cart.clear()
    setFullName('')
    setPhone('')
    setLocation('')
    setNotes('')
    setIsSubmitting(false)
    setShowOrderSuccess(true)
    
    toast.success('Order placed successfully!', {
      icon: '🎉',
      style: {
        borderRadius: '10px',
        background: AppTheme.colors.successSoft,
        color: AppTheme.colors.successDark,
      }
    })
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
                <CreditCardIcon className="h-8 w-8 text-primary" />
                Checkout
              </h1>
              <p className="text-text-secondary mt-1">
                Complete your order by providing your details below
              </p>
            </div>
            
            <Link to="/cart">
              <Button variant="ghost" className="flex items-center gap-2">
                <ArrowLeftIcon className="h-4 w-4" />
                Back to Cart
              </Button>
            </Link>
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
            <p className="text-text-secondary mb-6">Add some items to your cart before checking out</p>
            <Link to="/">
              <Button size="lg" className="flex items-center gap-2">
                <ShoppingBagIcon className="h-4 w-4" />
                Start Shopping
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Checkout Form */}
            <motion.div
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              className="lg:col-span-2"
            >
              <div className="bg-white rounded-xl border border-border shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-primary/5 to-secondary/5 p-4 border-b border-border">
                  <h2 className="text-lg font-semibold text-text flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-primary" />
                    Customer Information
                  </h2>
                </div>

                <form onSubmit={onSubmit} className="p-4 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextInput
                      label="Full Name"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      required
                      icon={<UserIcon className="h-4 w-4 text-text-tertiary" />}
                      placeholder="John Doe"
                    />
                    
                    <TextInput
                      label="Phone Number"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      required
                      icon={<PhoneIcon className="h-4 w-4 text-text-tertiary" />}
                      placeholder="+254 700 000 000"
                    />
                  </div>

                  <TextInput
                    label="Delivery Location"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    required
                    icon={<MapPinIcon className="h-4 w-4 text-text-tertiary" />}
                    placeholder="Nairobi, Kenya"
                  />

                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Order Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Any special instructions for delivery?"
                      rows={3}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  {/* Terms Agreement */}
                  <label className="flex items-start gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                    />
                    <span className="text-xs text-text-secondary group-hover:text-primary transition-colors">
                      I agree to the{' '}
                      <Link to="/terms" className="text-primary hover:underline">
                        terms and conditions
                      </Link>{' '}
                      and confirm that my details are correct
                    </span>
                  </label>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <Button
                      type="submit"
                      size="lg"
                      fullWidth
                      disabled={isSubmitting || cart.items.length === 0}
                      className="relative overflow-hidden group"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          Place Order
                          <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      )}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-primary to-primaryDark"
                        initial={{ x: '100%' }}
                        whileHover={{ x: 0 }}
                        transition={{ duration: 0.3 }}
                      />
                    </Button>
                  </div>
                </form>
              </div>

              {/* Security Badge */}
              <div className="mt-4 flex items-center gap-2 text-xs text-text-tertiary bg-background rounded-lg p-3 border border-border">
                <LockClosedIcon className="h-4 w-4 text-primary" />
                <span>Your information is secure and encrypted</span>
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
                    <ShoppingBagIcon className="h-5 w-5 text-primary" />
                    Order Summary
                  </h2>
                </div>

                <div className="p-4 space-y-4">
                  {/* Items List */}
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    <AnimatePresence>
                      {cart.items.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex items-start justify-between gap-2 p-2 bg-background rounded-lg border border-border"
                        >
                          <div>
                            <p className="text-sm font-medium text-text">{item.name}</p>
                            <p className="text-xs text-text-tertiary">
                              Qty {item.quantity} × {formatCurrency(item.price)}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-primary">
                            {formatCurrency(item.price * item.quantity)}
                          </p>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Price Breakdown */}
                  <div className="space-y-2 border-t border-border pt-4">
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

                    <div className="flex justify-between items-center pt-2 border-t border-border">
                      <span className="text-base font-semibold text-text">Total</span>
                      <span className="text-2xl font-bold text-primary">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  {/* Delivery Estimate */}
                  <div className="bg-background rounded-lg p-3 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <TruckIcon className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium text-text">Delivery Estimate</span>
                    </div>
                    <p className="text-xs text-text-secondary">2-4 business days</p>
                  </div>

                  {/* Trust Badges */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="text-center p-2 bg-background rounded-lg border border-border">
                      <ShieldCheckIcon className="h-4 w-4 text-primary mx-auto mb-1" />
                      <p className="text-[10px] text-text-tertiary">Secure Payment</p>
                    </div>
                    <div className="text-center p-2 bg-background rounded-lg border border-border">
                      <SparklesIcon className="h-4 w-4 text-primary mx-auto mb-1" />
                      <p className="text-[10px] text-text-tertiary">Quality Guaranteed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Back to Shop Link */}
              <Link
                to="/"
                className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:text-primary-dark transition-colors group"
              >
                <ArrowLeftIcon className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Continue Shopping
              </Link>
            </motion.aside>
          </div>
        )}
      </div>

      {/* Order Success Modal */}
      <AnimatePresence>
        {showOrderSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setShowOrderSuccess(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircleSolid className="h-10 w-10 text-success" />
                </div>
                <h3 className="text-xl font-bold text-text mb-2">Order Placed Successfully!</h3>
                <p className="text-text-secondary mb-4">
                  Thank you for your order. Our team will contact you shortly to confirm the details.
                </p>
                
                <div className="bg-background rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-text-secondary">Order Total</span>
                    <span className="text-lg font-bold text-primary">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Delivery to</span>
                    <span className="text-sm font-medium text-text">{location || 'Nairobi'}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Link to="/" className="flex-1">
                    <Button variant="outline" className="w-full">
                      Continue Shopping
                    </Button>
                  </Link>
                  <Link to="/" className="flex-1">
                    <Button className="w-full bg-gradient-to-r from-primary to-secondary text-white">
                      View Orders
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CheckoutPage