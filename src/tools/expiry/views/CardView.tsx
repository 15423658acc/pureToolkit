/**
 * 卡片视图
 * ------------------------------------------------------------
 * 网格 2 列，大字号"剩余天数"，背景按状态浅色；
 * 已过期卡片右上角"已过期"角标。
 */
import { clsx } from 'clsx'
import { CreditCard, IdCard, Pill, Plus, Tag } from 'lucide-react'
import type { ExpiryItem, ExpiryTag } from '@/core/db'
import { Empty } from '@/components/ui/Empty'
import { getDaysLeft, getStatus } from '../db'
import { STATUS_CONFIG } from '../StatusBadge'

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

interface CardViewProps {
  items: ExpiryItem[]
  onEdit: (item: ExpiryItem) => void
}

export function CardView({ items, onEdit }: CardViewProps) {
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
    <div className="grid grid-cols-2 gap-3">
      {sorted.map((item) => {
        const status = getStatus(item.endDate)
        const cfg = STATUS_CONFIG[status]
        const days = getDaysLeft(item.endDate)
        const Icon = tagIcon(item.tag)
        return (
          <button
            key={item.id}
            onClick={() => onEdit(item)}
            className={clsx(
              'relative rounded-2xl p-4 text-left border border-stone-200 flex flex-col',
              'shadow-[0_1px_2px_rgba(28,25,23,0.04),0_4px_12px_rgba(28,25,23,0.04)]',
              'active:scale-[0.98] transition no-select',
              cfg.bg
            )}
          >
            {status === 'expired' && (
              <span className="absolute top-2 right-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                已过期
              </span>
            )}
            <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center bg-white/70', cfg.text)}>
              <Icon size={16} />
            </div>
            <p className={clsx('text-3xl font-bold mt-3 leading-none', cfg.text)}>
              {days < 0 ? -days : days}
              <span className="text-sm font-medium ml-1">
                {days < 0 ? '天过期' : days === 0 ? '今天' : '天'}
              </span>
            </p>
            <p className="text-sm font-medium text-stone-900 truncate mt-1.5">{item.name}</p>
            <p className="text-xs text-stone-500 mt-0.5">{item.tag} · {item.endDate}</p>
          </button>
        )
      })}
    </div>
  )
}
