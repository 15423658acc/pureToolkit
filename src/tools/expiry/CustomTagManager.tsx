/**
 * 自定义标签管理
 * ------------------------------------------------------------
 * 创建 / 编辑 / 删除自定义标签。
 * 每个标签定义一组字段（字段名 + 输入类型 text/date/number）。
 * 存到 db.expiryCustomTags（fields 数组）。
 */
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ExpiryCustomTag } from '@/core/db'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { addCustomTag, deleteCustomTag, listCustomTags, updateCustomTag } from './db'

type FieldType = 'text' | 'date' | 'number'
interface FieldDef {
  name: string
  type: FieldType
}

interface CustomTagManagerProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const FIELD_TYPES: FieldType[] = ['text', 'date', 'number']
const TYPE_LABEL: Record<FieldType, string> = { text: '文本', date: '日期', number: '数字' }

export function CustomTagManager({ open, onClose, onSaved }: CustomTagManagerProps) {
  const toast = useToast()
  const [tags, setTags] = useState<ExpiryCustomTag[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [fields, setFields] = useState<FieldDef[]>([])

  const load = async () => {
    setTags(await listCustomTags())
  }

  useEffect(() => {
    if (open) void load()
  }, [open])

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setFields([])
  }

  const startEdit = (t: ExpiryCustomTag) => {
    setEditingId(t.id ?? null)
    setName(t.name)
    setFields(t.fields.map((f) => ({ name: f.name, type: f.type })))
  }

  const addField = () => setFields((p) => [...p, { name: '', type: 'text' }])
  const removeField = (idx: number) => setFields((p) => p.filter((_, i) => i !== idx))
  const updateField = (idx: number, patch: Partial<FieldDef>) =>
    setFields((p) => p.map((f, i) => (i === idx ? { ...f, ...patch } : f)))

  const valid = name.trim() && fields.every((f) => f.name.trim())

  const handleSave = async () => {
    if (!valid) {
      toast('请填写标签名，且字段名不能为空', 'error')
      return
    }
    const payload = {
      name: name.trim(),
      fields: fields
        .map((f) => ({ name: f.name.trim(), type: f.type }))
        .filter((f) => f.name)
    }
    try {
      if (editingId != null) {
        await updateCustomTag(editingId, payload)
        toast('已更新标签', 'success')
      } else {
        await addCustomTag(payload)
        toast('已创建标签', 'success')
      }
      resetForm()
      await load()
      onSaved()
    } catch (e) {
      toast('保存失败：' + (e as Error).message, 'error')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteCustomTag(id)
      toast('已删除标签', 'info')
      if (editingId === id) resetForm()
      await load()
      onSaved()
    } catch (e) {
      toast('删除失败：' + (e as Error).message, 'error')
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="自定义标签"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>关闭</Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* 已有标签列表 */}
        <div className="space-y-2">
          {tags.length === 0 ? (
            <p className="text-xs text-stone-400">还没有自定义标签，用下方表单创建一个吧。</p>
          ) : (
            tags.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 h-12"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate">{t.name}</p>
                  <p className="text-xs text-stone-400 truncate">
                    {t.fields.map((f) => f.name).join(' · ') || '无字段'}
                  </p>
                </div>
                <button
                  onClick={() => startEdit(t)}
                  className="w-8 h-8 rounded-lg hover:bg-stone-200 inline-flex items-center justify-center text-stone-500"
                  aria-label="编辑"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => handleDelete(t.id!)}
                  className="w-8 h-8 rounded-lg hover:bg-red-100 inline-flex items-center justify-center text-red-500"
                  aria-label="删除"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* 表单 */}
        <div className="space-y-3 pt-3 border-t border-stone-100">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-stone-500">
              {editingId != null ? '编辑标签' : '新建标签'}
            </p>
            {editingId != null && (
              <button
                onClick={resetForm}
                className="text-xs text-stone-400 hover:text-stone-600 inline-flex items-center gap-1"
              >
                <X size={12} /> 取消编辑
              </button>
            )}
          </div>

          <Field label="标签名" hint="如 健身卡、信用卡">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="标签名"
              maxLength={20}
            />
          </Field>

          <Field label="字段定义">
            <div className="space-y-2">
              {fields.map((f, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={f.name}
                    onChange={(e) => updateField(idx, { name: e.target.value })}
                    placeholder="字段名"
                    className="flex-1"
                  />
                  <select
                    value={f.type}
                    onChange={(e) => updateField(idx, { type: e.target.value as FieldType })}
                    className="h-11 px-2 text-sm rounded-xl border border-stone-200 bg-white text-stone-800 focus:outline-none focus:border-stone-400"
                  >
                    {FIELD_TYPES.map((ft) => (
                      <option key={ft} value={ft}>{TYPE_LABEL[ft]}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeField(idx)}
                    className="w-11 h-11 rounded-xl hover:bg-red-100 inline-flex items-center justify-center text-red-500 shrink-0"
                    aria-label="删除字段"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button
                onClick={addField}
                className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:bg-red-50 px-2.5 h-8 rounded-lg"
              >
                <Plus size={14} /> 添加字段
              </button>
            </div>
          </Field>

          <Button
            variant="primary"
            className="w-full"
            onClick={handleSave}
            disabled={!valid}
          >
            {editingId != null ? '保存修改' : '创建标签'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
