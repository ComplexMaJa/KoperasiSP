import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, PiggyBank, Banknote,
  CreditCard, FileBarChart, Settings, UserCog,
  ChevronRight, Tags
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  to:    string
  icon:  React.ReactNode
  roles?: string[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',   to: '/dashboard',  icon: <LayoutDashboard size={16} /> },
  { label: 'Anggota',     to: '/anggota',    icon: <Users size={16} />,       roles: ['admin','pengurus'] },
  { label: 'Simpanan',    to: '/simpanan',   icon: <PiggyBank size={16} /> },
  { label: 'Pinjaman',    to: '/pinjaman',   icon: <Banknote size={16} /> },
  { label: 'Kategori',    to: '/kategori-pinjaman', icon: <Tags size={16} />, roles: ['admin', 'pengurus'] },
  { label: 'Angsuran',    to: '/angsuran',   icon: <CreditCard size={16} /> },
  { label: 'Laporan',     to: '/laporan',    icon: <FileBarChart size={16} />, roles: ['admin','pengurus'] },
]

const ADMIN_ITEMS: NavItem[] = [
  { label: 'Pengaturan',  to: '/pengaturan', icon: <Settings size={16} />,    roles: ['admin'] },
  { label: 'Pengguna',    to: '/pengguna',   icon: <UserCog size={16} />,     roles: ['admin'] },
]

function SidebarLink({ item }: { item: NavItem }) {
  const location = useLocation()
  const isActive = location.pathname.startsWith(item.to)

  return (
    <NavLink
      to={item.to}
      className={cn(isActive ? 'sidebar-item-active' : 'sidebar-item')}
    >
      {item.icon}
      <span className="flex-1">{item.label}</span>
      {isActive && <ChevronRight size={14} className="text-merah-400" />}
    </NavLink>
  )
}

export function Sidebar() {
  const hasRole = useAuthStore((s) => s.hasRole)

  const visibleNav   = NAV_ITEMS.filter(i => !i.roles || hasRole(i.roles))
  const visibleAdmin = ADMIN_ITEMS.filter(i => !i.roles || hasRole(i.roles))

  return (
    <aside className="w-56 flex-shrink-0 bg-amoled-950 border-r border-amoled-600 flex flex-col shadow-sidebar">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-amoled-600">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-merah-500 flex items-center justify-center shrink-0">
            <PiggyBank size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">KSP</p>
            <p className="text-[10px] text-teks-muted leading-tight">Simpan Pinjam</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <span className="sidebar-group-label">Menu Utama</span>
        {visibleNav.map((item) => (
          <SidebarLink key={item.to} item={item} />
        ))}

        {visibleAdmin.length > 0 && (
          <>
            <span className="sidebar-group-label">Administrasi</span>
            {visibleAdmin.map((item) => (
              <SidebarLink key={item.to} item={item} />
            ))}
          </>
        )}
      </nav>

      {/* Version */}
      <div className="px-4 py-3 border-t border-amoled-600">
        <p className="text-[10px] text-teks-muted">v1.0.0 · KSP App</p>
      </div>
    </aside>
  )
}
