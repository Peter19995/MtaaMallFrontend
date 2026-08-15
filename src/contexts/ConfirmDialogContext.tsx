import { createContext, ReactNode, useContext, useState } from 'react'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Button } from '@components/common'

type ConfirmOptions = {
  title?: string
  message: string
  confirmLabel?: string
  destructive?: boolean
}

type PendingConfirmation = ConfirmOptions & { resolve: (confirmed: boolean) => void }

const ConfirmDialogContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null)

export const ConfirmDialogProvider = ({ children }: { children: ReactNode }) => {
  const [pending, setPending] = useState<PendingConfirmation | null>(null)
  const confirm = (options: ConfirmOptions) => new Promise<boolean>((resolve) => {
    setPending({ destructive: true, confirmLabel: 'Delete', title: 'Confirm action', ...options, resolve })
  })

  const close = (result: boolean) => {
    pending?.resolve(result)
    setPending(null)
  }

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(false) }}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message" className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
            <div className="flex items-start gap-4 p-6">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${pending.destructive ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}><ExclamationTriangleIcon className="h-6 w-6" /></div>
              <div className="min-w-0 flex-1"><h2 id="confirm-dialog-title" className="text-lg font-semibold text-text">{pending.title}</h2><p id="confirm-dialog-message" className="mt-2 text-sm leading-6 text-text-secondary">{pending.message}</p></div>
              <button type="button" onClick={() => close(false)} className="rounded-lg p-1.5 text-text-tertiary hover:bg-background hover:text-text" aria-label="Close dialog"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            <div className="flex justify-end gap-3 border-t border-border bg-background/60 px-6 py-4">
              <Button type="button" variant="ghost" onClick={() => close(false)}>Cancel</Button>
              <Button type="button" onClick={() => close(true)} className={pending.destructive ? '!border-error !bg-error !text-white hover:!bg-error-dark' : ''}>{pending.confirmLabel}</Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  )
}

export const useConfirmDialog = () => {
  const confirm = useContext(ConfirmDialogContext)
  if (!confirm) throw new Error('useConfirmDialog must be used inside ConfirmDialogProvider')
  return confirm
}
