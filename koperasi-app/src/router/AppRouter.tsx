import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './guards'
import { AppLayout }      from '@/components/layout/AppLayout'
import { Skeleton }       from '@/components/ui/Skeleton'

// Lazy-loaded pages
const LoginPage         = lazy(() => import('@/features/auth/LoginPage'))
const DashboardPage     = lazy(() => import('@/features/dashboard/DashboardPage'))
const PengaturanPage    = lazy(() => import('@/features/pengaturan/PengaturanPage'))
const AnggotaPage       = lazy(() => import('@/features/anggota/AnggotaPage'))
const SimpananPage      = lazy(() => import('@/features/simpanan/SimpananPage'))
const PinjamanPage      = lazy(() => import('@/features/pinjaman/PinjamanPage'))
const PinjamanDetailPage = lazy(() => import('@/features/pinjaman/PinjamanDetailPage'))
const KategoriPinjamanPage = lazy(() => import('@/features/pinjaman/KategoriPinjamanPage'))
const AngsuranPage      = lazy(() => import('@/features/angsuran/AngsuranPage'))
const LaporanPage       = lazy(() => import('@/features/laporan/LaporanPage'))
const UserPage          = lazy(() => import('@/features/user/UserPage'))

function PageLoader() {
  return (
    <div className="p-6 space-y-3">
      <div className="skeleton h-8 w-48" />
      <div className="skeleton h-12 w-full" />
      <div className="skeleton h-64 w-full" />
    </div>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected — inside AppLayout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"   element={<DashboardPage />} />
              <Route path="/pengaturan"  element={<PengaturanPage />} />
              <Route path="/anggota"     element={<AnggotaPage />} />
              <Route path="/simpanan"    element={<SimpananPage />} />
              <Route path="/pinjaman"    element={<PinjamanPage />} />
              <Route path="/pinjaman/:id" element={<PinjamanDetailPage />} />
              <Route path="/kategori-pinjaman" element={<KategoriPinjamanPage />} />
              <Route path="/angsuran"    element={<AngsuranPage />} />
              <Route path="/laporan"     element={<LaporanPage />} />
              <Route path="/pengguna"    element={<UserPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
