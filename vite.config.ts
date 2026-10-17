import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'
import path from 'node:path'

// 部署到 https://15423658acc.github.io/pureToolkit/，base 必须匹配子路径
const DEPLOY_BASE = '/pureToolkit/'

export default defineConfig({
  base: DEPLOY_BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // PWA 配置：可安装、可离线
      manifest: {
        name: '纯·工具箱',
        short_name: '工具箱',
        description: '纯前端的轻量生活小工具集合：转盘 / 保质期管家 / 阅读观影清单 / 日程安排。',
        theme_color: '#f59e0b',
        background_color: '#fafafa',
        display: 'standalone',
        orientation: 'portrait',
        scope: DEPLOY_BASE,
        start_url: DEPLOY_BASE,
        lang: 'zh-CN',
        icons: [
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons/maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // 同源静态资源走 StaleWhileRevalidate，离线优先
            // 用 RegExp 避免在 Node 环境类型检查时引用 self / location
            urlPattern: /^https?:\/\/[^/]+\/pureToolkit\//i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'puretoolkit-static',
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }
            }
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ],
  resolve: {
    // 用 import.meta.dirname 替代 __dirname，规避 Vite 8 native config loader 警告
    alias: { '@': path.resolve(import.meta.dirname, './src') }
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        // 按工具分块，懒加载提速首屏
        manualChunks: undefined
      }
    }
  }
})
