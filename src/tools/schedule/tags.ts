/**
 * 日程标签颜色定义
 * ------------------------------------------------------------
 * 4 个默认标签固定颜色；自定义标签从 8 色板里选。
 * 颜色键统一用 Tailwind 颜色名（如 'blue'），
 * 渲染时按 key 查表得到具体色值（hex + tailwind 类名）。
 */
import type { ScheduleTagDef } from '@/core/db'

/** 颜色键 → 具体颜色配置 */
export interface TagColor {
  /** 主色 hex（用于 chip 文字、tag 边色条） */
  hex: string
  /** 浅色背景 hex（用于 chip 背景） */
  soft: string
  /** Tailwind 主色类（用于行内文字、圆点等） */
  text: string
  /** Tailwind 浅背景类（用于 chip 背景） */
  bgSoft: string
  /** Tailwind 边框色（4px 竖色条） */
  barClass: string
}

const COLOR_MAP: Record<string, TagColor> = {
  red:     { hex: '#ef4444', soft: '#fee2e2', text: 'text-red-500',     bgSoft: 'bg-red-50',     barClass: 'bg-red-500' },
  orange:  { hex: '#f97316', soft: '#ffedd5', text: 'text-orange-500',  bgSoft: 'bg-orange-50',  barClass: 'bg-orange-500' },
  amber:   { hex: '#f59e0b', soft: '#fef3c7', text: 'text-amber-500',   bgSoft: 'bg-amber-50',   barClass: 'bg-amber-500' },
  lime:    { hex: '#84cc16', soft: '#ecfccb', text: 'text-lime-600',    bgSoft: 'bg-lime-50',    barClass: 'bg-lime-500' },
  emerald: { hex: '#10b981', soft: '#d1fae5', text: 'text-emerald-500', bgSoft: 'bg-emerald-50', barClass: 'bg-emerald-500' },
  teal:    { hex: '#14b8a6', soft: '#ccfbf1', text: 'text-teal-500',    bgSoft: 'bg-teal-50',    barClass: 'bg-teal-500' },
  blue:    { hex: '#3b82f6', soft: '#dbeafe', text: 'text-blue-500',    bgSoft: 'bg-blue-50',    barClass: 'bg-blue-500' },
  purple:  { hex: '#a855f7', soft: '#f3e8ff', text: 'text-purple-500',  bgSoft: 'bg-purple-50',  barClass: 'bg-purple-500' }
}

/** 8 个可选色板（自定义标签可从中选） */
export const COLOR_PALETTE_KEYS = [
  'red', 'orange', 'amber', 'lime', 'emerald', 'teal', 'blue', 'purple'
] as const

/** 4 个默认标签（不写入数据库，由本模块直接提供） */
export interface DefaultTag {
  name: string
  color: keyof typeof COLOR_MAP
}

export const DEFAULT_TAGS: DefaultTag[] = [
  { name: '工作', color: 'blue' },
  { name: '生活', color: 'emerald' },
  { name: '学习', color: 'purple' },
  { name: '娱乐', color: 'amber' }
]

/** 取颜色配置；未知 key 兜底为 stone */
export function getTagColor(key: string): TagColor {
  return COLOR_MAP[key] ?? {
    hex: '#78716c', soft: '#f5f5f4', text: 'text-stone-500',
    bgSoft: 'bg-stone-100', barClass: 'bg-stone-400'
  }
}

/** 合并默认标签 + 自定义标签，返回完整列表 */
export function buildTagList(custom: ScheduleTagDef[]): Array<DefaultTag & { customId?: number }> {
  const list: Array<DefaultTag & { customId?: number }> = DEFAULT_TAGS.map((t) => ({ ...t }))
  for (const c of custom) {
    list.push({ name: c.name, color: (c.color as keyof typeof COLOR_MAP), customId: c.id })
  }
  return list
}

/** 根据标签名查色（先匹配默认，再匹配自定义） */
export function findTagColor(
  name: string,
  custom: ScheduleTagDef[]
): TagColor {
  const def = DEFAULT_TAGS.find((t) => t.name === name)
  if (def) return getTagColor(def.color)
  const c = custom.find((t) => t.name === name)
  if (c) return getTagColor(c.color)
  // 兜底：未知标签按 stone
  return getTagColor('stone')
}
