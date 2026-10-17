/**
 * 添加 / 编辑弹窗
 * ------------------------------------------------------------
 * - title（必填）、date（默认今天）、time（可选）、tag、repeat
 * - 编辑模式下传入 initial 即可初始化
 */
import { clsx } from 'clsx'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import type { ScheduleItem, ScheduleTagDef } from '@/core/db'
import { getTagColor } from './tags'
import { TagPicker } from './TagPicker'

type RepeatValue = ScheduleItem['repeat']
const REPEAT_OPTIONS: Array<{ value: RepeatValue; label: string }> = [
  { value: 'once', label: '不重复' },
  { value: 'daily', label: '每日' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' }
]

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

interface AddEditDialogProps {
  open: boolean
  onClose: () => void
  /** 编辑时传入；新增为 undefined */
  initial?: ScheduleItem
  /** 默认日期（新增时使用，方便从日视图直接添加到某天） */
  defaultDate?: string
  customTags: ScheduleTagDef[]
  onSave: (data: {
    id?: number
    title: string
    tag: string
    date: string
    time?: string
    repeat: RepeatValue
  }) => Promise<void> | void
  onCreateCustomTag: (name: string, color: string) => Promise<void>
  onDeleteCustomTag: (id: number) => Promise<void>
}

export function AddEditDialog({
  open,
  onClose,
  initial,
  defaultDate,
  customTags,
  onSave,
  onCreateCustomTag,
  onDeleteCustomTag
}: AddEditDialogProps) {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayISO())
  const [time, setTime] = useState('')
  const [tag, setTag] = useState<string>('工作')
  const [repeat, setRepeat] = useState<RepeatValue>('once')
  const [tagPickerOpen, setTagPickerOpen] = useState(false)

  // 每次打开时同步表单
  useEffect(() => {
    if (!open) return
    if (initial) {
      setTitle(initial.title)
      setDate(initial.date)
      setTime(initial.time ?? '')
      setTag(initial.tag)
      setRepeat(initial.repeat)
    } else {
      setTitle('')
      setDate(defaultDate ?? todayISO())
      setTime('')
      setTag('工作')
      setRepeat('once')
    }
  }, [open, initial, defaultDate])

  const handleSave = async () => {
    const t = title.trim()
    if (!t) {
      toast('请填写标题', 'error')
      return
    }
    await onSave({
      id: initial?.id,
      title: t,
      tag,
      date,
      time: time.trim() || undefined,
      repeat
    })
    onClose()
  }

  // 当前选中标签的颜色（用于 chip 预览）
  const currentColor = getTagColor(
    customTags.find((c) => c.name === tag)?.color ??
    (['工作', '生活', '学习', '娱乐'].includes(tag)
      ? ({ '工作': 'blue', '生活': 'emerald', '学习': 'purple', '娱乐': 'amber' } as Record<string, string>)[tag] ?? 'blue'
      : 'stone')
  )

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={initial ? '编辑日程' : '新建日程'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>取消</Button>
            <Button variant="primary" onClick={() => void handleSave()}>保存</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {/* 标题 */}
          <Input
            autoFocus
            placeholder="日程标题，如：团队站会"
            value={title}
            maxLength={60}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* 日期 / 时间 */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          {/* 标签 */}
          <div>
            <p className="text-xs font-medium text-stone-500 px-0.5 mb-1.5">标签</p>
            <button
              onClick={() => setTagPickerOpen(true)}
              className={clsx(
                'h-11 w-full px-3 rounded-xl border inline-flex items-center gap-2',
                'border-stone-200 bg-white hover:bg-stone-50 transition'
              )}
            >
              <span className={clsx('w-3 h-3 rounded-full', currentColor.barClass)} />
              <span className="text-sm text-stone-800 flex-1 text-left">{tag}</span>
              <span className="text-xs text-stone-400">选择 ›</span>
            </button>
          </div>

          {/* 重复 */}
          <div>
            <p className="text-xs font-medium text-stone-500 px-0.5 mb-1.5">重复</p>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-stone-100 rounded-xl">
              {REPEAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRepeat(opt.value)}
                  className={clsx(
                    'h-9 rounded-lg text-xs font-medium transition',
                    repeat === opt.value
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {repeat !== 'once' && (
              <p className="text-xs text-stone-400 mt-1.5 px-0.5">
                重复日程会在符合规则的当天自动作为"虚拟实例"出现，
                完成情况单独记录，不会污染原始日程。
              </p>
            )}
          </div>
        </div>
      </Dialog>

      <TagPicker
        open={tagPickerOpen}
        onClose={() => setTagPickerOpen(false)}
        value={tag}
        onPick={(name) => {
          setTag(name)
          setTagPickerOpen(false)
        }}
        customTags={customTags}
        onCreateCustom={onCreateCustomTag}
        onDeleteCustom={onDeleteCustomTag}
      />
    </>
  )
}
