/**
 * 转盘 - 选项编辑器
 * ------------------------------------------------------------
 * 2 列 chip 网格，每个 chip 显示"标签 + 权重（若 ≠1）"。
 * - 点击网格末尾"+ 添加"打开弹窗添加新选项
 * - 长按（约 450ms）或右键某选项打开编辑弹窗：可调权重（1-10）、可删除
 * - 颜色由调色板按索引循环；新增选项沿用 next index 的颜色
 */
import { clsx } from 'clsx'
import { Plus, Trash } from 'lucide-react'
import { useRef, useState } from 'react'
import type { WheelOption } from '@/core/db'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { getColor } from './presets'

interface OptionEditorProps {
  options: WheelOption[]
  onChange: (next: WheelOption[]) => void
  /** 转动中禁用编辑 */
  disabled?: boolean
}

const LONG_PRESS_MS = 450

export function OptionEditor({ options, onChange, disabled }: OptionEditorProps) {
  const toast = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [editWeight, setEditWeight] = useState(1)
  const longPressTimer = useRef<number | null>(null)

  const openEdit = (i: number) => {
    setEditIndex(i)
    setEditWeight(options[i]?.weight || 1)
  }

  const startLongPress = (i: number) => {
    if (disabled) return
    cancelLongPress()
    longPressTimer.current = window.setTimeout(() => {
      openEdit(i)
    }, LONG_PRESS_MS)
  }

  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleAdd = () => {
    const label = newLabel.trim()
    if (!label) {
      toast('选项内容不能为空', 'error')
      return
    }
    if (options.some((o) => o.label === label)) {
      toast('已存在相同选项', 'error')
      return
    }
    onChange([
      ...options,
      { label, weight: 1, color: getColor(options.length) }
    ])
    setNewLabel('')
    setAddOpen(false)
    toast('已添加', 'success')
  }

  const handleSaveWeight = () => {
    if (editIndex === null) return
    const next = options.map((o, i) =>
      i === editIndex ? { ...o, weight: editWeight } : o
    )
    onChange(next)
    setEditIndex(null)
  }

  const handleDelete = () => {
    if (editIndex === null) return
    const next = options.filter((_, i) => i !== editIndex)
    onChange(next)
    setEditIndex(null)
    toast('已删除', 'info')
  }

  const editing = editIndex !== null ? options[editIndex] : null

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o, i) => (
          <button
            key={i}
            type="button"
            onPointerDown={() => startLongPress(i)}
            onPointerUp={cancelLongPress}
            onPointerLeave={cancelLongPress}
            onPointerCancel={cancelLongPress}
            onContextMenu={(e) => {
              e.preventDefault()
              if (!disabled) openEdit(i)
            }}
            disabled={disabled}
            className={clsx(
              'flex items-center gap-2 px-3 h-10 rounded-xl text-sm font-medium text-left',
              'border transition-colors select-none',
              'bg-white border-stone-200 text-stone-800',
              !disabled && 'hover:bg-amber-50 hover:border-amber-200',
              disabled && 'opacity-60'
            )}
          >
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: o.color || getColor(i) }}
            />
            <span className="flex-1 truncate">{o.label}</span>
            {(o.weight || 1) !== 1 && (
              <span className="text-[10px] font-semibold text-amber-600 shrink-0">
                ×{o.weight}
              </span>
            )}
          </button>
        ))}

        {/* 添加 chip */}
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          disabled={disabled}
          className={clsx(
            'flex items-center justify-center gap-1 px-3 h-10 rounded-xl text-sm font-medium',
            'border border-dashed border-stone-300 text-stone-500',
            'transition-colors',
            !disabled && 'hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50',
            disabled && 'opacity-60'
          )}
        >
          <Plus size={14} />
          添加
        </button>
      </div>

      {/* 添加选项弹窗 */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="添加选项"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>取消</Button>
            <Button variant="primary" onClick={handleAdd}>添加</Button>
          </>
        }
      >
        <Field label="选项内容">
          <Input
            autoFocus
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="如：寿司"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
            }}
          />
        </Field>
      </Dialog>

      {/* 编辑权重 / 删除弹窗 */}
      <Dialog
        open={editIndex !== null}
        onClose={() => setEditIndex(null)}
        title={editing?.label}
        size="sm"
        footer={
          <>
            <Button variant="danger" onClick={handleDelete}>
              <Trash size={14} /> 删除
            </Button>
            <Button variant="primary" onClick={handleSaveWeight}>保存</Button>
          </>
        }
      >
        <Field
          label={`权重：${editWeight}`}
          hint="权重越大被抽中的概率越高（范围 1-10）"
        >
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={editWeight}
            onChange={(e) => setEditWeight(Number(e.target.value))}
            className="w-full accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-stone-400 mt-1">
            <span>1</span>
            <span>10</span>
          </div>
        </Field>
      </Dialog>
    </div>
  )
}
