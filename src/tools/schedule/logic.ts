/**
 * 日程安排：日视图数据组装逻辑
 * ------------------------------------------------------------
 * 把 scheduleItems + scheduleCompletions + 当天日期
 * 组装成日视图可直接渲染的 DisplayItem 列表。
 *
 * 关键点：
 * - once 项只在它自己的 date 当天显示；done 字段控制是否完成
 * - 重复项（daily/weekly/monthly）在符合规则的当天作为"虚拟实例"显示
 *   （不写入 DB），完成情况由 scheduleCompletions 表决定
 * - 已完成（once.done / repeat 完成）和已跳过项都自动下沉到列表底部
 */
import type { ScheduleCompletion, ScheduleItem } from '@/core/db'

export interface DisplayItem {
  /** 唯一 key，用于 React 渲染 */
  key: string
  /** 对应的 scheduleItems.id */
  itemId: number
  title: string
  tag: string
  time?: string
  /** 当天日期 yyyy-mm-dd */
  date: string
  repeat: ScheduleItem['repeat']
  /** 该实例是否已完成 */
  done: boolean
  /** 该实例是否被跳过 */
  skipped: boolean
  /** 完成时间戳 */
  completedAt?: number
  /** 跳过时间戳 */
  skippedAt?: number
  /** 原始 sort（用于拖拽） */
  sort: number
  /** 是否为重复项的虚拟实例 */
  isVirtual: boolean
}

/** 判断一条重复日程在指定日期是否应该出现 */
export function repeatItemShowsOnDate(item: ScheduleItem, dateStr: string): boolean {
  if (item.repeat === 'once') return item.date === dateStr
  if (item.repeat === 'daily') return true
  // 周重复：按 schedule.date 的星期几匹配
  if (item.repeat === 'weekly') {
    const origin = new Date(item.date + 'T00:00:00')
    const target = new Date(dateStr + 'T00:00:00')
    if (isNaN(origin.getTime()) || isNaN(target.getTime())) return false
    return origin.getDay() === target.getDay()
  }
  // 月重复：按 schedule.date 的日匹配
  if (item.repeat === 'monthly') {
    const origin = new Date(item.date + 'T00:00:00')
    const target = new Date(dateStr + 'T00:00:00')
    if (isNaN(origin.getTime()) || isNaN(target.getTime())) return false
    return origin.getDate() === target.getDate()
  }
  return false
}

/**
 * 组装日视图的展示列表
 * @param items 所有 scheduleItems（包含 once + 重复）
 * @param completions 当天的完成情况
 * @param dateStr 当天日期 yyyy-mm-dd
 */
export function buildDayDisplayList(
  items: ScheduleItem[],
  completions: ScheduleCompletion[],
  dateStr: string
): DisplayItem[] {
  const compMap = new Map<number, ScheduleCompletion>()
  for (const c of completions) compMap.set(c.scheduleId, c)

  const out: DisplayItem[] = []

  for (const item of items) {
    if (item.id == null) continue
    const isVirtual = item.repeat !== 'once'
    const showsToday = isVirtual
      ? repeatItemShowsOnDate(item, dateStr)
      : item.date === dateStr
    if (!showsToday) continue

    const comp = compMap.get(item.id)
    let done: boolean
    let skipped: boolean
    let completedAt: number | undefined
    let skippedAt: number | undefined

    if (isVirtual) {
      // 重复项：状态来自 scheduleCompletions
      done = comp?.completed === true
      skipped = comp?.skippedAt != null
      completedAt = comp?.completedAt
      skippedAt = comp?.skippedAt
    } else {
      // once 项：状态来自 item.done
      done = item.done
      skipped = false
      completedAt = item.completedAt
    }

    out.push({
      key: isVirtual ? `v-${item.id}-${dateStr}` : `o-${item.id}`,
      itemId: item.id,
      title: item.title,
      tag: item.tag,
      time: item.time,
      date: dateStr,
      repeat: item.repeat,
      done,
      skipped,
      completedAt,
      skippedAt,
      sort: item.sort,
      isVirtual
    })
  }

  // 排序：未完成且未跳过在前；已完成/已跳过在后
  // 同区间内按 sort 升序，sort 相同则按 time 升序
  return out.sort((a, b) => {
    const aDone = a.done || a.skipped
    const bDone = b.done || b.skipped
    if (aDone !== bDone) return aDone ? 1 : -1
    if (a.sort !== b.sort) return a.sort - b.sort
    return (a.time ?? '').localeCompare(b.time ?? '')
  })
}

/** 计算某天的日程数（仅显示数，不含已完成） */
export function countDayActive(
  items: ScheduleItem[],
  completions: ScheduleCompletion[],
  dateStr: string
): { total: number; done: number } {
  const list = buildDayDisplayList(items, completions, dateStr)
  let done = 0
  for (const d of list) if (d.done || d.skipped) done++
  return { total: list.length, done }
}

/** 取当天前 3 条未完成项 chip（用于周视图） */
export function top3ActiveChips(
  items: ScheduleItem[],
  completions: ScheduleCompletion[],
  dateStr: string
): Array<{ title: string; tag: string; time?: string }> {
  const list = buildDayDisplayList(items, completions, dateStr)
  return list
    .filter((d) => !d.done && !d.skipped)
    .slice(0, 3)
    .map((d) => ({ title: d.title, tag: d.tag, time: d.time }))
}
