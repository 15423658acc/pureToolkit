/**
 * 上月回顾弹窗
 * - 按 completedAt 范围筛选
 * - 按 type 分组展示
 * - 一句话总结："上月看了 5 本书、3 部电影、2 部剧"
 */
import { ListChecks } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Empty } from '@/components/ui/Empty'
import type { MediaItem, MediaType } from '@/core/db'
import { listLastMonthCompleted, lastMonthRange, MEDIA_TYPES, typeLabel } from './db'

interface Props {
  open: boolean
  onClose: () => void
}

export function ReviewDialog({ open, onClose }: Props) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [label, setLabel] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLabel(lastMonthRange().label)
    setLoading(true)
    listLastMonthCompleted()
      .then(setItems)
      .finally(() => setLoading(false))
  }, [open])

  // 按 type 分组
  const groups = MEDIA_TYPES.map((t) => ({
    type: t.value,
    label: t.label,
    items: items.filter((x) => x.type === t.value)
  })).filter((g) => g.items.length > 0)

  const counter = (label: string) => {
    if (label === '书') return '本'
    if (label === '电影' || label === '剧') return '部'
    if (label === '播客') return '期'
    return '个'
  }

  const summary = groups
    .map((g) => `${g.items.length} ${counter(g.label)}${g.label}`)
    .join('、')

  return (
    <Dialog open={open} onClose={onClose} title={`${label || '上月'}回顾`} size="md">
      {loading ? (
        <div className="py-8 text-center text-sm text-stone-400">加载中…</div>
      ) : items.length === 0 ? (
        <Empty
          icon={<ListChecks size={22} />}
          title={`${label || '上月'}没标记过完成项`}
          hint="勾选条目时会自动记录完成时间，下个月就能看到回顾了"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {/* 总结 */}
          <div className="px-3 py-2.5 rounded-xl bg-blue-50 text-blue-700 text-sm">
            {label || '上月'}看了 {summary}
          </div>

          {/* 分组列表 */}
          {groups.map((g) => (
            <div key={g.type}>
              <h3 className="text-xs font-semibold text-stone-500 mb-1.5">
                {typeLabel(g.type as MediaType)}
                <span className="ml-1 text-stone-400">· {g.items.length}</span>
              </h3>
              <ul className="space-y-1">
                {g.items.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-baseline gap-2 px-2 py-1.5 rounded-lg hover:bg-stone-50"
                  >
                    <span className="flex-1 truncate text-sm text-stone-800">{it.title}</span>
                    {it.rating ? (
                      <span className="text-xs text-amber-500">{it.rating}★</span>
                    ) : null}
                    {it.tags.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px]"
                      >
                        {t}
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Dialog>
  )
}
