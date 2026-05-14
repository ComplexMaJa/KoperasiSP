import { Outlet } from 'react-router-dom'
import { Navbar }  from './Navbar'
import { Sidebar } from './Sidebar'
import { Footer }  from './Footer'

export function AppLayout() {
  return (
    <div className="flex h-screen bg-amoled-950 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  )
}
