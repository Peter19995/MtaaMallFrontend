// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { productImageSelectionError } from './ProductManagementPage'

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
