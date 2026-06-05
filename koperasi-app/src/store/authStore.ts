import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string // UUID from Supabase auth.users
  name: string
  email: string
  roles: string[]
  permissions: string[]
  anggota_id: number | null
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  setAuth: (token: string, user: AuthUser) => void
  clearAuth: () => void
  hasRole: (role: string | string[]) => boolean
  hasPermission: (permission: string) => boolean
  isAdmin: () => boolean
  isPengurus: () => boolean
  isAnggota: () => boolean
}

const getPermissionsForRoles = (roles: string[]): string[] => {
  const permissions = new Set<string>()
  
  if (roles.includes('admin')) {
    const adminPerms = [
      'pengaturan.lihat', 'pengaturan.ubah',
      'anggota.lihat', 'anggota.tambah', 'anggota.ubah', 'anggota.hapus', 'anggota.keluar',
      'simpanan.lihat', 'simpanan.tambah', 'simpanan.tarik',
      'pinjaman.lihat', 'pinjaman.ajukan', 'pinjaman.setujui', 'pinjaman.tolak', 'pinjaman.cair', 'pinjaman.pelunasan',
      'angsuran.lihat', 'angsuran.bayar', 'angsuran.denda',
      'laporan.lihat', 'laporan.export',
      'user.lihat', 'user.tambah', 'user.ubah', 'user.hapus'
    ]
    adminPerms.forEach(p => permissions.add(p))
  }
  
  if (roles.includes('pengurus')) {
    const pengurusPerms = [
      'anggota.lihat', 'anggota.tambah', 'anggota.ubah', 'anggota.keluar',
      'simpanan.lihat', 'simpanan.tambah', 'simpanan.tarik',
      'pinjaman.lihat', 'pinjaman.ajukan', 'pinjaman.setujui', 'pinjaman.tolak', 'pinjaman.cair', 'pinjaman.pelunasan',
      'angsuran.lihat', 'angsuran.bayar', 'angsuran.denda',
      'laporan.lihat', 'laporan.export'
    ]
    pengurusPerms.forEach(p => permissions.add(p))
  }
  
  if (roles.includes('anggota')) {
    const anggotaPerms = [
      'anggota.lihat',
      'simpanan.lihat',
      'pinjaman.lihat',
      'angsuran.lihat'
    ]
    anggotaPerms.forEach(p => permissions.add(p))
  }
  
  return Array.from(permissions)
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user:  null,

      setAuth: (token, user) => {
        // Automatically map permissions from user roles
        const permissions = getPermissionsForRoles(user.roles)
        set({ token, user: { ...user, permissions } })
      },

      clearAuth: () => {
        set({ token: null, user: null })
      },

      hasRole: (role) => {
        const roles = get().user?.roles ?? []
        if (Array.isArray(role)) return role.some((r) => roles.includes(r))
        return roles.includes(role)
      },

      hasPermission: (permission) => {
        return (get().user?.permissions ?? []).includes(permission)
      },

      isAdmin:    () => get().user?.roles.includes('admin') ?? false,
      isPengurus: () => get().user?.roles.includes('pengurus') ?? false,
      isAnggota:  () => get().user?.roles.includes('anggota') ?? false,
    }),
    {
      name: 'ksp-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
)

