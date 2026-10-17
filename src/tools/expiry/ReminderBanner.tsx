/**
 * 顶部提醒横幅
 * ------------------------------------------------------------
 * 扫描所有未归档物品，按状态分别堆叠红/橙/黄横幅；
 * 横幅可点击，跳转到对应过滤后的列表（由父组件 setFilter + setView 实现）。
 */
import { clsx } from 'clsx'
import type { ExpiryItem } from '@/core/db'
import { getStatus, type ExpiryStatus } from './db'

interface Props {
  items: ExpiryItem[]
  onFilter: (status: ExpiryStatus) => void
}

interface BannerSpec {
  status: ExpiryStatus
  count: number
  color: string
  emoji: string
  text: string
}

export function ReminderBanner({ items, onFilter }: Props) {
  const counts: Record<ExpiryStatus, number> = { expired: 0, soon: 0, near: 0, far: 0 }
  for (const i of items) counts[getStatus(i.endDate)]++

  const banners = (
    [
      { status: 'expired', count: counts.expired, color: 'bg-red-500', emoji: '🔴', text: '已过期' },
      { status: 'soon', count: counts.soon, color: 'bg-orange-500', emoji: '⚠️', text: '7 天内到期' },
      { status: 'near', count: counts.near, color: 'bg-amber-400', emoji: '📋', text: '30 天内到期' }
    ] as BannerSpec[]
  ).filter((b) => b.count > 0)

  if (banners.length === 0) return null

  return (
    <div className="space-y-2 mb-3">
      {banners.map((b) => (
        <button
          key={b.status}
          onClick={() => onFilter(b.status)}
          className={clsx(
            'w-full flex items-center gap-2.5 text-white rounded-2xl px-4 py-3 shadow-md',
            'active:scale-[0.99] transition no-select',
            b.color
          )}
        >
          <span className="text-base leading-none">{b.emoji}</span>
          <span className="text-sm font-medium">你有 {b.count} 项{b.text}</span>
          <span className="ml-auto text-xs opacity-90">查看 →</span>
        </button>
      ))}
    </div>
  )
}
