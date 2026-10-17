/**
 * 生日倒计时 - 农历转换 + 倒计时纯函数
 * ------------------------------------------------------------
 * 基于 lunar-javascript（无第三方依赖，纯 JS）。
 * 该包无 TS 类型声明，依赖同目录 lunar-javascript.d.ts 隐式 any 兜底。
 *
 * 关键 API：
 * - Lunar.fromYmdHms(y, m, d, 0, 0, 0) → Lunar 实例（m 范围 1-12，闰月为负数）
 * - lunar.getSolar() → Solar 实例
 * - solar.getYear() / getMonth() / getDay() → 公历年月日
 * - lunar.getMonthInChinese() → '正' | '二' | '三' ... '腊'
 * - lunar.getDayInChinese() → '初一' | '初二' ... '三十'
 *
 * 异常：fromYmdHms 在月份 0/13、日 0/32、不存在日期时会抛错。
 */
import type { Birthday } from '@/core/db'
import { Lunar } from 'lunar-javascript'

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** 安全构造农历：失败返回 null */
function safeLunar(y: number, m: number, d: number) {
  try {
    return Lunar.fromYmdHms(y, m, d, 0, 0, 0)
  } catch {
    return null
  }
}

/** 验证农历 y/m/d 是否合法（通过 round-trip 校验） */
export function isValidLunarDate(y: number, m: number, d: number): boolean {
  const lunar = safeLunar(y, m, d)
  if (!lunar) return false
  try {
    // 通过 solar → lunar 的回环判断 lunar-javascript 是否被偷偷归一化
    const solar = lunar.getSolar()
    const back = solar.getLunar()
    return back.getMonth() === m && back.getDay() === d
  } catch {
    return false
  }
}

/** 计算某条生日记录下一次公历生日日期（用于倒计时） */
export function getNextBirthday(b: Birthday, today: Date = new Date()): Date {
  const parts = (b.birthday || '').split('-').map(Number)
  const mm = parts[1]
  const dd = parts[2]
  if (!mm || !dd) return new Date(today.getFullYear() + 1, 0, 1)

  if (b.isLunar) {
    // 农历：找到今年（或明年）农历 mm 月 dd 日 对应的公历日期，且要 >= 今天
    const todayStart = startOfDay(today)
    for (let i = 0; i < 2; i++) {
      const yearToTry = today.getFullYear() + i
      const lunar = safeLunar(yearToTry, mm, dd)
      if (!lunar) continue
      try {
        const solar = lunar.getSolar()
        const date = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay())
        if (date >= todayStart) return date
      } catch {
        // 该年此农历日不存在，跳过
      }
    }
    // 兜底：明年的同一天（理论上不会到这里）
    const lunar = safeLunar(today.getFullYear() + 1, mm, dd)
    if (lunar) {
      try {
        const solar = lunar.getSolar()
        return new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay())
      } catch {
        /* ignore */
      }
    }
    return new Date(today.getFullYear() + 1, 0, 1)
  } else {
    // 公历：今年此月此日；若已过则取明年
    const todayStart = startOfDay(today)
    let candidate = new Date(today.getFullYear(), mm - 1, dd)
    if (candidate < todayStart) {
      candidate = new Date(today.getFullYear() + 1, mm - 1, dd)
    }
    return candidate
  }
}

/** 计算距离下次生日还有多少天（今天=0） */
export function getDaysUntilNext(b: Birthday, today: Date = new Date()): number {
  const next = getNextBirthday(b, today)
  return Math.floor((next.getTime() - startOfDay(today).getTime()) / 86400_000)
}

/** 把农历字符串 "1990-08-15" 格式化为 "农历八月十五" */
export function formatLunarLabel(birthday: string): string {
  const parts = birthday.split('-').map(Number)
  const [y, m, d] = parts
  if (!y || !m || !d) return birthday
  const lunar = safeLunar(y, m, d)
  if (!lunar) return birthday
  try {
    return `农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`
  } catch {
    return birthday
  }
}

/** 把公历字符串 yyyy-mm-dd 格式化为 "M 月 D 日" */
export function formatSolarLabel(birthday: string): string {
  const parts = birthday.split('-').map(Number)
  const [, m, d] = parts
  if (!m || !d) return birthday
  return `${m} 月 ${d} 日`
}

/** 根据生日字符串显示 "农历xx月xx" 或 "M月D日" */
export function formatBirthdayLabel(b: { isLunar: boolean; birthday: string }): string {
  return b.isLunar ? formatLunarLabel(b.birthday) : formatSolarLabel(b.birthday)
}

/** 农历月份选项：1-12（含闰月在前 -N 形式，简化为本年是否闰） */
export const LUNAR_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
/** 农历日选项：1-30（保存时校验是否合法） */
export const LUNAR_DAYS = Array.from({ length: 30 }, (_, i) => i + 1)
/** 年份选项：1900-2099 */
export const LUNAR_YEARS = Array.from({ length: 200 }, (_, i) => 1900 + i)
