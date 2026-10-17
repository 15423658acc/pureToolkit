/**
 * 转盘 - 历史记录展示
 * ------------------------------------------------------------
 * 横向 chip 列表，最近 20 条。默认折叠为 10 条，点开看全部。
 */
import { useState } from 'react'
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import type { WheelHistory } from '@/core/db'
import { Empty } from '@/components/ui/Empty'

interface HistoryListProps {
  history: WheelHistory[]
}

export function HistoryList({ history }: HistoryListProps) {
  const [expanded, setExpanded] = useState(false)

  if (history.length === 0) {
    return (
      <Empty
        icon={<RotateCcw size={22} />}
        title="还没有旋转记录"
        hint="转一下就有了"
      />
    )
  }

  const visible = expanded ? history : history.slice(0, 10)
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-stone-700">
          历史记录 <span className="text-stone-400 font-normal">最近 {history.length} 条</span>
        </h3>
        {history.length > 10 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-stone-500 hover:text-stone-900 inline-flex items-center gap-1"
          >
            {expanded ? '收起' : '展开全部'}
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((h, i) => (
          <div
            key={h.id ?? `h-${i}`}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-amber-50 border border-amber-100 text-xs"
          >
            <span className="font-semibold text-stone-800">{h.result}</span>
            <span className="text-amber-600/70">{h.templateName}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
