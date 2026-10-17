/**
 * 添加 / 编辑物品弹窗
 * ------------------------------------------------------------
 * - 4 个 tag chip：证件 / 订阅 / 药品 / 自定义
 * - 选 tag 后展示对应预设 chip，点击自动填充 name/startDate/endDate
 * - tag=药品：额外展示规格 / 用法用量 / 购买价格 / 生产厂家
 * - tag=自定义：选择已建自定义标签后，按其字段定义渲染输入项
 */
import { clsx } from 'clsx'
import { addDays, format, parseISO } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import type { ExpiryCustomTag, ExpiryItem, ExpiryTag } from '@/core/db'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { addExpiryItem, updateExpiryItem } from './db'
import { EXPIRY_PRESETS, MEDICINE_FIELDS } from './presets'

interface AddItemDialogProps {
  open: boolean
  onClose: () => void
  /** 编辑模式时传入；为 null 表示新增 */
  editItem: ExpiryItem | null
  customTags: ExpiryCustomTag[]
  onManageCustomTags: () => void
  onSaved: () => void
}

const TAGS: ExpiryTag[] = ['证件', '订阅', '药品', '自定义']

const todayISO = () => format(new Date(), 'yyyy-MM-dd')

export function AddItemDialog({
  open,
  onClose,
  editItem,
  customTags,
  onManageCustomTags,
  onSaved
}: AddItemDialogProps) {
  const toast = useToast()
  const [tag, setTag] = useState<ExpiryTag>('证件')
  const [customTagId, setCustomTagId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState(todayISO())
  const [endDate, setEndDate] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const selectedCustomTag = useMemo(
    () => customTags.find((t) => t.id === customTagId) ?? null,
    [customTags, customTagId]
  )

  // 打开或编辑对象变化时，初始化表单
  useEffect(() => {
    if (!open) return
    if (editItem) {
      setTag(editItem.tag)
      setCustomTagId(null)
      setName(editItem.name)
      setStartDate(editItem.startDate)
      setEndDate(editItem.endDate)
      setFields(editItem.fields ?? {})
    } else {
      setTag('证件')
      setCustomTagId(null)
      setName('')
      setStartDate(todayISO())
      setEndDate('')
      setFields({})
    }
  }, [open, editItem])

  // 切换 tag 时清空自定义字段，避免残留
  const handleTagChange = (next: ExpiryTag) => {
    setTag(next)
    setCustomTagId(null)
    setFields({})
  }

  // 应用预设
  const applyPreset = (preset: (typeof EXPIRY_PRESETS)[ExpiryTag][number]) => {
    setName(preset.name)
    const start = todayISO()
    setStartDate(start)
    if (preset.durationDays != null) {
      setEndDate(format(addDays(parseISO(start), preset.durationDays), 'yyyy-MM-dd'))
    }
  }

  const updateField = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  const valid = name.trim() && startDate && endDate

  const handleSave = async () => {
    if (!valid) {
      toast('请填写名称与起止日期', 'error')
      return
    }
    if (tag === '自定义' && !selectedCustomTag) {
      toast('请先选择或创建一个自定义标签', 'error')
      return
    }
    setSaving(true)
    try {
      // 组装 fields：仅保留非空值
      const cleanFields: Record<string, string> = {}
      if (tag === '药品') {
        for (const f of MEDICINE_FIELDS) {
          const v = (fields[f.key] ?? '').trim()
          if (v) cleanFields[f.key] = v
        }
      } else if (tag === '自定义' && selectedCustomTag) {
        cleanFields['__customTag'] = selectedCustomTag.name
        for (const f of selectedCustomTag.fields) {
          const v = (fields[f.name] ?? '').trim()
          if (v) cleanFields[f.name] = v
        }
      }
      const payload = {
        name: name.trim(),
        tag,
        startDate,
        endDate,
        fields: Object.keys(cleanFields).length > 0 ? cleanFields : undefined
      }
      if (editItem?.id != null) {
        await updateExpiryItem(editItem.id, payload)
        toast('已更新', 'success')
      } else {
        await addExpiryItem(payload)
        toast('已添加', 'success')
      }
      onSaved()
      onClose()
    } catch (e) {
      toast('保存失败：' + (e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const presets = EXPIRY_PRESETS[tag]

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editItem ? '编辑物品' : '添加物品'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>取消</Button>
          <Button variant="primary" tone="peach" onClick={handleSave} disabled={saving || !valid}>
            保存
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* tag 选择 */}
        <Field label="类别">
          <div className="flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <button
                key={t}
                onClick={() => handleTagChange(t)}
                className={clsx(
                  'px-3 h-8 rounded-full text-xs font-medium transition',
                  tag === t
                    ? 'bg-[#ffad99] text-stone-900 hover:bg-[#ff9a83]'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>

        {/* 自定义标签选择 */}
        {tag === '自定义' && (
          <Field label="自定义标签" hint="自定义标签决定要填哪些字段">
            {customTags.length === 0 ? (
              <div className="flex items-center gap-2">
                <p className="text-xs text-stone-400">还没有自定义标签</p>
                <Button size="sm" variant="soft" onClick={onManageCustomTags}>去创建</Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {customTags.map((ct) => (
                  <button
                    key={ct.id}
                    onClick={() => setCustomTagId(ct.id ?? null)}
                    className={clsx(
                      'px-3 h-8 rounded-full text-xs font-medium transition',
                      customTagId === ct.id
                        ? 'bg-[#ffad99] text-stone-900'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    )}
                  >
                    {ct.name}
                  </button>
                ))}
                <button
                  onClick={onManageCustomTags}
                  className="px-3 h-8 rounded-full text-xs font-medium text-stone-500 hover:bg-stone-100"
                >
                  + 管理
                </button>
              </div>
            )}
          </Field>
        )}

        {/* 预设 chip */}
        {presets.length > 0 && (
          <Field label="常用预设" hint="点击可自动填充名称与日期">
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className="px-3 h-8 rounded-full text-xs font-medium bg-[#fff0eb] text-[#d9644a] hover:bg-[#ffe0d5] transition"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </Field>
        )}

        {/* 名称 */}
        <Field label="物品名称">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如 身份证、布洛芬"
            maxLength={40}
          />
        </Field>

        {/* 起止日期 */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="开始日期">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="到期日期">
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>

        {/* 药品字段 */}
        {tag === '药品' && (
          <div className="space-y-3 pt-1 border-t border-stone-100">
            <p className="text-xs font-medium text-stone-500">药品信息（可选）</p>
            {MEDICINE_FIELDS.map((f) => (
              <Field key={f.key} label={f.label}>
                <Input
                  value={fields[f.key] ?? ''}
                  onChange={(e) => updateField(f.key, e.target.value)}
                  placeholder={f.placeholder}
                />
              </Field>
            ))}
          </div>
        )}

        {/* 自定义标签字段 */}
        {tag === '自定义' && selectedCustomTag && (
          <div className="space-y-3 pt-1 border-t border-stone-100">
            <p className="text-xs font-medium text-stone-500">
              {selectedCustomTag.name} 的字段
            </p>
            {selectedCustomTag.fields.map((f) => (
              <Field key={f.name} label={f.name}>
                <Input
                  type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                  value={fields[f.name] ?? ''}
                  onChange={(e) => updateField(f.name, e.target.value)}
                />
              </Field>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  )
}
