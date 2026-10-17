/**
 * 本地通知封装
 * ------------------------------------------------------------
 * 纯前端方案，无后端 Push。仅当 PWA 已安装 + 用户授权 + App 在前台/后台被唤醒时有效。
 * iOS Safari 完全不支持 Periodic Background Sync；Android Chrome 在已安装 PWA 下可注册，
 * 但间隔最少 12 小时且不保证准时。
 *
 * 兜底方案：App 打开时立即扫描将到期项目并弹横幅，详见各工具页面。
 */

// 浏览器实现支持 vibrate 字段，但 lib.dom.d.ts 未声明，这里本地扩展
declare global {
  interface NotificationOptions {
    vibrate?: number[]
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export async function ensurePermissionOrNotify(): Promise<boolean> {
  const granted = await requestNotificationPermission()
  if (!granted) return false
  return true
}

/** 立即显示一条本地通知 */
export async function showNotification(title: string, body: string): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        await reg.showNotification(title, {
          body,
          icon: '/pureToolkit/icons/icon.svg',
          badge: '/pureToolkit/icons/icon.svg',
          vibrate: [80, 40, 80]
        } as NotificationOptions & { vibrate?: number[] })
        return
      }
    }
    // 退回到普通 Notification
    new Notification(title, { body })
  } catch {
    /* 通知失败静默处理 */
  }
}

/**
 * 注册 Periodic Background Sync（仅 Chrome 安卓 + 已安装 PWA）
 * 唤醒间隔不保证准时，仅在浏览器认为合适时触发。
 */
export async function registerPeriodicSync(tag = 'expiry-check'): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return false
    if (!('periodicSync' in reg)) return false
    const status = await (navigator as any).permissions?.query({
      name: 'periodic-background-sync' as any
    })
    if (status?.state !== 'granted') return false
    await (reg as any).periodicSync.register(tag, {
      minInterval: 12 * 60 * 60 // 12 小时
    })
    return true
  } catch {
    return false
  }
}

export function isPWAInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  )
}

/** 平台能力探测，给 UI 显示"该功能在 iOS 上不可用"等提示 */
export function detectPlatformCapabilities() {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isAndroid = /android/i.test(navigator.userAgent)
  const supportsNotifications = 'Notification' in window
  const supportsPeriodicSync = 'serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype
  return {
    isIOS,
    isAndroid,
    supportsNotifications,
    supportsPeriodicSync,
    isPWAInstalled: isPWAInstalled()
  }
}
