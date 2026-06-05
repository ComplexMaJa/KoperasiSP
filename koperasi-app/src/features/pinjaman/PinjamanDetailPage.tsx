import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, ArrowLeft, Zap, Trash2 } from 'lucide-react'
import apiClient from '@/api/client'
import { useAuthStore } from '@/store/authStore'

export default function PinjamanDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isAdmin = useAuthStore(s => s.isAdmin())
  const isPengurus = useAuthStore(s => s.isPengurus())

  const [tolakCatatan, setTolakCatatan] = useState('')
  const [isTolakOpen, setIsTolakOpen] = useState(false)

  const { data: res, isLoading } = useQuery({
    queryKey: ['pinjaman', id],
    queryFn: () => apiClient.get(`/pinjaman/${id}`)
  })
  const p = res?.data?.data

  const { mutate: setujui } = useMutation({
    mutationFn: () => apiClient.put(`/pinjaman/${id}/setujui`),
    onSuccess: (res) => {
      toast.success(res.data.pesan)
      queryClient.invalidateQueries({ queryKey: ['pinjaman', id] })
    },
    onError: (err: any) => toast.error(err.message)
  })

  const { mutate: tolak } = useMutation({
    mutationFn: () => apiClient.put(`/pinjaman/${id}/tolak`, { catatan_penolakan: tolakCatatan }),
    onSuccess: (res) => {
      toast.success(res.data.pesan)
      setIsTolakOpen(false)
      queryClient.invalidateQueries({ queryKey: ['pinjaman', id] })
    },
    onError: (err: any) => toast.error(err.message)
  })

  const { mutate: cairkan } = useMutation({
    mutationFn: () => apiClient.put(`/pinjaman/${id}/cair`),
    onSuccess: (res) => {
      toast.success(res.data.pesan)
      queryClient.invalidateQueries({ queryKey: ['pinjaman', id] })
    },
    onError: (err: any) => toast.error(err.message)
  })

  const { mutate: pelunasanCepat } = useMutation({
    mutationFn: () => apiClient.post(`/pinjaman/${id}/pelunasan-cepat`),
    onSuccess: (res) => {
      toast.success(res.data.pesan)
      queryClient.invalidateQueries({ queryKey: ['pinjaman', id] })
    },
    onError: (err: any) => toast.error(err.message)
  })

  const { mutate: deletePinjaman } = useMutation({
    mutationFn: () => apiClient.delete(`/pinjaman/${id}`),
    onSuccess: (res) => {
      toast.success(res.data.pesan)
      navigate('/pinjaman')
    },
    onError: (err: any) => toast.error(err.message)
  })

  const formatRp = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num)

  if (isLoading) return <div className="p-8"><div className="skeleton h-64 w-full" /></div>
  if (!p) return <div className="p-8 text-center">Data tidak ditemukan</div>

  const canApprove = (isAdmin || isPengurus) && p.status === 'pengajuan'
  const canCair = isAdmin && p.status === 'disetujui'
  const canLunasCepat = (isAdmin || isPengurus) && p.status === 'cair'

  return (
    <div className="page-content animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/pinjaman')} className="btn-icon bg-amoled-800"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-3">
            Detail Pinjaman #{p.id}
            <span className={`badge badge-${p.status}`}>{p.status.toUpperCase()}</span>
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="card p-6 md:col-span-2 space-y-4">
          <h3 className="font-semibold text-white border-b border-amoled-600 pb-2">Informasi Pinjaman</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-teks-muted text-xs uppercase mb-1">Peminjam</p>
              <p className="font-medium text-white">{p.anggota?.nama}</p>
              <p className="font-mono text-xs text-teks-secondary">{p.anggota?.nik}</p>
            </div>
            <div>
              <p className="text-teks-muted text-xs uppercase mb-1">Penjamin</p>
              {p.penjamin ? (
                <>
                  <p className="font-medium text-white">{p.penjamin.nama}</p>
                  <p className="font-mono text-xs text-teks-secondary">{p.penjamin.nik}</p>
                </>
              ) : <p className="text-teks-secondary">-</p>}
            </div>
            <div>
              <p className="text-teks-muted text-xs uppercase mb-1">Tujuan Pinjaman</p>
              <p className="text-white">{p.tujuan_pinjaman}</p>
            </div>
            <div>
              <p className="text-teks-muted text-xs uppercase mb-1">Tanggal Pengajuan</p>
              <p className="text-white font-mono">{p.tanggal_pengajuan}</p>
            </div>
            
            <div className="col-span-2 divider my-2"></div>

            <div>
              <p className="text-teks-muted text-xs uppercase mb-1">Plafon Pinjaman</p>
              <p className="text-xl font-bold text-white font-mono">{formatRp(p.jumlah_pinjaman)}</p>
            </div>
            <div>
              <p className="text-teks-muted text-xs uppercase mb-1">Tenor</p>
              <p className="text-xl font-bold text-white">{p.tenor_bulan} Bulan</p>
            </div>
          </div>
        </div>

        {/* Action / Simulasi Card */}
        <div className="space-y-6">
          <div className="card p-6 bg-amoled-800">
            <h3 className="font-semibold text-white mb-4">Rincian Angsuran</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-teks-secondary">
                <span>Pokok</span> <span className="text-white font-mono">{formatRp(p.angsuran_pokok)}</span>
              </div>
              <div className="flex justify-between text-teks-secondary">
                <span>Bunga ({p.bunga_persen}%)</span> <span className="text-bahaya font-mono">+{formatRp(p.angsuran_bunga)}</span>
              </div>
              <div className="divider"></div>
              <div className="flex justify-between font-bold">
                <span className="text-white">Total per Bulan</span> <span className="text-sukses font-mono">{formatRp(p.total_angsuran)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {canApprove && (
              <>
                <button className="btn-primary w-full py-3 text-sm" onClick={() => {
                  if (confirm('Setujui pengajuan pinjaman ini? Jadwal angsuran akan otomatis dibuat.')) setujui()
                }}>
                  <CheckCircle size={18} /> Setujui Pinjaman
                </button>
                <button className="btn-danger w-full py-3 text-sm" onClick={() => setIsTolakOpen(true)}>
                  <XCircle size={18} /> Tolak Pengajuan
                </button>
              </>
            )}
            
            {canCair && (
              <button className="btn-primary w-full py-3 text-sm" onClick={() => {
                if (confirm('Cairkan dana ke anggota? Status akan berubah menjadi aktif.')) cairkan()
              }}>
                <Zap size={18} /> Cairkan Dana
              </button>
            )}

            {canLunasCepat && (
              <button className="btn w-full bg-amoled-700 text-white hover:bg-amoled-600 border border-amoled-500 py-3 text-sm" onClick={() => {
                if (confirm('Lakukan pelunasan cepat? Semua sisa pokok akan dilunasi tanpa bunga tambahan.')) pelunasanCepat()
              }}>
                <Zap size={18} className="text-sukses" /> Pelunasan Cepat
              </button>
            )}
            
            {p.status === 'ditolak' && (
               <div className="card border-bahaya/50 bg-bahaya-bg p-4 text-sm mt-4">
                  <span className="text-bahaya font-bold block mb-1">Alasan Ditolak:</span>
                  <p className="text-bahaya">{p.catatan_penolakan}</p>
               </div>
            )}

            {isAdmin && (
               <button 
                 className="btn-danger w-full py-3 text-sm mt-3" 
                 onClick={() => {
                   if (confirm('Apakah Anda yakin ingin menghapus pinjaman ini secara permanen beserta semua jadwal angsurannya?')) {
                     deletePinjaman()
                   }
                 }}
               >
                 <Trash2 size={18} /> Hapus Pinjaman
               </button>
            )}
          </div>
        </div>

        {/* Jadwal Angsuran (if approved) */}
        {p.angsuran && p.angsuran.length > 0 && (
          <div className="md:col-span-3 card p-6 mt-2">
            <h3 className="font-semibold text-white mb-4">Jadwal Angsuran</h3>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-16 text-center">Bulan Ke</th>
                    <th>Jatuh Tempo</th>
                    <th className="text-right">Pokok</th>
                    <th className="text-right">Bunga</th>
                    <th className="text-right">Total Angsuran</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {p.angsuran.map((a: any) => (
                    <tr key={a.id}>
                      <td className="text-center font-bold text-white">{a.ke}</td>
                      <td className="font-mono text-sm">{a.tanggal_jatuh_tempo}</td>
                      <td className="text-right font-mono text-sm">{formatRp(a.pokok)}</td>
                      <td className="text-right font-mono text-sm">{formatRp(a.bunga)}</td>
                      <td className="text-right font-mono text-sm font-semibold text-white">{formatRp(a.pokok + a.bunga)}</td>
                      <td><span className={`badge badge-${a.status}`}>{a.status.toUpperCase()}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Tolak Modal */}
      {isTolakOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header border-bahaya">
              <h2 className="modal-title text-bahaya">Tolak Pinjaman</h2>
              <button onClick={() => setIsTolakOpen(false)} className="btn-icon">✕</button>
            </div>
            <div className="modal-body">
              <label className="label">Catatan Penolakan</label>
              <textarea 
                className="input" rows={3} 
                value={tolakCatatan} onChange={e => setTolakCatatan(e.target.value)}
                placeholder="Berikan alasan mengapa pinjaman ditolak..."
              ></textarea>
            </div>
            <div className="modal-footer">
              <button onClick={() => setIsTolakOpen(false)} className="btn-ghost">Batal</button>
              <button disabled={!tolakCatatan} onClick={() => tolak()} className="btn-danger">
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
