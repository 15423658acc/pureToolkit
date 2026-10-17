/**
 * 日程安排工具主入口（默认导出，路由 /schedule）
 * ------------------------------------------------------------
 * - Layout accent="schedule"，主色 purple
 * - 顶部右上角：视图切换图标（CalendarDays / CalendarRange）
 * - 底部 FAB：黑色圆 + Plus
 * - 默认日视图，可切换周视图
 */
import { clsx } from 'clsx'
import { CalendarDays, CalendarRange, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Layout } from '@/components/Layout'
import { useToast } from '@/components/ui/Toast'
import type { ScheduleCompletion, ScheduleItem, ScheduleTagDef } from '@/core/db'
import { AddEditDialog } from './AddEditDialog'
import * as dbApi from './db'
import type { DisplayItem } from './logic'
import { DayView } from './views/DayView'
import { WeekView } from './views/WeekView'

type ViewMode = 'day' | 'week'

export default function Schedule() {
  const toast = useToast()
  const [view, setView] = useState<ViewMode>('day')
  const [date, setDate] = useState<Date>(() => new Date())

  const [items, setItems] = useState<ScheduleItem[]>([])
  const [completions, setCompletions] = useState<ScheduleCompletion[]>([])
  const [customTags, setCustomTags] = useState<ScheduleTagDef[]>([])

  // 弹窗
  const [addEditOpen, setAddEditOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ScheduleItem | undefined>()

  // 加载数据
  const reloadItems = async () => {
    const all = await dbApi.listScheduleItems()
    setItems(all)
  }
  const reloadCompletions = async (d: Date) => {
    const dateStr = toISODate(d)
    const all = await dbApi.listCompletionsByDate(dateStr)
    setCompletions(all)
  }
  const reloadTags = async () => {
    setCustomTags(await dbApi.listScheduleTags())
  }

  useEffect(() => { void reloadItems() }, [])
  useEffect(() => { void reloadTags() }, [])
  // 当日期或视图变化时刷新完成情况（日视图需要当天；周视图会拿 7 天）
  useEffect(() => {
    if (view === 'day') {
      void reloadCompletions(date)
    } else {
      // 周视图需要本周 7 天的完成情况，这里全部加载
      void (async () => {
        const start = startOfWeekISO(date)
        const all: ScheduleCompletion[] = []
        for (let i = 0; i < 7; i++) {
          const d = new Date(start)
          d.setDate(start.getDate() + i)
          const arr = await dbApi.listCompletionsByDate(toISODate(d))
          all.push(...arr)
        }
        setCompletions(all)
      })()
    }
  }, [date, view])

  // ========== 操作 ==========

  const handleSave = async (data: {
    id?: number
    title: string
    tag: string
    date: string
    time?: string
    repeat: ScheduleItem['repeat']
  }) => {
    if (data.id != null) {
      await dbApi.updateScheduleItem(data.id, {
        title: data.title,
        tag: data.tag,
        date: data.date,
        time: data.time,
        repeat: data.repeat
      })
      toast('已保存修改', 'success')
    } else {
      await dbApi.createScheduleItem({
        title: data.title,
        tag: data.tag,
        date: data.date,
        time: data.time,
        repeat: data.repeat
      })
      toast('已添加日程', 'success')
    }
    await reloadItems()
  }

  const handleToggleDone = async (item: DisplayItem) => {
    if (item.isVirtual) {
      // 重复项：写 scheduleCompletions
      await dbApi.setCompletionDone(item.itemId, item.date, !item.done)
    } else {
      // once 项
      await dbApi.setOnceDone(item.itemId, !item.done)
    }
    await reloadItems()
    await reloadCompletions(date)
  }

  const handleSkip = async (item: DisplayItem) => {
    if (item.isVirtual) {
      await dbApi.skipCompletion(item.itemId, item.date)
    } else {
      // once 项：跳过 = 完成
      await dbApi.setOnceDone(item.itemId, true)
    }
    toast('已跳过', 'info')
    await reloadItems()
    await reloadCompletions(date)
  }

  const handleEdit = (item: DisplayItem) => {
    const found = items.find((x) => x.id === item.itemId)
    if (found) {
      setEditingItem(found)
      setAddEditOpen(true)
    }
  }

  const handleReorder = async (pairs: Array<{ id: number; sort: number }>) => {
    if (pairs.length === 0) return
    await dbApi.reorderScheduleItems(pairs)
    await reloadItems()
  }

  const handleCreateTag = async (name: string, color: string) => {
    await dbApi.createScheduleTag(name, color)
    await reloadTags()
  }
  const handleDeleteTag = async (id: number) => {
    await dbApi.deleteScheduleTag(id)
    await reloadTags()
    toast('已删除标签', 'info')
  }

  // 默认日期：新增时取当前查看的日期（日视图）或今天（周视图）
  const defaultDate = useMemo(() => toISODate(date), [date])

  return (
    <Layout
      accent="schedule"
      title="日程安排"
      actions={
        <>
          <button
            aria-label="日视图"
            onClick={() => setView('day')}
            className={clsx(
              'w-9 h-9 rounded-xl inline-flex items-center justify-center transition',
              view === 'day'
                ? 'bg-purple-100 text-purple-600'
                : 'text-stone-500 hover:bg-stone-100'
            )}
          >
            <CalendarDays size={18} />
          </button>
          <button
            aria-label="周视图"
            onClick={() => setView('week')}
            className={clsx(
              'w-9 h-9 rounded-xl inline-flex items-center justify-center transition',
              view === 'week'
                ? 'bg-purple-100 text-purple-600'
                : 'text-stone-500 hover:bg-stone-100'
            )}
          >
            <CalendarRange size={18} />
          </button>
        </>
      }
      footer={
        <div className="flex justify-end">
          <button
            aria-label="添加日程"
            onClick={() => { setEditingItem(undefined); setAddEditOpen(true) }}
            className="w-12 h-12 rounded-full bg-purple-500 text-white shadow-lg hover:bg-purple-600 inline-flex items-center justify-center transition active:scale-95"
          >
            <Plus size={22} />
          </button>
        </div>
      }
    >
      {view === 'day' ? (
        <DayView
          date={date}
          onDateChange={setDate}
          items={items}
          completions={completions}
          customTags={customTags}
          onToggleDone={(it) => void handleToggleDone(it)}
          onSkip={(it) => void handleSkip(it)}
          onEdit={(it) => handleEdit(it)}
          onReorder={handleReorder}
        />
      ) : (
        <WeekView
          date={date}
          onDateChange={setDate}
          onPickDay={(d) => { setDate(d); setView('day') }}
          items={items}
          completions={completions}
          customTags={customTags}
        />
      )}

      <AddEditDialog
        open={addEditOpen}
        onClose={() => setAddEditOpen(false)}
        initial={editingItem}
        defaultDate={defaultDate}
        customTags={customTags}
        onSave={handleSave}
        onCreateCustomTag={handleCreateTag}
        onDeleteCustomTag={handleDeleteTag}
      />
    </Layout>
  )
}

/* ---------- utils ---------- */

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfWeekISO(d: Date): Date {
  const t = new Date(d)
  const day = t.getDay() // 0 = Sunday
  const diff = (day === 0 ? -6 : 1 - day) // 周一为 0
  t.setDate(t.getDate() + diff)
  t.setHours(0, 0, 0, 0)
  return t
}
