import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface NumberInputProps extends Omit<React.ComponentProps<"input">, 'type' | 'onChange' | 'value'> {
  value?: number | string
  onChange?: (value: string) => void
  min?: number
  max?: number
  step?: number
  allowDecimals?: boolean
  allowNegative?: boolean
  currency?: boolean
  placeholder?: string
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({
    value = "",
    onChange,
    min = 0,
    max,
    step = 1,
    allowDecimals = false,
    allowNegative = false,
    currency = false,
    placeholder,
    className,
    ...props
  }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow backspace, delete, tab, escape, enter
      if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
          // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z
          (e.keyCode === 65 && (e.ctrlKey || e.metaKey)) ||
          (e.keyCode === 67 && (e.ctrlKey || e.metaKey)) ||
          (e.keyCode === 86 && (e.ctrlKey || e.metaKey)) ||
          (e.keyCode === 88 && (e.ctrlKey || e.metaKey)) ||
          (e.keyCode === 90 && (e.ctrlKey || e.metaKey)) ||
          // Allow home, end, left, right
          (e.keyCode >= 35 && e.keyCode <= 39)) {
        return
      }

      // Allow decimal point only if decimals are allowed and no decimal exists
      if (allowDecimals && e.key === '.' && !value.toString().includes('.')) {
        return
      }

      // Allow minus only if negative numbers are allowed and it's at the start
      if (allowNegative && e.key === '-' && (e.currentTarget.selectionStart === 0)) {
        return
      }

      // Ensure that it is a number and stop the keypress
      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault()
      }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value

      // Remove any non-numeric characters except decimal point and minus
      if (!allowDecimals) {
        inputValue = inputValue.replace(/[^\d-]/g, '')
      } else {
        inputValue = inputValue.replace(/[^\d.-]/g, '')
      }

      if (!allowNegative) {
        inputValue = inputValue.replace(/-/g, '')
      }

      // Ensure only one decimal point
      if (allowDecimals) {
        const parts = inputValue.split('.')
        if (parts.length > 2) {
          inputValue = parts[0] + '.' + parts.slice(1).join('')
        }
      }

      // Ensure minus is only at the start
      if (allowNegative && inputValue.includes('-')) {
        const minusIndex = inputValue.indexOf('-')
        if (minusIndex > 0) {
          inputValue = inputValue.replace(/-/g, '')
        }
      }

      // Apply min/max constraints
      const numValue = parseFloat(inputValue)
      if (!isNaN(numValue)) {
        if (min !== undefined && numValue < min) {
          inputValue = min.toString()
        }
        if (max !== undefined && numValue > max) {
          inputValue = max.toString()
        }
      }

      onChange?.(inputValue)
    }

    const displayValue = currency && value ? 
      `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : 
      value

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className={cn("text-right", className)}
        {...props}
      />
    )
  }
)

NumberInput.displayName = "NumberInput"