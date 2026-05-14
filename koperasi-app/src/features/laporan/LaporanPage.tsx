import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileDown, Activity, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import apiClient from '@/api/client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function LaporanPage() {
  const [bulan, setBulan] = useState(new Date().getMonth() + 1)
  const [tahun, setTahun] = useState(new Date().getFullYear())

  const { data: transRes, isLoading: loadTrans } = useQuery({
    queryKey: ['laporan-transaksi', bulan, tahun],
    queryFn: () => apiClient.get('/laporan/transaksi', { params: { bulan, tahun } })
  })
  const trans = transRes?.data?.data

  const { data: shuRes, isLoading: loadShu } = useQuery({
    queryKey: ['laporan-shu', tahun],
    queryFn: () => apiClient.get('/laporan/shu', { params: { tahun } })
  })
  const shu = shuRes?.data?.data

  const formatRp = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num || 0)

  const downloadCsv = async () => {
    try {
      const res = await apiClient.get('/laporan/export', { params: { tahun } })
      const data = res.data.data
      
      if (!data || data.length === 0) return alert('Tidak ada data untuk diexport tahun ini.')

      const headers = Object.keys(data[0]).join(',')
      const csv = [
        headers,
        ...data.map((row: any) => Object.values(row).join(','))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.setAttribute('href', url)
      a.setAttribute('download', `laporan-angsuran-${tahun}.csv`)
      a.click()
    } catch (e) {
      console.error(e)
    }
  }

  const transChartData = trans ? [
    { name: 'Pokok', Pemasukan: trans.pemasukan.simpanan_pokok, Pengeluaran: 0 },
    { name: 'Wajib', Pemasukan: trans.pemasukan.simpanan_wajib, Pengeluaran: 0 },
    { name: 'Sukarela', Pemasukan: trans.pemasukan.simpanan_sukarela_masuk, Pengeluaran: trans.pengeluaran.simpanan_sukarela_keluar },
    { name: 'Angsuran', Pemasukan: trans.pemasukan.angsuran_masuk, Pengeluaran: 0 },
    { name: 'Pencairan', Pemasukan: 0, Pengeluaran: trans.pengeluaran.pinjaman_cair },
  ] : []

  const shuPieData = shu ? [
    { name: 'Anggota (40%)', value: shu.alokasi.anggota },
    { name: 'Pengurus (20%)', value: shu.alokasi.pengurus },
    { name: 'Cadangan (40%)', value: shu.alokasi.cadangan },
  ] : []
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b']

  return (
    <div className="page-content animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Laporan Keuangan</h1>
          <p className="page-desc">Ringkasan arus kas dan estimasi Sisa Hasil Usaha (SHU).</p>
        </div>
        <div className="flex gap-2">
          <select className="input max-w-[120px]" value={bulan} onChange={e => setBulan(Number(e.target.value))}>
            {['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].map((b, i) => (
              <option key={i+1} value={i+1}>{b}</option>
            ))}
          </select>
          <select className="input max-w-[100px]" value={tahun} onChange={e => setTahun(Number(e.target.value))}>
            {[0, 1, 2].map(offset => {
              const y = new Date().getFullYear() - offset
              return <option key={y} value={y}>{y}</option>
            })}
          </select>
          <button className="btn w-auto bg-amoled-800 border-amoled-600 hover:bg-amoled-700 text-white" onClick={downloadCsv}>
            <FileDown size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Arus Kas Widget */}
        <div className="card p-6 border-t-4 border-t-info">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Activity size={18} className="text-info" /> Arus Kas Bulanan</h3>
          {loadTrans ? <div className="skeleton h-32" /> : trans && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-amoled-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-sukses mb-1"><TrendingUp size={16} /> Pemasukan</div>
                <div className="text-2xl font-mono font-bold text-white">{formatRp(trans.pemasukan.total)}</div>
              </div>
              <div className="bg-amoled-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-bahaya mb-1"><TrendingDown size={16} /> Pengeluaran</div>
                <div className="text-2xl font-mono font-bold text-white">{formatRp(trans.pengeluaran.total)}</div>
              </div>
            </div>
          )}
          
          <div className="h-64 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={transChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="name" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} tickFormatter={(val) => `Rp ${val / 1000000}M`} />
                <Tooltip cursor={{ fill: '#2a2a2a' }} contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                <Legend />
                <Bar dataKey="Pemasukan" fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SHU Widget */}
        <div className="card p-6 border-t-4 border-t-merah-500">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><DollarSign size={18} className="text-merah-500" /> Estimasi SHU Tahun {tahun}</h3>
          {loadShu ? <div className="skeleton h-32" /> : shu && (
            <>
              <div className="bg-merah-500/10 border border-merah-500/30 p-4 rounded-lg mb-6">
                <div className="text-teks-secondary text-sm mb-1">Total SHU Kotor (Bunga + Denda)</div>
                <div className="text-3xl font-mono font-bold text-merah-500">{formatRp(shu.total_shu_kotor)}</div>
              </div>

              <div className="flex flex-col md:flex-row items-center">
                <div className="w-full md:w-1/2 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={shuPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                        {shuPieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 space-y-3">
                  {shuPieData.map((d, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                        <span className="text-teks-primary">{d.name}</span>
                      </div>
                      <span className="font-mono text-white">{formatRp(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
