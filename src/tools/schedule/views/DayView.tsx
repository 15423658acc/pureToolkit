/**
 * 日视图
 * ------------------------------------------------------------
 * - 顶部大字显示当前日期 + 前后日期切换箭头
 * - 当前日期下方的日程列表，按 time 升序排列
 * - 未完成项在上，已完成项自动下沉
 * - 未完成项可拖拽排序（HTML5 drag）
 * - 已完成项不可拖拽
 */
import { clsx } from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type DragEvent, useMemo, useState } from 'react'
import { addDays, format, isToday, subDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Empty } from '@/components/ui/Empty'
import type { ScheduleCompletion, ScheduleItem, ScheduleTagDef } from '@/core/db'
import {
  buildDayDisplayList,
  type DisplayItem
} from '../logic'
import { ScheduleRow } from '../ScheduleRow'

interface DayViewProps {
  date: Date
  onDateChange: (d: Date) => void
  items: ScheduleItem[]
  completions: ScheduleCompletion[]
  customTags: ScheduleTagDef[]
  onToggleDone: (item: DisplayItem) => void
  onSkip: (item: DisplayItem) => void
  onEdit: (item: DisplayItem) => void
  onReorder: (pairs: Array<{ id: number; sort: number }>) => Promise<void>
}

export function DayView({
  date,
  onDateChange,
  items,
  completions,
  customTags,
  onToggleDone,
  onSkip,
  onEdit,
  onReorder
}: DayViewProps) {
  const dateStr = useMemo(() => toISODate(date), [date])
  const list = useMemo(
    () => buildDayDisplayList(items, completions, dateStr),
    [items, completions, dateStr]
  )

  // 拖拽状态
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dropTargetId, setDropTargetId] = useState<number | null>(null)

  const handleDragStart = (item: DisplayItem) => (e: DragEvent<HTMLDivElement>) => {
    if (item.done || item.skipped) {
      e.preventDefault()
      return
    }
    setDraggingId(item.itemId)
    e.dataTransfer.effectAllowed = 'move'
    // 必须 setData，否则部分浏览器不会触发 drag
    try { e.dataTransfer.setData('text/plain', String(item.itemId)) } catch { /* ignore */ }
  }
  const handleDragOver = (item: DisplayItem) => (e: DragEvent<HTMLDivElement>) => {
    if (draggingId == null) return
    if (item.done || item.skipped) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dropTargetId !== item.itemId) setDropTargetId(item.itemId)
  }
  const handleDrop = (item: DisplayItem) => async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (draggingId == null || draggingId === item.itemId) {
      setDraggingId(null)
      setDropTargetId(null)
      return
    }
    // 把 draggingId 移到 item 位置之前：以 item.sort 为基准，
    // 重新分配所有未完成项的 sort。
    const newOrder = reorderSort(list, draggingId, item.itemId)
    setDraggingId(null)
    setDropTargetId(null)
    await onReorder(newOrder)
  }
  const handleDragEnd = () => {
    setDraggingId(null)
    setDropTargetId(null)
  }

  const isCurrentToday = isToday(date)

  return (
    <div>
      {/* 日期切换条 */}
      <div className="flex items-center justify-between mb-4">
        <button
          aria-label="前一天"
          onClick={() => onDateChange(subDays(date, 1))}
          className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-stone-600 hover:bg-stone-100"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <div className={clsx(
            'text-2xl font-bold tracking-tight',
            isCurrentToday ? 'text-purple-500' : 'text-stone-900'
          )}>
            {format(date, 'M 月 d 日 EEEE', { locale: zhCN })}
          </div>
          <div className="text-xs text-stone-400 mt-0.5">
            {isCurrentToday ? '今天' : format(date, 'yyyy 年 M 月', { locale: zhCN })}
          </div>
        </div>
        <button
          aria-label="后一天"
          onClick={() => onDateChange(addDays(date, 1))}
          className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-stone-600 hover:bg-stone-100"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* "今天" 快速跳转 */}
      {!isCurrentToday && (
        <div className="flex justify-center mb-3">
          <button
            onClick={() => onDateChange(new Date())}
            className="text-xs text-purple-500 hover:underline"
          >
            ‹ 回到今天
          </button>
        </div>
      )}

      {/* 日程列表 */}
      {list.length === 0 ? (
        <Empty
          icon={<span className="text-2xl">🌱</span>}
          title="今天还没有日程"
          hint="点击右下角 + 添加一条吧"
        />
      ) : (
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden divide-y divide-stone-100">
          {list.map((item) => (
            <ScheduleRow
              key={item.key}
              item={item}
              customTags={customTags}
              onToggleDone={() => onToggleDone(item)}
              onSkip={() => onSkip(item)}
              onEdit={() => onEdit(item)}
              draggable={!item.done && !item.skipped}
              onDragStart={handleDragStart(item)}
              onDragOver={handleDragOver(item)}
              onDrop={(e) => void handleDrop(item)(e)}
              onDragEnd={handleDragEnd}
              isDragging={draggingId === item.itemId}
              isDropTarget={dropTargetId === item.itemId}
            />
          ))}
        </div>
      )}

      {/* 完成情况统计 */}
      {list.length > 0 && (
        <div className="mt-3 flex items-center justify-between px-2 text-xs text-stone-400">
          <span>共 {list.length} 条</span>
          <span>
            已完成 {list.filter((x) => x.done || x.skipped).length} / {list.length}
          </span>
        </div>
      )}
    </div>
  )
}

/** 把 draggingId 移动到 targetId 之前的位置，返回需要更新的 sort 列表 */
function reorderSort(
  list: DisplayItem[],
  draggingId: number,
  targetId: number
): Array<{ id: number; sort: number }> {
  // 只考虑未完成项的顺序
  const active = list.filter((x) => !x.done && !x.skipped)
  const ids = active.map((x) => x.itemId)
  const fromIdx = ids.indexOf(draggingId)
  const toIdx = ids.indexOf(targetId)
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return []

  // 移动 from 到 to 之前
  const newIds = [...ids]
  const [moved] = newIds.splice(fromIdx, 1)
  newIds.splice(toIdx, 0, moved)

  // 重新分配 sort（仅未完成项）
  const STEP = 10
  const pairs = newIds.map((id, i) => ({ id, sort: (i + 1) * STEP }))
  return pairs
}

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
