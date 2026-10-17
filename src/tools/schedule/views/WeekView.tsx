/**
 * 周视图
 * ------------------------------------------------------------
 * - 显示当前周的 7 天（周一到周日）
 * - 每个日卡显示日期 + 当天待办数 + 前 3 条待办 chip
 * - 点日期卡片进入日视图
 */
import { clsx } from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  isToday,
  startOfWeek,
  subDays
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { ScheduleCompletion, ScheduleItem, ScheduleTagDef } from '@/core/db'
import {
  buildDayDisplayList,
  top3ActiveChips
} from '../logic'
import { findTagColor } from '../tags'

interface WeekViewProps {
  /** 周内任一日期，仅用于锚定周 */
  date: Date
  onDateChange: (d: Date) => void
  /** 点击日卡片，进入该天的日视图 */
  onPickDay: (d: Date) => void
  items: ScheduleItem[]
  completions: ScheduleCompletion[]
  customTags: ScheduleTagDef[]
}

export function WeekView({
  date,
  onDateChange,
  onPickDay,
  items,
  completions,
  customTags
}: WeekViewProps) {
  const weekDays = useMemo(() => {
    const start = startOfWeek(date, { weekStartsOn: 1 })
    const end = endOfWeek(date, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [date])

  const weekRangeLabel = useMemo(() => {
    const start = startOfWeek(date, { weekStartsOn: 1 })
    const end = endOfWeek(date, { weekStartsOn: 1 })
    if (start.getMonth() === end.getMonth()) {
      return `${format(start, 'M 月 d 日', { locale: zhCN })} - ${format(end, 'd 日', { locale: zhCN })}`
    }
    return `${format(start, 'M 月 d 日', { locale: zhCN })} - ${format(end, 'M 月 d 日', { locale: zhCN })}`
  }, [date])

  return (
    <div>
      {/* 周切换条 */}
      <div className="flex items-center justify-between mb-4">
        <button
          aria-label="上一周"
          onClick={() => onDateChange(subDays(date, 7))}
          className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-stone-600 hover:bg-stone-100"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <div className="text-xl font-bold tracking-tight text-stone-900">
            {weekRangeLabel}
          </div>
          <div className="text-xs text-stone-400 mt-0.5">
            {format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy 年 M 月', { locale: zhCN })}
          </div>
        </div>
        <button
          aria-label="下一周"
          onClick={() => onDateChange(addDays(date, 7))}
          className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-stone-600 hover:bg-stone-100"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {!isToday(date) && !weekDays.some((d) => isToday(d)) && (
        <div className="flex justify-center mb-3">
          <button
            onClick={() => onDateChange(new Date())}
            className="text-xs text-purple-500 hover:underline"
          >
            ‹ 回到本周
          </button>
        </div>
      )}

      {/* 7 天卡片 */}
      <div className="grid grid-cols-1 gap-2">
        {weekDays.map((d) => {
          const dateStr = toISODate(d)
          const list = buildDayDisplayList(items, completions, dateStr)
          const chips = top3ActiveChips(items, completions, dateStr)
          const total = list.length
          const done = list.filter((x) => x.done || x.skipped).length
          const active = total - done
          const today = isToday(d)

          return (
            <button
              key={dateStr}
              onClick={() => onPickDay(d)}
              className={clsx(
                'w-full text-left p-3 rounded-2xl border transition',
                'flex items-center gap-3',
                today
                  ? 'border-purple-300 bg-purple-50 shadow-sm'
                  : 'border-stone-100 bg-white hover:bg-stone-50'
              )}
            >
              {/* 左侧日期 */}
              <div className={clsx(
                'w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0',
                today ? 'bg-purple-500 text-white' : 'bg-stone-100 text-stone-700'
              )}>
                <span className="text-[10px] leading-none opacity-80">
                  {format(d, 'EEEEEE', { locale: zhCN })}
                </span>
                <span className="text-lg font-bold leading-none mt-0.5">
                  {d.getDate()}
                </span>
              </div>

              {/* 中间 chip */}
              <div className="flex-1 min-w-0">
                {total === 0 ? (
                  <p className="text-xs text-stone-400">暂无日程</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {chips.length === 0 ? (
                      <p className="text-xs text-stone-400">
                        {active === 0 ? '全部完成' : '无未完成项'}
                      </p>
                    ) : (
                      chips.map((c, idx) => {
                        const color = findTagColor(c.tag, customTags)
                        return (
                          <div
                            key={`${c.title}-${idx}`}
                            className="inline-flex items-center gap-1.5 min-w-0"
                          >
                            <span className={clsx(
                              'inline-flex items-center h-5 px-1.5 rounded-md text-[10px] font-medium shrink-0',
                              color.bgSoft, color.text
                            )}>
                              {c.tag}
                            </span>
                            {c.time && (
                              <span className="text-[11px] text-stone-500 shrink-0 tabular-nums">
                                {c.time}
                              </span>
                            )}
                            <span className="text-xs text-stone-700 truncate">
                              {c.title}
                            </span>
                          </div>
                        )
                      })
                    )}
                    {total > 3 && (
                      <span className="text-[10px] text-stone-400">
                        +{total - 3} 条更多
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 右侧统计 */}
              <div className="shrink-0 text-right">
                <div className={clsx(
                  'text-sm font-bold tabular-nums',
                  active > 0 ? 'text-stone-900' : 'text-stone-400'
                )}>
                  {active}
                </div>
                <div className="text-[10px] text-stone-400">/ {total}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
