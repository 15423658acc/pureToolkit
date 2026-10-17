/**
 * 圆环计时器组件
 * ------------------------------------------------------------
 * 200px 直径的圆环 + 中心数字时间 + 阶段标签
 * 颜色随阶段变化：work rose-500 / short_break emerald-500 / long_break sky-500
 */
import { clsx } from 'clsx'
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { Phase } from './store'
import { usePomodoroStore } from './store'

const SIZE = 200
const STROKE = 12
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const PHASE_META: Record<Phase, { label: string; ring: string; text: string; soft: string }> = {
  work: {
    label: '专注中',
    ring: 'stroke-rose-500',
    text: 'text-rose-600',
    soft: 'bg-rose-50 text-rose-600'
  },
  short_break: {
    label: '短休息',
    ring: 'stroke-emerald-500',
    text: 'text-emerald-600',
    soft: 'bg-emerald-50 text-emerald-600'
  },
  long_break: {
    label: '长休息',
    ring: 'stroke-sky-500',
    text: 'text-sky-600',
    soft: 'bg-sky-50 text-sky-600'
  }
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function Timer() {
  const phase = usePomodoroStore((s) => s.phase)
  const remainingMs = usePomodoroStore((s) => s.remainingMs)
  const phaseDurationMs = usePomodoroStore((s) => s.phaseDurationMs)
  const running = usePomodoroStore((s) => s.running)
  const currentTodoTitle = usePomodoroStore((s) => s.currentTodoTitle)
  const start = usePomodoroStore((s) => s.start)
  const pause = usePomodoroStore((s) => s.pause)
  const reset = usePomodoroStore((s) => s.reset)
  const skip = usePomodoroStore((s) => s.skip)

  const meta = PHASE_META[phase]
  const progress = phaseDurationMs > 0 ? 1 - remainingMs / phaseDurationMs : 0
  const dashOffset = CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, progress)))

  const statusLabel = running
    ? meta.label
    : remainingMs <= 0
      ? '已结束'
      : phase === 'work'
        ? '待开始'
        : '休息中'

  return (
    <div className="bg-white rounded-3xl border border-stone-100 shadow-sm px-5 py-6 flex flex-col items-center">
      <span
        className={clsx(
          'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
          meta.soft
        )}
      >
        {statusLabel}
      </span>

      {/* 圆环 */}
      <div className="relative mt-3" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-stone-100"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            className={clsx('transition-[stroke-dashoffset] duration-1000 ease-linear', meta.ring)}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={clsx('text-4xl font-bold tabular-nums', meta.text)}>
            {formatClock(remainingMs)}
          </span>
          <span className="text-xs text-stone-400 mt-1">{phaseLabel(phase)}</span>
        </div>
      </div>

      {/* 当前 todo 标题 */}
      <div className="mt-3 text-center min-h-[1.5rem] px-2">
        {currentTodoTitle ? (
          <p className="text-sm text-stone-700 truncate max-w-[16rem]">
            🍅 <span className="font-medium">{currentTodoTitle}</span>
          </p>
        ) : (
          <p className="text-xs text-stone-400">未绑定待办</p>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="mt-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void reset()}
          aria-label="重置"
          className="text-stone-500 hover:bg-stone-100"
        >
          <RotateCcw size={18} />
        </Button>
        {running ? (
          <Button
            variant="primary"
            tone="rose"
            size="lg"
            onClick={() => pause()}
            className="min-w-[7rem]"
          >
            <Pause size={18} /> 暂停
          </Button>
        ) : (
          <Button
            variant="primary"
            tone="rose"
            size="lg"
            onClick={() => start()}
            disabled={remainingMs <= 0}
            className="min-w-[7rem]"
          >
            <Play size={18} /> 继续
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void skip()}
          aria-label="跳过"
          className="text-stone-500 hover:bg-stone-100"
        >
          <SkipForward size={18} />
        </Button>
      </div>
    </div>
  )
}

function phaseLabel(phase: Phase): string {
  switch (phase) {
    case 'work':
      return '专注阶段'
    case 'short_break':
      return '短休阶段'
    case 'long_break':
      return '长休阶段'
  }
}
