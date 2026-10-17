/**
 * 添加 / 编辑生日弹窗
 * ------------------------------------------------------------
 * - name 必填 Input
 * - relation 4 chip：家人 / 朋友 / 同事 / 其他
 * - isLunar segmented：公历 / 农历
 * - birthday：
 *   - 公历：date input
 *   - 农历：3 个 select（年 1900-2099 / 月 1-12 / 日 1-30，保存时校验）
 * - remindAdvance segmented：0 / 1 / 3 / 7 / 15
 * - notes 可选 Textarea
 */
import { clsx } from 'clsx'
import { useEffect, useState } from 'react'
import type { Birthday } from '@/core/db'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Input, Textarea } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { addBirthday, updateBirthday } from './db'
import {
  formatSolarLabel,
  isValidLunarDate,
  LUNAR_DAYS,
  LUNAR_MONTHS,
  LUNAR_YEARS
} from './lunar'

interface Props {
  open: boolean
  onClose: () => void
  editItem: Birthday | null
  onSaved: () => void
}

const RELATIONS = ['家人', '朋友', '同事', '其他']
const REMIND_OPTIONS = [0, 1, 3, 7, 15]
const todayISO = () => {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function AddEditDialog({ open, onClose, editItem, onSaved }: Props) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [relation, setRelation] = useState<string>('家人')
  const [isLunar, setIsLunar] = useState(false)
  const [solarDate, setSolarDate] = useState(todayISO())
  const [lunarYear, setLunarYear] = useState(1990)
  const [lunarMonth, setLunarMonth] = useState(8)
  const [lunarDay, setLunarDay] = useState(15)
  const [remindAdvance, setRemindAdvance] = useState(7)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editItem) {
      setName(editItem.name)
      setRelation(editItem.relation || '其他')
      setIsLunar(editItem.isLunar)
      const parts = editItem.birthday.split('-').map(Number)
      if (editItem.isLunar) {
        setLunarYear(parts[0] || 1990)
        setLunarMonth(parts[1] || 8)
        setLunarDay(parts[2] || 15)
      } else {
        setSolarDate(editItem.birthday || todayISO())
      }
      setRemindAdvance(editItem.remindAdvance)
      setNotes(editItem.notes ?? '')
    } else {
      setName('')
      setRelation('家人')
      setIsLunar(false)
      setSolarDate(todayISO())
      setLunarYear(1990)
      setLunarMonth(8)
      setLunarDay(15)
      setRemindAdvance(7)
      setNotes('')
    }
  }, [open, editItem])

  const valid = name.trim().length > 0

  const buildBirthdayString = (): string | null => {
    if (isLunar) {
      if (!isValidLunarDate(lunarYear, lunarMonth, lunarDay)) {
        toast(`农历${lunarYear}年${lunarMonth}月${lunarDay}日不存在`, 'error')
        return null
      }
      return `${lunarYear}-${pad(lunarMonth)}-${pad(lunarDay)}`
    }
    if (!solarDate) {
      toast('请选择日期', 'error')
      return null
    }
    return solarDate
  }

  const handleSave = async () => {
    if (!valid) {
      toast('请填写姓名', 'error')
      return
    }
    const birthdayStr = buildBirthdayString()
    if (!birthdayStr) return
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        relation,
        isLunar,
        birthday: birthdayStr,
        remindAdvance,
        notes: notes.trim() || undefined
      }
      if (editItem?.id != null) {
        await updateBirthday(editItem.id, payload)
        toast('已更新', 'success')
      } else {
        await addBirthday(payload)
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editItem ? '编辑生日' : '添加生日'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>取消</Button>
          <Button
            variant="primary"
            className="bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700"
            onClick={handleSave}
            disabled={saving || !valid}
          >
            保存
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* 姓名 */}
        <Field label="姓名">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如 妈妈、小明"
            maxLength={40}
          />
        </Field>

        {/* 关系 */}
        <Field label="关系">
          <div className="flex flex-wrap gap-2">
            {RELATIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRelation(r)}
                className={clsx(
                  'px-3 h-8 rounded-full text-xs font-medium transition',
                  relation === r
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </Field>

        {/* 历法 segmented */}
        <Field label="历法">
          <div className="inline-flex p-0.5 bg-stone-100 rounded-xl">
            <button
              onClick={() => setIsLunar(false)}
              className={clsx(
                'px-4 h-8 rounded-lg text-xs font-medium transition',
                !isLunar ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
              )}
            >
              公历
            </button>
            <button
              onClick={() => setIsLunar(true)}
              className={clsx(
                'px-4 h-8 rounded-lg text-xs font-medium transition',
                isLunar ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
              )}
            >
              农历
            </button>
          </div>
        </Field>

        {/* 生日日期 */}
        <Field label={isLunar ? '农历生日' : '公历生日'}>
          {isLunar ? (
            <div className="grid grid-cols-3 gap-2">
              <select
                value={lunarYear}
                onChange={(e) => setLunarYear(Number(e.target.value))}
                className="h-11 w-full px-2.5 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400"
              >
                {LUNAR_YEARS.map((y) => (
                  <option key={y} value={y}>{y} 年</option>
                ))}
              </select>
              <select
                value={lunarMonth}
                onChange={(e) => setLunarMonth(Number(e.target.value))}
                className="h-11 w-full px-2.5 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400"
              >
                {LUNAR_MONTHS.map((m) => (
                  <option key={m} value={m}>{m} 月</option>
                ))}
              </select>
              <select
                value={lunarDay}
                onChange={(e) => setLunarDay(Number(e.target.value))}
                className="h-11 w-full px-2.5 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400"
              >
                {LUNAR_DAYS.map((d) => (
                  <option key={d} value={d}>{d} 日</option>
                ))}
              </select>
            </div>
          ) : (
            <Input
              type="date"
              value={solarDate}
              onChange={(e) => setSolarDate(e.target.value)}
              max="2099-12-31"
              min="1900-01-01"
            />
          )}
          {isLunar && (
            <p className="text-xs text-stone-400 px-0.5">
              农历年份 1900-2099；某些月份只有 29 天，保存时会自动校验。
            </p>
          )}
          {!isLunar && solarDate && (
            <p className="text-xs text-stone-400 px-0.5">
              已选：{formatSolarLabel(solarDate)}
            </p>
          )}
        </Field>

        {/* 提前提醒天数 */}
        <Field label="提前提醒" hint="打开 App 时若距离下次生日 ≤ 此天数，会弹横幅/通知">
          <div className="flex flex-wrap gap-2">
            {REMIND_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setRemindAdvance(d)}
                className={clsx(
                  'px-3 h-8 rounded-full text-xs font-medium transition',
                  remindAdvance === d
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                )}
              >
                {d === 0 ? '当天' : `提前 ${d} 天`}
              </button>
            ))}
          </div>
        </Field>

        {/* 备注 */}
        <Field label="备注（可选）">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="礼物建议、电话..."
            rows={2}
            maxLength={120}
          />
        </Field>
      </div>
    </Dialog>
  )
}
