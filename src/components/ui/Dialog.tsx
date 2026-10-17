import { clsx } from 'clsx'
import { X } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** sm | md | lg | full */
  size?: 'sm' | 'md' | 'lg' | 'full'
}

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  full: 'max-w-full'
}

export function Dialog({ open, onClose, title, children, footer, size = 'md' }: DialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 遮罩 */}
      <button
        aria-label="关闭"
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={clsx(
          'relative w-full bg-white shadow-xl',
          'rounded-t-3xl sm:rounded-3xl',
          'max-h-[90dvh] flex flex-col',
          SIZES[size]
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-stone-100">
            <h2 className="text-base font-semibold text-stone-900">{title}</h2>
            <button
              aria-label="关闭对话框"
              onClick={onClose}
              className="text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg w-8 h-8 inline-flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-stone-100 flex gap-2 justify-end safe-bottom">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
