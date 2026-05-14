import { LogOut, User } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useMutation }  from '@tanstack/react-query'
import apiClient        from '@/api/client'
import toast            from 'react-hot-toast'
import { useNavigate }  from 'react-router-dom'

export function Navbar() {
  const user      = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const navigate  = useNavigate()

  const { mutate: logout, isPending } = useMutation({
    mutationFn: () => apiClient.post('/auth/logout'),
    onSettled:  () => {
      clearAuth()
      navigate('/login', { replace: true })
      toast.success('Berhasil logout.')
    },
  })

  const roleLabel: Record<string, string> = {
    admin:    'Admin',
    pengurus: 'Pengurus',
    anggota:  'Anggota',
  }

  const primaryRole = user?.roles?.[0] ?? 'anggota'

  return (
    <header className="h-14 bg-amoled-900 border-b border-amoled-600 flex items-center justify-between px-5 shrink-0">
      {/* Left: breadcrumb area (empty — filled by PageHeader per page) */}
      <div />

      {/* Right: user info + logout */}
      <div className="flex items-center gap-3">
        {/* Role badge */}
        <span className={`badge ${primaryRole === 'admin' ? 'bg-merah-950 text-merah-300' : 'badge-disetujui'}`}>
          {roleLabel[primaryRole] ?? primaryRole}
        </span>

        {/* User name */}
        <div className="flex items-center gap-2 text-sm text-teks-secondary">
          <User size={14} />
          <span className="text-teks-primary font-medium">{user?.name}</span>
        </div>

        {/* Logout */}
        <button
          onClick={() => logout()}
          disabled={isPending}
          className="btn-icon"
          title="Logout"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  )
}
