/**
 * 单条记录卡片
 * - 左侧圆形复选框（点击勾选 / 取消）
 * - 类型图标 + 标题（蓝色边线表示未完成）
 * - 评分、进度、标签、笔记摘要
 * - 长按弹编辑
 */
import { clsx } from 'clsx'
import {
  BookOpen,
  Check,
  FileText,
  Film,
  Mic,
  Star,
  Tv
} from 'lucide-react'
import { useEffect, useRef, type MouseEvent } from 'react'
import type { MediaItem, MediaType } from '@/core/db'
import { toggleDone, typeLabel } from './db'

const TYPE_ICONS: Record<MediaType, typeof BookOpen> = {
  book: BookOpen,
  movie: Film,
  tv: Tv,
  podcast: Mic,
  other: FileText
}

interface Props {
  item: MediaItem
  onChanged: () => void
  onLongPress: (item: MediaItem) => void
}

const LONG_PRESS_MS = 500

export function MediaCard({ item, onChanged, onLongPress }: Props) {
  const timerRef = useRef<number | null>(null)
  const longPressedRef = useRef(false)

  const Icon = TYPE_ICONS[item.type]
  const done = item.status === 'done'
  const rating = item.rating ?? 0

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  const startLongPress = () => {
    longPressedRef.current = false
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      longPressedRef.current = true
      onLongPress(item)
      timerRef.current = null
    }, LONG_PRESS_MS)
  }

  const cancelLongPress = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  // 卡片点击（非复选框、非长按）→ 触发编辑
  const onCardClick = () => {
    if (longPressedRef.current) {
      longPressedRef.current = false
      return
    }
    onLongPress(item)
  }

  const onCheckboxClick = (e: MouseEvent) => {
    e.stopPropagation()
    cancelLongPress()
    void toggleDone(item).then(onChanged)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onCardClick}
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onContextMenu={(e) => {
        e.preventDefault()
        onLongPress(item)
      }}
      className={clsx(
        'relative bg-white rounded-2xl shadow-bento border border-stone-100',
        'pl-4 pr-3 py-3 cursor-pointer transition',
        'flex items-start gap-3',
        done ? 'opacity-60' : ''
      )}
    >
      {/* 左侧 4px 蓝色竖线 */}
      {!done && (
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-blue-500" aria-hidden />
      )}

      {/* 圆形复选框 */}
      <button
        type="button"
        onClick={onCheckboxClick}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        aria-label={done ? '取消完成' : '标记完成'}
        className={clsx(
          'mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 inline-flex items-center justify-center transition',
          done
            ? 'bg-blue-500 border-blue-500 text-white'
            : 'border-stone-300 text-transparent hover:border-blue-400'
        )}
      >
        <Check size={14} strokeWidth={3} />
      </button>

      {/* 主体 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon size={16} className={done ? 'text-stone-400 shrink-0' : 'text-blue-500 shrink-0'} />
          <h3
            className={clsx(
              'font-semibold text-stone-900 truncate text-sm',
              done && 'line-through text-stone-400'
            )}
          >
            {item.title}
          </h3>
          <span className="ml-auto shrink-0 text-[10px] text-stone-400">{typeLabel(item.type)}</span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-stone-500">
          {rating > 0 && (
            <span className="inline-flex items-center gap-0.5 text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={11}
                  className={i < rating ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}
                />
              ))}
            </span>
          )}
          {item.progress && (
            <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">{item.progress}</span>
          )}
          {item.tags.slice(0, 3).map((t) => (
            <span key={t} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
              {t}
            </span>
          ))}
          {item.tags.length > 3 && (
            <span className="text-stone-400">+{item.tags.length - 3}</span>
          )}
        </div>

        {item.notes && (
          <p
            className={clsx(
              'mt-1.5 text-xs text-stone-500 line-clamp-2',
              done && 'line-through text-stone-400'
            )}
          >
            {item.notes}
          </p>
        )}
      </div>
    </div>
  )
}
