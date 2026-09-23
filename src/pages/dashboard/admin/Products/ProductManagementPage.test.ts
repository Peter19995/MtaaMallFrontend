// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { filterProductsByTypedName, productImageSelectionError, productSaveErrorMessage } from './ProductManagementPage'

describe('product image selection', () => {
  it('accepts supported image files within the limit', () => {
    const image = new File(['image'], 'chair.png', { type: 'image/png' })
    expect(productImageSelectionError([image], 1)).toBeNull()
  })

  it('rejects non-images, disguised extensions, oversized files and excess images', () => {
    expect(productImageSelectionError([new File(['x'], 'notes.txt', { type: 'text/plain' })], 1)).toMatch(/images only/)
    expect(productImageSelectionError([new File(['x'], 'fake.txt', { type: 'image/png' })], 1)).toMatch(/images only/)
    expect(productImageSelectionError([new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' })], 1)).toMatch(/larger than 5 MB/)
    expect(productImageSelectionError([], 6)).toMatch(/at most 5 images/)
  })
})

describe('product-name suggestions', () => {
  const products = [
    { name: 'Mouse' },
    { name: 'Wireless Mouse' },
    { name: 'Keyboard' },
  ]

  it('shows only products whose names contain the typed text', () => {
    expect(filterProductsByTypedName(products, 'mouse')).toEqual([
      { name: 'Mouse' },
      { name: 'Wireless Mouse' },
    ])
    expect(filterProductsByTypedName(products, 'KEY')).toEqual([{ name: 'Keyboard' }])
  })
})

describe('product save errors', () => {
  it('shows the API conflict detail instead of the Axios status text', () => {
    expect(productSaveErrorMessage({
      response: { status: 409, data: { detail: 'This product already exists in your business' } },
      message: 'Request failed with status code 409',
    })).toBe('This product already exists in your business')

    expect(productSaveErrorMessage({ response: { status: 409 } }))
      .toBe('This product already exists in your business.')
  })
})
