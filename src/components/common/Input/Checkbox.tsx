import { InputHTMLAttributes } from 'react'
import clsx from 'clsx'

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Checkbox = ({ label, className, ...rest }: CheckboxProps) => {
  return (
    <label className="inline-flex items-center gap-2 text-xs sm:text-sm text-text-secondary">
      <input
        type="checkbox"
        className={clsx(
          'h-4 w-4 rounded border border-border text-primary focus:ring-primary',
          className
        )}
        {...rest}
      />
      {label && <span>{label}</span>}
    </label>
  )
}

export default Checkbox

