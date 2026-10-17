/**
 * 日历视图
 * ------------------------------------------------------------
 * 月历（date-fns + 自写网格，不引日历库），周一为首日。
 * 有到期的日期下方画彩色圆点（按状态色）；
 * 点圆点展开当日到期物品的小卡片列表。
 */
import { clsx } from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths
} from 'date-fns'
import type { ExpiryItem } from '@/core/db'
import { getStatus } from '../db'
import { STATUS_CONFIG, StatusBadge } from '../StatusBadge'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

interface CalendarViewProps {
  items: ExpiryItem[]
  onEdit: (item: ExpiryItem) => void
}

export function CalendarView({ items, onEdit }: CalendarViewProps) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const byDate = useMemo(() => {
    const m = new Map<string, ExpiryItem[]>()
    for (const it of items) {
      const list = m.get(it.endDate)
      if (list) list.push(it)
      else m.set(it.endDate, [it])
    }
    return m
  }, [items])

  const days = useMemo(() => {
    const start = startOfWeek(cursor, { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [cursor])

  const today = new Date()
  const selectedKey = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : ''
  const selectedItems = selectedKey ? byDate.get(selectedKey) ?? [] : []

  return (
    <div>
      {/* 月份切换 */}
      <div className="flex items-center justify-between mb-3">
        <button
          aria-label="上个月"
          onClick={() => setCursor((c) => subMonths(c, 1))}
          className="w-8 h-8 rounded-lg hover:bg-stone-100 inline-flex items-center justify-center text-stone-600"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-semibold text-stone-900">{format(cursor, 'yyyy 年 M 月')}</p>
        <button
          aria-label="下个月"
          onClick={() => setCursor((c) => addMonths(c, 1))}
          className="w-8 h-8 rounded-lg hover:bg-stone-100 inline-flex items-center justify-center text-stone-600"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 周几表头 */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-xs text-stone-400 py-1">{w}</div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-px bg-stone-100 rounded-xl overflow-hidden border border-stone-100">
        {days.map((d) => {
          const inMonth = isSameMonth(d, cursor)
          const key = format(d, 'yyyy-MM-dd')
          const dayItems = byDate.get(key) ?? []
          const isToday = isSameDay(d, today)
          const isSel = selectedDay ? isSameDay(d, selectedDay) : false
          return (
            <button
              key={key}
              onClick={() => setSelectedDay(dayItems.length > 0 ? d : null)}
              className={clsx(
                'min-h-14 flex flex-col items-center justify-start pt-1.5 gap-1 text-xs relative',
                inMonth ? 'bg-white' : 'bg-stone-50',
                isSel && 'ring-2 ring-red-400 ring-inset',
                dayItems.length === 0 && 'cursor-default'
              )}
            >
              <span
                className={clsx(
                  'inline-flex items-center justify-center text-xs h-5 w-5 rounded-full',
                  inMonth ? 'text-stone-700' : 'text-stone-300',
                  isToday && 'bg-red-500 text-white font-semibold'
                )}
              >
                {format(d, 'd')}
              </span>
              {dayItems.length > 0 && (
                <div className="flex flex-wrap gap-0.5 justify-center px-0.5">
                  {dayItems.slice(0, 4).map((it, idx) => (
                    <span
                      key={idx}
                      className={clsx('w-1.5 h-1.5 rounded-full', STATUS_CONFIG[getStatus(it.endDate)].dot)}
                    />
                  ))}
                  {dayItems.length > 4 && (
                    <span className="text-[9px] text-stone-400 leading-none">+{dayItems.length - 4}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* 当日到期物品 */}
      {selectedDay && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-stone-500 px-1">
            {format(selectedDay, 'M 月 d 日')} · {selectedItems.length} 项到期
          </p>
          {selectedItems.map((it) => (
            <button
              key={it.id}
              onClick={() => onEdit(it)}
              className="w-full flex items-center gap-3 bg-white border border-stone-200 rounded-2xl px-3 h-14 text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">{it.name}</p>
                <p className="text-xs text-stone-400">{it.tag}</p>
              </div>
              <StatusBadge endDate={it.endDate} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
