import { InputHTMLAttributes } from 'react'
import clsx from 'clsx'

export interface RadioProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Radio = ({ label, className, ...rest }: RadioProps) => {
  return (
    <label className="inline-flex items-center gap-2 text-xs sm:text-sm text-text-secondary">
      <input
        type="radio"
        className={clsx(
          'h-4 w-4 rounded-full border border-border text-primary focus:ring-primary',
          className
        )}
        {...rest}
      />
      {label && <span>{label}</span>}
    </label>
  )
}

export default Radio

