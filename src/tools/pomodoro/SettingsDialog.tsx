/**
 * 时长设置弹窗
 * ------------------------------------------------------------
 * - work / short_break / long_break 时长（分钟）
 * - 长休息前的工作次数（longBreakEvery）
 * - 设置存到 localStorage（通过 store.updateSettings）
 */
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import type { Settings } from './store'
import { usePomodoroStore } from './store'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

interface NumberFieldProps {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}

function NumberField({ label, hint, value, min, max, onChange }: NumberFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-stone-500">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (!Number.isFinite(n)) return
          onChange(Math.min(max, Math.max(min, Math.floor(n))))
        }}
        className="h-11 w-full px-3.5 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition"
      />
      {hint && <span className="text-xs text-stone-400">{hint}</span>}
    </label>
  )
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const toast = useToast()
  const settings = usePomodoroStore((s) => s.settings)
  const updateSettings = usePomodoroStore((s) => s.updateSettings)

  const [draft, setDraft] = useState<Settings>(settings)

  useEffect(() => {
    if (!open) return
    setDraft(settings)
  }, [open, settings])

  const handleSave = () => {
    updateSettings(draft)
    toast('设置已保存', 'success')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="番茄钟设置"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" tone="rose" onClick={handleSave}>
            保存
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <NumberField
          label="专注时长（分钟）"
          hint="建议 25 分钟"
          value={draft.workMin}
          min={1}
          max={120}
          onChange={(v) => setDraft((d) => ({ ...d, workMin: v }))}
        />
        <NumberField
          label="短休息时长（分钟）"
          hint="建议 5 分钟"
          value={draft.shortBreakMin}
          min={1}
          max={60}
          onChange={(v) => setDraft((d) => ({ ...d, shortBreakMin: v }))}
        />
        <NumberField
          label="长休息时长（分钟）"
          hint="建议 15 分钟"
          value={draft.longBreakMin}
          min={1}
          max={60}
          onChange={(v) => setDraft((d) => ({ ...d, longBreakMin: v }))}
        />
        <NumberField
          label="长休息前的工作次数"
          hint="每完成 N 个专注后进入长休息"
          value={draft.longBreakEvery}
          min={2}
          max={12}
          onChange={(v) => setDraft((d) => ({ ...d, longBreakEvery: v }))}
        />
        <p className="text-xs text-stone-400 leading-relaxed pt-1">
          测试时可以把专注时长设为 1 分钟快速验证。
          设置仅保存到本地浏览器，不写入数据库。
        </p>
      </div>
    </Dialog>
  )
}
