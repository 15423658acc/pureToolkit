import { clsx } from 'clsx'
import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={clsx(
        'h-11 w-full px-3.5 text-sm rounded-xl border border-stone-200',
        'bg-white text-stone-900 placeholder:text-stone-400',
        'focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400',
        'transition',
        className
      )}
      {...rest}
    />
  )
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => (
    <textarea
      ref={ref}
      className={clsx(
        'w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200',
        'bg-white text-stone-900 placeholder:text-stone-400',
        'focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400',
        'transition resize-none',
        className
      )}
      {...rest}
    />
  )
)
Textarea.displayName = 'Textarea'

interface FieldProps {
  label?: string
  hint?: string
  children: React.ReactNode
  className?: string
}

export function Field({ label, hint, children, className }: FieldProps) {
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-xs font-medium text-stone-500 px-0.5">{label}</label>
      )}
      {children}
      {hint && <p className="text-xs text-stone-400 px-0.5">{hint}</p>}
    </div>
  )
}
