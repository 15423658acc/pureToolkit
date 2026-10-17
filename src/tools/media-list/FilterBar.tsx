/**
 * FilterBar：搜索 / 排序 / 筛选
 * ------------------------------------------------------------
 * 暴露给 MediaList 三个状态：search、sortMode、filter
 * - 搜索：点放大镜图标显示/隐藏顶部搜索条
 * - 排序：下拉菜单 4 个选项
 * - 筛选：弹 dialog 选 type / tag / status
 */
import { clsx } from 'clsx'
import { Check, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Input'
import type { MediaItem, MediaType, MediaStatus } from '@/core/db'
import { MEDIA_STATUS, MEDIA_TYPES, type SortMode } from './db'

export interface MediaFilter {
  type?: MediaType
  status?: MediaStatus
  tag?: string
}

interface Props {
  /** 全部数据，用于提取已有 tag 列表 */
  allItems: MediaItem[]
  search: string
  onSearchChange: (v: string) => void
  sortMode: SortMode
  onSortChange: (m: SortMode) => void
  filter: MediaFilter
  onFilterChange: (f: MediaFilter) => void
  /** 顶部右上角"回顾上月"按钮 */
  onReview: () => void
}

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'default', label: '默认（完成下沉）' },
  { value: 'addedAt', label: '添加时间' },
  { value: 'rating', label: '评分' },
  { value: 'type', label: '类型' }
]

export function FilterBar({
  allItems,
  search,
  onSearchChange,
  sortMode,
  onSortChange,
  filter,
  onFilterChange,
  onReview
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  // 提取所有 tag（去重）
  const allTags = Array.from(new Set(allItems.flatMap((x) => x.tags))).sort()

  // 关闭 sort 下拉
  useEffect(() => {
    if (!sortOpen) return
    const onDoc = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [sortOpen])

  const activeFilterCount =
    (filter.type ? 1 : 0) + (filter.status ? 1 : 0) + (filter.tag ? 1 : 0)

  const clearFilter = () => onFilterChange({})

  return (
    <div className="mb-3">
      {/* 操作按钮行 */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setSearchOpen((v) => !v)}
          aria-label="搜索"
          className={clsx(
            'w-9 h-9 -ml-1.5 rounded-xl inline-flex items-center justify-center transition',
            searchOpen ? 'bg-blue-50 text-blue-600' : 'text-stone-600 hover:bg-stone-100'
          )}
        >
          <Search size={18} />
        </button>

        {/* 排序下拉 */}
        <div className="relative" ref={sortRef}>
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            className="inline-flex items-center gap-1 h-9 px-2.5 rounded-xl text-stone-600 hover:bg-stone-100 text-sm"
          >
            <ChevronDown size={16} />
            <span className="hidden sm:inline">
              {SORT_OPTIONS.find((o) => o.value === sortMode)?.label ?? '排序'}
            </span>
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-10 z-20 w-44 bg-white rounded-xl shadow-lg border border-stone-100 py-1.5">
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onSortChange(o.value)
                    setSortOpen(false)
                  }}
                  className={clsx(
                    'w-full text-left px-3 h-9 inline-flex items-center justify-between text-sm hover:bg-stone-50',
                    sortMode === o.value ? 'text-blue-600' : 'text-stone-700'
                  )}
                >
                  {o.label}
                  {sortMode === o.value && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 筛选 */}
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className={clsx(
            'relative inline-flex items-center gap-1 h-9 px-2.5 rounded-xl text-sm transition',
            activeFilterCount > 0
              ? 'bg-blue-50 text-blue-600'
              : 'text-stone-600 hover:bg-stone-100'
          )}
        >
          <SlidersHorizontal size={16} />
          <span className="hidden sm:inline">筛选</span>
          {activeFilterCount > 0 && (
            <span className="ml-1 min-w-4 h-4 px-1 inline-flex items-center justify-center rounded-full bg-blue-500 text-white text-[10px]">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* 回顾上月 */}
        <Button
          variant="soft"
          size="sm"
          className="ml-auto"
          onClick={onReview}
        >
          回顾上月
        </Button>
      </div>

      {/* 搜索条 */}
      {searchOpen && (
        <div className="mt-2 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索标题 / 笔记 / 标签…"
            autoFocus
            className="w-full h-10 pl-9 pr-9 text-sm rounded-xl border border-stone-200 bg-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
          />
          {search && (
            <button
              type="button"
              aria-label="清空"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 inline-flex items-center justify-center text-stone-400 hover:text-stone-700"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* 当前激活筛选的 chip 行 */}
      {activeFilterCount > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {filter.type && (
            <Chip onClear={() => onFilterChange({ ...filter, type: undefined })}>
              类型：{MEDIA_TYPES.find((t) => t.value === filter.type)?.label}
            </Chip>
          )}
          {filter.status && (
            <Chip onClear={() => onFilterChange({ ...filter, status: undefined })}>
              状态：{MEDIA_STATUS.find((s) => s.value === filter.status)?.label}
            </Chip>
          )}
          {filter.tag && (
            <Chip onClear={() => onFilterChange({ ...filter, tag: undefined })}>
              标签：{filter.tag}
            </Chip>
          )}
          <button
            type="button"
            onClick={clearFilter}
            className="text-xs text-stone-400 hover:text-stone-700 px-1.5"
          >
            清除全部
          </button>
        </div>
      )}

      {/* 筛选 Dialog */}
      <Dialog
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="筛选"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={clearFilter}>
              清除
            </Button>
            <Button variant="primary" onClick={() => setFilterOpen(false)}>
              完成
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="类型">
            <ChipGroup
              options={MEDIA_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              value={filter.type}
              onChange={(v) =>
                onFilterChange({ ...filter, type: v as MediaType | undefined })
              }
            />
          </Field>

          <Field label="状态">
            <ChipGroup
              options={MEDIA_STATUS.map((s) => ({ value: s.value, label: s.label }))}
              value={filter.status}
              onChange={(v) =>
                onFilterChange({ ...filter, status: v as MediaStatus | undefined })
              }
            />
          </Field>

          <Field label="标签" hint={allTags.length === 0 ? '还没有任何标签' : undefined}>
            {allTags.length === 0 ? (
              <p className="text-xs text-stone-400 px-0.5">添加记录时输入的标签会在这里出现</p>
            ) : (
              <ChipGroup
                options={allTags.map((t) => ({ value: t, label: t }))}
                value={filter.tag}
                onChange={(v) => onFilterChange({ ...filter, tag: v })}
              />
            )}
          </Field>
        </div>
      </Dialog>
    </div>
  )
}

function Chip({ children, onClear }: { children: ReactNode; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 h-6 rounded-md bg-blue-50 text-blue-700 text-xs">
      {children}
      <button
        type="button"
        onClick={onClear}
        aria-label="移除"
        className="text-blue-400 hover:text-blue-700"
      >
        <X size={11} />
      </button>
    </span>
  )
}

interface ChipGroupProps {
  options: { value: string; label: string }[]
  value?: string
  onChange: (v: string | undefined) => void
}

function ChipGroup({ options, value, onChange }: ChipGroupProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(active ? undefined : o.value)}
            className={clsx(
              'h-8 px-3 rounded-lg border text-sm transition',
              active
                ? 'bg-blue-50 border-blue-300 text-blue-600'
                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
