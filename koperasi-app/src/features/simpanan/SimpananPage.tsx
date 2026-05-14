import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Wallet, ArrowDownCircle, ArrowUpCircle, CheckCircle } from 'lucide-react'
import apiClient from '@/api/client'

// Types
interface Anggota {
  id: number
  nik: string
  nama: string
  status: string
}

const sukarelaSchema = z.object({
  jenis: z.enum(['setor', 'tarik']).optional(),
  jumlah: z.coerce.number().min(1000, 'Minimal Rp 1.000'),
  keterangan: z.string().optional(),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
})

export default function SimpananPage() {
  const queryClient = useQueryClient()
  const [selectedAnggota, setSelectedAnggota] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'wajib' | 'sukarela'>('wajib')
  const [tahun, setTahun] = useState(new Date().getFullYear())
  
  const [isSukarelaModalOpen, setIsSukarelaModalOpen] = useState(false)
  const [sukarelaMode, setSukarelaMode] = useState<'setor' | 'tarik'>('setor')

  // -- Queries --
  // Fetch all anggota for dropdown
  const { data: anggotaRes } = useQuery({
    queryKey: ['anggota-list'],
    queryFn: () => apiClient.get('/anggota?limit=1000&status=aktif')
  })
  const anggotaList: Anggota[] = anggotaRes?.data?.data?.data || []

  // Wajib
  const { data: wajibRes, isLoading: loadingWajib } = useQuery({
    queryKey: ['simpanan-wajib', selectedAnggota, tahun],
    queryFn: () => apiClient.get(`/simpanan/wajib/${selectedAnggota}?tahun=${tahun}`),
    enabled: !!selectedAnggota && activeTab === 'wajib'
  })
  const wajibData = wajibRes?.data?.data?.simpanan_wajib || []
  
  // Sukarela
  const { data: sukarelaRes, isLoading: loadingSukarela } = useQuery({
    queryKey: ['simpanan-sukarela', selectedAnggota],
    queryFn: () => apiClient.get(`/simpanan/sukarela/${selectedAnggota}`),
    enabled: !!selectedAnggota && activeTab === 'sukarela'
  })
  const saldoSukarela = sukarelaRes?.data?.data?.saldo || 0
  const riwayatSukarela = sukarelaRes?.data?.data?.riwayat?.data || []

  // -- Mutations --
  const { mutate: bayarWajib } = useMutation({
    mutationFn: (bulan: number) => apiClient.post('/simpanan/wajib', {
      anggota_id: selectedAnggota,
      bulan,
      tahun,
      tanggal_bayar: new Date().toISOString().split('T')[0]
    }),
    onSuccess: (res) => {
      toast.success(res.data.pesan)
      queryClient.invalidateQueries({ queryKey: ['simpanan-wajib'] })
    },
    onError: (err: any) => toast.error(err.message)
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(sukarelaSchema)
  })

  const { mutate: submitSukarela } = useMutation({
    mutationFn: (data: any) => apiClient.post(`/simpanan/sukarela/${data.jenis}`, {
      anggota_id: selectedAnggota,
      jumlah: data.jumlah,
      tanggal: data.tanggal,
      keterangan: data.keterangan
    }),
    onSuccess: (res) => {
      toast.success(res.data.pesan)
      setIsSukarelaModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['simpanan-sukarela'] })
    },
    onError: (err: any) => toast.error(err.message)
  })

  const formatRp = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num)

  const bulanList = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

  return (
    <div className="page-content animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Manajemen Simpanan</h1>
          <p className="page-desc">Kelola simpanan wajib dan sukarela anggota.</p>
        </div>
      </div>

      {/* Anggota Selector */}
      <div className="card p-5 mb-6">
        <label className="label">Pilih Anggota Aktif</label>
        <select 
          className="input max-w-md"
          value={selectedAnggota || ''}
          onChange={(e) => setSelectedAnggota(Number(e.target.value))}
        >
          <option value="" disabled>-- Pilih Anggota --</option>
          {anggotaList.map((a: Anggota) => (
            <option key={a.id} value={a.id}>{a.nik} - {a.nama}</option>
          ))}
        </select>
      </div>

      {selectedAnggota && (
        <>
          {/* Tabs */}
          <div className="tabs">
            <button className={activeTab === 'wajib' ? 'tab-active' : 'tab'} onClick={() => setActiveTab('wajib')}>Simpanan Wajib</button>
            <button className={activeTab === 'sukarela' ? 'tab-active' : 'tab'} onClick={() => setActiveTab('sukarela')}>Simpanan Sukarela</button>
          </div>

          {/* Tab Wajib */}
          {activeTab === 'wajib' && (
            <div className="card p-6 animate-slide-up">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-white">Status Pembayaran Tahun {tahun}</h3>
                <select className="input max-w-[120px]" value={tahun} onChange={(e) => setTahun(Number(e.target.value))}>
                  {[0, 1, 2, 3, 4].map(offset => {
                    const y = new Date().getFullYear() - offset
                    return <option key={y} value={y}>{y}</option>
                  })}
                </select>
              </div>

              {loadingWajib ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><div className="skeleton h-24 col-span-4" /></div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {bulanList.map((namaBulan, i) => {
                    const bulanNum = i + 1
                    const record = wajibData.find((w: any) => w.bulan === bulanNum)
                    
                    return (
                      <div key={bulanNum} className={`p-4 rounded-lg border flex flex-col items-center justify-center text-center transition-colors ${record ? 'bg-sukses-bg/20 border-sukses/30' : 'bg-amoled-800 border-amoled-600'}`}>
                        <span className="text-sm font-medium text-teks-primary mb-1">{namaBulan}</span>
                        {record ? (
                          <>
                            <CheckCircle size={24} className="text-sukses my-2" />
                            <span className="text-xs text-teks-muted">Lunas: {record.tanggal_bayar}</span>
                            <span className="text-xs font-mono text-white mt-1">{formatRp(Number(record.jumlah))}</span>
                          </>
                        ) : (
                          <>
                            <div className="h-6 my-2"></div>
                            <button className="btn-primary py-1.5 px-3 text-xs w-full max-w-[120px]" onClick={() => {
                              if(confirm(`Bayar simpanan wajib bulan ${namaBulan} ${tahun}?`)) bayarWajib(bulanNum)
                            }}>
                              Bayar
                            </button>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab Sukarela */}
          {activeTab === 'sukarela' && (
            <div className="space-y-6 animate-slide-up">
              {/* Summary Card */}
              <div className="card p-6 bg-gradient-to-br from-amoled-900 to-amoled-800 border-l-4 border-l-merah-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-teks-secondary mb-1">Total Saldo Sukarela</p>
                    {loadingSukarela ? <div className="skeleton h-8 w-40" /> : <h2 className="text-3xl font-bold text-white font-mono">{formatRp(saldoSukarela)}</h2>}
                  </div>
                  <Wallet size={40} className="text-merah-500 opacity-20" />
                </div>
                <div className="mt-6 flex gap-3">
                  <button className="btn-primary" onClick={() => {
                    setSukarelaMode('setor')
                    reset({ jenis: 'setor', jumlah: '', tanggal: new Date().toISOString().split('T')[0], keterangan: '' })
                    setIsSukarelaModalOpen(true)
                  }}>
                    <ArrowDownCircle size={16} /> Setor Dana
                  </button>
                  <button className="btn-ghost text-white border-amoled-500 hover:bg-amoled-700" onClick={() => {
                    setSukarelaMode('tarik')
                    reset({ jenis: 'tarik', jumlah: '', tanggal: new Date().toISOString().split('T')[0], keterangan: '' })
                    setIsSukarelaModalOpen(true)
                  }}>
                    <ArrowUpCircle size={16} /> Tarik Dana
                  </button>
                </div>
              </div>

              {/* Riwayat Table */}
              <div className="card p-4">
                <h3 className="font-semibold text-white mb-4">Riwayat Transaksi</h3>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>Jenis</th>
                        <th>Keterangan</th>
                        <th className="text-right">Nominal</th>
                        <th className="text-right">Saldo Setelah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingSukarela ? (
                         <tr><td colSpan={5}><div className="skeleton-row h-10" /></td></tr>
                      ) : riwayatSukarela.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-6 text-teks-muted">Belum ada transaksi sukarela.</td></tr>
                      ) : (
                        riwayatSukarela.map((r: any) => (
                          <tr key={r.id}>
                            <td>{r.tanggal}</td>
                            <td>
                              <span className={`badge ${r.jenis === 'setor' ? 'bg-sukses-bg text-sukses' : 'bg-bahaya-bg text-bahaya'}`}>
                                {r.jenis.toUpperCase()}
                              </span>
                            </td>
                            <td>{r.keterangan || '-'}</td>
                            <td className={`text-right font-mono ${r.jenis === 'setor' ? 'text-sukses' : 'text-bahaya'}`}>
                              {r.jenis === 'setor' ? '+' : '-'}{formatRp(Number(r.jumlah))}
                            </td>
                            <td className="text-right font-mono text-white">{formatRp(Number(r.saldo_setelah))}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Sukarela Modal */}
      {isSukarelaModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="modal-title flex items-center gap-2">
                {sukarelaMode === 'setor' ? <ArrowDownCircle size={18} className="text-sukses" /> : <ArrowUpCircle size={18} className="text-bahaya" />}
                {sukarelaMode === 'setor' ? 'Setor Simpanan Sukarela' : 'Tarik Simpanan Sukarela'}
              </h2>
              <button onClick={() => setIsSukarelaModalOpen(false)} className="btn-icon">✕</button>
            </div>
            <form onSubmit={handleSubmit((d) => submitSukarela({ ...d, jenis: sukarelaMode }))}>
              <div className="modal-body space-y-4">
                <div>
                  <label className="label">Tanggal Transaksi</label>
                  <input type="date" className="input" {...register('tanggal')} />
                  {errors.tanggal && <p className="error-msg">{errors.tanggal.message as string}</p>}
                </div>
                <div>
                  <label className="label">Nominal {sukarelaMode === 'setor' ? 'Setoran' : 'Penarikan'}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-teks-muted">Rp</span>
                    <input type="number" className="input pl-9 font-mono" {...register('jumlah')} placeholder="50000" />
                  </div>
                  {errors.jumlah && <p className="error-msg">{errors.jumlah.message as string}</p>}
                </div>
                <div>
                  <label className="label">Keterangan (Opsional)</label>
                  <input type="text" className="input" {...register('keterangan')} placeholder="Contoh: Tabungan qurban" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsSukarelaModalOpen(false)} className="btn-ghost">Batal</button>
                <button type="submit" disabled={isSubmitting} className={sukarelaMode === 'setor' ? 'btn-primary' : 'btn-danger'}>
                  {isSubmitting ? 'Memproses...' : 'Proses Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
