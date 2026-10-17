/**
 * PWA 安装提示横幅 + 平台能力提示
 */
import { Download, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { detectPlatformCapabilities } from '../core/notify'
import { useAppStore } from '../core/store'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'puretoolkit.install.dismissed'

export function InstallBanner() {
  const { installPromptAvailable, setInstallPromptAvailable, installed, setInstalled } = useAppStore()
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const caps = detectPlatformCapabilities()
    if (caps.isPWAInstalled) setInstalled(true)

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setInstallPromptAvailable(true)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallPromptAvailable(false)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [setInstallPromptAvailable, setInstalled])

  if (installed || !installPromptAvailable) return null
  const dismissed = localStorage.getItem(DISMISS_KEY) === '1'
  if (dismissed) return null

  const onInstall = async () => {
    if (!deferred) return
    await deferred.prompt()
    const res = await deferred.userChoice
    if (res.outcome === 'accepted') setInstalled(true)
    setInstallPromptAvailable(false)
    setDeferred(null)
  }
  const onDismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setInstallPromptAvailable(false)
  }

  return (
    <div className="mx-auto max-w-3xl mb-3">
      <div className="flex items-center gap-3 bg-stone-900 text-white rounded-2xl px-4 py-3 shadow-md">
        <Download size={18} className="shrink-0" />
        <div className="flex-1 text-sm">
          <p className="font-medium">安装到桌面，离线更顺手</p>
          <p className="text-stone-300 text-xs">无网络也能用，开箱即享</p>
        </div>
        <button
          onClick={onInstall}
          className="shrink-0 bg-white text-stone-900 text-xs font-semibold px-3 h-8 rounded-lg"
        >
          安装
        </button>
        <button
          aria-label="关闭"
          onClick={onDismiss}
          className="shrink-0 text-stone-400 hover:text-white w-8 h-8 inline-flex items-center justify-center"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
