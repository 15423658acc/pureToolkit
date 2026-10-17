/**
 * 顶部提醒横幅
 * ------------------------------------------------------------
 * 扫描所有生日，找出"距离下次生日 ≤ remindAdvance 且 ≤ 7 天"的项，
 * 橙色背景 + 蛋糕 emoji + "🎂 妈妈 农历八月十五 还有 3 天"。
 * 多条分行展示，可点击跳转到该生日（高亮）。
 */
import type { Birthday } from '@/core/db'
import { formatBirthdayLabel, getDaysUntilNext } from './lunar'

interface Props {
  items: Birthday[]
  onSelect: (id: number) => void
}

export function ReminderBanner({ items, onSelect }: Props) {
  const today = new Date()
  const reminding = items
    .map((b) => ({ b, days: getDaysUntilNext(b, today) }))
    .filter(({ b, days }) => days >= 0 && days <= b.remindAdvance && days <= 7)

  if (reminding.length === 0) return null

  return (
    <div className="space-y-2 mb-3">
      {reminding.map(({ b, days }) => (
        <button
          key={b.id}
          onClick={() => b.id != null && onSelect(b.id)}
          className="w-full flex items-center gap-2.5 text-left bg-orange-50 hover:bg-orange-100 active:scale-[0.99] transition rounded-2xl px-4 py-3 no-select border border-orange-200"
        >
          <span className="text-base leading-none">🎂</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-orange-700 truncate">
              {b.name} · {formatBirthdayLabel(b)}
            </p>
            <p className="text-xs text-orange-600 mt-0.5">
              {days === 0 ? '今天生日' : `还有 ${days} 天`}
            </p>
          </div>
          <span className="text-xs text-orange-500 shrink-0">查看 →</span>
        </button>
      ))}
    </div>
  )
}
