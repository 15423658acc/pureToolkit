import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
type Size = 'sm' | 'md' | 'lg' | 'icon'

/** primary 按钮的色调，让每个工具用自己的主题色，而不是统一黑色 */
type Tone =
  | 'neutral'
  | 'amber'
  | 'red'
  | 'blue'
  | 'purple'
  | 'emerald'
  | 'rose'
  | 'slate'
  | 'peach'

const PRIMARY_TONES: Record<Tone, string> = {
  neutral: 'bg-stone-900 text-white hover:bg-stone-800 active:bg-stone-950',
  amber: 'bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700',
  red: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700',
  blue: 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700',
  purple: 'bg-purple-500 text-white hover:bg-purple-600 active:bg-purple-700',
  emerald: 'bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700',
  rose: 'bg-rose-500 text-white hover:bg-rose-600 active:bg-rose-700',
  slate: 'bg-slate-600 text-white hover:bg-slate-700 active:bg-slate-800',
  peach: 'bg-[#ffad99] text-stone-900 hover:bg-[#ff9a83] active:bg-[#f4867a]'
}

const VARIANTS: Record<Exclude<Variant, 'primary'>, string> = {
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
  /** primary 的色调，默认 neutral（黑）；其他 variant 忽略此值 */
  tone?: Tone
  children?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  tone = 'neutral',
  className,
  children,
  ...rest
}: Props) {
  const variantClass =
    variant === 'primary' ? PRIMARY_TONES[tone] : VARIANTS[variant]
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-medium transition-colors',
        'disabled:opacity-50 disabled:pointer-events-none no-select',
        variantClass,
        SIZES[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
