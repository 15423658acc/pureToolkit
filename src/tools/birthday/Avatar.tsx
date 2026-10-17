/**
 * 圆形头像 - 按关系配色 + 显示姓名首字
 */
import { clsx } from 'clsx'

interface Props {
  name: string
  relation: string
  size?: 'sm' | 'md' | 'lg'
}

const RELATION_STYLE: Record<string, string> = {
  家人: 'bg-red-100 text-red-600',
  朋友: 'bg-blue-100 text-blue-600',
  同事: 'bg-emerald-100 text-emerald-600',
  其他: 'bg-stone-200 text-stone-600'
}

const SIZES = {
  sm: 'w-9 h-9 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg'
}

function pickInitial(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  // 中文取首字，英文取首字母大写
  const first = trimmed[0] ?? '?'
  return /[a-zA-Z]/.test(first) ? first.toUpperCase() : first
}

export function Avatar({ name, relation, size = 'md' }: Props) {
  const cls = RELATION_STYLE[relation] ?? RELATION_STYLE['其他']
  return (
    <div
      className={clsx(
        'rounded-full flex items-center justify-center font-semibold shrink-0 select-none',
        cls,
        SIZES[size]
      )}
    >
      {pickInitial(name)}
    </div>
  )
}
