import { TextareaHTMLAttributes, useId } from 'react'
import clsx from 'clsx'

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export const TextArea = ({ label, error, helperText, id, className, ...rest }: TextAreaProps) => {
  const generatedId = useId()
  const textAreaId = id ?? rest.name ?? generatedId

  return (
    <div className="space-y-1.5 text-xs sm:text-sm">
      {label && (
        <label
          htmlFor={textAreaId}
          className={clsx(
            'block font-medium',
            error ? 'text-error' : 'text-text-secondary'
          )}
        >
          {label}
        </label>
      )}
      <textarea
        id={textAreaId}
        className={clsx(
          'min-h-[80px] w-full rounded-md border bg-surface px-3 py-2 text-xs sm:text-sm outline-none transition shadow-sm',
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

export default TextArea
