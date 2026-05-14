import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: number
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user:  null,

      setAuth: (token, user) => set({ token, user }),

      clearAuth: () => {
        localStorage.removeItem('ksp_token')
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
