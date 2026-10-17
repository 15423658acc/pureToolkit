/**
 * 番茄钟待办 - 主入口（默认导出，路由 /pomodoro）
 * ------------------------------------------------------------
 * 一屏融合：圆环计时器 + 今日待办列表
 *
 * 布局：
 * - Layout accent="pomodoro"，主色 rose
 * - 顶部右上角：设置图标按钮
 * - 内容区：
 *   1) StatsBar（统计小字）
 *   2) Timer（200px 圆环 + 阶段标签 + 操作按钮）
 *   3) 今日待办 TodoList
 * - 右下角 FAB：rose-500 实心圆 + Plus
 *
 * 计时器逻辑全部放在 src/tools/pomodoro/store.ts，
 * 组件订阅 store 即可；切换路由不会丢状态。
 */
import { clsx } from 'clsx'
import { Plus, Settings as SettingsIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Layout } from '@/components/Layout'
import { useToast } from '@/components/ui/Toast'
import type { PomodoroTodo } from '@/core/db'
import { AddTodoDialog } from './AddTodoDialog'
import { SettingsDialog } from './SettingsDialog'
import { StatsBar } from './StatsBar'
import { Timer } from './Timer'
import { TodoList } from './TodoList'
import { createTodo, listTodayTodos } from './db'
import { usePomodoroStore } from './store'

export default function Pomodoro() {
  const toast = useToast()
  const [todos, setTodos] = useState<PomodoroTodo[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // 监听阶段变化 / 完成计数变化，触发 list reload
  const phase = usePomodoroStore((s) => s.phase)
  const completedWorkCount = usePomodoroStore((s) => s.completedWorkCount)

  const reload = async () => {
    const list = await listTodayTodos()
    setTodos(list)
  }

  useEffect(() => {
    void reload()
  }, [phase, completedWorkCount])

  const handleAdd = async (title: string) => {
    await createTodo(title)
    toast('已添加待办', 'success')
    await reload()
  }

  return (
    <Layout
      accent="pomodoro"
      title="番茄钟待办"
      actions={
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="设置"
          className="w-9 h-9 rounded-xl inline-flex items-center justify-center text-stone-500 hover:bg-stone-100"
        >
          <SettingsIcon size={18} />
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        {/* 顶部统计 + 计时器 */}
        <div className="flex flex-col items-center gap-2">
          <StatsBar />
          <Timer />
        </div>

        {/* 今日待办 */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-stone-700">今日待办</h2>
            <span className="text-xs text-stone-400">{todos.length} 项</span>
          </div>
          <TodoList todos={todos} onChanged={() => void reload()} />
        </section>

        {/* 底部留白防止 FAB 遮挡 */}
        <div className="h-20" />
      </div>

      {/* FAB */}
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        aria-label="添加待办"
        className={clsx(
          'fixed right-4 bottom-6 z-40 w-14 h-14 rounded-full',
          'bg-rose-500 text-white shadow-lg hover:bg-rose-600 active:bg-rose-700',
          'inline-flex items-center justify-center transition active:scale-95 safe-bottom'
        )}
      >
        <Plus size={22} />
      </button>

      <AddTodoDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
      />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Layout>
  )
}
