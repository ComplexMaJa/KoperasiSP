import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileDown, Activity, TrendingUp, TrendingDown, DollarSign, Search, Calendar } from 'lucide-react'
import apiClient from '@/api/client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function LaporanPage() {
  const [bulan, setBulan] = useState(new Date().getMonth() + 1)
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [subTab, setSubTab] = useState<'ringkasan' | 'simpanan' | 'pinjaman' | 'angsuran'>('ringkasan')
  
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // 1. Ringkasan Queries
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

  // 2. Tabular Reports Queries
  const { data: simpananRes, isLoading: loadSimpanan } = useQuery({
    queryKey: ['laporan-simpanan'],
    queryFn: () => apiClient.get('/laporan/simpanan'),
    enabled: subTab === 'simpanan'
  })
  const simpananData = simpananRes?.data?.data || []

  const { data: pinjamanRes, isLoading: loadPinjaman } = useQuery({
    queryKey: ['laporan-pinjaman', startDate, endDate],
    queryFn: () => apiClient.get('/laporan/pinjaman', { params: { start_date: startDate, end_date: endDate } }),
    enabled: subTab === 'pinjaman'
  })
  const pinjamanData = pinjamanRes?.data?.data || []

  const { data: angsuranRes, isLoading: loadAngsuran } = useQuery({
    queryKey: ['laporan-angsuran', startDate, endDate],
    queryFn: () => apiClient.get('/laporan/angsuran', { params: { start_date: startDate, end_date: endDate } }),
    enabled: subTab === 'angsuran'
  })
  const angsuranData = angsuranRes?.data?.data || []

  const formatRp = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0)

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

  // Local filtering logic
  const filteredSimpanan = simpananData.filter((d: any) => 
    d.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.nik.includes(searchQuery)
  )

  const filteredPinjaman = pinjamanData.filter((d: any) => 
    d.anggota?.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.anggota?.nik.includes(searchQuery)
  )

  const filteredAngsuran = angsuranData.filter((d: any) => 
    d.pinjaman?.anggota?.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.pinjaman?.anggota?.nik.includes(searchQuery)
  )

  // Sum Totals
  const totalPokok = filteredSimpanan.reduce((acc: number, d: any) => acc + d.pokok, 0)
  const totalWajib = filteredSimpanan.reduce((acc: number, d: any) => acc + d.wajib, 0)
  const totalSukarela = filteredSimpanan.reduce((acc: number, d: any) => acc + d.sukarela, 0)
  const totalSimpananSum = filteredSimpanan.reduce((acc: number, d: any) => acc + d.total, 0)

  const totalPlafon = filteredPinjaman.reduce((acc: number, d: any) => acc + parseFloat(d.jumlah_pinjaman), 0)

  const totalPokokAngs = filteredAngsuran.reduce((acc: number, d: any) => acc + parseFloat(d.pokok), 0)
  const totalBungaAngs = filteredAngsuran.reduce((acc: number, d: any) => acc + parseFloat(d.bunga), 0)
  const totalDendaAngs = filteredAngsuran.reduce((acc: number, d: any) => acc + parseFloat(d.denda), 0)
  const totalAngsSum = filteredAngsuran.reduce((acc: number, d: any) => acc + parseFloat(d.pokok) + parseFloat(d.bunga) + parseFloat(d.denda), 0)

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
          <p className="page-desc">Ringkasan arus kas, estimasi Sisa Hasil Usaha (SHU), dan data transaksi keuangan.</p>
        </div>
        <div className="flex gap-2">
          {subTab === 'ringkasan' && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={subTab === 'ringkasan' ? 'tab-active' : 'tab'} onClick={() => setSubTab('ringkasan')}>Ringkasan</button>
        <button className={subTab === 'simpanan' ? 'tab-active' : 'tab'} onClick={() => setSubTab('simpanan')}>Laporan Simpanan</button>
        <button className={subTab === 'pinjaman' ? 'tab-active' : 'tab'} onClick={() => setSubTab('pinjaman')}>Laporan Pinjaman</button>
        <button className={subTab === 'angsuran' ? 'tab-active' : 'tab'} onClick={() => setSubTab('angsuran')}>Laporan Angsuran</button>
      </div>

      {/* 1. Ringkasan View */}
      {subTab === 'ringkasan' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 animate-slide-up">
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
      )}

      {/* 2. Tabular Reports Views */}
      {subTab !== 'ringkasan' && (
        <div className="card p-4 animate-slide-up">
          {/* Table Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-teks-muted" size={16} />
              <input 
                type="text" 
                placeholder="Cari NIK atau Nama Anggota..." 
                className="input pl-9 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {subTab !== 'simpanan' && (
              <div className="flex gap-2 items-center w-full md:w-auto">
                <div className="relative w-full md:w-40">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-teks-muted" size={14} />
                  <input type="date" className="input pl-9 py-1.5 text-xs font-mono" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <span className="text-teks-muted text-xs">s/d</span>
                <div className="relative w-full md:w-40">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-teks-muted" size={14} />
                  <input type="date" className="input pl-9 py-1.5 text-xs font-mono" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Tables */}
          <div className="table-wrap">
            {subTab === 'simpanan' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>NIK</th>
                    <th>Nama Anggota</th>
                    <th className="text-right">Pokok</th>
                    <th className="text-right">Wajib</th>
                    <th className="text-right">Sukarela</th>
                    <th className="text-right">Total Simpanan</th>
                  </tr>
                </thead>
                <tbody>
                  {loadSimpanan ? (
                    <tr><td colSpan={6}><div className="skeleton-row h-10 w-full" /></td></tr>
                  ) : filteredSimpanan.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-6 text-teks-muted">Tidak ada data simpanan.</td></tr>
                  ) : (
                    <>
                      {filteredSimpanan.map((d: any) => (
                        <tr key={d.id}>
                          <td className="font-mono text-xs">{d.nik}</td>
                          <td className="font-medium text-white">{d.nama}</td>
                          <td className="text-right font-mono">{formatRp(d.pokok)}</td>
                          <td className="text-right font-mono">{formatRp(d.wajib)}</td>
                          <td className="text-right font-mono">{formatRp(d.sukarela)}</td>
                          <td className="text-right font-mono font-semibold text-white">{formatRp(d.total)}</td>
                        </tr>
                      ))}
                      <tr className="bg-amoled-800 font-bold border-t border-amoled-600">
                        <td colSpan={2} className="text-white">TOTAL KESELURUHAN</td>
                        <td className="text-right font-mono text-white">{formatRp(totalPokok)}</td>
                        <td className="text-right font-mono text-white">{formatRp(totalWajib)}</td>
                        <td className="text-right font-mono text-white">{formatRp(totalSukarela)}</td>
                        <td className="text-right font-mono text-sukses">{formatRp(totalSimpananSum)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            )}

            {subTab === 'pinjaman' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Peminjam</th>
                    <th>Kategori</th>
                    <th className="text-center">Tenor</th>
                    <th>Status</th>
                    <th className="text-right">Plafon Pinjaman</th>
                  </tr>
                </thead>
                <tbody>
                  {loadPinjaman ? (
                    <tr><td colSpan={6}><div className="skeleton-row h-10 w-full" /></td></tr>
                  ) : filteredPinjaman.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-6 text-teks-muted">Tidak ada data pinjaman.</td></tr>
                  ) : (
                    <>
                      {filteredPinjaman.map((d: any) => (
                        <tr key={d.id}>
                          <td className="font-mono text-xs">{d.tanggal_pengajuan}</td>
                          <td>
                            <div className="font-medium text-white">{d.anggota?.nama}</div>
                            <div className="text-xs text-teks-muted font-mono">{d.anggota?.nik}</div>
                          </td>
                          <td>{d.kategori_pinjaman?.nama_kategori || 'Kredit'} ({d.bunga_persen}%)</td>
                          <td className="text-center">{d.tenor_bulan} Bln</td>
                          <td><span className={`badge badge-${d.status}`}>{d.status.toUpperCase()}</span></td>
                          <td className="text-right font-mono font-semibold text-white">{formatRp(Number(d.jumlah_pinjaman))}</td>
                        </tr>
                      ))}
                      <tr className="bg-amoled-800 font-bold border-t border-amoled-600">
                        <td colSpan={5} className="text-white">TOTAL PLAFON PINJAMAN</td>
                        <td className="text-right font-mono text-sukses">{formatRp(totalPlafon)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            )}

            {subTab === 'angsuran' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Peminjam</th>
                    <th className="text-center">Ke</th>
                    <th>Jatuh Tempo</th>
                    <th>Tgl Bayar</th>
                    <th className="text-right">Pokok</th>
                    <th className="text-right">Bunga</th>
                    <th className="text-right">Denda</th>
                    <th className="text-right">Total Angsuran</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loadAngsuran ? (
                    <tr><td colSpan={9}><div className="skeleton-row h-10 w-full" /></td></tr>
                  ) : filteredAngsuran.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-6 text-teks-muted">Tidak ada data angsuran.</td></tr>
                  ) : (
                    <>
                      {filteredAngsuran.map((d: any) => (
                        <tr key={d.id}>
                          <td>
                            <div className="font-medium text-white">{d.pinjaman?.anggota?.nama}</div>
                            <div className="text-xs text-teks-muted font-mono">{d.pinjaman?.anggota?.nik}</div>
                          </td>
                          <td className="text-center font-bold">{d.ke}</td>
                          <td className="font-mono text-xs">{d.tanggal_jatuh_tempo}</td>
                          <td className="font-mono text-xs">{d.tanggal_bayar || '-'}</td>
                          <td className="text-right font-mono">{formatRp(Number(d.pokok))}</td>
                          <td className="text-right font-mono">{formatRp(Number(d.bunga))}</td>
                          <td className="text-right font-mono text-bahaya">{d.denda > 0 ? `+${formatRp(Number(d.denda))}` : '-'}</td>
                          <td className="text-right font-mono font-semibold text-white">{formatRp(Number(d.pokok) + Number(d.bunga) + Number(d.denda))}</td>
                          <td><span className={`badge badge-${d.status}`}>{d.status.toUpperCase()}</span></td>
                        </tr>
                      ))}
                      <tr className="bg-amoled-800 font-bold border-t border-amoled-600">
                        <td colSpan={4} className="text-white">TOTAL ANGSURAN</td>
                        <td className="text-right font-mono text-white">{formatRp(totalPokokAngs)}</td>
                        <td className="text-right font-mono text-white">{formatRp(totalBungaAngs)}</td>
                        <td className="text-right font-mono text-bahaya">{formatRp(totalDendaAngs)}</td>
                        <td className="text-right font-mono text-sukses">{formatRp(totalAngsSum)}</td>
                        <td></td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
