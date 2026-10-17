import { clsx } from 'clsx'
import { ArrowLeft } from 'lucide-react'
import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface LayoutProps {
  title: ReactNode
  accent?: 'wheel' | 'expiry' | 'media' | 'schedule' | 'stone'
  /** 顶部右上角动作区 */
  actions?: ReactNode
  children: ReactNode
  /** 页面底部固定操作栏（如转盘的"开始"按钮） */
  footer?: ReactNode
}

const ACCENTS = {
  wheel: 'text-amber-600',
  expiry: 'text-red-500',
  media: 'text-blue-500',
  schedule: 'text-purple-500',
  stone: 'text-stone-700'
}

export function Layout({ title, accent = 'stone', actions, children, footer }: LayoutProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-paper">
      {/* 顶部导航条 */}
      <header className="sticky top-0 z-30 bg-paper/80 backdrop-blur-lg border-b border-stone-100">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center gap-2">
          <Link
            to="/"
            aria-label="返回首页"
            className="w-9 h-9 -ml-1.5 rounded-xl inline-flex items-center justify-center text-stone-600 hover:bg-stone-100"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className={clsx('text-base font-semibold truncate', ACCENTS[accent])}>
            {title}
          </h1>
          <div className="ml-auto flex items-center gap-1.5">{actions}</div>
        </div>
      </header>

      {/* 内容区 */}
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-4">{children}</div>
      </main>

      {/* 固定底部操作栏 */}
      {footer && (
        <div className="sticky bottom-0 z-30 bg-paper/90 backdrop-blur-lg border-t border-stone-100 safe-bottom">
          <div className="mx-auto max-w-3xl px-4 py-3">{footer}</div>
        </div>
      )}
    </div>
  )
}
