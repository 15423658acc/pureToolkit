/**
 * 生日倒计时 - 主入口
 * ------------------------------------------------------------
 * 路由 /birthday。
 * - 顶部红色横幅（橙色）：扫描今日 ≤ remindAdvance 且 ≤ 7 天的项
 * - 卡片列表：按距离下次生日天数升序
 * - 添加 / 编辑 FAB
 * - 本地通知（App 打开时）
 * - 首次进入通知权限引导
 */
import { Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Birthday } from '@/core/db'
import { Layout } from '@/components/Layout'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Empty } from '@/components/ui/Empty'
import { useToast } from '@/components/ui/Toast'
import {
  registerPeriodicSync,
  requestNotificationPermission,
  showNotification
} from '@/core/notify'
import { deleteBirthday, listBirthdays } from './db'
import { formatBirthdayLabel, getDaysUntilNext } from './lunar'
import { AddEditDialog } from './AddEditDialog'
import { BirthdayCard } from './BirthdayCard'
import { ReminderBanner } from './ReminderBanner'

const NOTIF_DISMISS_KEY = 'puretoolkit.birthday.notifDismissed'
const NOTIF_TODAY_KEY = () =>
  `puretoolkit.birthday.notified.${new Date().toISOString().slice(0, 10)}`

export default function BirthdayPage() {
  const toast = useToast()
  const [items, setItems] = useState<Birthday[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<Birthday | null>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [highlightId, setHighlightId] = useState<number | null>(null)
  const highlightTimer = useRef<number | null>(null)

  const loadData = useCallback(async () => {
    const all = await listBirthdays()
    setItems(all)
  }, [])

  // 挂载：加载数据 + 通知权限提示 + 扫描提醒 + 注册后台同步
  useEffect(() => {
    void (async () => {
      await loadData()
      if (
        'Notification' in window &&
        Notification.permission === 'default' &&
        !localStorage.getItem(NOTIF_DISMISS_KEY)
      ) {
        setNotifOpen(true)
      }
      // 已授权：扫描提醒范围内项弹通知（每天至多一次）
      if ('Notification' in window && Notification.permission === 'granted') {
        if (!localStorage.getItem(NOTIF_TODAY_KEY())) {
          const today = new Date()
          const all = await listBirthdays()
          const reminding = all
            .map((b) => ({ b, days: getDaysUntilNext(b, today) }))
            .filter(({ b, days }) => days >= 0 && days <= b.remindAdvance && days <= 7)
          if (reminding.length > 0) {
            const body =
              reminding
                .slice(0, 5)
                .map(({ b, days }) => {
                  const tail = days === 0 ? '今天生日' : `还有 ${days} 天`
                  return `${b.name} ${formatBirthdayLabel(b)} ${tail}`
                })
                .join('；') + (reminding.length > 5 ? '…' : '')
            void showNotification('生日提醒', body)
            localStorage.setItem(NOTIF_TODAY_KEY(), '1')
          }
        }
      }
      void registerPeriodicSync('birthday-check')
    })()
    return () => {
      if (highlightTimer.current !== null) {
        clearTimeout(highlightTimer.current)
      }
    }
  }, [loadData])

  // 排序：按"距离下次生日天数"升序
  const sorted = [...items].sort((a, b) => {
    const da = getDaysUntilNext(a)
    const db_ = getDaysUntilNext(b)
    return da - db_
  })

  const handleAdd = () => {
    setEditItem(null)
    setAddOpen(true)
  }

  const handleEdit = (b: Birthday) => {
    setEditItem(b)
    setAddOpen(true)
  }

  const handleDelete = async (id: number) => {
    await deleteBirthday(id)
    toast('已删除', 'info')
    await loadData()
  }

  const handleSelectBanner = (id: number) => {
    setHighlightId(id)
    if (highlightTimer.current !== null) clearTimeout(highlightTimer.current)
    highlightTimer.current = window.setTimeout(() => setHighlightId(null), 2000)
    // 滚动到对应卡片
    requestAnimationFrame(() => {
      const el = document.getElementById(`birthday-card-${id}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const handleEnableNotif = async () => {
    const ok = await requestNotificationPermission()
    if (ok) {
      toast('已开启通知，App 启动时会提醒你', 'success')
      const today = new Date()
      const reminding = items
        .map((b) => ({ b, days: getDaysUntilNext(b, today) }))
        .filter(({ b, days }) => days >= 0 && days <= b.remindAdvance && days <= 7)
      if (reminding.length > 0) {
        const body = reminding
          .slice(0, 5)
          .map(({ b, days }) =>
            days === 0 ? `${b.name} 今天生日` : `${b.name} 还有 ${days} 天`
          )
          .join('，')
        void showNotification('生日提醒', body)
        localStorage.setItem(NOTIF_TODAY_KEY(), '1')
      }
      void registerPeriodicSync('birthday-check')
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
    <Layout accent="birthday" title="生日倒计时">
      {/* 固定提醒依赖说明 */}
      <p className="text-xs text-stone-400 px-1 mb-3 leading-relaxed">
        ⚠️ iOS 不支持后台推送，建议每日打开 App 一次。
      </p>

      {/* 顶部橙色横幅 */}
      <ReminderBanner items={items} onSelect={handleSelectBanner} />

      {/* 列表 */}
      {sorted.length === 0 ? (
        <Empty
          icon={<Plus size={22} />}
          title="还没有生日记录"
          hint="点击右下角 + 添加亲友生日"
          action={
            <Button
              variant="primary"
              className="bg-orange-500 text-white hover:bg-orange-600"
              onClick={handleAdd}
            >
              添加第一个生日
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sorted.map((b) => (
            <div id={`birthday-card-${b.id}`} key={b.id}>
              <BirthdayCard
                birthday={b}
                highlight={highlightId === b.id}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={handleAdd}
        aria-label="添加生日"
        className="fixed bottom-6 right-4 w-14 h-14 rounded-full bg-orange-500 text-white shadow-lg flex items-center justify-center hover:bg-orange-600 active:scale-95 transition z-30"
      >
        <Plus size={26} />
      </button>

      {/* 添加 / 编辑弹窗 */}
      <AddEditDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        editItem={editItem}
        onSaved={loadData}
      />

      {/* 通知权限引导 */}
      <Dialog
        open={notifOpen}
        onClose={handleDismissNotif}
        title="开启生日提醒？"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={handleDismissNotif}>暂不</Button>
            <Button
              variant="primary"
              className="bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700"
              onClick={handleEnableNotif}
            >
              开启通知
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-sm text-stone-600">
          <p>打开通知后，App 启动时会提醒你即将到来的生日。</p>
          <p className="text-xs text-stone-400">
            后台提醒是实验性功能，仅 Chrome 安卓 + 已安装 PWA 生效。
          </p>
        </div>
      </Dialog>
    </Layout>
  )
}
