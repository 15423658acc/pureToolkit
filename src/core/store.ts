/**
 * 全局应用状态：轻量，仅放真正跨工具共享的状态
 */
import { create } from 'zustand'

interface AppState {
  /** 首页 Bento 布局模式：comfortable / compact */
  layout: 'comfortable' | 'compact'
  setLayout: (l: 'comfortable' | 'compact') => void

  /** 安装提示横幅是否显示 */
  installPromptAvailable: boolean
  setInstallPromptAvailable: (b: boolean) => void

  /** 已安装 */
  installed: boolean
  setInstalled: (b: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  layout: 'comfortable',
  setLayout: (l) => set({ layout: l }),
  installPromptAvailable: false,
  setInstallPromptAvailable: (b) => set({ installPromptAvailable: b }),
  installed: false,
  setInstalled: (b) => set({ installed: b })
}))
