import { Combobox, Transition } from '@headlessui/react'
import { ChangeEvent, FocusEventHandler, Fragment, SelectHTMLAttributes, useMemo, useState } from 'react'
import { CheckIcon, ChevronUpDownIcon, MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import clsx from 'clsx'

export interface SelectOption {
  label: string
  value: string | number
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string
  error?: string
  helperText?: string
  options: SelectOption[]
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void
  allowCustomValue?: boolean
  customValueLabel?: (value: string) => string
}

export const Select = ({
  label,
  error,
  helperText,
  options,
  className,
  id,
  name,
  value,
  defaultValue,
  disabled,
  required,
  onChange,
  onBlur,
  allowCustomValue = false,
  customValueLabel = (customValue) => `Use “${customValue}”`,
  ...rest
}: SelectProps) => {
  const selectId = id ?? name
  const [query, setQuery] = useState('')
  const [internalValue, setInternalValue] = useState(defaultValue ?? '')
  const isControlled = value !== undefined
  const currentValue = isControlled ? value : internalValue
  const selected = options.find((option) => String(option.value) === String(currentValue))
    ?? (allowCustomValue && String(currentValue).trim()
      ? { label: String(currentValue), value: String(currentValue) }
      : null)
  const filteredOptions = useMemo(() => {
    const search = query.trim().toLocaleLowerCase()
    if (!search) return options
    return options.filter((option) => option.label.toLocaleLowerCase().includes(search))
  }, [options, query])
  const trimmedQuery = query.trim()
  const hasExactQueryMatch = options.some((option) =>
    option.label.toLocaleLowerCase() === trimmedQuery.toLocaleLowerCase()
  )

  const emitChange = (option: SelectOption | null) => {
    if (!isControlled) setInternalValue(option?.value ?? '')
    if (!onChange) return
    const target = { value: option?.value ?? '', name } as unknown as HTMLSelectElement
    onChange({ target, currentTarget: target } as ChangeEvent<HTMLSelectElement>)
  }

  return (
    <div className="space-y-1.5 text-xs sm:text-sm">
      {label && (
        <label
          htmlFor={selectId}
          className={clsx('block font-medium', error ? 'text-error' : 'text-text-secondary')}
        >
          {label}
        </label>
      )}
      <Combobox value={selected} onChange={emitChange} disabled={disabled} nullable>
        <div className="relative">
          <div
            className={clsx(
              'relative w-full overflow-hidden rounded-md border bg-surface text-left shadow-sm transition',
              error
                ? 'border-error bg-error-light/10 focus-within:border-error-dark focus-within:ring-1 focus-within:ring-error-dark'
                : 'border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary',
              disabled && 'cursor-not-allowed bg-divider/40 opacity-70',
              className
            )}
          >
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <Combobox.Input
              id={selectId}
              className="w-full border-none bg-transparent py-2 pl-9 pr-10 text-xs text-text outline-none sm:text-sm"
              displayValue={(option: SelectOption | null) => option?.label ?? ''}
              onChange={(event) => {
                const nextQuery = event.target.value
                setQuery(nextQuery)
                if (allowCustomValue) {
                  emitChange(nextQuery.trim() ? { label: nextQuery, value: nextQuery } : null)
                }
              }}
              onFocus={(event) => event.currentTarget.select()}
              onBlur={onBlur as FocusEventHandler<HTMLInputElement> | undefined}
              placeholder="Search and select…"
              autoComplete="off"
              required={required}
              disabled={disabled}
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center px-3 text-text-tertiary">
              <ChevronUpDownIcon className="h-4 w-4" aria-hidden="true" />
            </Combobox.Button>
          </div>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <Combobox.Options className="absolute z-[150] mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-white py-1 shadow-xl focus:outline-none">
              {allowCustomValue && trimmedQuery && !hasExactQueryMatch && (
                <Combobox.Option
                  value={{ label: trimmedQuery, value: trimmedQuery }}
                  className={({ active }) => clsx(
                    'relative cursor-pointer select-none border-b border-border px-3 py-2 text-sm font-medium',
                    active ? 'bg-primary/10 text-primary' : 'text-primary'
                  )}
                >
                  {customValueLabel(trimmedQuery)}
                </Combobox.Option>
              )}
              {filteredOptions.length === 0 && !(allowCustomValue && trimmedQuery) ? (
                <div className="px-3 py-2 text-sm text-text-secondary">No matching options</div>
              ) : (
                filteredOptions.map((option) => (
                  <Combobox.Option
                    key={`${option.value}-${option.label}`}
                    value={option}
                    className={({ active }) => clsx(
                      'relative cursor-pointer select-none py-2 pl-9 pr-3 text-sm',
                      active ? 'bg-primary/10 text-primary' : 'text-text'
                    )}
                  >
                    {({ selected: isSelected }) => (
                      <>
                        <span className={clsx('block truncate', isSelected && 'font-semibold')}>{option.label}</span>
                        {isSelected && <CheckIcon className="absolute left-3 top-2.5 h-4 w-4 text-primary" />}
                      </>
                    )}
                  </Combobox.Option>
                ))
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
      <select
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        name={name}
        value={String(currentValue)}
        onChange={() => undefined}
        disabled={disabled}
        {...rest}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {(helperText || error) && (
        <p className={clsx('text-[11px]', error ? 'text-error' : 'text-text-tertiary')}>
          {error ?? helperText}
        </p>
      )}
    </div>
  )
}

export default Select
