/**
 * 单行日程组件
 * ------------------------------------------------------------
 * - 行高 64px
 * - 左侧 4px 竖色条按 tag 颜色
 * - tag 用小 chip 显示（带颜色背景 + 文字）
 * - 时间在标题前面
 * - 已完成项淡灰 + 删除线，整行 bg-stone-50
 * - 未完成项右滑出 [跳过] 按钮
 * - 未完成项可拖拽（draggable + drag handlers 由父组件传入）
 */
import { clsx } from 'clsx'
import { Check, SkipForward } from 'lucide-react'
import { type DragEvent, useEffect, useRef, useState } from 'react'
import type { ScheduleTagDef } from '@/core/db'
import { findTagColor } from './tags'
import type { DisplayItem } from './logic'

interface ScheduleRowProps {
  item: DisplayItem
  customTags: ScheduleTagDef[]
  /** 点击勾选完成 */
  onToggleDone: () => void
  /** 跳过 */
  onSkip: () => void
  /** 点击行（进入编辑） */
  onEdit: () => void
  /** 拖拽相关 */
  draggable?: boolean
  onDragStart?: (e: DragEvent<HTMLDivElement>) => void
  onDragOver?: (e: DragEvent<HTMLDivElement>) => void
  onDrop?: (e: DragEvent<HTMLDivElement>) => void
  onDragEnd?: (e: DragEvent<HTMLDivElement>) => void
  /** 是否被拖拽中 */
  isDragging?: boolean
  /** 是否为放置目标 */
  isDropTarget?: boolean
}

export function ScheduleRow({
  item,
  customTags,
  onToggleDone,
  onSkip,
  onEdit,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  isDropTarget
}: ScheduleRowProps) {
  const color = findTagColor(item.tag, customTags)
  const isCompleted = item.done || item.skipped

  // 右滑出"跳过"按钮的状态
  const [translateX, setTranslateX] = useState(0)
  const startX = useRef<number | null>(null)
  const startT = useRef<number>(0)
  const dragging = useRef(false)

  // 已完成项不允许滑出
  const SKIP_WIDTH = 80

  const onTouchStart = (e: React.TouchEvent) => {
    if (isCompleted) return
    startX.current = e.touches[0].clientX
    startT.current = Date.now()
    dragging.current = false
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current == null || isCompleted) return
    const dx = e.touches[0].clientX - startX.current
    if (Math.abs(dx) > 4) dragging.current = true
    // 仅允许向左滑（dx < 0），且最多滑出 SKIP_WIDTH
    const next = Math.max(-SKIP_WIDTH, Math.min(0, dx))
    setTranslateX(next)
  }
  const onTouchEnd = () => {
    if (startX.current == null) return
    // 小于 -SKIP_WIDTH/2 时保持打开
    setTranslateX((curr) => (curr < -SKIP_WIDTH / 2 ? -SKIP_WIDTH : 0))
    startX.current = null
    // 防止误触：短时间小位移不算滑动，不触发点击
    setTimeout(() => { dragging.current = false }, 0)
  }

  // 点击行进入编辑（如果未在滑动）。
  // 我们用 click 事件，但若刚刚发生过滑动则跳过。
  const wasSwiping = useRef(false)
  useEffect(() => {
    if (translateX !== 0) wasSwiping.current = true
    const t = setTimeout(() => { wasSwiping.current = false }, 300)
    return () => clearTimeout(t)
  }, [translateX])

  const handleClick = () => {
    if (wasSwiping.current) return
    onEdit()
  }

  return (
    <div
      className={clsx(
        'relative overflow-hidden',
        isDragging && 'opacity-60'
      )}
    >
      {/* 跳过按钮（行底部，被前景盖住） */}
      {!isCompleted && (
        <button
          aria-label="跳过"
          onClick={() => { setTranslateX(0); onSkip() }}
          className="absolute top-0 right-0 h-full w-20 bg-stone-300 text-stone-700 inline-flex items-center justify-center gap-1 text-xs"
        >
          <SkipForward size={14} />
          跳过
        </button>
      )}

      {/* 主行 */}
      <div
        role="row"
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleClick}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: 'transform 0.18s ease'
        }}
        className={clsx(
          'relative h-16 flex items-stretch cursor-pointer',
          'bg-white',
          isCompleted && 'bg-stone-50',
          isDropTarget && 'ring-2 ring-purple-300 ring-inset',
          // 拖拽时的占位效果
          isDragging && 'rotate-2'
        )}
      >
        {/* 左侧 4px 竖色条 */}
        <div className={clsx('w-1 shrink-0', color.barClass)} />

        {/* 完成圆圈 */}
        <button
          aria-label={item.done ? '取消完成' : '标记完成'}
          onClick={(e) => {
            e.stopPropagation()
            onToggleDone()
          }}
          className={clsx(
            'shrink-0 ml-2.5 w-6 h-6 rounded-full border-2 inline-flex items-center justify-center transition',
            item.done
              ? 'bg-purple-500 border-purple-500 text-white'
              : 'border-stone-300 text-transparent hover:border-stone-500'
          )}
        >
          <Check size={14} strokeWidth={3} />
        </button>

        {/* 内容区 */}
        <div className="flex-1 min-w-0 ml-3 flex flex-col justify-center">
          {/* 顶行：时间 + 标题 */}
          <div className="flex items-center gap-2">
            {item.time && (
              <span className={clsx(
                'text-xs font-semibold tabular-nums shrink-0',
                isCompleted ? 'text-stone-400' : 'text-purple-500'
              )}>
                {item.time}
              </span>
            )}
            <span className={clsx(
              'text-sm font-medium truncate',
              isCompleted ? 'text-stone-400 line-through' : 'text-stone-900'
            )}>
              {item.title}
            </span>
          </div>
          {/* 底行：tag chip */}
          <div className="mt-1 flex items-center gap-1.5">
            <span className={clsx(
              'inline-flex items-center gap-1 h-5 px-1.5 rounded-md text-[10px] font-medium',
              color.bgSoft,
              isCompleted ? 'text-stone-400' : color.text
            )}>
              <span className={clsx('w-1.5 h-1.5 rounded-full', color.barClass)} />
              {item.tag}
            </span>
            {item.isVirtual && (
              <span className="text-[10px] text-stone-400">
                {item.repeat === 'daily' ? '每日' :
                  item.repeat === 'weekly' ? '每周' : '每月'}
              </span>
            )}
            {item.skipped && (
              <span className="text-[10px] text-stone-400">已跳过</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
