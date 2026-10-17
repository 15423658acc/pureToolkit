/**
 * 保质期管家 - 主入口
 * ------------------------------------------------------------
 * 路由 /expiry。三视图切换（列表 / 卡片 / 日历）、顶部提醒横幅、
 * 添加 FAB、归档/删除、本地通知、自定义标签。
 */
import { clsx } from 'clsx'
import { CalendarDays, Grid3x3, List, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ExpiryCustomTag, ExpiryItem } from '@/core/db'
import { Layout } from '@/components/Layout'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { registerPeriodicSync, requestNotificationPermission, showNotification } from '@/core/notify'
import {
  archiveExpiryItem,
  deleteExpiryItem,
  getDaysLeft,
  getStatus,
  listCustomTags,
  listExpiryItems,
  unarchiveExpiryItem,
  type ExpiryStatus
} from './db'
import { ReminderBanner } from './ReminderBanner'
import { AddItemDialog } from './AddItemDialog'
import { CustomTagManager } from './CustomTagManager'
import { ListView } from './views/ListView'
import { CardView } from './views/CardView'
import { CalendarView } from './views/CalendarView'

type ViewMode = 'list' | 'card' | 'calendar'
type FilterMode = 'all' | ExpiryStatus

const NOTIF_DISMISS_KEY = 'puretoolkit.expiry.notifDismissed'
const NOTIF_TODAY_KEY = () => `puretoolkit.expiry.notified.${new Date().toISOString().slice(0, 10)}`

const FILTER_CHIPS: { key: FilterMode; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'expired', label: '已过期' },
  { key: 'soon', label: '7天内' },
  { key: 'near', label: '30天内' },
  { key: 'far', label: '远期' }
]

const VIEW_BUTTONS: { mode: ViewMode; Icon: typeof List; label: string }[] = [
  { mode: 'list', Icon: List, label: '列表' },
  { mode: 'card', Icon: Grid3x3, label: '卡片' },
  { mode: 'calendar', Icon: CalendarDays, label: '日历' }
]

export default function Expiry() {
  const toast = useToast()
  const [items, setItems] = useState<ExpiryItem[]>([])
  const [customTags, setCustomTags] = useState<ExpiryCustomTag[]>([])
  const [view, setView] = useState<ViewMode>('list')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<ExpiryItem | null>(null)
  const [manageTagsOpen, setManageTagsOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [archivedOpen, setArchivedOpen] = useState(false)

  const loadData = useCallback(async () => {
    const [allItems, tags] = await Promise.all([
      listExpiryItems(true),
      listCustomTags()
    ])
    setItems(allItems)
    setCustomTags(tags)
  }, [])

  // 挂载：加载数据 + 通知权限提示 + 扫描提醒 + 注册后台同步
  useEffect(() => {
    void (async () => {
      await loadData()
      // 通知权限：未授权且未"暂不"过，弹引导
      if (
        'Notification' in window &&
        Notification.permission === 'default' &&
        !localStorage.getItem(NOTIF_DISMISS_KEY)
      ) {
        setNotifOpen(true)
      }
      // 已授权：扫描 7 天内到期项并弹通知（每天至多一次）
      if ('Notification' in window && Notification.permission === 'granted') {
        if (!localStorage.getItem(NOTIF_TODAY_KEY())) {
          const soon = (await listExpiryItems(false)).filter(
            (i) => getStatus(i.endDate) === 'soon'
          )
          if (soon.length > 0) {
            const body =
              soon
                .slice(0, 5)
                .map((i) => `${i.name}还有 ${getDaysLeft(i.endDate)} 天到期`)
                .join('，') + (soon.length > 5 ? '…' : '')
            void showNotification('保质期提醒', body)
            localStorage.setItem(NOTIF_TODAY_KEY(), '1')
          }
        }
      }
      // 尝试注册 Periodic Background Sync（静默，仅 Chrome 安卓生效）
      void registerPeriodicSync('expiry-check')
    })()
  }, [loadData])

  const nonArchived = useMemo(() => items.filter((i) => !i.archived), [items])
  const archivedItems = useMemo(() => items.filter((i) => i.archived), [items])

  const visibleItems = useMemo(() => {
    if (filter === 'all') return nonArchived
    return nonArchived.filter((i) => getStatus(i.endDate) === filter)
  }, [nonArchived, filter])

  const handleBannerFilter = (status: ExpiryStatus) => {
    setFilter(status)
    setView('list')
  }

  const handleEdit = (item: ExpiryItem) => {
    setEditItem(item)
    setAddOpen(true)
  }

  const handleAdd = () => {
    setEditItem(null)
    setAddOpen(true)
  }

  const handleArchive = async (id: number) => {
    await archiveExpiryItem(id)
    await loadData()
  }
  const handleUnarchive = async (id: number) => {
    await unarchiveExpiryItem(id)
    await loadData()
  }
  const handleDelete = async (id: number) => {
    await deleteExpiryItem(id)
    await loadData()
  }

  const handleEnableNotif = async () => {
    const ok = await requestNotificationPermission()
    if (ok) {
      toast('已开启通知，App 启动时会提醒你', 'success')
      // 立即尝试弹一次提醒 + 注册后台同步
      const soon = nonArchived.filter((i) => getStatus(i.endDate) === 'soon')
      if (soon.length > 0) {
        const body = soon
          .slice(0, 5)
          .map((i) => `${i.name}即将到期`)
          .join('，')
        void showNotification('保质期提醒', body)
        localStorage.setItem(NOTIF_TODAY_KEY(), '1')
      }
      void registerPeriodicSync('expiry-check')
    } else {
      toast('未开启通知权限，可在浏览器设置中重新开启', 'info')
    }
    setNotifOpen(false)
  }

  const handleDismissNotif = () => {
    localStorage.setItem(NOTIF_DISMISS_KEY, '1')
    setNotifOpen(false)
  }

  return (
    <Layout
      accent="expiry"
      title="保质期管家"
      actions={
        <div className="flex items-center gap-1">
          {VIEW_BUTTONS.map(({ mode, Icon, label }) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              aria-label={label}
              className={clsx(
                'w-9 h-9 rounded-xl inline-flex items-center justify-center transition',
                view === mode
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-500 hover:bg-stone-100'
              )}
            >
              <Icon size={18} />
            </button>
          ))}
        </div>
      }
    >
      {/* 固定提醒依赖说明 */}
      <p className="text-xs text-stone-400 px-1 mb-3 leading-relaxed">
        ⚠️ 提醒依赖 App 至少每日打开一次，iOS 不支持后台推送，请勿用于关键事项。
      </p>

      {/* 顶部横幅 */}
      <ReminderBanner items={nonArchived} onFilter={handleBannerFilter} />

      {/* 过滤 chip（仅列表/卡片视图生效） */}
      {view !== 'calendar' && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {FILTER_CHIPS.map((c) => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={clsx(
                'px-2.5 h-7 rounded-full text-xs font-medium transition',
                filter === c.key
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* 主视图 */}
      {view === 'list' && (
        <ListView
          items={visibleItems}
          onEdit={handleEdit}
          onArchive={handleArchive}
          onUnarchive={handleUnarchive}
          onDelete={handleDelete}
        />
      )}
      {view === 'card' && (
        <CardView items={visibleItems} onEdit={handleEdit} />
      )}
      {view === 'calendar' && (
        <CalendarView items={nonArchived} onEdit={handleEdit} />
      )}

      {/* 已归档折叠区（仅列表 + 全部筛选时显示） */}
      {view === 'list' && filter === 'all' && archivedItems.length > 0 && (
        <div className="mt-4 border-t border-stone-100 pt-3">
          <button
            onClick={() => setArchivedOpen((v) => !v)}
            className="w-full flex items-center justify-between text-xs text-stone-500 px-1"
          >
            <span>已归档 ({archivedItems.length})</span>
            <span>{archivedOpen ? '收起' : '展开'}</span>
          </button>
          {archivedOpen && (
            <div className="mt-2">
              <ListView
                items={archivedItems}
                onEdit={handleEdit}
                onArchive={handleArchive}
                onUnarchive={handleUnarchive}
                onDelete={handleDelete}
              />
            </div>
          )}
        </div>
      )}

      {/* 浮动添加按钮 */}
      <button
        onClick={handleAdd}
        aria-label="添加物品"
        className="fixed bottom-6 right-4 w-14 h-14 rounded-full bg-stone-900 text-white shadow-lg flex items-center justify-center active:scale-95 transition z-30"
      >
        <Plus size={26} />
      </button>

      {/* 添加 / 编辑弹窗 */}
      <AddItemDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        editItem={editItem}
        customTags={customTags}
        onManageCustomTags={() => {
          setAddOpen(false)
          setManageTagsOpen(true)
        }}
        onSaved={loadData}
      />

      {/* 自定义标签管理 */}
      <CustomTagManager
        open={manageTagsOpen}
        onClose={() => setManageTagsOpen(false)}
        onSaved={loadData}
      />

      {/* 通知权限引导 */}
      <Dialog
        open={notifOpen}
        onClose={handleDismissNotif}
        title="开启到期提醒？"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={handleDismissNotif}>暂不</Button>
            <Button variant="primary" onClick={handleEnableNotif}>开启通知</Button>
          </>
        }
      >
        <div className="space-y-2 text-sm text-stone-600">
          <p>打开通知后，App 启动时会提醒你即将到期的物品。</p>
          <p className="text-xs text-stone-400">
            已尝试开启后台提醒（实验性，仅 Chrome 安卓生效）。
          </p>
        </div>
      </Dialog>
    </Layout>
  )
}
