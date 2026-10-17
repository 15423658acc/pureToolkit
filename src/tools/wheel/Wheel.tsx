/**
 * 转盘 - 主入口
 * ------------------------------------------------------------
 * 路由 /wheel。集预设模板 / 自定义选项 / 转动动画 / 历史记录于一体。
 *
 * 数据模型：
 * - 所有模板（预设 + 用户自存）放在 db.wheelTemplates
 * - 进入页面默认显示"上次用过的模板"或第一个预设；用户对选项的
 *   增删改只是当前内存态，除非主动"保存为模板"才会落库
 * - 每次旋转结果写入 db.wheelHistory
 *
 * 转动数学：
 * - 扇区 i 的中心角（从 12 点方向顺时针）为 (i + 0.5) * sectorAngle
 * - 想让扇区 tIndex 停在顶部，需要 final rotation ≡ (360 - (tIndex+0.5)*sectorAngle) mod 360
 * - 总转数固定 5 圈，再加一段对齐 delta
 * - 加权抽样选择 tIndex，权重影响概率而非扇区角度
 */
import { Dices, Save } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Layout } from '@/components/Layout'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import {
  db,
  type WheelHistory,
  type WheelOption,
  type WheelTemplate
} from '@/core/db'
import { ensurePresets } from './presets'
import { SpinWheel } from './SpinWheel'
import { TemplateChips } from './TemplateChips'
import { OptionEditor } from './OptionEditor'
import { HistoryList } from './HistoryList'

const LAST_TEMPLATE_KEY = 'puretoolkit.wheel.lastTemplateId'
const MIN_OPTIONS_TO_SPIN = 2

/** 按权重抽样返回选中的索引（权重越大越易被选中） */
function weightedSample(options: WheelOption[]): number {
  const weights = options.map((o) => Math.max(1, o.weight || 1))
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r < 0) return i
  }
  return weights.length - 1
}

/** 模板排序：预设在前，自定义按创建时间倒序 */
function sortTemplates(list: WheelTemplate[]): WheelTemplate[] {
  return [...list].sort((a, b) => {
    if (a.isPreset !== b.isPreset) return a.isPreset ? -1 : 1
    return b.createdAt - a.createdAt
  })
}

export default function Wheel() {
  const toast = useToast()
  const [templates, setTemplates] = useState<WheelTemplate[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [options, setOptions] = useState<WheelOption[]>([])
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [duration, setDuration] = useState(4500)
  const [resultIndex, setResultIndex] = useState<number | null>(null)
  const [history, setHistory] = useState<WheelHistory[]>([])
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  /** 防止快速重复点击触发多次旋转 */
  const spinLockRef = useRef(false)

  // 初次挂载：写预设 → 加载模板 → 选初始模板 → 加载历史
  useEffect(() => {
    void (async () => {
      await ensurePresets()
      const all = sortTemplates(await db.wheelTemplates.toArray())
      setTemplates(all)

      // 选初始：localStorage 记录的"上次用的" 或 第一个预设
      const lastIdStr = localStorage.getItem(LAST_TEMPLATE_KEY)
      const lastId = lastIdStr ? Number(lastIdStr) : NaN
      const initial = all.find((t) => t.id === lastId) || all[0]
      if (initial) {
        setActiveId(initial.id ?? null)
        setOptions(initial.options.map((o) => ({ ...o })))
      }

      const recent = await db.wheelHistory
        .orderBy('spunAt')
        .reverse()
        .limit(20)
        .toArray()
      setHistory(recent)
    })()
  }, [])

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === activeId) ?? null,
    [templates, activeId]
  )

  const handleSelectTemplate = (t: WheelTemplate) => {
    if (isSpinning) return
    setActiveId(t.id ?? null)
    setOptions(t.options.map((o) => ({ ...o })))
    setResultIndex(null)
    if (t.id !== undefined) localStorage.setItem(LAST_TEMPLATE_KEY, String(t.id))
  }

  const handleOptionsChange = (next: WheelOption[]) => {
    setOptions(next)
    setResultIndex(null)
  }

  const handleSpin = () => {
    if (isSpinning || options.length < MIN_OPTIONS_TO_SPIN) return
    if (spinLockRef.current) return
    spinLockRef.current = true

    // 1. 随机时长 3.5 ~ 5.5 秒
    const dur = 3500 + Math.random() * 2000
    // 2. 加权抽样目标扇区
    const targetIndex = weightedSample(options)
    // 3. 计算最终旋转角度
    const n = options.length
    const sectorAngle = 360 / n
    // 让扇区中心停在指针下；加微小随机偏移避免每次正中
    const subOffset = (Math.random() - 0.5) * sectorAngle * 0.5
    const targetMod =
      (((360 - (targetIndex + 0.5) * sectorAngle + subOffset) % 360) + 360) % 360
    const currentMod = ((rotation % 360) + 360) % 360
    const delta = (targetMod - currentMod + 360) % 360
    const newRotation = rotation + 5 * 360 + delta

    setDuration(dur)
    setResultIndex(null)
    setIsSpinning(true)
    setRotation(newRotation)
  }

  const handleSpinEnd = () => {
    const n = options.length
    if (n === 0) {
      setIsSpinning(false)
      spinLockRef.current = false
      return
    }
    // 反向算出哪个扇区现在位于顶部，避免与目标计算出现漂移导致错位
    const sectorAngle = 360 / n
    const r = ((rotation % 360) + 360) % 360
    let bestI = 0
    let bestDist = Infinity
    for (let i = 0; i < n; i++) {
      const angle = (((i + 0.5) * sectorAngle + r) % 360 + 360) % 360
      const dist = Math.min(angle, 360 - angle)
      if (dist < bestDist) {
        bestDist = dist
        bestI = i
      }
    }
    setResultIndex(bestI)
    setIsSpinning(false)
    spinLockRef.current = false

    const result = options[bestI]
    if (result) {
      const templateName = activeTemplate?.name ?? '自定义'
      const spunAt = Date.now()
      void db.wheelHistory
        .add({ templateName, result: result.label, spunAt })
        .then((id) => {
          setHistory((prev) =>
            [
              { id: id as number, templateName, result: result.label, spunAt },
              ...prev
            ].slice(0, 20)
          )
        })
    }
  }

  const handleOpenSave = () => {
    const fallback = activeTemplate?.name
      ? `${activeTemplate.name} 副本`
      : '我的转盘'
    setSaveName(fallback)
    setSaveOpen(true)
  }

  const handleSaveAsTemplate = async () => {
    const name = saveName.trim()
    if (!name) {
      toast('请输入模板名', 'error')
      return
    }
    if (options.length === 0) {
      toast('选项不能为空', 'error')
      return
    }
    const now = Date.now()
    const id = await db.wheelTemplates.add({
      name,
      options: options.map((o) => ({ ...o })),
      isPreset: false,
      createdAt: now,
      updatedAt: now
    })
    const newTemplate: WheelTemplate = {
      id: id as number,
      name,
      options: options.map((o) => ({ ...o })),
      isPreset: false,
      createdAt: now,
      updatedAt: now
    }
    // 自定义模板排在预设之后、其他自定义之前
    setTemplates((prev) => {
      const presets = prev.filter((t) => t.isPreset)
      const customs = prev.filter((t) => !t.isPreset)
      return [...presets, newTemplate, ...customs]
    })
    setActiveId(id as number)
    localStorage.setItem(LAST_TEMPLATE_KEY, String(id))
    setSaveOpen(false)
    setSaveName('')
    toast('已保存为新模板', 'success')
  }

  const canSpin = options.length >= MIN_OPTIONS_TO_SPIN && !isSpinning

  return (
    <Layout
      accent="wheel"
      title="转盘"
      actions={
        <Button
          variant="soft"
          size="sm"
          onClick={handleOpenSave}
          disabled={options.length === 0 || isSpinning}
          className="bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200"
        >
          <Save size={14} /> 保存为模板
        </Button>
      }
      footer={
        <Button
          variant="primary" tone="amber"
          size="lg"
          onClick={handleSpin}
          disabled={!canSpin}
          className="w-full rounded-full h-12 text-base font-semibold shadow-lg"
        >
          <Dices size={18} />
          {isSpinning ? '旋转中…' : '开始旋转'}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <TemplateChips
          templates={templates}
          activeId={activeId}
          onSelect={handleSelectTemplate}
          disabled={isSpinning}
        />

        <SpinWheel
          options={options}
          rotation={rotation}
          duration={duration}
          isSpinning={isSpinning}
          resultIndex={resultIndex}
          onSpinEnd={handleSpinEnd}
        />

        {resultIndex !== null && !isSpinning && options[resultIndex] && (
          <div className="text-center">
            <p className="text-xs text-stone-500 mb-1">本次结果</p>
            <p className="text-3xl font-bold text-amber-600 tracking-tight">
              {options[resultIndex].label}
            </p>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-stone-700">
              选项 <span className="text-stone-400 font-normal">({options.length})</span>
            </h3>
            <p className="text-xs text-stone-400">长按或右键编辑 / 删除</p>
          </div>
          <OptionEditor
            options={options}
            onChange={handleOptionsChange}
            disabled={isSpinning}
          />
        </div>

        <div className="pt-2 border-t border-stone-100">
          <HistoryList history={history} />
        </div>
      </div>

      <Dialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="保存为模板"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>取消</Button>
            <Button variant="primary" tone="amber" onClick={handleSaveAsTemplate}>保存</Button>
          </>
        }
      >
        <Field label="模板名" hint="将作为新模板保存，不影响原预设">
          <Input
            autoFocus
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="如：我的午餐转盘"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveAsTemplate()
            }}
          />
        </Field>
      </Dialog>
    </Layout>
  )
}
