/**
 * 日程安排：数据访问薄封装
 * ------------------------------------------------------------
 * 直接基于 Dexie db 操作，封装了日程相关查询、完成情况等。
 */
import { db, type ScheduleCompletion, type ScheduleItem, type ScheduleTagDef } from '@/core/db'

/* ---------- 日程项 CRUD ---------- */

export async function listScheduleItems(): Promise<ScheduleItem[]> {
  return db.scheduleItems.orderBy('sort').toArray()
}

export async function getScheduleItem(id: number): Promise<ScheduleItem | undefined> {
  return db.scheduleItems.get(id)
}

export async function createScheduleItem(
  data: Omit<ScheduleItem, 'id' | 'sort' | 'createdAt' | 'updatedAt' | 'done' | 'completedAt'>
): Promise<number> {
  const now = Date.now()
  // sort 取当前最大值 + 1
  const all = await db.scheduleItems.toArray()
  const maxSort = all.reduce((m, x) => Math.max(m, x.sort ?? 0), 0)
  const id = await db.scheduleItems.add({
    ...data,
    done: false,
    sort: maxSort + 1,
    createdAt: now,
    updatedAt: now
  })
  return id as number
}

export async function updateScheduleItem(
  id: number,
  patch: Partial<ScheduleItem>
): Promise<void> {
  await db.scheduleItems.update(id, { ...patch, updatedAt: Date.now() })
}

export async function deleteScheduleItem(id: number): Promise<void> {
  await db.transaction('rw', db.scheduleItems, db.scheduleCompletions, async () => {
    await db.scheduleItems.delete(id)
    // 同步删除该日程的所有完成/跳过记录
    await db.scheduleCompletions.where('scheduleId').equals(id).delete()
  })
}

/* ---------- 完成情况 ---------- */

/** 拿指定 scheduleId 在指定 date 的完成/跳过记录 */
export async function getCompletion(
  scheduleId: number,
  date: string
): Promise<ScheduleCompletion | undefined> {
  const arr = await db.scheduleCompletions
    .where('scheduleId').equals(scheduleId)
    .toArray()
  return arr.find((c) => c.date === date)
}

/** 拿指定 date 当天的所有完成记录（用于日视图批量加载） */
export async function listCompletionsByDate(date: string): Promise<ScheduleCompletion[]> {
  return db.scheduleCompletions.where('date').equals(date).toArray()
}

/** 标记重复项当天完成 / 取消完成 */
export async function setCompletionDone(
  scheduleId: number,
  date: string,
  done: boolean
): Promise<void> {
  const existing = await getCompletion(scheduleId, date)
  const now = Date.now()
  if (existing) {
    await db.scheduleCompletions.update(existing.id!, {
      completed: done,
      completedAt: done ? now : undefined,
      skippedAt: undefined
    })
  } else {
    await db.scheduleCompletions.add({
      scheduleId,
      date,
      completed: done,
      completedAt: done ? now : undefined
    })
  }
}

/** 跳过重复项当天的实例 */
export async function skipCompletion(
  scheduleId: number,
  date: string
): Promise<void> {
  const existing = await getCompletion(scheduleId, date)
  const now = Date.now()
  if (existing) {
    await db.scheduleCompletions.update(existing.id!, {
      completed: false,
      skippedAt: now,
      completedAt: undefined
    })
  } else {
    await db.scheduleCompletions.add({
      scheduleId,
      date,
      completed: false,
      skippedAt: now
    })
  }
}

/* ---------- once 项的完成 / 跳过 ---------- */

/** once 项的勾选完成 */
export async function setOnceDone(
  id: number,
  done: boolean
): Promise<void> {
  await updateScheduleItem(id, {
    done,
    completedAt: done ? Date.now() : undefined
  })
}

/* ---------- 排序 ---------- */

/** 批量更新 sort（拖拽后调用） */
export async function reorderScheduleItems(
  pairs: Array<{ id: number; sort: number }>
): Promise<void> {
  await db.transaction('rw', db.scheduleItems, async () => {
    for (const p of pairs) {
      await db.scheduleItems.update(p.id, { sort: p.sort, updatedAt: Date.now() })
    }
  })
}

/* ---------- 自定义标签 ---------- */

export async function listScheduleTags(): Promise<ScheduleTagDef[]> {
  return db.scheduleTags.toArray()
}

export async function createScheduleTag(name: string, color: string): Promise<number> {
  const id = await db.scheduleTags.add({ name, color })
  return id as number
}

export async function deleteScheduleTag(id: number): Promise<void> {
  await db.scheduleTags.delete(id)
}
