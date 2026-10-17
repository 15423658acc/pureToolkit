import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ToastProvider } from './components/ui/Toast'
import { HomePage } from './pages/Home'

const WheelPage = lazy(() => import('./tools/wheel/Wheel'))
const ExpiryPage = lazy(() => import('./tools/expiry/Expiry'))
const MediaListPage = lazy(() => import('./tools/media-list/MediaList'))
const SchedulePage = lazy(() => import('./tools/schedule/Schedule'))

function Loading() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-paper">
      <div className="text-stone-400 text-sm">加载中…</div>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <HashRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/wheel" element={<WheelPage />} />
            <Route path="/expiry" element={<ExpiryPage />} />
            <Route path="/media" element={<MediaListPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route
              path="*"
              element={
                <Layout title="页面不存在">
                  <div className="text-center py-12 text-stone-500">这个工具还没准备好</div>
                </Layout>
              }
            />
          </Routes>
        </Suspense>
      </HashRouter>
    </ToastProvider>
  )
}
