/**
 * 标签选择 + 管理弹窗
 * ------------------------------------------------------------
 * - 显示 4 个默认标签 + 已有的自定义标签
 * - 提供"+ 新建标签"入口，输入名字 + 选 8 色板
 * - 选中后立即返回，调用方控制关闭
 */
import { clsx } from 'clsx'
import { Check, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import type { ScheduleTagDef } from '@/core/db'
import {
  COLOR_PALETTE_KEYS,
  buildTagList,
  getTagColor
} from './tags'

interface TagPickerProps {
  open: boolean
  onClose: () => void
  /** 当前选中的标签名 */
  value: string
  /** 选中某个标签 */
  onPick: (tagName: string) => void
  /** 自定义标签列表 */
  customTags: ScheduleTagDef[]
  /** 创建自定义标签 */
  onCreateCustom: (name: string, color: string) => Promise<void>
  /** 删除自定义标签 */
  onDeleteCustom: (id: number) => Promise<void>
}

export function TagPicker({
  open,
  onClose,
  value,
  onPick,
  customTags,
  onCreateCustom,
  onDeleteCustom
}: TagPickerProps) {
  const toast = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState<string>('pink')

  const tags = buildTagList(customTags)

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) {
      toast('请输入标签名', 'error')
      return
    }
    if (tags.some((t) => t.name === name)) {
      toast('标签名已存在', 'error')
      return
    }
    await onCreateCustom(name, newColor)
    toast('已创建标签', 'success')
    setNewName('')
    setShowCreate(false)
    // 创建后立即选中
    onPick(name)
  }

  return (
    <Dialog open={open} onClose={onClose} title="选择标签" size="md">
      <div className="flex flex-col gap-3">
        {/* 标签网格 */}
        <div className="grid grid-cols-2 gap-2">
          {tags.map((t) => {
            const c = getTagColor(t.color)
            const active = value === t.name
            return (
              <button
                key={t.name}
                onClick={() => onPick(t.name)}
                className={clsx(
                  'relative h-11 px-3 rounded-xl border inline-flex items-center gap-2',
                  'transition',
                  active
                    ? 'border-stone-900 bg-white shadow-sm'
                    : 'border-stone-200 bg-white hover:bg-stone-50'
                )}
              >
                <span className={clsx('w-3 h-3 rounded-full', c.barClass)} />
                <span className="text-sm text-stone-800 truncate flex-1 text-left">
                  {t.name}
                </span>
                {active && <Check size={16} className="text-stone-900 shrink-0" />}
                {/* 自定义标签可删除 */}
                {t.customId != null && (
                  <button
                    aria-label={`删除标签 ${t.name}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      void onDeleteCustom(t.customId!)
                    }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-stone-200 text-stone-500 hover:bg-stone-300 inline-flex items-center justify-center"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </button>
            )
          })}
        </div>

        {/* 新建标签区 */}
        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="h-11 w-full rounded-xl border border-dashed border-stone-300 text-stone-500 text-sm inline-flex items-center justify-center gap-1.5 hover:bg-stone-50"
          >
            <Plus size={16} />
            新建标签
          </button>
        ) : (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 flex flex-col gap-3">
            <Input
              autoFocus
              placeholder="标签名，如：家庭 / 健康 / 副业"
              value={newName}
              maxLength={10}
              onChange={(e) => setNewName(e.target.value)}
            />
            <div>
              <p className="text-xs font-medium text-stone-500 mb-1.5">选颜色</p>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_PALETTE_KEYS.map((k) => {
                  const c = getTagColor(k)
                  const active = newColor === k
                  return (
                    <button
                      key={k}
                      aria-label={`颜色 ${k}`}
                      onClick={() => setNewColor(k)}
                      className={clsx(
                        'h-9 rounded-lg inline-flex items-center justify-center transition',
                        active ? 'ring-2 ring-stone-900 ring-offset-1' : 'hover:opacity-80'
                      )}
                      style={{ background: c.soft }}
                    >
                      <span className={clsx('w-4 h-4 rounded-full', c.barClass)} />
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                取消
              </Button>
              <Button variant="primary" tone="purple" size="sm" onClick={() => void handleCreate()}>
                创建
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}
