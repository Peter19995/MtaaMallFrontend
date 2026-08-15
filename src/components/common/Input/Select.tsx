import { SelectHTMLAttributes } from 'react'
import clsx from 'clsx'

export interface SelectOption {
  label: string
  value: string | number
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options: SelectOption[]
}

export const Select = ({
  label,
  error,
  helperText,
  options,
  className,
  id,
  ...rest
}: SelectProps) => {
  const selectId = id ?? rest.name

  return (
    <div className="space-y-1.5 text-xs sm:text-sm">
      {label && (
        <label
          htmlFor={selectId}
          className={clsx(
            'block font-medium',
            error ? 'text-error' : 'text-text-secondary'
          )}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={clsx(
            'w-full appearance-none rounded-md border bg-surface px-3 py-2 text-xs sm:text-sm outline-none transition shadow-sm',
            error
              ? 'border-error bg-error-light/10 focus:border-error-dark focus:ring-1 focus:ring-error-dark'
              : 'border-border focus:border-primary focus:ring-1 focus:ring-primary',
            'disabled:cursor-not-allowed disabled:bg-divider/40',
            className
          )}
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-text-tertiary">
          ▾
        </span>
      </div>
      {(helperText || error) && (
        <p className={clsx('text-[11px]', error ? 'text-error' : 'text-text-tertiary')}>
          {error ?? helperText}
        </p>
      )}
    </div>
  )
}

export default Select

