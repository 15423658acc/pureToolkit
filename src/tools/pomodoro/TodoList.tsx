/**
 * 今日待办列表
 * ------------------------------------------------------------
 * 每行一个 todo：[勾选圆圈] 标题 🍅×N [选中计时按钮]
 * 当前正在计时的 todo：bg-rose-50 + text-rose-600
 * 已完成项：淡灰 + 删除线
 * 点击未完成 todo 的标题区可"绑定到当前番茄"
 */
import { clsx } from 'clsx'
import { Check, ListTodo, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Empty } from '@/components/ui/Empty'
import { useToast } from '@/components/ui/Toast'
import { deleteTodo, toggleTodoDone, type PomodoroTodo } from './db'
import { usePomodoroStore } from './store'

interface TodoListProps {
  todos: PomodoroTodo[]
  onChanged: () => void
}

export function TodoList({ todos, onChanged }: TodoListProps) {
  const toast = useToast()
  const currentTodoId = usePomodoroStore((s) => s.currentTodoId)
  const bindTodo = usePomodoroStore((s) => s.bindTodo)

  const handleToggle = async (todo: PomodoroTodo) => {
    if (todo.done && currentTodoId === todo.id) {
      // 已绑定的 todo 被完成，自动解绑
      bindTodo(undefined, undefined)
    }
    await toggleTodoDone(todo)
    await onChanged()
  }

  const handleBind = (todo: PomodoroTodo) => {
    if (todo.done) return
    if (currentTodoId === todo.id) {
      bindTodo(undefined, undefined)
    } else {
      bindTodo(todo.id, todo.title)
    }
  }

  const handleDelete = async (todo: PomodoroTodo) => {
    if (!todo.id) return
    if (currentTodoId === todo.id) bindTodo(undefined, undefined)
    await deleteTodo(todo.id)
    toast('已删除', 'info')
    await onChanged()
  }

  if (todos.length === 0) {
    return (
      <Empty
        icon={<ListTodo size={22} />}
        title="今日还没有待办"
        hint="点击右下角加号添加，开始专注第一个番茄吧"
      />
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {todos.map((todo) => {
        const isActive = currentTodoId === todo.id
        return (
          <div
            key={todo.id}
            className={clsx(
              'flex items-center gap-2.5 rounded-2xl px-3 py-2.5 border transition',
              isActive
                ? 'bg-rose-50 border-rose-200'
                : todo.done
                  ? 'bg-stone-50 border-stone-100'
                  : 'bg-white border-stone-100 hover:bg-stone-50'
            )}
          >
            <button
              type="button"
              onClick={() => void handleToggle(todo)}
              aria-label={todo.done ? '取消完成' : '标记完成'}
              className={clsx(
                'w-6 h-6 rounded-full border-2 inline-flex items-center justify-center transition shrink-0',
                todo.done
                  ? 'bg-stone-400 border-stone-400 text-white'
                  : 'border-stone-300 hover:border-rose-400 text-transparent'
              )}
            >
              <Check size={14} strokeWidth={3} />
            </button>

            <button
              type="button"
              onClick={() => handleBind(todo)}
              disabled={todo.done}
              className={clsx(
                'flex-1 text-left text-sm truncate',
                todo.done
                  ? 'text-stone-400 line-through'
                  : isActive
                    ? 'text-rose-600 font-medium'
                    : 'text-stone-800'
              )}
            >
              {todo.title}
              {todo.completedPomodoros > 0 && (
                <span className="ml-1.5 text-xs text-stone-400">
                  🍅×{todo.completedPomodoros}
                </span>
              )}
            </button>

            {!todo.done && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleBind(todo)}
                aria-label={isActive ? '取消计时' : '开始计时'}
                className={clsx(
                  'w-8 h-8 shrink-0',
                  isActive
                    ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                    : 'text-stone-400 hover:bg-stone-100 hover:text-stone-700'
                )}
              >
                <Play size={14} />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => void handleDelete(todo)}
              aria-label="删除"
              className="w-8 h-8 shrink-0 text-stone-300 hover:bg-stone-100 hover:text-red-500"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        )
      })}
    </div>
  )
}
