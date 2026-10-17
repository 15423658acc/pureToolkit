/**
 * 全局 Dexie 数据库定义
 * ------------------------------------------------------------
 * 纯前端，数据存浏览器本地 IndexedDB。
 * 所有工具共享一个 DB，按工具分表，方便统一导出/导入。
 */
import Dexie, { type Table } from 'dexie'

/* ============================================================
 * 类型定义
 * ============================================================ */

/* 转盘：用户自定义选项 + 预设模板 */
export interface WheelOption {
  id?: number
  label: string
  weight: number          // 权重，默认 1
  color?: string          // 颜色覆盖，空则按索引循环
}

export interface WheelTemplate {
  id?: number
  name: string            // 模板名，如 "今天吃啥"
  options: WheelOption[]  // 选项列表
  isPreset: boolean       // 是否为系统预设（不可删除）
  createdAt: number
  updatedAt: number
}

export interface WheelHistory {
  id?: number
  templateName: string
  result: string
  spunAt: number
}

/* 保质期管家 */
export type ExpiryTag =
  | '证件' | '订阅' | '药品' | '自定义'

export interface ExpiryItem {
  id?: number
  name: string
  tag: ExpiryTag
  startDate: string         // ISO yyyy-mm-dd
  endDate: string           // ISO yyyy-mm-dd
  /** 自定义字段：随 tag 不同而异 */
  fields?: Record<string, string>
  /** 归档（过期处理后归档，不删除） */
  archived: boolean
  createdAt: number
  updatedAt: number
}

/* 保质期管家 - 自定义标签（用户自定义字段定义） */
export interface ExpiryCustomTag {
  id?: number
  name: string
  fields: { name: string; type: 'text' | 'date' | 'number' }[]
}

/* 阅读观影清单 */
export type MediaStatus = 'unread' | 'reading' | 'done'
export type MediaType = 'book' | 'movie' | 'tv' | 'podcast' | 'other'

export interface MediaItem {
  id?: number
  title: string
  type: MediaType
  status: MediaStatus
  rating?: number             // 1-5
  tags: string[]
  progress?: string          // 自由文本：第3集/第100页
  notes?: string
  addedAt: number             // 添加时间
  completedAt?: number        // 完成时间（用于"上个月看了什么"回顾）
  sort: number               // 排序，未完成在前、完成自动下沉到末尾
}

/* 日程安排 */
export type ScheduleTag = '工作' | '生活' | '学习' | '娱乐' | string

export interface ScheduleItem {
  id?: number
  title: string
  tag: ScheduleTag
  /** ISO yyyy-mm-dd */
  date: string
  /** HH:mm 或自由文本 */
  time?: string
  done: boolean
  /** 重复规则：once | daily | weekly | monthly */
  repeat: 'once' | 'daily' | 'weekly' | 'monthly'
  sort: number
  completedAt?: number
  createdAt: number
  updatedAt: number
}

/** 重复日程的每日完成情况（不污染 scheduleItems 原始记录） */
export interface ScheduleCompletion {
  id?: number
  scheduleId: number          // 关联到 scheduleItems.id
  date: string                // yyyy-mm-dd，表示哪一天的这次实例
  completed: boolean
  skippedAt?: number          // 跳过的时间戳
  completedAt?: number
}

/** 自定义标签（4 个默认标签不在此表，仅用户自定义） */
export interface ScheduleTagDef {
  id?: number
  name: string
  color: string               // 颜色键，如 'blue' | 'emerald' | 'purple' | 'amber' ...
}

/* ============================================================
 * Dexie DB
 * ============================================================ */
class PureToolkitDB extends Dexie {
  wheelTemplates!: Table<WheelTemplate, number>
  wheelHistory!: Table<WheelHistory, number>
  expiryItems!: Table<ExpiryItem, number>
  expiryCustomTags!: Table<ExpiryCustomTag, number>
  mediaItems!: Table<MediaItem, number>
  scheduleItems!: Table<ScheduleItem, number>
  scheduleCompletions!: Table<ScheduleCompletion, number>
  scheduleTags!: Table<ScheduleTagDef, number>

  constructor() {
    super('puretoolkit')
    this.version(1).stores({
      // ++id 自增主键，后面是索引字段
      wheelTemplates: '++id, name, isPreset, updatedAt',
      wheelHistory: '++id, spunAt',
      expiryItems: '++id, name, tag, endDate, archived, updatedAt',
      mediaItems: '++id, title, type, status, addedAt, completedAt, sort',
      scheduleItems: '++id, title, tag, date, done, repeat, sort, updatedAt'
    })
    // v2: 增加日程完成情况和自定义标签表（必须包含 v1 全部表）
    this.version(2).stores({
      wheelTemplates: '++id, name, isPreset, updatedAt',
      wheelHistory: '++id, spunAt',
      expiryItems: '++id, name, tag, endDate, archived, updatedAt',
      mediaItems: '++id, title, type, status, addedAt, completedAt, sort',
      scheduleItems: '++id, title, tag, date, done, repeat, sort, updatedAt',
      scheduleCompletions: '++id, scheduleId, date, completed, skippedAt, completedAt',
      scheduleTags: '++id, name'
    })
    // v3: 增加保质期"自定义标签"表（升级时必须包含全部历史表）
    this.version(3).stores({
      wheelTemplates: '++id, name, isPreset, updatedAt',
      wheelHistory: '++id, spunAt',
      expiryItems: '++id, name, tag, endDate, archived, updatedAt',
      expiryCustomTags: '++id, name',
      mediaItems: '++id, title, type, status, addedAt, completedAt, sort',
      scheduleItems: '++id, title, tag, date, done, repeat, sort, updatedAt',
      scheduleCompletions: '++id, scheduleId, date, completed, skippedAt, completedAt',
      scheduleTags: '++id, name'
    })
  }
}

export const db = new PureToolkitDB()

/* ============================================================
 * 工具函数
 * ============================================================ */

/** 清空所有数据（危险操作前需要二次确认） */
export async function clearAllData(): Promise<void> {
  await Promise.all([
    db.wheelTemplates.clear(),
    db.wheelHistory.clear(),
    db.expiryItems.clear(),
    db.mediaItems.clear(),
    db.scheduleItems.clear(),
    db.scheduleCompletions.clear(),
    db.scheduleTags.clear()
  ])
}

/** 数据库是否为空 */
export async function isDBEmpty(): Promise<boolean> {
  const counts = await Promise.all([
    db.wheelTemplates.count(),
    db.wheelHistory.count(),
    db.expiryItems.count(),
    db.mediaItems.count(),
    db.scheduleItems.count(),
    db.scheduleCompletions.count(),
    db.scheduleTags.count()
  ])
  return counts.every((c) => c === 0)
}
