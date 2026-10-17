/**
 * 转盘 - 顶部模板切换 chip 行
 * ------------------------------------------------------------
 * 横向滚动，当前激活 chip 用 amber-500 实心填充。
 */
import { clsx } from 'clsx'
import type { WheelTemplate } from '@/core/db'

interface TemplateChipsProps {
  templates: WheelTemplate[]
  activeId: number | null
  onSelect: (t: WheelTemplate) => void
  /** 转动中禁用切换 */
  disabled?: boolean
}

export function TemplateChips({ templates, activeId, onSelect, disabled }: TemplateChipsProps) {
  if (templates.length === 0) return null
  return (
    <div
      className="-mx-4 px-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="选择模板"
    >
      <div className="flex gap-2 pb-1">
        {templates.map((t) => {
          const isActive = t.id === activeId
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t)}
              disabled={disabled}
              className={clsx(
                'shrink-0 h-8 px-3.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
                'disabled:opacity-50 disabled:pointer-events-none',
                isActive
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-amber-50 hover:border-amber-200'
              )}
            >
              {t.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
