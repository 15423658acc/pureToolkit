/**
 * 状态徽章复用组件 + 状态色板
 * ------------------------------------------------------------
 * 状态色统一在此定义：列表行左侧色条、卡片背景、日历圆点都引用。
 */
import { clsx } from 'clsx'
import { formatRemaining, getStatus, type ExpiryStatus } from './db'

export interface StatusStyle {
  /** 圆点色 */
  dot: string
  /** 文字色 */
  text: string
  /** 浅色背景 */
  bg: string
  /** 左侧竖色条 */
  bar: string
  /** 徽章 pill 背景+文字 */
  badge: string
  /** 中文标签 */
  label: string
}

export const STATUS_CONFIG: Record<ExpiryStatus, StatusStyle> = {
  expired: {
    dot: 'bg-red-500',
    text: 'text-red-600',
    bg: 'bg-red-50',
    bar: 'bg-red-500',
    badge: 'bg-red-100 text-red-700',
    label: '已过期'
  },
  soon: {
    dot: 'bg-orange-500',
    text: 'text-orange-600',
    bg: 'bg-orange-50',
    bar: 'bg-orange-500',
    badge: 'bg-orange-100 text-orange-700',
    label: '7天内'
  },
  near: {
    dot: 'bg-amber-400',
    text: 'text-amber-600',
    bg: 'bg-amber-50',
    bar: 'bg-amber-400',
    badge: 'bg-amber-100 text-amber-700',
    label: '30天内'
  },
  far: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-600',
    bg: 'bg-emerald-50',
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
    label: '远期'
  }
}

interface StatusBadgeProps {
  endDate: string
}

/** 紧凑 pill：圆点 + "还有 N 天" / "已过期 N 天" */
export function StatusBadge({ endDate }: StatusBadgeProps) {
  const status = getStatus(endDate)
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', cfg.badge)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {formatRemaining(endDate)}
    </span>
  )
}
