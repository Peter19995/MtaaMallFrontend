import { useContext, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  MinusIcon,
  PlusIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@components/common'
import { CartContext } from '@contexts/CartContext'
import {
  getProductRequest,
  listProductVariantsRequest,
  type ProductVariantResponse,
} from '@api/modules/products.api'
import { resolveMediaUrls } from '@utils/media'

const money = (value: number) => new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 0,
}).format(value)

const ProductDetailsPage = () => {
  const { productId } = useParams()
  const cart = useContext(CartContext)
  const numericProductId = Number(productId)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)

  const productQuery = useQuery({
    queryKey: ['public-product', numericProductId],
    queryFn: () => getProductRequest(numericProductId, { include_zero_variants: true }),
    enabled: Number.isSafeInteger(numericProductId) && numericProductId > 0,
  })
  const variantsQuery = useQuery({
    queryKey: ['public-product-variants', numericProductId],
    queryFn: () => listProductVariantsRequest(numericProductId),
    enabled: Boolean(productQuery.data),
  })

  const product = productQuery.data
  const variants = useMemo(
    () => (variantsQuery.data ?? []).filter((variant) => variant.is_active && variant.available_online !== false),
    [variantsQuery.data],
  )
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? null
  const images = useMemo(() => {
    if (!product) return []
    const values = [
      ...resolveMediaUrls(product.image_urls ?? []),
      ...resolveMediaUrls(variants.map((variant) => variant.image_url).filter(Boolean) as string[]),
    ]
    return [...new Set(values)]
  }, [product, variants])

  useEffect(() => {
    if (selectedImage >= images.length) setSelectedImage(0)
  }, [images.length, selectedImage])

  if (!cart) throw new Error('CartContext is required for ProductDetailsPage.')

  if (productQuery.isLoading) {
    return <div className="mx-auto max-w-7xl px-4 py-16"><div className="h-96 animate-pulse rounded-3xl bg-white shadow-sm" /></div>
  }

  if (!product || productQuery.isError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <ShoppingBagIcon className="mx-auto h-16 w-16 text-text-tertiary" />
        <h1 className="mt-5 text-2xl font-bold text-text">Product not available</h1>
        <p className="mt-2 text-text-secondary">This product may be out of stock or no longer available online.</p>
        <Link to="/products" className="mt-6 inline-flex font-semibold text-primary hover:underline">Back to Shop</Link>
      </div>
    )
  }

  const basePrice = product.selling_price ?? product.price
  const productPrice = product.is_on_offer ? Math.max(basePrice - (product.max_offer ?? 0), 0) : basePrice
  const price = selectedVariant?.price_override ?? selectedVariant?.price ?? productPrice
  const available = selectedVariant?.stock_quantity ?? product.stock_quantity
  const tags = (product.tags ?? '').split(',').map((tag) => tag.trim()).filter(Boolean)

  const chooseVariant = (variant: ProductVariantResponse) => {
    setSelectedVariantId(variant.id)
    setQuantity(1)
    if (variant.image_url) {
      const index = images.indexOf(resolveMediaUrls([variant.image_url])[0])
      if (index >= 0) setSelectedImage(index)
    }
  }

  const addToCart = async () => {
    if (variants.length > 0 && !selectedVariant) {
      toast.error('Select a product option first.')
      return
    }
    try {
      await cart.addItem({
        id: String(product.id),
        product_id: product.id,
        product_variant_id: selectedVariant?.id,
        name: product.name + (selectedVariant ? ` · ${selectedVariant.sku}` : ''),
        price,
        quantity,
      })
      toast.success(`${product.name} added to your cart`)
    } catch (error: any) {
      toast.error(String(error?.response?.data?.message || error?.response?.data?.detail || error?.message || 'Could not add this product.'))
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-white to-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/products" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-primary">
          <ArrowLeftIcon className="h-4 w-4" /> Back to Shop
        </Link>

        <div className="grid gap-8 rounded-3xl border border-border bg-white p-5 shadow-sm lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,.92fr)] lg:p-8">
          <section aria-label="Product images">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5">
              {images.length ? (
                <img src={images[selectedImage]} alt={`${product.name} image ${selectedImage + 1}`} className="h-full w-full object-contain" />
              ) : (
                <ShoppingBagIcon className="h-28 w-28 text-primary/20" />
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
                {images.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    aria-label={`View image ${index + 1}`}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square overflow-hidden rounded-xl border-2 bg-background p-1 transition ${selectedImage === index ? 'border-primary shadow-sm' : 'border-transparent hover:border-primary/30'}`}
                  >
                    <img src={image} alt="" className="h-full w-full rounded-lg object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col">
            <p className="text-sm font-bold uppercase tracking-wider text-primary">{product.category_name || 'General'}</p>
            <h1 className="mt-2 text-3xl font-bold text-text sm:text-4xl">{product.name}</h1>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-3 text-sm text-text-secondary">
              <BuildingStorefrontIcon className="h-5 w-5 text-primary" />
              Sold by <strong className="text-text">{product.business_name ?? 'MtaaMall seller'}</strong>
              {product.branch_name ? <span>· {product.branch_name}</span> : null}
            </div>

            <div className="mt-6 flex flex-wrap items-end gap-3">
              <span className="text-3xl font-black text-primary">{money(price)}</span>
              {product.is_on_offer && !selectedVariant && <span className="pb-1 text-sm text-text-tertiary line-through">{money(basePrice)}</span>}
              <span className={`ml-auto rounded-full px-3 py-1 text-sm font-semibold ${available > 0 ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                {available > 0 ? `${available} in stock` : 'Out of stock'}
              </span>
            </div>

            <p className="mt-6 whitespace-pre-line leading-7 text-text-secondary">
              {product.description || 'Product details are provided by the seller.'}
            </p>

            {tags.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{tags.map((tag) => <span key={tag} className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-text-secondary">{tag}</span>)}</div>}

            {variants.length > 0 && (
              <div className="mt-7">
                <p className="mb-3 text-sm font-bold text-text">Choose an option</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {variants.map((variant) => {
                    const label = Object.entries(variant.options).map(([key, value]) => `${key}: ${value}`).join(' · ') || variant.sku
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        disabled={variant.stock_quantity <= 0}
                        onClick={() => chooseVariant(variant)}
                        className={`rounded-xl border p-3 text-left text-sm transition disabled:opacity-40 ${selectedVariantId === variant.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/40'}`}
                      >
                        <span className="font-semibold text-text">{label}</span>
                        <span className="mt-1 block text-xs text-text-secondary">{money(variant.price_override ?? variant.price)} · {variant.stock_quantity} available</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mt-8 border-t border-border pt-6">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="inline-flex h-12 items-center overflow-hidden rounded-xl border border-border bg-white">
                  <button type="button" aria-label="Reduce quantity" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="grid h-full w-12 place-items-center disabled:opacity-30"><MinusIcon className="h-5 w-5" /></button>
                  <span className="w-12 text-center font-bold">{quantity}</span>
                  <button type="button" aria-label="Increase quantity" disabled={quantity >= available} onClick={() => setQuantity((value) => Math.min(available, value + 1))} className="grid h-full w-12 place-items-center disabled:opacity-30"><PlusIcon className="h-5 w-5" /></button>
                </div>
                <Button fullWidth disabled={available <= 0 || cart.isBusy} onClick={addToCart} className="h-12">
                  <ShoppingBagIcon className="mr-2 h-5 w-5" /> Add to Cart
                </Button>
              </div>
              <div className="mt-5 grid gap-2 text-sm text-text-secondary sm:grid-cols-2">
                <span className="flex items-center gap-2"><CheckCircleIcon className="h-5 w-5 text-success" /> Seller SKU: {selectedVariant?.sku || product.sku}</span>
                {(product.fulfillment_methods ?? []).map((method) => <span key={method} className="flex items-center gap-2"><CheckCircleIcon className="h-5 w-5 text-success" /> {method}</span>)}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

export default ProductDetailsPage
