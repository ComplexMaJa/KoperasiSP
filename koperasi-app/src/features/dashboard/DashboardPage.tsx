import { useQuery } from '@tanstack/react-query'
import { Users, Wallet, Landmark, AlertCircle, Clock } from 'lucide-react'
import apiClient from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { Link } from 'react-router-dom'

export default function DashboardPage() {
  const user = useAuthStore(s => s.user)
  const isAdmin = useAuthStore(s => s.isAdmin())
  const isPengurus = useAuthStore(s => s.isPengurus())

  const { data: res, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => apiClient.get('/dashboard/summary'),
    enabled: isAdmin || isPengurus
  })
  
  const s = res?.data?.data

  const formatRp = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num || 0)

  if (!isAdmin && !isPengurus) {
    return (
      <div className="page-content animate-fade-in">
        <h1 className="text-2xl font-bold text-white mb-2">Selamat Datang, {user?.name}</h1>
        <p className="text-teks-secondary">Gunakan menu di samping untuk melihat data simpanan dan pinjaman Anda.</p>
      </div>
    )
  }

  return (
    <div className="page-content animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard Koperasi</h1>
        <p className="text-teks-secondary">Ringkasan aktivitas dan status keuangan.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
      ) : s ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="card-elevated p-5 border-l-4 border-l-info">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-info/10 text-info flex items-center justify-center shrink-0">
                <Users size={24} />
              </div>
              <div>
                <p className="text-xs text-teks-secondary uppercase tracking-wider font-semibold mb-1">Anggota Aktif</p>
                <h3 className="text-2xl font-bold text-white">{s.total_anggota} <span className="text-sm font-normal text-teks-muted">orang</span></h3>
              </div>
            </div>
          </div>

          <div className="card-elevated p-5 border-l-4 border-l-sukses">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-sukses/10 text-sukses flex items-center justify-center shrink-0">
                <Wallet size={24} />
              </div>
              <div className="w-full overflow-hidden">
                <p className="text-xs text-teks-secondary uppercase tracking-wider font-semibold mb-1">Total Simpanan</p>
                <h3 className="text-xl font-bold text-white font-mono truncate" title={formatRp(s.total_simpanan)}>
                  {formatRp(s.total_simpanan)}
                </h3>
              </div>
            </div>
          </div>

          <div className="card-elevated p-5 border-l-4 border-l-peringatan">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-peringatan/10 text-peringatan flex items-center justify-center shrink-0">
                <Landmark size={24} />
              </div>
              <div>
                <p className="text-xs text-teks-secondary uppercase tracking-wider font-semibold mb-1">Pinjaman Aktif</p>
                <h3 className="text-2xl font-bold text-white">{s.pinjaman_aktif} <span className="text-sm font-normal text-teks-muted">pinjaman</span></h3>
              </div>
            </div>
          </div>

          <div className="card-elevated p-5 border-l-4 border-l-bahaya">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-bahaya/10 text-bahaya flex items-center justify-center shrink-0">
                <AlertCircle size={24} />
              </div>
              <div>
                <p className="text-xs text-teks-secondary uppercase tracking-wider font-semibold mb-1">Angsuran Telat</p>
                <h3 className="text-2xl font-bold text-white">{s.angsuran_telat} <span className="text-sm font-normal text-teks-muted">tagihan</span></h3>
              </div>
            </div>
          </div>

        </div>
      ) : null}

      {s && s.angsuran_hari_ini > 0 && (
        <div className="mt-6 card p-4 bg-peringatan/5 border-peringatan/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock size={20} className="text-peringatan animate-pulse" />
            <p className="text-sm text-white">Ada <strong className="text-peringatan">{s.angsuran_hari_ini} angsuran</strong> yang jatuh tempo hari ini.</p>
          </div>
          <Link to="/angsuran" className="btn text-xs bg-peringatan text-black hover:bg-peringatan/80 font-semibold px-3 py-1.5 rounded-md">
            Lihat Tagihan
          </Link>
        </div>
      )}
    </div>
  )
}
