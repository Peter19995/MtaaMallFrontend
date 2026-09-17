import {
  createContext,
  FormEvent,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  QuestionMarkCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

import { Button } from '../Button'
import { TextArea } from '../Input'

type DialogTone = 'default' | 'danger'

type DialogOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: DialogTone
}

type PromptOptions = DialogOptions & {
  defaultValue?: string
  inputLabel?: string
  inputType?: 'text' | 'password'
  placeholder?: string
  minLength?: number
  maxLength?: number
  trim?: boolean
}

type ActiveDialog = {
  kind: 'alert' | 'confirm' | 'prompt'
  options: PromptOptions
  resolve: (value: boolean | string | null | undefined) => void
}

type SiteDialogContextValue = {
  alert: (options: string | DialogOptions) => Promise<void>
  confirm: (options: string | DialogOptions) => Promise<boolean>
  prompt: (options: PromptOptions) => Promise<string | null>
}

const SiteDialogContext = createContext<SiteDialogContextValue | null>(null)

const normalizeOptions = (options: string | DialogOptions): DialogOptions =>
  typeof options === 'string' ? { message: options } : options

export const SiteDialogProvider = ({ children }: { children: ReactNode }) => {
  const [dialog, setDialog] = useState<ActiveDialog | null>(null)
  const [inputValue, setInputValue] = useState('')
  const dialogRef = useRef<ActiveDialog | null>(null)

  useEffect(() => {
    dialogRef.current = dialog
  }, [dialog])

  const open = useCallback(
    (kind: ActiveDialog['kind'], options: PromptOptions) =>
      new Promise<boolean | string | null | undefined>((resolve) => {
        setInputValue(options.defaultValue ?? '')
        setDialog({ kind, options, resolve })
      }),
    []
  )

  const alert = useCallback(
    async (options: string | DialogOptions) => {
      await open('alert', normalizeOptions(options))
    },
    [open]
  )

  const confirm = useCallback(
    async (options: string | DialogOptions) =>
      Boolean(await open('confirm', normalizeOptions(options))),
    [open]
  )

  const prompt = useCallback(
    async (options: PromptOptions) => {
      const result = await open('prompt', options)
      return typeof result === 'string' ? result : null
    },
    [open]
  )

  const close = useCallback((value: boolean | string | null | undefined) => {
    const active = dialogRef.current
    if (!active) return
    active.resolve(value)
    dialogRef.current = null
    setInputValue('')
    setDialog(null)
  }, [])

  useEffect(() => {
    if (!dialog) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      close(dialog.kind === 'confirm' ? false : dialog.kind === 'prompt' ? null : undefined)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [close, dialog])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!dialog) return
    const promptValue = dialog.options.trim === false ? inputValue : inputValue.trim()
    close(dialog.kind === 'prompt' ? promptValue : dialog.kind === 'confirm' ? true : undefined)
  }

  const title = dialog?.options.title ??
    (dialog?.kind === 'prompt' ? 'Reason required' : dialog?.kind === 'confirm' ? 'Please confirm' : 'Notice')
  const minimumLength = dialog?.options.minLength ?? 0
  const validatedInput = dialog?.options.trim === false ? inputValue : inputValue.trim()
  const promptIsValid = dialog?.kind !== 'prompt' || validatedInput.length >= minimumLength
  const isDanger = dialog?.options.tone === 'danger'
  const Icon = isDanger
    ? ExclamationTriangleIcon
    : dialog?.kind === 'alert'
      ? InformationCircleIcon
      : QuestionMarkCircleIcon

  return (
    <SiteDialogContext.Provider value={{ alert, confirm, prompt }}>
      {children}
      <AnimatePresence>
        {dialog && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-text/55 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.currentTarget !== event.target || dialog.kind === 'alert') return
              close(dialog.kind === 'confirm' ? false : null)
            }}
          >
            <motion.form
              role={isDanger ? 'alertdialog' : 'dialog'}
              aria-modal="true"
              aria-labelledby="site-dialog-title"
              aria-describedby="site-dialog-description"
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.18 }}
              onSubmit={submit}
            >
              <div className="flex items-start gap-4 border-b border-divider bg-gradient-to-r from-primary/10 via-white to-secondary/10 p-5">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${isDanger ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary-dark'}`}>
                  <Icon className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 id="site-dialog-title" className="text-lg font-bold text-text">{title}</h2>
                  <p id="site-dialog-description" className="mt-1 text-sm leading-6 text-text-secondary">
                    {dialog.options.message}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close dialog"
                  className="rounded-lg p-2 text-text-tertiary transition hover:bg-white hover:text-text"
                  onClick={() => close(dialog.kind === 'confirm' ? false : dialog.kind === 'prompt' ? null : undefined)}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5">
                {dialog.kind === 'prompt' && (
                  dialog.options.inputType === 'password' ? (
                    <label className="block text-sm font-semibold text-text">
                      {dialog.options.inputLabel ?? 'Password'}
                      <input
                        autoFocus
                        type="password"
                        autoComplete="current-password"
                        className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                        placeholder={dialog.options.placeholder ?? 'Enter your password'}
                        value={inputValue}
                        minLength={minimumLength || undefined}
                        maxLength={dialog.options.maxLength ?? 1024}
                        required={minimumLength > 0}
                        onChange={(event) => setInputValue(event.target.value)}
                      />
                    </label>
                  ) : (
                    <TextArea
                      autoFocus
                      label={dialog.options.inputLabel ?? 'Reason'}
                      placeholder={dialog.options.placeholder ?? 'Enter a clear reason'}
                      value={inputValue}
                      minLength={minimumLength || undefined}
                      maxLength={dialog.options.maxLength ?? 1000}
                      required={minimumLength > 0}
                      onChange={(event) => setInputValue(event.target.value)}
                    />
                  )
                )}
                <div className="mt-5 flex flex-wrap justify-end gap-3">
                  {dialog.kind !== 'alert' && (
                    <Button type="button" variant="ghost" onClick={() => close(dialog.kind === 'confirm' ? false : null)}>
                      {dialog.options.cancelLabel ?? 'Cancel'}
                    </Button>
                  )}
                  {isDanger ? (
                    <button
                      type="submit"
                      disabled={!promptIsValid}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-error-dark bg-error px-4 text-sm font-medium text-white transition hover:bg-error-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {dialog.options.confirmLabel ?? 'Confirm'}
                    </button>
                  ) : (
                    <Button type="submit" disabled={!promptIsValid}>
                      {dialog.options.confirmLabel ?? (dialog.kind === 'alert' ? 'Okay' : 'Confirm')}
                    </Button>
                  )}
                </div>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </SiteDialogContext.Provider>
  )
}

export const useSiteDialog = (): SiteDialogContextValue => {
  const context = useContext(SiteDialogContext)
  if (!context) throw new Error('useSiteDialog must be used inside SiteDialogProvider')
  return context
}
