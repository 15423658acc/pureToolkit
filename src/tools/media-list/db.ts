/**
 * 阅读观影清单 - 数据访问薄封装
 * ------------------------------------------------------------
 * 在 src/core/db.ts 的 db.mediaItems 之上加一层业务方法：
 * - 默认排序（未完成在前 + 完成下沉）
 * - 勾选 / 取消勾选
 * - 上月回顾筛选
 */
import { db, type MediaItem, type MediaType, type MediaStatus } from '@/core/db'

/* ============================================================
 * 排序
 * ============================================================ */

export type SortMode = 'default' | 'addedAt' | 'rating' | 'type'

/**
 * 默认排序：未完成项在前（按 sort 升序），已完成项在后（按 completedAt 倒序）
 */
export function sortDefault(items: MediaItem[]): MediaItem[] {
  const undone = items
    .filter((x) => x.status !== 'done')
    .sort((a, b) => a.sort - b.sort || a.addedAt - b.addedAt)
  const done = items
    .filter((x) => x.status === 'done')
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
  return [...undone, ...done]
}

export function sortByAddedAt(items: MediaItem[]): MediaItem[] {
  return [...items].sort((a, b) => a.addedAt - b.addedAt)
}

export function sortByRating(items: MediaItem[]): MediaItem[] {
  // 评分高的在前，无评分（0）排末尾
  return [...items].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
}

export function sortByType(items: MediaItem[]): MediaItem[] {
  return [...items].sort((a, b) => a.type.localeCompare(b.type) || a.addedAt - b.addedAt)
}

export function applySort(items: MediaItem[], mode: SortMode): MediaItem[] {
  switch (mode) {
    case 'addedAt':
      return sortByAddedAt(items)
    case 'rating':
      return sortByRating(items)
    case 'type':
      return sortByType(items)
    case 'default':
    default:
      return sortDefault(items)
  }
}

/* ============================================================
 * CRUD
 * ============================================================ */

export async function listAllMedia(): Promise<MediaItem[]> {
  return db.mediaItems.toArray()
}

export async function addMedia(item: Omit<MediaItem, 'id' | 'addedAt' | 'sort'>): Promise<number> {
  const now = Date.now()
  // sort 用当前最大值 + 1，保证新加项排在最后
  const maxSort = await db.mediaItems.orderBy('sort').last().then((x) => x?.sort ?? 0).catch(() => 0)
  const id = await db.mediaItems.add({
    ...item,
    addedAt: now,
    sort: maxSort + 1
  })
  return id
}

export async function updateMedia(id: number, patch: Partial<MediaItem>): Promise<void> {
  await db.mediaItems.update(id, patch)
}

export async function deleteMedia(id: number): Promise<void> {
  await db.mediaItems.delete(id)
}

/**
 * 切换勾选状态。勾选后立即下沉（依赖默认排序），取消勾选后回到未完成区。
 */
export async function toggleDone(item: MediaItem): Promise<void> {
  if (!item.id) return
  if (item.status === 'done') {
    // 取消勾选：回到 unread，清掉完成时间
    await db.mediaItems.update(item.id, {
      status: 'unread' satisfies MediaStatus,
      completedAt: undefined
    })
  } else {
    // 勾选完成：设置完成时间
    await db.mediaItems.update(item.id, {
      status: 'done' satisfies MediaStatus,
      completedAt: Date.now()
    })
  }
}

/* ============================================================
 * 上月回顾
 * ============================================================ */

/**
 * 返回上个月的 [start, end) 时间戳范围（基于当前时间）。
 */
export function lastMonthRange(now: Date = new Date()): { start: number; end: number; label: string } {
  // 当月 1 号 00:00
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  // 上月 1 号 00:00
  const lastMonthStart = new Date(thisMonthStart)
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1)
  const start = lastMonthStart.getTime()
  const end = thisMonthStart.getTime()
  const label = `${lastMonthStart.getFullYear()}年${lastMonthStart.getMonth() + 1}月`
  return { start, end, label }
}

export async function listLastMonthCompleted(): Promise<MediaItem[]> {
  const { start, end } = lastMonthRange()
  const all = await db.mediaItems.toArray()
  return all
    .filter((x) => x.status === 'done' && (x.completedAt ?? 0) >= start && (x.completedAt ?? 0) < end)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
}

/* ============================================================
 * 类型 / 状态 元信息
 * ============================================================ */

export interface TypeMeta {
  value: MediaType
  label: string
}

export const MEDIA_TYPES: TypeMeta[] = [
  { value: 'book', label: '书' },
  { value: 'movie', label: '电影' },
  { value: 'tv', label: '剧' },
  { value: 'podcast', label: '播客' },
  { value: 'other', label: '其他' }
]

export const MEDIA_STATUS: { value: MediaStatus; label: string }[] = [
  { value: 'unread', label: '未开始' },
  { value: 'reading', label: '进行中' },
  { value: 'done', label: '已完成' }
]

export function typeLabel(t: MediaType): string {
  return MEDIA_TYPES.find((x) => x.value === t)?.label ?? '其他'
}
