/**
 * 番茄钟计时状态：模块顶层 zustand store + setInterval
 * ------------------------------------------------------------
 * 设计要点：
 * - store 创建在模块顶层，组件树卸载（路由切换）也不丢状态
 * - setInterval 也在模块顶层启动，每秒触发 tick
 * - 持久化到 localStorage：phase / remainingMs / completedWorkCount / currentTodo / settings
 * - 不持久化 running / endsAt，重载后默认暂停（剩余时间从 last persisted 值继续）
 */
import { create } from 'zustand'
import { db, type PomodoroSession } from '@/core/db'
import { requestNotificationPermission, showNotification } from '@/core/notify'
import { addSession, incrementTodoPomodoros, todayISO } from './db'

export type Phase = 'work' | 'short_break' | 'long_break'

export interface Settings {
  workMin: number
  shortBreakMin: number
  longBreakMin: number
  longBreakEvery: number
}

const SETTINGS_KEY = 'pomodoro-settings'
const STATE_KEY = 'pomodoro-state'

const DEFAULT_SETTINGS: Settings = {
  workMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  longBreakEvery: 4
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS
}

function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

function phaseDurationMs(phase: Phase, s: Settings): number {
  switch (phase) {
    case 'work':
      return s.workMin * 60_000
    case 'short_break':
      return s.shortBreakMin * 60_000
    case 'long_break':
      return s.longBreakMin * 60_000
  }
}

interface PersistedState {
  phase: Phase
  remainingMs: number
  phaseDurationMs: number
  completedWorkCount: number
  currentTodoId?: number
  currentTodoTitle?: string
}

function loadState(): Partial<PersistedState> {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (raw) return JSON.parse(raw) as Partial<PersistedState>
  } catch {
    /* ignore */
  }
  return {}
}

function saveState(s: PersistedState): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

interface PomodoroState extends PersistedState {
  running: boolean
  /** ms timestamp at which the phase will end. null when paused/idle */
  endsAt: number | null
  settings: Settings

  start: () => void
  pause: () => void
  reset: () => void
  skip: () => Promise<void>
  bindTodo: (id?: number, title?: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  tick: () => Promise<void>
}

const initialSettings = loadSettings()
const persisted = loadState()
const initialPhase: Phase = persisted.phase ?? 'work'
const initialDurationMs =
  persisted.phaseDurationMs ?? phaseDurationMs(initialPhase, initialSettings)
const initialRemaining =
  persisted.remainingMs != null ? persisted.remainingMs : initialDurationMs
const initialCompleted = persisted.completedWorkCount ?? 0

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  phase: initialPhase,
  remainingMs: initialRemaining,
  phaseDurationMs: initialDurationMs,
  completedWorkCount: initialCompleted,
  currentTodoId: persisted.currentTodoId,
  currentTodoTitle: persisted.currentTodoTitle,
  running: false,
  endsAt: null,
  settings: initialSettings,

  start: () => {
    const s = get()
    if (s.running) return
    if (s.remainingMs <= 0) return
    // 开始计时前先请求通知权限（已授权则立即返回，否则弹询问框）
    void requestNotificationPermission()
    set({ running: true, endsAt: Date.now() + s.remainingMs })
    persist(get())
  },

  pause: () => {
    const s = get()
    if (!s.running) return
    const remainingMs = Math.max(0, (s.endsAt ?? 0) - Date.now())
    set({ running: false, endsAt: null, remainingMs })
    persist(get())
  },

  reset: () => {
    const s = get()
    const phaseMs = phaseDurationMs(s.phase, s.settings)
    set({
      phaseDurationMs: phaseMs,
      remainingMs: phaseMs,
      running: false,
      endsAt: null
    })
    persist(get())
  },

  skip: async () => {
    const s = get()
    const elapsedSec = Math.max(0, Math.round((s.phaseDurationMs - s.remainingMs) / 1000))
    if (elapsedSec > 0) {
      await writeSession(s.phase, elapsedSec, s.currentTodoId, s.currentTodoTitle)
    }
    await transitionToNext(s, /*autoStart*/ false)
    persist(get())
  },

  bindTodo: (id, title) => {
    set({ currentTodoId: id, currentTodoTitle: title })
    persist(get())
  },

  updateSettings: (patch) => {
    const s = get()
    const newSettings = { ...s.settings, ...patch }
    saveSettings(newSettings)
    // 暂停且未开始（剩余等于当前阶段总时长）时，立刻套用新时长
    if (!s.running && s.remainingMs === s.phaseDurationMs) {
      const phaseMs = phaseDurationMs(s.phase, newSettings)
      set({ settings: newSettings, phaseDurationMs: phaseMs, remainingMs: phaseMs })
    } else {
      set({ settings: newSettings })
    }
    persist(get())
  },

  tick: async () => {
    const s = get()
    if (!s.running) return
    const remaining = (s.endsAt ?? 0) - Date.now()
    if (remaining > 0) {
      set({ remainingMs: remaining })
      // 持久化不每秒写盘太重；这里仍然写，确保切页面时也能恢复（成本可接受）
      persist(get())
      return
    }
    // 阶段完成
    set({ remainingMs: 0 })
    await completePhase(s)
    persist(get())
  }
}))

function persist(s: PomodoroState): void {
  saveState({
    phase: s.phase,
    remainingMs: s.remainingMs,
    phaseDurationMs: s.phaseDurationMs,
    completedWorkCount: s.completedWorkCount,
    currentTodoId: s.currentTodoId,
    currentTodoTitle: s.currentTodoTitle
  })
}

async function writeSession(
  phase: Phase,
  durationSec: number,
  todoId?: number,
  todoTitle?: string
): Promise<void> {
  const session: Omit<PomodoroSession, 'id'> = {
    todoId,
    todoTitle,
    durationSec,
    finishedAt: Date.now(),
    date: todayISO(),
    type: phase
  }
  await addSession(session)
}

async function getTodayWorkCount(): Promise<number> {
  const today = todayISO()
  const sessions = await db.pomodoroSessions
    .where('date')
    .equals(today)
    .and((x) => x.type === 'work')
    .toArray()
  return sessions.length
}

async function completePhase(s: PomodoroState): Promise<void> {
  const durationSec = Math.round(s.phaseDurationMs / 1000)
  await writeSession(s.phase, durationSec, s.currentTodoId, s.currentTodoTitle)

  if (s.phase === 'work') {
    // 当前 todo 累加 1
    if (s.currentTodoId != null) {
      await incrementTodoPomodoros(s.currentTodoId)
    }
    // 通知
    const todayCount = await getTodayWorkCount()
    const body = s.currentTodoTitle
      ? `已为「${s.currentTodoTitle}」专注 ${s.settings.workMin} 分钟`
      : `专注 ${s.settings.workMin} 分钟，休息一下`
    void showNotification(`完成第 ${todayCount} 个番茄 🍅`, body)
    await transitionToNext(s, /*autoStart*/ true)
  } else {
    // 休息结束 → 切回 work，不自动开始
    await transitionToNext(s, /*autoStart*/ false)
  }
}

async function transitionToNext(s: PomodoroState, autoStart: boolean): Promise<void> {
  let nextPhase: Phase
  let newCompletedWorkCount = s.completedWorkCount
  if (s.phase === 'work') {
    newCompletedWorkCount = s.completedWorkCount + 1
    nextPhase =
      newCompletedWorkCount % s.settings.longBreakEvery === 0
        ? 'long_break'
        : 'short_break'
  } else {
    nextPhase = 'work'
  }
  const phaseMs = phaseDurationMs(nextPhase, s.settings)
  usePomodoroStore.setState({
    phase: nextPhase,
    completedWorkCount: newCompletedWorkCount,
    phaseDurationMs: phaseMs,
    remainingMs: phaseMs,
    running: autoStart,
    endsAt: autoStart ? Date.now() + phaseMs : null
  })
}

/* ============================================================
 * 模块顶层 setInterval —— 即使组件卸载也持续 tick
 * ========================================================== */

let intervalId: ReturnType<typeof setInterval> | null = null
function ensureTicking(): void {
  if (intervalId != null) return
  intervalId = setInterval(() => {
    void usePomodoroStore.getState().tick()
  }, 1000)
}
ensureTicking()
