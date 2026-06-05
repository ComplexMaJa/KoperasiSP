import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Plus, Search, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import apiClient from '@/api/client'

const formSchema = z.object({
  anggota_id: z.coerce.number().min(1, 'Anggota peminjam wajib dipilih'),
  penjamin_anggota_id: z.coerce.number().optional().nullable(),
  kategori_id: z.coerce.number().min(1, 'Kategori pinjaman wajib dipilih'),
  jumlah_pinjaman: z.coerce.number().min(1000, 'Minimal pinjaman Rp 1.000').max(1000000000, 'Maksimal pinjaman Rp 1.000.000.000'),
  tenor_bulan: z.coerce.number().min(1, 'Tenor minimal 1 bulan').max(60, 'Maksimal 60 bulan'),
  tujuan_pinjaman: z.string().min(1, 'Tujuan pinjaman wajib diisi').max(255, 'Tujuan pinjaman maksimal 255 karakter'),
  tanggal_pengajuan: z.string().min(1, 'Tanggal pengajuan wajib diisi'),
}).superRefine((data, ctx) => {
  if (data.penjamin_anggota_id && data.penjamin_anggota_id === data.anggota_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Penjamin tidak boleh sama dengan peminjam',
      path: ['penjamin_anggota_id']
    })
  }
})

export default function PinjamanPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [statusFilter])

  // Queries
  const { data: res, isLoading } = useQuery({
    queryKey: ['pinjaman', { page, status: statusFilter }],
    queryFn: () => apiClient.get('/pinjaman', { params: { page, status: statusFilter } })
  })
  const pinjamanList = res?.data?.data?.data || []

  const { data: anggotaRes } = useQuery({
    queryKey: ['anggota-list-aktif'],
    queryFn: () => apiClient.get('/anggota?limit=1000&status=aktif')
  })
  const anggotaList = anggotaRes?.data?.data?.data || []

  const { data: kategoriRes } = useQuery({
    queryKey: ['kategori-pinjaman-list'],
    queryFn: () => apiClient.get('/kategori-pinjaman')
  })
  const kategoriList = kategoriRes?.data?.data || []

  // Form
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      anggota_id: '',
      penjamin_anggota_id: '',
      kategori_id: '',
      jumlah_pinjaman: '',
      tenor_bulan: 12,
      tujuan_pinjaman: '',
      tanggal_pengajuan: new Date().toISOString().split('T')[0]
    }
  })

  // Watch for live preview
  const watchJumlah = useWatch({ control, name: 'jumlah_pinjaman' })
  const watchTenor = useWatch({ control, name: 'tenor_bulan' })
  const watchKategori = useWatch({ control, name: 'kategori_id' })

  const { data: simulasiRes } = useQuery({
    queryKey: ['simulasi', watchJumlah, watchTenor, watchKategori],
    queryFn: () => apiClient.get(`/pinjaman/simulasi?jumlah_pinjaman=${watchJumlah}&tenor_bulan=${watchTenor}&kategori_id=${watchKategori}`),
    enabled: !!watchJumlah && Number(watchJumlah) >= 1000 && !!watchTenor && Number(watchTenor) >= 1 && !!watchKategori
  })
  const simulasi = simulasiRes?.data?.data

  const { mutate: ajukanPinjaman } = useMutation({
    mutationFn: (data: any) => apiClient.post('/pinjaman', data),
    onSuccess: (res) => {
      toast.success(res.data.pesan)
      setIsModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['pinjaman'] })
    },
    onError: (err: any) => {
      toast.error(err.message)
      if (err.errors) {
        const firstError = Object.values(err.errors)[0] as string[];
        if (firstError && firstError.length > 0) {
          toast.error(firstError[0]);
        }
      }
    }
  })

  const formatRp = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num)

  return (
    <div className="page-content animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Data Pinjaman</h1>
          <p className="page-desc">Kelola pengajuan dan daftar pinjaman anggota.</p>
        </div>
        <button className="btn-primary" onClick={() => {
          reset()
          setIsModalOpen(true)
        }}>
          <Plus size={16} /> Ajukan Pinjaman
        </button>
      </div>

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <select 
            className="input max-w-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="pengajuan">Pengajuan</option>
            <option value="disetujui">Disetujui</option>
            <option value="cair">Cair / Aktif</option>
            <option value="lunas">Lunas</option>
            <option value="ditolak">Ditolak</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Peminjam</th>
                <th className="text-right">Plafon</th>
                <th className="text-center">Tenor</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                 <tr><td colSpan={6}><div className="skeleton-row h-10" /></td></tr>
              ) : pinjamanList.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-6 text-teks-muted">Belum ada data pinjaman.</td></tr>
              ) : (
                pinjamanList.map((p: any) => (
                  <tr key={p.id}>
                    <td>{p.tanggal_pengajuan}</td>
                    <td className="font-medium text-white">{p.anggota.nama} <br/><span className="text-xs text-teks-muted font-mono">{p.anggota.nik}</span></td>
                    <td className="text-right font-mono">{formatRp(p.jumlah_pinjaman)}</td>
                    <td className="text-center">{p.tenor_bulan} bln</td>
                    <td>
                      <span className={`badge badge-${p.status}`}>{p.status.toUpperCase()}</span>
                    </td>
                    <td className="text-right">
                      <Link to={`/pinjaman/${p.id}`} className="btn-icon inline-flex text-info hover:text-white">
                        <Eye size={16} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!isLoading && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-amoled-600 text-sm">
            <div className="text-teks-secondary">
              Menampilkan halaman <span className="text-white font-medium">{page}</span> dari <span className="text-white font-medium">{res?.data?.data?.last_page || 1}</span> (Total <span className="text-white font-medium">{res?.data?.data?.total || 0}</span> pengajuan)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="btn-ghost py-1.5 px-3"
              >
                Sebelumnya
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, res?.data?.data?.last_page || 1))}
                disabled={page === (res?.data?.data?.last_page || 1)}
                className="btn-ghost py-1.5 px-3"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box w-full max-w-2xl">
            <div className="modal-header">
              <h2 className="modal-title">Form Pengajuan Pinjaman</h2>
              <button onClick={() => setIsModalOpen(false)} className="btn-icon">✕</button>
            </div>
            <form onSubmit={handleSubmit((d) => ajukanPinjaman(d))}>
              <div className="modal-body grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div>
                  <label className="label">Peminjam</label>
                  <select className="input" {...register('anggota_id')}>
                    <option value="">-- Pilih Anggota --</option>
                    {anggotaList.map((a: any) => <option key={a.id} value={a.id}>{a.nik} - {a.nama}</option>)}
                  </select>
                  {errors.anggota_id && <p className="error-msg">{errors.anggota_id.message as string}</p>}
                </div>

                <div>
                  <label className="label">Penjamin (Opsional)</label>
                  <select className="input" {...register('penjamin_anggota_id')}>
                    <option value="">-- Tanpa Penjamin --</option>
                    {anggotaList.map((a: any) => <option key={a.id} value={a.id}>{a.nik} - {a.nama}</option>)}
                  </select>
                  {errors.penjamin_anggota_id && <p className="error-msg">{errors.penjamin_anggota_id.message as string}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="label">Kategori Pinjaman</label>
                  <select className="input" {...register('kategori_id')}>
                    <option value="">-- Pilih Kategori --</option>
                    {kategoriList.map((k: any) => <option key={k.id} value={k.id}>{k.nama_kategori} ({k.bunga_persen}%)</option>)}
                  </select>
                  {errors.kategori_id && <p className="error-msg">{errors.kategori_id.message as string}</p>}
                </div>

                <div>
                  <label className="label">Plafon Pinjaman</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-teks-muted">Rp</span>
                    <input type="number" className="input pl-9 font-mono" max={1000000000} min={1000} {...register('jumlah_pinjaman')} />
                  </div>
                  {errors.jumlah_pinjaman && <p className="error-msg">{errors.jumlah_pinjaman.message as string}</p>}
                </div>

                <div>
                  <label className="label">Tenor (Bulan)</label>
                  <input type="number" className="input" max={60} min={1} {...register('tenor_bulan')} />
                  {errors.tenor_bulan && <p className="error-msg">{errors.tenor_bulan.message as string}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="label">Tujuan Pinjaman</label>
                  <input type="text" className="input" maxLength={255} {...register('tujuan_pinjaman')} />
                  {errors.tujuan_pinjaman && <p className="error-msg">{errors.tujuan_pinjaman.message as string}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="label">Tanggal Pengajuan</label>
                  <input type="date" className="input" {...register('tanggal_pengajuan')} />
                  {errors.tanggal_pengajuan && <p className="error-msg">{errors.tanggal_pengajuan.message as string}</p>}
                </div>

                {/* Simulasi Preview */}
                <div className="md:col-span-2 mt-2 card bg-amoled-900 border-merah-500/30 p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Simulasi Angsuran per Bulan</h3>
                  {simulasi ? (
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <div className="text-teks-secondary">Bunga ({simulasi.bunga_persen}%)</div>
                      <div className="text-right font-mono text-bahaya">+{formatRp(simulasi.angsuran_bunga)}</div>
                      <div className="text-teks-secondary">Pokok</div>
                      <div className="text-right font-mono text-white">{formatRp(simulasi.angsuran_pokok)}</div>
                      <div className="col-span-2 divider my-1"></div>
                      <div className="text-white font-bold">Total Angsuran</div>
                      <div className="text-right font-mono text-sukses font-bold">{formatRp(simulasi.total_angsuran)} <span className="text-xs text-teks-muted font-normal">/ bln</span></div>
                    </div>
                  ) : (
                    <p className="text-xs text-teks-muted">Isi nominal dan tenor untuk melihat simulasi.</p>
                  )}
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-ghost">Batal</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? 'Memproses...' : 'Ajukan Pinjaman'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
