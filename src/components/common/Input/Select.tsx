import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes
} from 'react'
import { CheckIcon, ChevronUpDownIcon, MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import clsx from 'clsx'

export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
  description?: string
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  label?: string
  error?: string
  helperText?: string
  options?: SelectOption[]
  children?: ReactNode
  value?: string | number
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void
  searchable?: boolean
  searchPlaceholder?: string
  emptyMessage?: string
}

const normalizeValue = (value: string | number | readonly string[] | undefined) =>
  value === undefined || Array.isArray(value) ? '' : String(value)

const optionsFromChildren = (children: ReactNode): SelectOption[] => {
  const result: SelectOption[] = []
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    if (child.type === 'option') {
      const option = child.props as { value?: string | number; disabled?: boolean; children?: ReactNode }
      result.push({
        value: option.value ?? '',
        label: Children.toArray(option.children).join(''),
        disabled: option.disabled
      })
      return
    }
    const nested = child.props as { children?: ReactNode }
    if (nested.children) result.push(...optionsFromChildren(nested.children))
  })
  return result
}

export const Select = ({
  label,
  error,
  helperText,
  options,
  children,
  className,
  id,
  name,
  value,
  defaultValue,
  onChange,
  disabled,
  required,
  searchable,
  searchPlaceholder = 'Search options...',
  emptyMessage = 'No matching options',
  ...rest
}: SelectProps) => {
  const generatedId = useId()
  const selectId = id ?? name ?? `select-${generatedId}`
  const menuId = `${selectId}-options`
  const wrapperRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const isControlled = value !== undefined
  const resolvedOptions = useMemo(
    () => options ?? optionsFromChildren(children),
    [children, options]
  )
  const [internalValue, setInternalValue] = useState(() => normalizeValue(defaultValue))
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const selectedValue = isControlled ? normalizeValue(value) : internalValue
  const selectedOption = resolvedOptions.find((option) => String(option.value) === selectedValue)
  const canSearch = searchable ?? resolvedOptions.length >= 8

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return resolvedOptions
    return resolvedOptions.filter((option) =>
      `${option.label} ${option.description ?? ''}`.toLowerCase().includes(normalizedQuery)
    )
  }, [query, resolvedOptions])

  useEffect(() => {
    if (!isControlled) setInternalValue(normalizeValue(defaultValue))
  }, [defaultValue, isControlled])

  useEffect(() => {
    if (!isControlled && defaultValue === undefined && internalValue === '') {
      const firstEnabledOption = resolvedOptions.find((option) => !option.disabled)
      if (firstEnabledOption && String(firstEnabledOption.value) !== '') {
        setInternalValue(String(firstEnabledOption.value))
      }
    }
  }, [defaultValue, internalValue, isControlled, resolvedOptions])

  useEffect(() => {
    if (!open) return
    const closeOnOutsidePress = (event: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', closeOnOutsidePress)
    document.addEventListener('touchstart', closeOnOutsidePress)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsidePress)
      document.removeEventListener('touchstart', closeOnOutsidePress)
    }
  }, [open])

  useEffect(() => {
    if (open && canSearch) searchRef.current?.focus()
  }, [canSearch, open])

  useEffect(() => {
    setActiveIndex((current) => {
      if (!filteredOptions.length) return -1
      if (current >= 0 && current < filteredOptions.length && !filteredOptions[current].disabled) {
        return current
      }
      return filteredOptions.findIndex((option) => !option.disabled)
    })
  }, [filteredOptions])

  const selectOption = (nextValue: string) => {
    if (!isControlled) setInternalValue(nextValue)
    onChange?.({
      target: { value: nextValue, name },
      currentTarget: { value: nextValue, name }
    } as unknown as ChangeEvent<HTMLSelectElement>)
    setOpen(false)
    setQuery('')
  }

  const moveActive = (direction: 1 | -1) => {
    if (!filteredOptions.length) return
    let next = activeIndex
    for (let count = 0; count < filteredOptions.length; count += 1) {
      next = (next + direction + filteredOptions.length) % filteredOptions.length
      if (!filteredOptions[next].disabled) {
        setActiveIndex(next)
        return
      }
    }
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false)
      setQuery('')
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) setOpen(true)
      else moveActive(event.key === 'ArrowDown' ? 1 : -1)
      return
    }
    if (event.key === 'Enter' && open && activeIndex >= 0) {
      event.preventDefault()
      const option = filteredOptions[activeIndex]
      if (option && !option.disabled) selectOption(String(option.value))
    }
  }

  return (
    <div className="space-y-1.5 text-xs sm:text-sm">
      {label && (
        <label
          id={`${selectId}-label`}
          htmlFor={selectId}
          className={clsx('block font-medium', error ? 'text-error' : 'text-text-secondary')}
        >
          {label}
          {required && <span className="ml-0.5 text-error" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative" ref={wrapperRef}>
        <button
          id={selectId}
          type="button"
          aria-label={rest['aria-label']}
          aria-labelledby={label ? `${selectId}-label ${selectId}` : undefined}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          aria-invalid={Boolean(error)}
          aria-required={required}
          disabled={disabled}
          onClick={() => {
            if (disabled) return
            setOpen((current) => !current)
            if (open) setQuery('')
          }}
          onKeyDown={handleKeyDown}
          className={clsx(
            'relative w-full rounded-lg border bg-surface px-3 py-2.5 pr-10 text-left text-xs shadow-sm outline-none transition sm:text-sm',
            'focus-visible:ring-2 focus-visible:ring-primary/25',
            error
              ? 'border-error bg-error-light/10 focus-visible:border-error-dark'
              : open
              ? 'border-primary ring-2 ring-primary/15'
              : 'border-border hover:border-primary/60',
            'disabled:cursor-not-allowed disabled:bg-divider/40 disabled:text-text-tertiary',
            className
          )}
        >
          <span className={clsx('block truncate', selectedOption ? 'text-text' : 'text-text-tertiary')}>
            {selectedOption?.label ?? 'Select an option'}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-text-tertiary">
            <ChevronUpDownIcon className="h-4 w-4" aria-hidden="true" />
          </span>
        </button>

        {open && (
          <div
            id={menuId}
            role="listbox"
            aria-labelledby={label ? `${selectId}-label` : undefined}
            aria-activedescendant={activeIndex >= 0 ? `${selectId}-option-${activeIndex}` : undefined}
            className="absolute z-[80] mt-2 max-h-72 w-full overflow-hidden rounded-xl border border-border bg-white p-1.5 shadow-xl ring-1 ring-black/5"
            onKeyDown={handleKeyDown}
          >
            {canSearch && (
              <div className="sticky top-0 z-10 mb-1 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={searchPlaceholder}
                  className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-tertiary"
                  autoComplete="off"
                />
              </div>
            )}

            <div className="max-h-60 overflow-y-auto overscroll-contain py-0.5">
              {filteredOptions.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-text-tertiary">{emptyMessage}</p>
              ) : (
                filteredOptions.map((option, index) => {
                  const selected = String(option.value) === selectedValue
                  return (
                    <button
                      id={`${selectId}-option-${index}`}
                      key={`${option.value}-${option.label}`}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      disabled={option.disabled}
                      onMouseEnter={() => !option.disabled && setActiveIndex(index)}
                      onClick={() => selectOption(String(option.value))}
                      className={clsx(
                        'relative w-full cursor-pointer select-none rounded-lg py-2.5 pl-3 pr-9 text-left transition-colors',
                        index === activeIndex ? 'bg-primary/10 text-primary-dark' : 'text-text hover:bg-background',
                        option.disabled && 'cursor-not-allowed opacity-45'
                      )}
                    >
                      <span className={clsx('block truncate text-sm', selected && 'font-semibold')}>
                        {option.label}
                      </span>
                      {option.description && (
                        <span className="mt-0.5 block truncate text-xs text-text-tertiary">
                          {option.description}
                        </span>
                      )}
                      {selected && (
                        <span className="absolute inset-y-0 right-3 flex items-center text-primary">
                          <CheckIcon className="h-4 w-4" aria-hidden="true" />
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {(helperText || error) && (
        <p className={clsx('text-[11px]', error ? 'text-error' : 'text-text-tertiary')}>
          {error ?? helperText}
        </p>
      )}
      {name && <input type="hidden" name={name} value={selectedValue} />}
    </div>
  )
}

export default Select
