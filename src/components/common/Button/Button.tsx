import { ButtonHTMLAttributes, ReactNode } from 'react'
import { semanticColors } from '../../../constants/theme'
import clsx from 'clsx'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  loading?: boolean
}

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth,
  leftIcon,
  rightIcon,
  loading,
  className,
  disabled,
  ...rest
}: ButtonProps) => {
  const isDisabled = disabled || loading

  const sizeClasses =
    size === 'sm'
      ? 'h-8 px-3 text-xs'
      : size === 'lg'
        ? 'h-11 px-5 text-sm'
        : 'h-9 px-4 text-xs sm:text-sm'

  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary disabled:cursor-not-allowed'

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-primary text-text-inverse border border-primary-dark hover:bg-primary-dark disabled:opacity-50',
    secondary:
      'bg-secondary text-text border border-secondary-dark hover:bg-secondary-dark hover:text-text-inverse disabled:opacity-50',
    outline:
      'bg-transparent text-primary border border-primary hover:bg-primary hover:text-text-inverse disabled:opacity-50',
    ghost:
      'bg-transparent text-text-secondary hover:bg-background border border-transparent disabled:opacity-50'
  }

  const semantic = semanticColors.button[variant === 'secondary' ? 'secondary' : 'primary']

  return (
    <button
      type="button"
      disabled={isDisabled}
      className={clsx(
        baseClasses,
        sizeClasses,
        variantClasses[variant],
        fullWidth && 'w-full',
        className
      )}
      style={{
        background:
          variant === 'primary'
            ? `linear-gradient(135deg, ${semantic.background}, ${semantic.border})`
            : undefined
      }}
      {...rest}
    >
      {leftIcon && !loading && <span className="inline-flex items-center">{leftIcon}</span>}
      <span className={clsx('inline-flex items-center', loading && 'opacity-80')}>
        {loading && (
          <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-[2px] border-text-inverse border-t-transparent" />
        )}
        {children}
      </span>
      {rightIcon && !loading && <span className="inline-flex items-center">{rightIcon}</span>}
    </button>
  )
}

export default Button
