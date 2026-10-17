/**
 * 转盘 - 预设模板 + 调色板
 * ------------------------------------------------------------
 * 启动时若 DB 中无任何预设，则 bulkAdd 一组预设模板。
 * 调色板按索引循环，扇区颜色取自这里（除非选项自带 color）。
 */
import { db, type WheelOption, type WheelTemplate } from '@/core/db'

/** 扇区调色板：amber/red/blue/purple/green/pink/cyan/orange/teal/lime */
export const WHEEL_PALETTE: string[] = [
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#3b82f6', // blue-500
  '#a855f7', // purple-500
  '#10b981', // emerald-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
  '#84cc16'  // lime-500
]

/** 按索引取调色板颜色（循环） */
export function getColor(index: number): string {
  return WHEEL_PALETTE[index % WHEEL_PALETTE.length]
}

interface PresetSeed {
  name: string
  options: string[]
}

const PRESET_SEEDS: PresetSeed[] = [
  { name: '今天吃啥', options: ['米饭', '面条', '火锅', '麻辣烫', '沙县', '麦当劳', '肯德基', '自己做'] },
  { name: '今天穿啥', options: ['休闲', '商务', '运动', '复古', '街头', '极简'] },
  { name: '周末做啥', options: ['看电影', '逛公园', '桌游', '看书', '健身', '睡觉', '约朋友'] },
  { name: '喝什么', options: ['美式', '拿铁', '奶茶', '果汁', '白水', '茶', '可乐'] },
  { name: '随机数字', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] }
]

/** 把字符串列表转成带默认权重和颜色的 WheelOption 数组 */
export function buildPresetOptions(labels: string[]): WheelOption[] {
  return labels.map((label, i) => ({
    label,
    weight: 1,
    color: getColor(i)
  }))
}

/** 预设模板数据（不含 id 与时间戳，写入时由调用方补齐） */
export const WHEEL_PRESETS: Omit<WheelTemplate, 'id' | 'createdAt' | 'updatedAt'>[] =
  PRESET_SEEDS.map((s) => ({
    name: s.name,
    options: buildPresetOptions(s.options),
    isPreset: true
  }))

/**
 * 确保 DB 中存在预设模板。若已存在任何预设则跳过；否则 bulkAdd。
 * 幂等，可在每次进入页面时安全调用。
 */
export async function ensurePresets(): Promise<void> {
  const all = await db.wheelTemplates.toArray()
  if (all.some((t) => t.isPreset)) return
  const now = Date.now()
  const toAdd: WheelTemplate[] = WHEEL_PRESETS.map((p) => ({
    name: p.name,
    options: p.options.map((o) => ({ ...o })),
    isPreset: true,
    createdAt: now,
    updatedAt: now
  }))
  await db.wheelTemplates.bulkAdd(toAdd)
}
