/**
 * 转盘 - SVG 转盘 + 转动动画
 * ------------------------------------------------------------
 * 纯 SVG + CSS transform，无 Canvas。
 * - 转动通过父组件控制 rotation（角度）与 duration（毫秒）
 * - 转动结束后通过 setTimeout 触发 onSpinEnd，由父组件
 *   决定结果（用反向算法找到顶部扇区，避免父子的角度
 *   计算出现微妙误差时展示错位）
 * - 停止后高亮当前结果扇区，其余扇区半透明
 */
import { useEffect, useRef } from 'react'
import type { WheelOption } from '@/core/db'
import { getColor } from './presets'

interface SpinWheelProps {
  options: WheelOption[]
  /** 当前累计旋转角度（度）。父组件每次旋转累加。 */
  rotation: number
  /** 本次旋转动画时长（毫秒） */
  duration: number
  /** 是否正在旋转 */
  isSpinning: boolean
  /** 停止后的结果扇区索引，null 表示未出结果 */
  resultIndex: number | null
  /** 旋转结束回调 */
  onSpinEnd: () => void
}

const CX = 100
const CY = 100
const R = 96

/** 角度（从 12 点方向顺时针）→ SVG 坐标 */
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) }
}

/** 生成扇区 path d 字符串 */
function describeSector(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle)
  const end = polarToCartesian(cx, cy, r, endAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  // sweep=1：在 SVG y 轴向下坐标系里，正角度顺时针绘制
  return `M ${cx} ${cy} L ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)} Z`
}

export function SpinWheel({
  options,
  rotation,
  duration,
  isSpinning,
  resultIndex,
  onSpinEnd
}: SpinWheelProps) {
  const n = options.length
  const sectorAngle = 360 / Math.max(1, n)

  // 用 ref 持有最新 onSpinEnd，避免 effect 因回调引用变化而重置 timer
  const onSpinEndRef = useRef(onSpinEnd)
  useEffect(() => {
    onSpinEndRef.current = onSpinEnd
  }, [onSpinEnd])

  useEffect(() => {
    if (!isSpinning) return
    // +60ms 容差，确保 CSS 过渡已结束
    const t = window.setTimeout(() => onSpinEndRef.current(), duration + 60)
    return () => window.clearTimeout(t)
  }, [isSpinning, duration])

  if (n === 0) {
    return (
      <div className="w-[88vw] max-w-md aspect-square mx-auto rounded-full border-2 border-dashed border-stone-200 flex items-center justify-center text-stone-400 text-sm px-6 text-center">
        添加至少 2 个选项后才能转动
      </div>
    )
  }

  const sectors = options.map((opt, i) => {
    const startAngle = i * sectorAngle
    const endAngle = (i + 1) * sectorAngle
    const centerAngle = (i + 0.5) * sectorAngle
    const labelPos = polarToCartesian(CX, CY, R * 0.62, centerAngle)
    return {
      key: i,
      d: describeSector(CX, CY, R, startAngle, endAngle),
      fill: opt.color || getColor(i),
      label: opt.label,
      labelX: labelPos.x,
      labelY: labelPos.y
    }
  })

  const fontSize = n <= 4 ? 11 : n <= 8 ? 9 : 7

  return (
    <div className="relative w-[88vw] max-w-md aspect-square mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-full block drop-shadow-md">
        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: `${CX}px ${CY}px`,
            transformBox: 'view-box',
            transition: isSpinning
              ? `transform ${duration}ms cubic-bezier(0.13, 0.84, 0.21, 1)`
              : 'transform 0ms'
          }}
        >
          {sectors.map((s, i) => (
            <path
              key={s.key}
              d={s.d}
              fill={s.fill}
              stroke="white"
              strokeWidth={1.2}
              opacity={resultIndex !== null && resultIndex !== i ? 0.4 : 1}
            />
          ))}
          {sectors.map((s) => {
            const text = s.label.length > 6 ? s.label.slice(0, 5) + '…' : s.label
            return (
              <text
                key={`t-${s.key}`}
                x={s.labelX}
                y={s.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={fontSize}
                fill="white"
                fontWeight={700}
                className="pointer-events-none select-none"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}
              >
                {text}
              </text>
            )
          })}
        </g>
        {/* 中心轴帽 */}
        <circle cx={CX} cy={CY} r={13} fill="white" stroke="#1c1917" strokeWidth={2} />
        <circle cx={CX} cy={CY} r={4} fill="#1c1917" />
      </svg>
      {/* 顶部指针：黑色三角，尖端朝下指向转盘 */}
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"
        aria-hidden
      >
        <div
          className="w-0 h-0"
          style={{
            borderLeft: '11px solid transparent',
            borderRight: '11px solid transparent',
            borderTop: '20px solid #1c1917'
          }}
        />
      </div>
    </div>
  )
}
