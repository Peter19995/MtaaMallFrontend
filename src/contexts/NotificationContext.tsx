import { createContext, ReactNode } from 'react'
import toast from 'react-hot-toast'

type NotificationContextValue = {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

export const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
)

type Props = {
  children: ReactNode
}

export const NotificationProvider = ({ children }: Props) => {
  const value: NotificationContextValue = {
    success: (message) => toast.success(message),
    error: (message) => toast.error(message),
    info: (message) => toast(message)
  }

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

