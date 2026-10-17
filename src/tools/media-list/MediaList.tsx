/**
 * 阅读观影清单 - 主入口
 * ------------------------------------------------------------
 * 路由 /media，默认导出。挂载到 Layout（accent="media"）下。
 *
 * 功能要点：
 * - 列表加载、勾选 / 取消、编辑、删除
 * - 顶部搜索 / 排序 / 筛选 / 回顾上月
 * - 右下角 FAB 添加
 * - 移动单列、桌面 2 列网格
 */
import { clsx } from 'clsx'
import { ListChecks, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Layout } from '@/components/Layout'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Empty } from '@/components/ui/Empty'
import { useToast } from '@/components/ui/Toast'
import type { MediaItem } from '@/core/db'
import {
  applySort,
  deleteMedia,
  listAllMedia,
  type SortMode
} from './db'
import { AddEditDialog } from './AddEditDialog'
import { FilterBar, type MediaFilter } from './FilterBar'
import { MediaCard } from './MediaCard'
import { ReviewDialog } from './ReviewDialog'

export default function MediaList() {
  const toast = useToast()
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)

  // 过滤/排序/搜索状态
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('default')
  const [filter, setFilter] = useState<MediaFilter>({})

  // 弹窗状态
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<MediaItem | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null)

  const reload = async () => {
    const data = await listAllMedia()
    setItems(data)
    setLoading(false)
  }

  useEffect(() => {
    void reload()
  }, [])

  // 搜索 + 筛选
  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase()
    return items.filter((it) => {
      if (filter.type && it.type !== filter.type) return false
      if (filter.status && it.status !== filter.status) return false
      if (filter.tag && !it.tags.includes(filter.tag)) return false
      if (kw) {
        const hay = `${it.title} ${it.notes ?? ''} ${it.tags.join(' ')} ${it.progress ?? ''}`.toLowerCase()
        if (!hay.includes(kw)) return false
      }
      return true
    })
  }, [items, search, filter])

  const sorted = useMemo(() => applySort(filtered, sortMode), [filtered, sortMode])

  const onAdd = () => {
    setEditing(null)
    setEditorOpen(true)
  }

  const onEdit = (it: MediaItem) => {
    setEditing(it)
    setEditorOpen(true)
  }

  const onRequestDelete = (it: MediaItem) => {
    setEditing(null)
    setEditorOpen(false)
    setDeleteTarget(it)
  }

  const onConfirmDelete = async () => {
    if (!deleteTarget?.id) return
    try {
      await deleteMedia(deleteTarget.id)
      toast('已删除', 'success')
      await reload()
    } finally {
      setDeleteTarget(null)
    }
  }

  // 完成统计
  const doneCount = items.filter((x) => x.status === 'done').length

  return (
    <Layout
      title="阅读观影清单"
      accent="media"
      actions={
        <span className="text-xs text-stone-400 mr-1">
          共 {items.length} 项{doneCount > 0 && ` · 已完成 ${doneCount}`}
        </span>
      }
    >
      {/* 工具栏 */}
      <FilterBar
        allItems={items}
        search={search}
        onSearchChange={setSearch}
        sortMode={sortMode}
        onSortChange={setSortMode}
        filter={filter}
        onFilterChange={setFilter}
        onReview={() => setReviewOpen(true)}
      />

      {/* 列表 */}
      {loading ? (
        <div className="py-12 text-center text-sm text-stone-400">加载中…</div>
      ) : sorted.length === 0 ? (
        <Empty
          icon={<ListChecks size={22} />}
          title={items.length === 0 ? '清单还是空的' : '没找到符合条件的项'}
          hint={
            items.length === 0
              ? '点击右下角加号，添加第一本想读 / 想看的内容'
              : '试试清空搜索或筛选条件'
          }
          action={
            items.length === 0 ? (
              <Button variant="primary" size="sm" onClick={onAdd}>
                <Plus size={14} /> 添加条目
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {sorted.map((it) => (
            <MediaCard
              key={it.id}
              item={it}
              onChanged={reload}
              onLongPress={onEdit}
            />
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={onAdd}
        aria-label="添加"
        className={clsx(
          'fixed right-4 bottom-6 z-40 w-14 h-14 rounded-full',
          'bg-stone-900 text-white shadow-lg hover:bg-stone-800 active:bg-stone-950',
          'inline-flex items-center justify-center transition safe-bottom'
        )}
      >
        <Plus size={22} />
      </button>

      {/* 添加 / 编辑弹窗 */}
      <AddEditDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        editing={editing}
        onSaved={reload}
        onDelete={onRequestDelete}
      />

      {/* 回顾上月 */}
      <ReviewDialog open={reviewOpen} onClose={() => setReviewOpen(false)} />

      {/* 删除确认 */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="删除条目"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button variant="danger" onClick={onConfirmDelete}>
              删除
            </Button>
          </>
        }
      >
        <p className="text-sm text-stone-600">
          确定删除「<span className="font-semibold text-stone-900">{deleteTarget?.title}</span>」吗？此操作不可撤销。
        </p>
      </Dialog>

      {/* 右下角 FAB 与底部留白 */}
      <div className="h-16" />
    </Layout>
  )
}
