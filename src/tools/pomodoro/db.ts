/**
 * 番茄钟待办 - 数据访问薄封装
 * ------------------------------------------------------------
 * 在 src/core/db.ts 的 db.pomodoroTodos / db.pomodoroSessions 之上加一层业务方法：
 * - 今日待办 CRUD（默认排序：未完成在前 + 完成下沉）
 * - 完成番茄 session 写入
 * - 今日 / 本周统计聚合
 */
import { addDays, format, startOfWeek } from 'date-fns'
import { db, type PomodoroSession, type PomodoroTodo } from '@/core/db'

export type { PomodoroTodo, PomodoroSession } from '@/core/db'

/* ============================================================
 * 日期工具
 * ============================================================ */

/** 今日 yyyy-MM-dd */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** 本周（周一为起点）7 天日期字符串列表 */
export function thisWeekDates(): string[] {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), 'yyyy-MM-dd'))
}

/* ============================================================
 * 今日待办 CRUD
 * ============================================================ */

/** 今日未完成在前，已完成自动下沉 */
export function sortTodos(items: PomodoroTodo[]): PomodoroTodo[] {
  const undone = items.filter((x) => !x.done).sort((a, b) => a.sort - b.sort || a.createdAt - b.createdAt)
  const done = items
    .filter((x) => x.done)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
  return [...undone, ...done]
}

export async function listTodayTodos(date = todayISO()): Promise<PomodoroTodo[]> {
  const all = await db.pomodoroTodos.where('date').equals(date).toArray()
  return sortTodos(all)
}

export async function createTodo(title: string, date = todayISO()): Promise<number> {
  const now = Date.now()
  const all = await db.pomodoroTodos.where('date').equals(date).toArray()
  const maxSort = all.reduce((m, x) => Math.max(m, x.sort ?? 0), 0)
  const id = await db.pomodoroTodos.add({
    title,
    completedPomodoros: 0,
    done: false,
    sort: maxSort + 1,
    date,
    createdAt: now,
    updatedAt: now
  })
  return id as number
}

export async function updateTodo(id: number, patch: Partial<PomodoroTodo>): Promise<void> {
  await db.pomodoroTodos.update(id, { ...patch, updatedAt: Date.now() })
}

export async function toggleTodoDone(todo: PomodoroTodo): Promise<void> {
  if (!todo.id) return
  await updateTodo(todo.id, {
    done: !todo.done,
    completedAt: !todo.done ? Date.now() : undefined
  })
}

export async function deleteTodo(id: number): Promise<void> {
  await db.pomodoroTodos.delete(id)
}

/** 完成一个工作番茄后，给 todo 累加 1 */
export async function incrementTodoPomodoros(id: number): Promise<void> {
  const todo = await db.pomodoroTodos.get(id)
  if (!todo) return
  await db.pomodoroTodos.update(id, {
    completedPomodoros: (todo.completedPomodoros ?? 0) + 1,
    updatedAt: Date.now()
  })
}

/* ============================================================
 * Session 读写
 * ============================================================ */

export async function addSession(input: Omit<PomodoroSession, 'id'>): Promise<void> {
  await db.pomodoroSessions.add(input)
}

/** 今日工作番茄数 + 总专注分钟数 */
export async function getTodayStats(date = todayISO()): Promise<{ count: number; totalSec: number }> {
  const sessions = await db.pomodoroSessions
    .where('date')
    .equals(date)
    .and((s) => s.type === 'work')
    .toArray()
  const totalSec = sessions.reduce((sum, s) => sum + s.durationSec, 0)
  return { count: sessions.length, totalSec }
}

/** 本周工作番茄数 */
export async function getThisWeekWorkCount(): Promise<number> {
  const dates = thisWeekDates()
  const all: PomodoroSession[] = []
  for (const d of dates) {
    const arr = await db.pomodoroSessions.where('date').equals(d).toArray()
    all.push(...arr)
  }
  return all.filter((s) => s.type === 'work').length
}
