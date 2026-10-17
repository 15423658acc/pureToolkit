import type { ReactNode } from 'react'

interface EmptyProps {
  icon?: ReactNode
  title: string
  hint?: string
  action?: ReactNode
}

export function Empty({ icon, title, hint, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 mb-3">
          {icon}
        </div>
      )}
      <p className="text-stone-700 font-medium">{title}</p>
      {hint && <p className="text-sm text-stone-400 mt-1 max-w-xs">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
