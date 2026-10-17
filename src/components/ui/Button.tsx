import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-stone-900 text-white hover:bg-stone-800 active:bg-stone-950',
  secondary: 'bg-white border border-stone-200 text-stone-800 hover:bg-stone-50',
  ghost: 'text-stone-700 hover:bg-stone-100',
  danger: 'bg-red-500 text-white hover:bg-red-600',
  soft: 'bg-stone-100 text-stone-800 hover:bg-stone-200'
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm rounded-lg gap-1',
  md: 'h-10 px-4 text-sm rounded-xl gap-1.5',
  lg: 'h-12 px-6 text-base rounded-xl gap-2',
  icon: 'h-10 w-10 rounded-xl'
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...rest
}: Props) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-medium transition-colors',
        'disabled:opacity-50 disabled:pointer-events-none no-select',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
