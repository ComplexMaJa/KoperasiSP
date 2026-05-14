import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Plus, Edit2, LogOut, Search } from 'lucide-react'
import apiClient from '@/api/client'

// Types
interface Anggota {
  id: number
  nik: string
  nama: string
  alamat: string
  telepon: string
  tanggal_gabung: string
  status: 'aktif' | 'keluar'
  tanggal_keluar: string | null
  keterangan_keluar: string | null
}

interface Refund {
  pokok: number
  wajib: number
  sukarela: number
  total: number
}

// Schemas
const formSchema = z.object({
  nik: z.string().length(16, 'NIK harus 16 digit'),
  nama: z.string().min(1, 'Nama wajib diisi'),
  alamat: z.string().min(1, 'Alamat wajib diisi'),
  telepon: z.string().min(1, 'Telepon wajib diisi'),
  tanggal_gabung: z.string().min(1, 'Tanggal gabung wajib diisi'),
})

const keluarSchema = z.object({
  keterangan_keluar: z.string().min(1, 'Alasan keluar wajib diisi'),
})

export default function AnggotaPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingData, setEditingData] = useState<Anggota | null>(null)
  
  const [isKeluarOpen, setIsKeluarOpen] = useState(false)
  const [keluarTarget, setKeluarTarget] = useState<Anggota | null>(null)

  // API Queries
  const { data: res, isLoading } = useQuery({
    queryKey: ['anggota', { page, search, status: statusFilter }],
    queryFn: () => apiClient.get('/anggota', { params: { page, search, status: statusFilter } })
  })
  
  const anggotaList = res?.data?.data?.data || []

  const { data: saldoRes, isLoading: loadingSaldo } = useQuery({
    queryKey: ['anggota-saldo', keluarTarget?.id],
    queryFn: () => apiClient.get(`/anggota/${keluarTarget?.id}/saldo`),
    enabled: !!keluarTarget
  })
  const refundData: Refund | undefined = saldoRes?.data?.data

  // API Mutations
  const { mutate: saveAnggota } = useMutation({
    mutationFn: (data: any) => {
      if (editingData) return apiClient.put(`/anggota/${editingData.id}`, data)
      return apiClient.post('/anggota', data)
    },
    onSuccess: (res) => {
      toast.success(res.data.pesan)
      setIsFormOpen(false)
      queryClient.invalidateQueries({ queryKey: ['anggota'] })
    },
    onError: (err: any) => {
      toast.error(err.message)
      if (err.errors) toast.error(Object.values(err.errors)[0][0] as string)
    }
  })

  const { mutate: prosesKeluar } = useMutation({
    mutationFn: (data: any) => apiClient.post(`/anggota/${keluarTarget?.id}/keluar`, data),
    onSuccess: (res) => {
      toast.success(res.data.pesan)
      setIsKeluarOpen(false)
      queryClient.invalidateQueries({ queryKey: ['anggota'] })
    },
    onError: (err: any) => toast.error(err.message)
  })

  // Forms
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(formSchema)
  })

  const { register: regKeluar, handleSubmit: handleKeluar, reset: resetKeluar, formState: { errors: keluarErrors, isSubmitting: isKeluarSubmitting } } = useForm({
    resolver: zodResolver(keluarSchema)
  })

  const formatRp = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num)

  return (
    <div className="page-content animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Data Anggota</h1>
          <p className="page-desc">Kelola data anggota, pendaftaran baru, dan proses keluar anggota.</p>
        </div>
        <button className="btn-primary" onClick={() => {
          setEditingData(null)
          reset({ nik: '', nama: '', alamat: '', telepon: '', tanggal_gabung: new Date().toISOString().split('T')[0] })
          setIsFormOpen(true)
        }}>
          <Plus size={16} /> Tambah Anggota
        </button>
      </div>

      <div className="card p-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-teks-muted" size={16} />
            <input 
              type="text" 
              placeholder="Cari NIK atau Nama..." 
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
            <option value="aktif">Aktif</option>
            <option value="keluar">Keluar</option>
          </select>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>NIK</th>
                <th>Nama Anggota</th>
                <th>Telepon</th>
                <th>Tgl Gabung</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="py-3 px-4"><div className="skeleton-row h-10" /></td>
                  </tr>
                ))
              ) : anggotaList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-teks-muted">Tidak ada data anggota.</td>
                </tr>
              ) : (
                anggotaList.map((a: Anggota) => (
                  <tr key={a.id}>
                    <td className="font-mono text-sm">{a.nik}</td>
                    <td className="font-medium text-white">{a.nama}</td>
                    <td>{a.telepon}</td>
                    <td>{a.tanggal_gabung}</td>
                    <td>
                      <span className={`badge ${a.status === 'aktif' ? 'badge-aktif' : 'badge-keluar'}`}>
                        {a.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="text-right space-x-1">
                      <button 
                        className="btn-icon text-info hover:text-white"
                        title="Edit"
                        onClick={() => {
                          setEditingData(a)
                          reset(a)
                          setIsFormOpen(true)
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                      {a.status === 'aktif' && (
                        <button 
                          className="btn-icon text-bahaya hover:text-white"
                          title="Proses Keluar"
                          onClick={() => {
                            setKeluarTarget(a)
                            resetKeluar({ keterangan_keluar: '' })
                            setIsKeluarOpen(true)
                          }}
                        >
                          <LogOut size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="modal-title">{editingData ? 'Edit Anggota' : 'Daftar Anggota Baru'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="btn-icon">✕</button>
            </div>
            <form onSubmit={handleSubmit((d) => saveAnggota(d))}>
              <div className="modal-body">
                {editingData && (
                  <div className="info-info mb-4">
                    NIK tidak dapat diubah. Untuk mengubah, hapus dan buat ulang data anggota jika belum ada transaksi.
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="label">NIK</label>
                    <input type="text" className="input" maxLength={16} {...register('nik')} disabled={!!editingData} />
                    {errors.nik && <p className="error-msg">{errors.nik.message as string}</p>}
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="label">Tanggal Gabung</label>
                    <input type="date" className="input" {...register('tanggal_gabung')} disabled={!!editingData} />
                    {errors.tanggal_gabung && <p className="error-msg">{errors.tanggal_gabung.message as string}</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="label">Nama Lengkap</label>
                    <input type="text" className="input" {...register('nama')} />
                    {errors.nama && <p className="error-msg">{errors.nama.message as string}</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="label">Telepon</label>
                    <input type="text" className="input" {...register('telepon')} />
                    {errors.telepon && <p className="error-msg">{errors.telepon.message as string}</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="label">Alamat</label>
                    <textarea className="input" rows={3} {...register('alamat')}></textarea>
                    {errors.alamat && <p className="error-msg">{errors.alamat.message as string}</p>}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsFormOpen(false)} className="btn-ghost">Batal</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Keluar Modal */}
      {isKeluarOpen && keluarTarget && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header border-b border-bahaya/50">
              <h2 className="modal-title text-bahaya flex items-center gap-2">
                <LogOut size={20} /> Proses Keluar Anggota
              </h2>
              <button onClick={() => setIsKeluarOpen(false)} className="btn-icon">✕</button>
            </div>
            
            <div className="modal-body space-y-4">
              <div className="p-4 bg-amoled-950 rounded-lg">
                <p className="text-sm font-medium text-white mb-1">{keluarTarget.nama}</p>
                <p className="text-xs text-teks-secondary font-mono">{keluarTarget.nik}</p>
              </div>

              {loadingSaldo ? (
                <div className="skeleton h-24 w-full" />
              ) : refundData ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-teks-primary">Rincian Refund Simpanan</h3>
                  <div className="card bg-amoled-900 border-amoled-600 p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-teks-secondary">Simpanan Pokok</span>
                      <span className="font-mono text-white">{formatRp(refundData.pokok)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-teks-secondary">Simpanan Wajib</span>
                      <span className="font-mono text-white">{formatRp(refundData.wajib)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-teks-secondary">Simpanan Sukarela</span>
                      <span className="font-mono text-white">{formatRp(refundData.sukarela)}</span>
                    </div>
                    <div className="divider my-2"></div>
                    <div className="flex justify-between font-bold">
                      <span className="text-white">Total Diserahkan</span>
                      <span className="text-sukses font-mono">{formatRp(refundData.total)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-bahaya text-sm">Gagal memuat data saldo.</p>
              )}

              <form id="keluarForm" onSubmit={handleKeluar((d) => prosesKeluar(d))}>
                <label className="label">Alasan / Keterangan Keluar</label>
                <textarea className="input" rows={3} {...regKeluar('keterangan_keluar')} placeholder="Contoh: Pindah domisili..."></textarea>
                {keluarErrors.keterangan_keluar && <p className="error-msg">{keluarErrors.keterangan_keluar.message as string}</p>}
              </form>
            </div>
            
            <div className="modal-footer">
              <button onClick={() => setIsKeluarOpen(false)} className="btn-ghost">Batal</button>
              <button type="submit" form="keluarForm" disabled={isKeluarSubmitting || loadingSaldo} className="btn-danger">
                {isKeluarSubmitting ? 'Memproses...' : 'Proses Keluar & Selesai'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
