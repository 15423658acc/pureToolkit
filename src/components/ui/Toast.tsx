/**
 * 轻量 toast（不引入外部库）
 * 通过 useToast() 在任意组件触发
 */
import { clsx } from 'clsx'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'
interface Toast { id: number; type: ToastType; message: string }

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, type, message }])
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 2400)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none safe-bottom">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              'pointer-events-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm text-white',
              t.type === 'success' && 'bg-emerald-600',
              t.type === 'error' && 'bg-red-500',
              t.type === 'info' && 'bg-stone-900'
            )}
          >
            {t.type === 'success' && <CheckCircle2 size={16} />}
            {t.type === 'error' && <AlertCircle size={16} />}
            {t.type === 'info' && <Info size={16} />}
            <span>{t.message}</span>
            <button
              className="opacity-70 hover:opacity-100"
              onClick={() => setToasts((arr) => arr.filter((x) => x.id !== t.id))}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx.toast
}
