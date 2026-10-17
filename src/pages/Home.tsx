import { clsx } from 'clsx'
import {
  Calendar,
  Clock,
  KeyRound,
  Leaf,
  ListChecks,
  Ruler,
  Sparkles,
  Stethoscope,
  Sun,
  Target
} from 'lucide-react'
import { type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { InstallBanner } from '../components/Header'
import { downloadBackup } from '../core/backup'

interface ToolMeta {
  id: string
  name: string
  desc: string
  Icon: ComponentType<{ size?: number | string }>
  accent: string         // 边色/图标色
  bg: string             // 卡片渐变背景（柔和）
  to: string
  available: boolean
  badge?: string
}

const CORE_TOOLS: ToolMeta[] = [
  {
    id: 'wheel',
    name: '转盘',
    desc: '吃啥、穿啥、做啥，转一下就决定',
    Icon: Sparkles,
    accent: 'text-amber-600',
    bg: 'from-amber-50 to-amber-100',
    to: '/wheel',
    available: true
  },
  {
    id: 'expiry',
    name: '保质期管家',
    desc: '证件 / 会员 / 药品到期一览',
    Icon: Stethoscope,
    accent: 'text-red-500',
    bg: 'from-red-50 to-red-100',
    to: '/expiry',
    available: true
  },
  {
    id: 'media',
    name: '阅读观影清单',
    desc: '勾选自动下沉，回顾上月看了什么',
    Icon: ListChecks,
    accent: 'text-blue-500',
    bg: 'from-blue-50 to-blue-100',
    to: '/media',
    available: true
  },
  {
    id: 'schedule',
    name: '日程安排',
    desc: '今日待办，工作 / 生活 / 学习 / 娱乐',
    Icon: Calendar,
    accent: 'text-purple-500',
    bg: 'from-purple-50 to-purple-100',
    to: '/schedule',
    available: true
  }
]

const EXTENSION_TOOLS: ToolMeta[] = [
  { id: 'pomodoro', name: '番茄钟待办', desc: '待办 + 番茄计时', Icon: Clock, accent: 'text-rose-500', bg: 'from-rose-50 to-rose-100', to: '/pomodoro', available: false, badge: '即将' },
  { id: 'habit', name: '习惯打卡', desc: '连续天数养成', Icon: Target, accent: 'text-emerald-500', bg: 'from-emerald-50 to-emerald-100', to: '/habit', available: false, badge: '即将' },
  { id: 'birthday', name: '生日倒计时', desc: '亲友生日 + 农历', Icon: Sun, accent: 'text-orange-500', bg: 'from-orange-50 to-orange-100', to: '/birthday', available: false, badge: '即将' },
  { id: 'password', name: '密码生成器', desc: '强度检测 + 本地生成', Icon: KeyRound, accent: 'text-slate-500', bg: 'from-slate-50 to-slate-100', to: '/password', available: false, badge: '即将' },
  { id: 'unit', name: '单位换算', desc: '厨房 / 长度 / 重量', Icon: Ruler, accent: 'text-teal-500', bg: 'from-teal-50 to-teal-100', to: '/unit', available: false, badge: '即将' },
  { id: 'flashcard', name: '本地闪卡', desc: '翻转卡牌自测', Icon: Leaf, accent: 'text-lime-500', bg: 'from-lime-50 to-lime-100', to: '/flashcard', available: false, badge: '即将' }
]

export function HomePage() {
  return (
    <div className="min-h-[100dvh] bg-paper">
      <div className="mx-auto max-w-3xl px-4 py-6 safe-bottom">
        {/* 顶部标题区 */}
        <header className="flex items-end justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">纯·工具箱</h1>
            <p className="text-sm text-stone-500 mt-0.5">
              纯前端 · 可离线 · 无后端 · 开箱即用
            </p>
          </div>
          <button
            onClick={() => downloadBackup()}
            className="text-xs text-stone-500 hover:text-stone-900 px-2 py-1 rounded-md hover:bg-stone-100"
            title="导出全部数据为 JSON 备份"
          >
            备份
          </button>
        </header>

        <InstallBanner />

        {/* 核心 4 大格 Bento */}
        <section className="grid grid-cols-2 gap-3 mb-5">
          {CORE_TOOLS.map((tool) => (
            <ToolCard key={tool.id} tool={tool} big />
          ))}
        </section>

        {/* 扩展工具小格 */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-stone-500">更多工具</h2>
            <span className="text-xs text-stone-400">敬请期待</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {EXTENSION_TOOLS.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </section>

        {/* 关于 */}
        <footer className="mt-8 pt-5 border-t border-stone-100 text-xs text-stone-400 leading-relaxed">
          <p>
            数据全部保存在你浏览器本地（IndexedDB），不上传任何服务器。
            清浏览器缓存会丢失，请定期点击右上角"备份"导出 JSON。
          </p>
          <p className="mt-2">
            提醒类功能在 iOS 上有较多限制，建议每日打开 App 一次；安卓安装到桌面后可后台通知。
          </p>
        </footer>
      </div>
    </div>
  )
}

function ToolCard({ tool, big = false }: { tool: ToolMeta; big?: boolean }) {
  const className = clsx(
    'bento-card bento-card-hoverable relative overflow-hidden block no-underline',
    'bg-gradient-to-br', tool.bg,
    big ? 'aspect-[4/3] sm:aspect-[16/10] p-5' : 'aspect-square p-3',
    !tool.available && 'opacity-60'
  )
  const inner = (
    <>
      <div className="flex items-start justify-between">
        <div className={clsx(
          'rounded-2xl bg-white/70 flex items-center justify-center',
          tool.accent,
          big ? 'w-12 h-12' : 'w-9 h-9'
        )}>
          <tool.Icon size={big ? 22 : 18} />
        </div>
        {tool.badge && (
          <span className="text-[10px] uppercase tracking-wide font-semibold bg-white/70 text-stone-500 px-1.5 py-0.5 rounded-md">
            {tool.badge}
          </span>
        )}
      </div>
      <div className="mt-auto pt-3">
        <p className={clsx(
          'font-semibold text-stone-900 truncate',
          big ? 'text-base' : 'text-xs'
        )}>
          {tool.name}
        </p>
        {big && (
          <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{tool.desc}</p>
        )}
      </div>
    </>
  )

  if (tool.available) {
    return (
      <Link to={tool.to} className={className}>
        {inner}
      </Link>
    )
  }
  return (
    <div className={className}>
      {inner}
    </div>
  )
}
