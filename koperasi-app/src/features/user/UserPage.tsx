import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Power, PowerOff, Shield, Eye, EyeOff } from 'lucide-react'
import apiClient from '@/api/client'

// Types
interface User {
  id: number
  name: string
  email: string
  is_active: boolean
  roles: { name: string }[]
  anggota_id: number | null
}

interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
  total: number
}

// Schema
const userSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi.').max(100, 'Nama maksimal 100 karakter.'),
  email: z.string().email('Email tidak valid.').min(1, 'Email wajib diisi.').max(150, 'Email maksimal 150 karakter.'),
  password: z.string().max(50, 'Password maksimal 50 karakter.').optional(),
  role: z.enum(['admin', 'pengurus']),
})

export default function UserPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [search, roleFilter])

  // -- API Hooks --
  const { data: res, isLoading } = useQuery({
    queryKey: ['users', { page, search, role: roleFilter }],
    queryFn: () => apiClient.get('/users', { params: { page, search, role: roleFilter } }),
  })
  
  const users: Paginated<User> | undefined = res?.data?.data

  const { mutate: toggleActive } = useMutation({
    mutationFn: (id: number) => apiClient.put(`/users/${id}/toggle-aktif`),
    onSuccess: (res) => {
      toast.success(res.data.pesan)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const { mutate: deleteUser } = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/users/${id}`),
    onSuccess: (res) => {
      toast.success(res.data.pesan)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: { name: '', email: '', password: '', role: 'pengurus' }
  })

  const openAddModal = () => {
    setEditingUser(null)
    reset({ name: '', email: '', password: '', role: 'pengurus' })
    setShowPassword(false)
    setIsModalOpen(true)
  }

  const openEditModal = (u: User) => {
    setEditingUser(u)
    reset({ 
      name: u.name, 
      email: u.email, 
      password: '', 
      role: (u.roles[0]?.name as any) || 'pengurus' 
    })
    setShowPassword(false)
    setIsModalOpen(true)
  }

  const { mutate: saveUser } = useMutation({
    mutationFn: (data: any) => {
      if (editingUser) return apiClient.put(`/users/${editingUser.id}`, data)
      return apiClient.post('/users', data)
    },
    onSuccess: (res) => {
      toast.success(res.data.pesan)
      setIsModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err: any) => {
      toast.error(err.message)
      if (err.errors) {
         const firstKey = Object.keys(err.errors)[0]
         toast.error(err.errors[firstKey][0])
      }
    }
  })

  // -- Render --
  return (
    <div className="page-content animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Manajemen Pengguna</h1>
          <p className="page-desc">Kelola akses admin dan pengurus koperasi.</p>
        </div>
        <button onClick={openAddModal} className="btn-primary">
          <Plus size={16} /> Tambah Pengguna
        </button>
      </div>

      <div className="card p-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <input 
            type="text" 
            placeholder="Cari nama atau email..." 
            className="input max-w-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select 
            className="input max-w-xs"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Semua Peran</option>
            <option value="admin">Admin</option>
            <option value="pengurus">Pengurus</option>
          </select>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Peran</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="py-3 px-4"><div className="skeleton-row h-8" /></td>
                  </tr>
                ))
              ) : users?.data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-teks-muted">Tidak ada data pengguna.</td>
                </tr>
              ) : (
                users?.data.map((u) => (
                  <tr key={u.id}>
                    <td className="font-medium text-white">{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className="badge bg-amoled-700 text-teks-secondary capitalize">
                        <Shield size={10} className="mr-1 inline" />
                        {u.roles[0]?.name || '-'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-aktif' : 'badge-keluar'}`}>
                        {u.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="text-right space-x-2">
                      <button onClick={() => openEditModal(u)} className="btn-icon" title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`Apakah Anda yakin ingin ${u.is_active ? 'menonaktifkan' : 'mengaktifkan'} pengguna ini?`)) {
                            toggleActive(u.id)
                          }
                        }} 
                        className={`btn-icon ${u.is_active ? 'hover:text-peringatan' : 'hover:text-sukses'}`}
                        title={u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        {u.is_active ? <PowerOff size={16} /> : <Power size={16} />}
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('Apakah Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan.')) {
                            deleteUser(u.id)
                          }
                        }}
                        className="btn-icon hover:text-bahaya" 
                        title="Hapus"
                      >
                        <Trash2 size={16} />
                      </button>
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
              Menampilkan halaman <span className="text-white font-medium">{page}</span> dari <span className="text-white font-medium">{users?.last_page || 1}</span> (Total <span className="text-white font-medium">{users?.total || 0}</span> pengguna)
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
                onClick={() => setPage((p) => Math.min(p + 1, users?.last_page || 1))}
                disabled={page === (users?.last_page || 1)}
                className="btn-ghost py-1.5 px-3"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="modal-title">{editingUser ? 'Edit Pengguna' : 'Tambah Pengguna'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="btn-icon">✕</button>
            </div>
            <form onSubmit={handleSubmit((d) => saveUser(d))}>
              <div className="modal-body">
                <div>
                  <label className="label">Nama Lengkap</label>
                  <input type="text" className="input" maxLength={100} {...register('name')} />
                  {errors.name && <p className="error-msg">{errors.name.message as string}</p>}
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" maxLength={150} {...register('email')} />
                  {errors.email && <p className="error-msg">{errors.email.message as string}</p>}
                </div>
                <div>
                  <label className="label">Kata Sandi {editingUser && '(Opsional)'}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={editingUser ? 'Kosongkan jika tidak ingin diubah' : ''}
                      className="input pr-10"
                      maxLength={50}
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon p-1"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {errors.password && <p className="error-msg">{errors.password.message as string}</p>}
                </div>
                <div>
                  <label className="label">Peran</label>
                  <select className="input" {...register('role')}>
                    <option value="admin">Admin</option>
                    <option value="pengurus">Pengurus</option>
                  </select>
                  {errors.role && <p className="error-msg">{errors.role.message as string}</p>}
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
