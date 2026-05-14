import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Search, Calculator, CheckCircle, Clock } from 'lucide-react'
import apiClient from '@/api/client'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function AngsuranPage() {
  const queryClient = useQueryClient()
  const isAdmin = useAuthStore(s => s.isAdmin())
  
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: res, isLoading } = useQuery({
    queryKey: ['angsuran', { page, search, status: statusFilter }],
    queryFn: () => apiClient.get('/angsuran', { params: { page, search, status: statusFilter } })
  })
  const angsuranList = res?.data?.data?.data || []

  const { mutate: bayar } = useMutation({
    mutationFn: (id: number) => apiClient.post(`/angsuran/${id}/bayar`),
    onSuccess: (res) => {
      toast.success(res.data.pesan)
      queryClient.invalidateQueries({ queryKey: ['angsuran'] })
      queryClient.invalidateQueries({ queryKey: ['pinjaman'] })
    },
    onError: (err: any) => toast.error(err.message)
  })

  const { mutate: generateDenda, isPending: isGenerating } = useMutation({
    mutationFn: () => apiClient.post('/angsuran/generate-denda'),
    onSuccess: (res) => {
      toast.success(res.data.pesan)
      queryClient.invalidateQueries({ queryKey: ['angsuran'] })
    },
    onError: (err: any) => toast.error(err.message)
  })

  const formatRp = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num)

  return (
    <div className="page-content animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pembayaran Angsuran</h1>
          <p className="page-desc">Catat pembayaran angsuran dan kelola denda keterlambatan.</p>
        </div>
        {isAdmin && (
          <button 
            className="btn w-auto bg-amoled-800 text-white hover:bg-amoled-700 border border-amoled-600"
            onClick={() => generateDenda()}
            disabled={isGenerating}
          >
            <Calculator size={16} className="text-merah-500" /> 
            {isGenerating ? 'Menghitung...' : 'Hitung Denda (Manual)'}
          </button>
        )}
      </div>

      <div className="card p-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-teks-muted" size={16} />
            <input 
              type="text" 
              placeholder="Cari NIK atau Nama Anggota..." 
              className="input pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select 
            className="input max-w-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="belum">Belum Bayar</option>
            <option value="telat">Telat (Denda)</option>
            <option value="lunas">Lunas</option>
          </select>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Peminjam</th>
                <th className="text-center">Ke</th>
                <th>Jatuh Tempo</th>
                <th className="text-right">Tagihan + Denda</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6}><div className="skeleton-row h-10" /></td></tr>
                ))
              ) : angsuranList.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-6 text-teks-muted">Tidak ada data angsuran ditemukan.</td></tr>
              ) : (
                angsuranList.map((a: any) => {
                  const totalTagihan = a.pokok + a.bunga + a.denda
                  
                  return (
                    <tr key={a.id}>
                      <td>
                        <Link to={`/pinjaman/${a.pinjaman_id}`} className="font-medium text-info hover:underline block">
                          {a.pinjaman.anggota.nama}
                        </Link>
                        <span className="text-xs text-teks-muted font-mono">{a.pinjaman.anggota.nik}</span>
                      </td>
                      <td className="text-center font-bold text-white">{a.ke}</td>
                      <td>
                        <span className={`font-mono text-sm ${a.status === 'telat' ? 'text-bahaya font-bold' : ''}`}>
                          {a.tanggal_jatuh_tempo}
                        </span>
                        {a.status === 'telat' && <Clock size={12} className="inline ml-2 text-bahaya" />}
                      </td>
                      <td className="text-right">
                        <div className="font-mono text-sm text-white font-semibold">
                          {formatRp(totalTagihan)}
                        </div>
                        {a.denda > 0 && (
                          <div className="text-xs text-bahaya font-mono flex justify-end items-center gap-1 mt-0.5">
                            (+Denda {formatRp(a.denda)})
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${a.status}`}>{a.status.toUpperCase()}</span>
                        {a.status === 'lunas' && <div className="text-[10px] text-teks-muted mt-1">Tgl: {a.tanggal_bayar}</div>}
                      </td>
                      <td className="text-right space-x-1">
                        {a.status !== 'lunas' ? (
                          <button 
                            className="btn-primary py-1.5 px-3 text-xs w-full max-w-[100px] inline-flex items-center gap-1 justify-center"
                            onClick={() => {
                              if (confirm(`Proses pembayaran sebesar ${formatRp(totalTagihan)} untuk ${a.pinjaman.anggota.nama}?`)) {
                                bayar(a.id)
                              }
                            }}
                          >
                            <CheckCircle size={14} /> Bayar
                          </button>
                        ) : (
                          <span className="text-xs text-sukses font-medium inline-flex items-center gap-1">
                            <CheckCircle size={14} /> Selesai
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
