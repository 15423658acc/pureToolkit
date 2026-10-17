/**
 * 单条生日卡片（含右滑编辑/删除）
 * ------------------------------------------------------------
 * 移动端单列 / 桌面 2 列网格，参考 expiry/ListView 的 SwipeRow 实现：
 * touch + transform，不引入第三方滑动库。长按或点击行打开编辑。
 */
import { clsx } from 'clsx'
import { Cake, Pencil, Trash2 } from 'lucide-react'
import { useRef, useState, type ReactNode, type TouchEvent } from 'react'
import type { Birthday } from '@/core/db'
import { Avatar } from './Avatar'
import { formatBirthdayLabel, getDaysUntilNext } from './lunar'

interface Props {
  birthday: Birthday
  highlight?: boolean
  onEdit: (b: Birthday) => void
  onDelete: (id: number) => void
}

const ACTION_W = 144

function getCountdownClass(days: number): string {
  if (days >= 30) return 'text-stone-700'
  if (days >= 7) return 'text-orange-600'
  if (days >= 0) return 'text-red-500 font-bold'
  return 'text-stone-500'
}

function getCountdownText(days: number): string {
  if (days === 0) return '今天'
  if (days > 0) return `还有 ${days} 天`
  return `已过 ${-days} 天`
}

function SwipeShell({
  onEdit,
  onDelete,
  highlight,
  children
}: {
  onEdit: () => void
  onDelete: () => void
  highlight?: boolean
  children: ReactNode
}) {
  const [offset, setOffset] = useState(0)
  const startX = useRef(0)
  const startOffset = useRef(0)
  const dragging = useRef(false)
  const moved = useRef(false)
  const longPress = useRef<number | null>(null)
  const edited = useRef(false)

  const open = offset <= -ACTION_W / 2

  const clearLongPress = () => {
    if (longPress.current !== null) {
      clearTimeout(longPress.current)
      longPress.current = null
    }
  }

  const onStart = (e: TouchEvent) => {
    const t = e.touches[0]
    if (!t) return
    startX.current = t.clientX
    startOffset.current = offset
    dragging.current = true
    moved.current = false
    edited.current = false
    longPress.current = window.setTimeout(() => {
      if (!moved.current) {
        edited.current = true
        onEdit()
      }
    }, 500)
  }

  const onMove = (e: TouchEvent) => {
    if (!dragging.current) return
    const t = e.touches[0]
    if (!t) return
    const dx = t.clientX - startX.current
    if (!moved.current && Math.abs(dx) > 8) {
      moved.current = true
      clearLongPress()
    }
    if (Math.abs(dx) <= 0) return
    let next = startOffset.current + dx
    next = Math.max(-ACTION_W, Math.min(0, next))
    setOffset(next)
  }

  const onEnd = () => {
    dragging.current = false
    clearLongPress()
    if (!moved.current) {
      if (open) setOffset(0)
      else if (!edited.current) onEdit()
      return
    }
    setOffset(offset <= -ACTION_W / 2 ? -ACTION_W : 0)
  }

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-2xl border bg-white transition',
        highlight ? 'border-orange-400 ring-2 ring-orange-200' : 'border-stone-200'
      )}
      style={{ touchAction: 'pan-y' }}
    >
      <div className="absolute inset-y-0 right-0 flex">
        <button
          onClick={onEdit}
          className="w-[72px] flex flex-col items-center justify-center bg-orange-500 text-white text-[11px] gap-1 active:opacity-90"
        >
          <Pencil size={16} />
          编辑
        </button>
        <button
          onClick={onDelete}
          className="w-[72px] flex flex-col items-center justify-center bg-red-500 text-white text-[11px] gap-1 active:opacity-90"
        >
          <Trash2 size={16} />
          删除
        </button>
      </div>
      <div
        className="relative bg-white"
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging.current ? 'none' : 'transform 0.2s ease'
        }}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
      >
        {children}
      </div>
    </div>
  )
}

function CardInner({ birthday }: { birthday: Birthday }) {
  const days = getDaysUntilNext(birthday)
  const relation = birthday.relation || '其他'
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <Avatar name={birthday.name} relation={relation} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-stone-900 truncate">
            {birthday.name}
          </p>
          <span className={clsx('text-lg leading-none shrink-0', getCountdownClass(days))}>
            {getCountdownText(days)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-stone-500">
          <span className="truncate">{formatBirthdayLabel(birthday)}</span>
          <span className="text-stone-300">·</span>
          <span className="shrink-0">{relation}</span>
        </div>
        <div className="flex items-center justify-between mt-1.5 gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md shrink-0">
            <Cake size={11} /> 提前 {birthday.remindAdvance} 天
          </span>
          {birthday.notes && (
            <span className="text-[11px] text-stone-400 truncate text-right">
              备注：{birthday.notes}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function BirthdayCard({ birthday, highlight, onEdit, onDelete }: Props) {
  const id = birthday.id
  if (id == null) return null
  return (
    <SwipeShell
      highlight={highlight}
      onEdit={() => onEdit(birthday)}
      onDelete={() => onDelete(id)}
    >
      <CardInner birthday={birthday} />
    </SwipeShell>
  )
}
