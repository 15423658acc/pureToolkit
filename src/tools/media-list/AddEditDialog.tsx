/**
 * 添加 / 编辑弹窗
 * - title（Input，必填）
 * - type（chip 选择器，带 lucide 图标）
 * - status（segmented control，三态）
 * - rating（5 颗可点击星星）
 * - progress（Input）
 * - tags（输入 chip，回车或逗号分隔）
 * - notes（Textarea）
 */
import { clsx } from 'clsx'
import { BookOpen, Film, FileText, Mic, Star, Tv, X } from 'lucide-react'
import { useEffect, useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Input, Textarea } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import type { MediaItem, MediaType, MediaStatus } from '@/core/db'
import { MEDIA_STATUS, MEDIA_TYPES, addMedia, updateMedia } from './db'

interface Props {
  open: boolean
  onClose: () => void
  /** 传入则进入编辑模式，否则为新增 */
  editing?: MediaItem | null
  /** 默认类型，新增时使用 */
  defaultType?: MediaType
  onSaved?: () => void
  /** 编辑模式下点击删除按钮时调用 */
  onDelete?: (item: MediaItem) => void
}

const TYPE_ICONS: Record<MediaType, typeof BookOpen> = {
  book: BookOpen,
  movie: Film,
  tv: Tv,
  podcast: Mic,
  other: FileText
}

export function AddEditDialog({ open, onClose, editing, defaultType = 'book', onSaved, onDelete }: Props) {
  const toast = useToast()
  const isEdit = !!editing

  const [title, setTitle] = useState('')
  const [type, setType] = useState<MediaType>(defaultType)
  const [status, setStatus] = useState<MediaStatus>('unread')
  const [rating, setRating] = useState<number>(0)
  const [progress, setProgress] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setTitle(editing.title)
      setType(editing.type)
      setStatus(editing.status)
      setRating(editing.rating ?? 0)
      setProgress(editing.progress ?? '')
      setTags(editing.tags ?? [])
      setNotes(editing.notes ?? '')
    } else {
      setTitle('')
      setType(defaultType)
      setStatus('unread')
      setRating(0)
      setProgress('')
      setTags([])
      setNotes('')
    }
    setTagInput('')
  }, [open, editing, defaultType])

  const commitTagInput = () => {
    const raw = tagInput.trim().replace(/,$/, '')
    if (!raw) {
      setTagInput('')
      return
    }
    setTags((prev) => (prev.includes(raw) ? prev : [...prev, raw]))
    setTagInput('')
  }

  const onTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
      e.preventDefault()
      commitTagInput()
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1))
    }
  }

  const removeTag = (idx: number) => {
    setTags((prev) => prev.filter((_, i) => i !== idx))
  }

  const onStarClick = (n: number) => {
    // 再次点同一颗星 → 清零
    setRating((prev) => (prev === n ? 0 : n))
  }

  const onSave = async () => {
    const t = title.trim()
    if (!t) {
      toast('请填写标题', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: t,
        type,
        status,
        rating: rating > 0 ? rating : undefined,
        progress: progress.trim() || undefined,
        tags,
        notes: notes.trim() || undefined
      }
      if (isEdit && editing?.id) {
        // 切换到已完成且之前没有 completedAt 时补一个时间戳
        const completedAt =
          status === 'done' && !editing.completedAt ? Date.now() : status === 'done' ? editing.completedAt : undefined
        await updateMedia(editing.id, { ...payload, completedAt })
        toast('已更新', 'success')
      } else {
        await addMedia(payload)
        toast('已添加', 'success')
      }
      onSaved?.()
      onClose()
    } catch (e) {
      console.error(e)
      toast('保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? '编辑条目' : '添加条目'}
      footer={
        <>
          {isEdit && onDelete && editing && (
            <Button
              variant="ghost"
              className="mr-auto text-red-500 hover:bg-red-50"
              onClick={() => onDelete(editing)}
              disabled={saving}
            >
              删除
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button variant="primary" onClick={onSave} disabled={saving}>
            保存
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="标题">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：三体"
            autoFocus
          />
        </Field>

        <Field label="类型">
          <div className="flex flex-wrap gap-2">
            {MEDIA_TYPES.map((t) => {
              const Icon = TYPE_ICONS[t.value]
              const active = type === t.value
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={clsx(
                    'inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-sm transition',
                    active
                      ? 'bg-blue-50 border-blue-300 text-blue-600'
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                  )}
                >
                  <Icon size={16} />
                  {t.label}
                </button>
              )
            })}
          </div>
        </Field>

        <Field label="状态">
          <div className="inline-flex p-1 rounded-xl bg-stone-100 text-sm">
            {MEDIA_STATUS.map((s) => {
              const active = status === s.value
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={clsx(
                    'px-3 h-8 rounded-lg transition',
                    active ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
                  )}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </Field>

        <Field label="评分（可选）">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`评 ${n} 颗星`}
                onClick={() => onStarClick(n)}
                className="p-1 -m-1"
              >
                <Star
                  size={24}
                  className={clsx(
                    'transition',
                    n <= rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                  )}
                />
              </button>
            ))}
            {rating > 0 && (
              <button
                type="button"
                onClick={() => setRating(0)}
                className="ml-2 text-xs text-stone-400 hover:text-stone-700"
              >
                清除
              </button>
            )}
          </div>
        </Field>

        <Field label="进度（可选）" hint="例如：第 3 集、第 100 页、看到 1:23:45">
          <Input
            value={progress}
            onChange={(e) => setProgress(e.target.value)}
            placeholder="自由文本"
          />
        </Field>

        <Field label="标签" hint="回车或逗号分隔">
          <div className="flex flex-wrap items-center gap-1.5 px-2 py-2 rounded-xl border border-stone-200 bg-white min-h-11">
            {tags.map((t, i) => (
              <span
                key={`${t}-${i}`}
                className="inline-flex items-center gap-1 px-2 h-7 rounded-lg bg-blue-50 text-blue-700 text-xs"
              >
                {t}
                <button
                  type="button"
                  onClick={() => removeTag(i)}
                  className="text-blue-400 hover:text-blue-700"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={onTagKeyDown}
              onBlur={commitTagInput}
              placeholder={tags.length === 0 ? '科幻 / 刘慈欣' : ''}
              className="flex-1 min-w-24 h-7 bg-transparent outline-none text-sm"
            />
          </div>
        </Field>

        <Field label="笔记（可选）">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="摘抄、感受、吐槽…"
            rows={4}
          />
        </Field>
      </div>
    </Dialog>
  )
}
