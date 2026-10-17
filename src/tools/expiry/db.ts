/**
 * 保质期管家 - 数据访问层 + 状态计算助手
 * ------------------------------------------------------------
 * 薄封装 db.expiryItems 与 db.expiryCustomTags，并集中放置
 * "剩余天数 / 状态等级" 等纯函数，供各视图复用。
 */
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { db, type ExpiryCustomTag, type ExpiryItem, type ExpiryTag } from '@/core/db'

export type { ExpiryItem, ExpiryCustomTag, ExpiryTag } from '@/core/db'

/** 状态等级：已过期 / 7 天内 / 30 天内 / 远期 */
export type ExpiryStatus = 'expired' | 'soon' | 'near' | 'far'

/** endDate 距今天还剩多少天（已过期为负数）。endDate 格式 yyyy-MM-dd */
export function getDaysLeft(endDate: string, today: Date = new Date()): number {
  return differenceInCalendarDays(parseISO(endDate), today)
}

/** 依据结束日期判定状态等级 */
export function getStatus(endDate: string, today: Date = new Date()): ExpiryStatus {
  const d = getDaysLeft(endDate, today)
  if (d < 0) return 'expired'
  if (d <= 7) return 'soon'
  if (d <= 30) return 'near'
  return 'far'
}

/** 人类可读的剩余描述："还有 N 天" / "今天到期" / "已过期 N 天" */
export function formatRemaining(endDate: string): string {
  const d = getDaysLeft(endDate)
  if (d < 0) return `已过期 ${-d} 天`
  if (d === 0) return '今天到期'
  return `还有 ${d} 天`
}

/* ============================================================
 * 物品 CRUD
 * ============================================================ */

export interface ExpiryItemInput {
  name: string
  tag: ExpiryTag
  startDate: string
  endDate: string
  fields?: Record<string, string>
}

export async function listExpiryItems(includeArchived = false): Promise<ExpiryItem[]> {
  const all = await db.expiryItems.toArray()
  return includeArchived ? all : all.filter((i) => !i.archived)
}

export async function getExpiryItem(id: number): Promise<ExpiryItem | undefined> {
  return db.expiryItems.get(id)
}

export async function addExpiryItem(input: ExpiryItemInput): Promise<number> {
  const now = Date.now()
  return db.expiryItems.add({
    name: input.name,
    tag: input.tag,
    startDate: input.startDate,
    endDate: input.endDate,
    fields: input.fields,
    archived: false,
    createdAt: now,
    updatedAt: now
  })
}

export async function updateExpiryItem(id: number, patch: Partial<ExpiryItem>): Promise<void> {
  await db.expiryItems.update(id, { ...patch, updatedAt: Date.now() })
}

export async function archiveExpiryItem(id: number): Promise<void> {
  await updateExpiryItem(id, { archived: true })
}

export async function unarchiveExpiryItem(id: number): Promise<void> {
  await updateExpiryItem(id, { archived: false })
}

export async function deleteExpiryItem(id: number): Promise<void> {
  await db.expiryItems.delete(id)
}

/* ============================================================
 * 自定义标签 CRUD
 * ============================================================ */

export async function listCustomTags(): Promise<ExpiryCustomTag[]> {
  return db.expiryCustomTags.toArray()
}

export async function addCustomTag(data: Omit<ExpiryCustomTag, 'id'>): Promise<number> {
  return db.expiryCustomTags.add(data as ExpiryCustomTag)
}

export async function updateCustomTag(id: number, patch: Partial<ExpiryCustomTag>): Promise<void> {
  await db.expiryCustomTags.update(id, patch)
}

export async function deleteCustomTag(id: number): Promise<void> {
  await db.expiryCustomTags.delete(id)
}
