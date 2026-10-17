/**
 * 顶部统计条
 * ------------------------------------------------------------
 * 一行小字：今日专注 🍅×N（共 X 分钟）· 本周 🍅×M
 */
import { useEffect, useState } from 'react'
import { getThisWeekWorkCount, getTodayStats } from './db'
import { usePomodoroStore } from './store'

/** 一个用来"刷新"的计数器，Pomodoro 每次完成阶段 +1 触发重算 */
export function StatsBar() {
  const [stats, setStats] = useState<{ todayCount: number; todaySec: number; weekCount: number }>({
    todayCount: 0,
    todaySec: 0,
    weekCount: 0
  })
  const phase = usePomodoroStore((s) => s.phase)
  const completedWorkCount = usePomodoroStore((s) => s.completedWorkCount)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [today, week] = await Promise.all([getTodayStats(), getThisWeekWorkCount()])
      if (cancelled) return
      setStats({ todayCount: today.count, todaySec: today.totalSec, weekCount: week })
    })()
    return () => {
      cancelled = true
    }
  }, [phase, completedWorkCount])

  const minutes = Math.round(stats.todaySec / 60)

  return (
    <div className="flex items-center justify-center gap-3 text-xs text-stone-500">
      <span>
        今日专注 <span className="font-semibold text-rose-600">🍅×{stats.todayCount}</span>
        {minutes > 0 && <span className="text-stone-400">（共 {minutes} 分钟）</span>}
      </span>
      <span className="text-stone-300">·</span>
      <span>
        本周 <span className="font-semibold text-stone-700">🍅×{stats.weekCount}</span>
      </span>
    </div>
  )
}
