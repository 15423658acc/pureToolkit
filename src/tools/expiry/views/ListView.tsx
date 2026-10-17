/**
 * 列表视图
 * ------------------------------------------------------------
 * 扫读优先，行高 56px，左侧 4px 竖色条 + 图标 + 名称 + 标签/日期 + 状态徽章。
 * 按剩余天数升序（已过期最优先）。
 * 左滑出 [归档/恢复][删除] 按钮（touch + transform，不引库）；
 * 长按或点击行打开编辑。
 */
import { clsx } from 'clsx'
import { Archive, CreditCard, IdCard, Pill, Plus, Tag, Trash2 } from 'lucide-react'
import { useRef, useState, type ReactNode, type TouchEvent } from 'react'
import type { ExpiryItem, ExpiryTag } from '@/core/db'
import { Empty } from '@/components/ui/Empty'
import { useToast } from '@/components/ui/Toast'
import { getDaysLeft, getStatus } from '../db'
import { STATUS_CONFIG, StatusBadge } from '../StatusBadge'

interface ListViewProps {
  items: ExpiryItem[]
  onEdit: (item: ExpiryItem) => void
  onArchive: (id: number) => void
  onUnarchive: (id: number) => void
  onDelete: (id: number) => void
}

const ACTION_W = 144 // 两个按钮宽度

function tagIcon(tag: ExpiryTag) {
  switch (tag) {
    case '证件':
      return IdCard
    case '订阅':
      return CreditCard
    case '药品':
      return Pill
    default:
      return Tag
  }
}

function Row({ item }: { item: ExpiryItem }) {
  const status = getStatus(item.endDate)
  const cfg = STATUS_CONFIG[status]
  const Icon = tagIcon(item.tag)
  return (
    <div className="flex items-center gap-3 px-3 h-14 bg-white">
      <div className={clsx('w-1 h-8 rounded-full', cfg.bar)} />
      <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center', cfg.bg, cfg.text)}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-900 truncate">{item.name}</p>
        <p className="text-xs text-stone-400">{item.tag} · {item.endDate}</p>
      </div>
      <StatusBadge endDate={item.endDate} />
    </div>
  )
}

function SwipeRow({
  primaryLabel,
  onEdit,
  onPrimary,
  onDelete,
  children
}: {
  primaryLabel: string
  onEdit: () => void
  onPrimary: () => void
  onDelete: () => void
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
    const dy = 0 // 仅横向判定，不读取 Y 避免抖动
    if (!moved.current && Math.abs(dx) > 8) {
      moved.current = true
      clearLongPress()
    }
    if (Math.abs(dx) <= Math.abs(dy)) return
    let next = startOffset.current + dx
    next = Math.max(-ACTION_W, Math.min(0, next))
    setOffset(next)
  }

  const onEnd = () => {
    dragging.current = false
    clearLongPress()
    if (!moved.current) {
      // 视为点击：若已展开则收起，否则编辑
      if (open) setOffset(0)
      else if (!edited.current) onEdit()
      return
    }
    setOffset(offset <= -ACTION_W / 2 ? -ACTION_W : 0)
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white"
      style={{ touchAction: 'pan-y' }}
    >
      {/* 操作按钮层（右侧固定） */}
      <div className="absolute inset-y-0 right-0 flex">
        <button
          onClick={onPrimary}
          className={clsx(
            'w-[72px] flex flex-col items-center justify-center text-white text-[11px] gap-1 active:opacity-90',
            primaryLabel === '恢复' ? 'bg-emerald-500' : 'bg-amber-500'
          )}
        >
          <Archive size={16} />
          {primaryLabel}
        </button>
        <button
          onClick={onDelete}
          className="w-[72px] flex flex-col items-center justify-center bg-red-500 text-white text-[11px] gap-1 active:opacity-90"
        >
          <Trash2 size={16} />
          删除
        </button>
      </div>
      {/* 内容层 */}
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

export function ListView({ items, onEdit, onArchive, onUnarchive, onDelete }: ListViewProps) {
  const toast = useToast()
  const sorted = [...items].sort((a, b) => getDaysLeft(a.endDate) - getDaysLeft(b.endDate))

  if (sorted.length === 0) {
    return (
      <Empty
        icon={<Plus size={22} />}
        title="还没有物品"
        hint="点击右下角 + 添加证件、订阅或药品"
      />
    )
  }

  return (
    <div className="space-y-2">
      {sorted.map((item) => {
        const id = item.id
        if (id == null) return null
        const isArchived = item.archived
        return (
          <SwipeRow
            key={id}
            primaryLabel={isArchived ? '恢复' : '归档'}
            onEdit={() => onEdit(item)}
            onPrimary={() => {
              if (isArchived) {
                onUnarchive(id)
                toast('已恢复', 'success')
              } else {
                onArchive(id)
                toast('已归档', 'info')
              }
            }}
            onDelete={() => {
              onDelete(id)
              toast('已删除', 'error')
            }}
          >
            <Row item={item} />
          </SwipeRow>
        )
      })}
    </div>
  )
}
