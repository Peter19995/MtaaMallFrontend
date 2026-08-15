import { createContext, ReactNode, useMemo, useState } from 'react'

type CartItem = {
  id: string
  name: string
  price: number
  quantity: number
}

type CartContextValue = {
  items: CartItem[]
  total: number
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  clear: () => void
}

export const CartContext = createContext<CartContextValue | undefined>(undefined)

type Props = {
  children: ReactNode
}

export const CartProvider = ({ children }: Props) => {
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
        )
      }
      return [...prev, item]
    })
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const clear = () => setItems([])

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  )

  return (
    <CartContext.Provider value={{ items, total, addItem, removeItem, clear }}>
      {children}
    </CartContext.Provider>
  )
}

