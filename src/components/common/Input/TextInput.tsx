import { InputHTMLAttributes } from 'react'
import clsx from 'clsx'

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const TextInput = ({ label, error, helperText, className, id, ...rest }: TextInputProps) => {
  const inputId = id ?? rest.name

  return (
    <div className="space-y-1.5 text-xs sm:text-sm">
      {label && (
        <label
          htmlFor={inputId}
          className={clsx(
            'block font-medium',
            error ? 'text-error' : 'text-text-secondary'
          )}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={clsx(
          'w-full rounded-md border bg-surface px-3 py-2 text-xs sm:text-sm outline-none transition shadow-sm',
          error
            ? 'border-error bg-error-light/10 focus:border-error-dark focus:ring-1 focus:ring-error-dark'
            : 'border-border focus:border-primary focus:ring-1 focus:ring-primary',
          'placeholder:text-text-tertiary',
          'disabled:cursor-not-allowed disabled:bg-divider/40',
          className
        )}
        {...rest}
      />
      {(helperText || error) && (
        <p className={clsx('text-[11px]', error ? 'text-error' : 'text-text-tertiary')}>
          {error ?? helperText}
        </p>
      )}
    </div>
  )
}

export default TextInput

