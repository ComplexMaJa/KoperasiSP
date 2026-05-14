import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import apiClient from '@/api/client'

const formSchema = z.object({
  nama_kategori: z.string().min(3, 'Nama kategori minimal 3 karakter'),
  bunga_persen: z.coerce.number().min(0, 'Bunga minimal 0%').max(100, 'Bunga maksimal 100%'),
  keterangan: z.string().optional().nullable(),
})

export default function KategoriPinjamanPage() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const { data: res, isLoading } = useQuery({
    queryKey: ['kategori-pinjaman'],
    queryFn: () => apiClient.get('/kategori-pinjaman')
  })
  const kategoriList = res?.data?.data || []

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { nama_kategori: '', bunga_persen: '', keterangan: '' }
  })

  const handleOpenModal = (kategori?: any) => {
    if (kategori) {
      setEditingId(kategori.id)
      reset({
        nama_kategori: kategori.nama_kategori,
        bunga_persen: kategori.bunga_persen,
        keterangan: kategori.keterangan || ''
      })
    } else {
      setEditingId(null)
      reset({ nama_kategori: '', bunga_persen: '', keterangan: '' })
    }
    setIsModalOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (data: any) => 
      editingId ? apiClient.put(`/kategori-pinjaman/${editingId}`, data) : apiClient.post('/kategori-pinjaman', data),
    onSuccess: (res) => {
      toast.success(res.data.pesan)
      setIsModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['kategori-pinjaman'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Terjadi kesalahan')
      if (err.errors) {
        const firstError = Object.values(err.errors)[0] as string[];
        if (firstError && firstError.length > 0) {
          toast.error(firstError[0]);
        }
      }
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/kategori-pinjaman/${id}`),
    onSuccess: (res) => {
      toast.success(res.data.pesan)
      queryClient.invalidateQueries({ queryKey: ['kategori-pinjaman'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menghapus kategori')
    }
  })

  const handleDelete = (id: number) => {
    if (confirm('Yakin ingin menghapus kategori ini? Pastikan kategori ini belum dipakai oleh pinjaman manapun.')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="page-content animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Kategori Pinjaman</h1>
          <p className="page-desc">Kelola jenis pinjaman dan persentase bunga.</p>
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={16} /> Tambah Kategori
        </button>
      </div>

      <div className="card p-4">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Kategori</th>
                <th className="text-center">Bunga (%)</th>
                <th>Keterangan</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                 <tr><td colSpan={4}><div className="skeleton-row h-10" /></td></tr>
              ) : kategoriList.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-6 text-teks-muted">Belum ada kategori pinjaman.</td></tr>
              ) : (
                kategoriList.map((k: any) => (
                  <tr key={k.id}>
                    <td className="font-medium text-white">{k.nama_kategori}</td>
                    <td className="text-center font-mono">{k.bunga_persen}%</td>
                    <td className="text-teks-muted">{k.keterangan || '-'}</td>
                    <td className="text-right space-x-2">
                      <button onClick={() => handleOpenModal(k)} className="btn-icon text-info hover:text-white">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(k.id)} className="btn-icon text-bahaya hover:text-white">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box w-full max-w-md">
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? 'Edit Kategori' : 'Tambah Kategori'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="btn-icon">✕</button>
            </div>
            <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))}>
              <div className="modal-body space-y-4">
                
                <div>
                  <label className="label">Nama Kategori</label>
                  <input type="text" className="input" {...register('nama_kategori')} />
                  {errors.nama_kategori && <p className="error-msg">{errors.nama_kategori.message as string}</p>}
                </div>

                <div>
                  <label className="label">Bunga (% per bulan)</label>
                  <input type="number" step="0.1" className="input font-mono" {...register('bunga_persen')} />
                  {errors.bunga_persen && <p className="error-msg">{errors.bunga_persen.message as string}</p>}
                </div>

                <div>
                  <label className="label">Keterangan (Opsional)</label>
                  <textarea className="input" rows={3} {...register('keterangan')} />
                  {errors.keterangan && <p className="error-msg">{errors.keterangan.message as string}</p>}
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-ghost">Batal</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
