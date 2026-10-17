/**
 * 保质期管家 - 预设模板
 * ------------------------------------------------------------
 * 添加物品弹窗里，选择 tag 后用 chip 列表展示对应预设；
 * 点击 chip 自动填充 name / startDate / endDate。
 * 药品无预设时长，仅提供常见药名。
 */
import type { ExpiryTag } from '@/core/db'

export interface ExpiryPreset {
  name: string
  tag: ExpiryTag
  /** 预设时长（天）；undefined 表示需用户自行设置结束日期（如药品） */
  durationDays?: number
}

const MONTH = 30
const YEAR = 365

export const EXPIRY_PRESETS: Record<ExpiryTag, ExpiryPreset[]> = {
  证件: [
    { name: '身份证', tag: '证件', durationDays: 20 * YEAR },
    { name: '驾照', tag: '证件', durationDays: 10 * YEAR },
    { name: '护照', tag: '证件', durationDays: 10 * YEAR },
    { name: '港澳通行证', tag: '证件', durationDays: 10 * YEAR },
    { name: '社保卡', tag: '证件', durationDays: 10 * YEAR }
  ],
  订阅: [
    { name: '爱奇艺', tag: '订阅', durationDays: YEAR },
    { name: 'Netflix', tag: '订阅', durationDays: MONTH },
    { name: 'Apple Music', tag: '订阅', durationDays: MONTH },
    { name: 'Spotify', tag: '订阅', durationDays: MONTH },
    { name: '京东 Plus', tag: '订阅', durationDays: YEAR }
  ],
  药品: [
    { name: '布洛芬', tag: '药品' },
    { name: '对乙酰氨基酚', tag: '药品' },
    { name: '阿莫西林', tag: '药品' },
    { name: '板蓝根颗粒', tag: '药品' },
    { name: '藿香正气水', tag: '药品' }
  ],
  自定义: []
}

/** 药品固定自定义字段定义（用于添加表单渲染） */
export const MEDICINE_FIELDS: { key: string; label: string; placeholder: string; optional?: boolean }[] = [
  { key: '规格', label: '规格', placeholder: '如 0.5g×24 片' },
  { key: '用法用量', label: '用法用量', placeholder: '如 一日三次，饭后 1 片' },
  { key: '购买价格', label: '购买价格', placeholder: '如 ￥38.5' },
  { key: '生产厂家', label: '生产厂家', placeholder: '如 华润三九', optional: true }
]
