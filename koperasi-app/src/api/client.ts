import { supabase } from '@/lib/supabaseClient'

// Helper to convert DB error or normal error into Axios-like response format
const handleException = (err: any) => {
  const message = err.message || 'Terjadi kesalahan pada server.'
  console.error('Supabase Adapter Error:', err)
  const formattedError = new Error(message) as any
  formattedError.status = err.code === 'P0001' ? 400 : 500 // P0001 is user exception in PL/pgSQL
  formattedError.errors = err.details ? { db: [err.details] } : undefined
  return Promise.reject(formattedError)
}

// Map database statuses/roles to expected UI formats
export const apiClient = {
  get: async (url: string, config?: any): Promise<any> => {
    try {
      const [pathOnly, queryString] = url.split('?')
      const urlParts = pathOnly.split('/').filter(Boolean)
      const params = { ...(config?.params || {}) }
      if (queryString) {
        const urlParams = new URLSearchParams(queryString)
        for (const [key, value] of urlParams.entries()) {
          params[key] = value
        }
      }

      // 1. GET /anggota
      if (urlParts[0] === 'anggota') {
        // GET /anggota/:id/saldo
        if (urlParts[2] === 'saldo') {
          const anggotaId = parseInt(urlParts[1])
          const { data, error } = await supabase.rpc('hitung_refund_anggota', { p_anggota_id: anggotaId })
          if (error) throw error
          const refund = data && data[0] ? data[0] : { pokok: 0, wajib: 0, sukarela: 0, total: 0 }
          return { data: { sukses: true, data: refund } }
        }

        // GET /anggota/:id
        if (urlParts[1] && !isNaN(parseInt(urlParts[1]))) {
          const { data, error } = await supabase
            .from('anggota')
            .select('*')
            .eq('id', parseInt(urlParts[1]))
            .single()
          if (error) throw error
          return { data: { sukses: true, data } }
        }

        // GET /anggota list
        let query = supabase.from('anggota').select('*', { count: 'exact' })
        
        if (params.status) {
          query = query.eq('status', params.status)
        }
        if (params.search) {
          query = query.or(`nik.ilike.%${params.search}%,nama.ilike.%${params.search}%`)
        }
        
        // Pagination
        const limit = params.limit ? parseInt(params.limit) : 20
        const page = params.page ? parseInt(params.page) : 1
        const from = (page - 1) * limit
        const to = from + limit - 1
        
        query = query.range(from, to).order('nama', { ascending: true })
        const { data, count, error } = await query
        if (error) throw error

        return {
          data: {
            sukses: true,
            data: {
              data: data || [],
              current_page: page,
              last_page: count ? Math.ceil(count / limit) : 1,
              total: count || 0
            }
          }
        }
      }

      // 2. GET /simpanan/wajib/:anggota_id
      if (urlParts[0] === 'simpanan' && urlParts[1] === 'wajib') {
        const anggotaId = parseInt(urlParts[2])
        const tahun = parseInt(params.tahun) || new Date().getFullYear()

        const { data, error } = await supabase
          .from('simpanan_wajib')
          .select('*')
          .eq('anggota_id', anggotaId)
          .eq('tahun', tahun)

        if (error) throw error
        return { data: { sukses: true, data: { simpanan_wajib: data || [] } } }
      }

      // 3. GET /simpanan/sukarela/:anggota_id
      if (urlParts[0] === 'simpanan' && urlParts[1] === 'sukarela') {
        const anggotaId = parseInt(urlParts[2])

        // Get balance
        const { data: setorData, error: e1 } = await supabase.from('simpanan_sukarela').select('jumlah').eq('anggota_id', anggotaId).eq('jenis', 'setor')
        const { data: tarikData, error: e2 } = await supabase.from('simpanan_sukarela').select('jumlah').eq('anggota_id', anggotaId).eq('jenis', 'tarik')
        if (e1) throw e1
        if (e2) throw e2

        const setorSum = (setorData || []).reduce((acc, row) => acc + parseFloat(row.jumlah as any), 0)
        const tarikSum = (tarikData || []).reduce((acc, row) => acc + parseFloat(row.jumlah as any), 0)
        const saldo = setorSum - tarikSum

        // Get history
        const { data: riwayat, error: e3 } = await supabase
          .from('simpanan_sukarela')
          .select('*')
          .eq('anggota_id', anggotaId)
          .order('tanggal', { ascending: false })
          .order('created_at', { ascending: false })
        if (e3) throw e3

        return {
          data: {
            sukses: true,
            data: {
              saldo,
              riwayat: { data: riwayat || [] }
            }
          }
        }
      }

      // 4. GET /pinjaman
      if (urlParts[0] === 'pinjaman') {
        // GET /pinjaman/simulasi
        if (urlParts[1] === 'simulasi') {
          const { data, error } = await supabase.rpc('hitung_simulasi_pinjaman', {
            p_jumlah_pinjaman: parseFloat(params.jumlah_pinjaman),
            p_tenor_bulan: parseInt(params.tenor_bulan),
            p_kategori_id: parseInt(params.kategori_id)
          })
          if (error) throw error
          return { data: { sukses: true, data: data && data[0] ? data[0] : null } }
        }

        // GET /pinjaman/:id
        if (urlParts[1] && !isNaN(parseInt(urlParts[1]))) {
          const { data, error } = await supabase
            .from('pinjaman')
            .select('*, anggota:anggota_id(nik, nama), kategori_pinjaman:kategori_id(nama_kategori), angsuran(*)')
            .eq('id', parseInt(urlParts[1]))
            .single()
          if (error) throw error
          return { data: { sukses: true, data } }
        }

        // GET /pinjaman list
        let query = supabase.from('pinjaman').select('*, anggota:anggota_id(nik, nama), kategori_pinjaman:kategori_id(nama_kategori)', { count: 'exact' })
        if (params.status) {
          query = query.eq('status', params.status)
        }
        if (params.anggota_id) {
          query = query.eq('anggota_id', parseInt(params.anggota_id))
        }

        const limit = params.limit ? parseInt(params.limit) : 20
        const page = params.page ? parseInt(params.page) : 1
        const from = (page - 1) * limit
        const to = from + limit - 1

        query = query.range(from, to).order('created_at', { ascending: false })
        const { data, count, error } = await query
        if (error) throw error

        return {
          data: {
            sukses: true,
            data: {
              data: data || [],
              current_page: page,
              last_page: count ? Math.ceil(count / limit) : 1,
              total: count || 0
            }
          }
        }
      }

      // 5. GET /angsuran
      if (urlParts[0] === 'angsuran') {
        // GET /angsuran/pinjaman/:pinjaman_id
        if (urlParts[1] === 'pinjaman') {
          const pinjamanId = parseInt(urlParts[2])
          const { data, error } = await supabase
            .from('angsuran')
            .select('*')
            .eq('pinjaman_id', pinjamanId)
            .order('ke', { ascending: true })
          if (error) throw error
          return { data: { sukses: true, data: data || [] } }
        }

        // GET /angsuran list
        let query = supabase.from('angsuran').select('*, pinjaman(*, anggota:anggota_id(nik, nama))', { count: 'exact' })
        if (params.status) {
          query = query.eq('status', params.status)
        }
        if (params.search) {
          // Join filtering
          query = query.or(`pinjaman.anggota.nik.ilike.%${params.search}%,pinjaman.anggota.nama.ilike.%${params.search}%`)
        }

        const limit = params.limit ? parseInt(params.limit) : 20
        const page = params.page ? parseInt(params.page) : 1
        const from = (page - 1) * limit
        const to = from + limit - 1

        query = query.range(from, to).order('tanggal_jatuh_tempo', { ascending: true })
        const { data, count, error } = await query
        if (error) throw error

        return {
          data: {
            sukses: true,
            data: {
              data: data || [],
              current_page: page,
              last_page: count ? Math.ceil(count / limit) : 1,
              total: count || 0
            }
          }
        }
      }

      // 6. GET /kategori-pinjaman
      if (urlParts[0] === 'kategori-pinjaman') {
        const { data, error } = await supabase.from('kategori_pinjaman').select('*').order('nama_kategori', { ascending: true })
        if (error) throw error
        return { data: { sukses: true, data: data || [] } }
      }

      // 7. GET /pengaturan
      if (urlParts[0] === 'pengaturan') {
        const { data, error } = await supabase.from('pengaturan').select('*').order('kunci', { ascending: true })
        if (error) throw error
        return { data: { sukses: true, data: data || [] } }
      }

      // GET /users (Admin only)
      if (urlParts[0] === 'users') {
        const { data, error } = await supabase.rpc('get_users')
        if (error) throw error
        
        let filtered = data || []
        if (params.search) {
          const s = params.search.toLowerCase()
          filtered = filtered.filter((u: any) => 
            u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)
          )
        }
        if (params.role) {
          filtered = filtered.filter((u: any) => u.role === params.role)
        }

        // Pagination
        const limit = params.limit ? parseInt(params.limit) : 20
        const page = params.page ? parseInt(params.page) : 1
        const from = (page - 1) * limit
        const to = from + limit
        const paginated = filtered.slice(from, to)

        return {
          data: {
            sukses: true,
            data: {
              data: paginated.map((u: any) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                is_active: u.is_active,
                roles: [{ name: u.role }],
                anggota_id: u.anggota_id
              })),
              current_page: page,
              last_page: Math.ceil(filtered.length / limit) || 1,
              total: filtered.length
            }
          }
        }
      }

      // 8. GET /auth/me
      if (urlParts[0] === 'auth' && urlParts[1] === 'me') {
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) throw new Error('Sesi habis. Silakan login kembali.')

        const { data: roleData } = await supabase.from('user_roles').select('role').eq('id', user.id).single()
        const role = roleData?.role || 'anggota'

        let anggotaId: number | null = null
        if (role === 'anggota') {
          const { data: anggota } = await supabase.from('anggota').select('id').eq('user_id', user.id).single()
          anggotaId = anggota?.id || null
        }

        return {
          data: {
            sukses: true,
            data: {
              id: user.id,
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
              email: user.email,
              roles: [role],
              anggota_id: anggotaId
            }
          }
        }
      }

      // 9. GET /dashboard/summary
      if (urlParts[0] === 'dashboard' && urlParts[1] === 'summary') {
        const { count: totalAnggota } = await supabase.from('anggota').select('*', { head: true, count: 'exact' }).eq('status', 'aktif')
        const { count: pinjamanAktif } = await supabase.from('pinjaman').select('*', { head: true, count: 'exact' }).eq('status', 'cair')
        const { count: telatAngsuran } = await supabase.from('angsuran').select('*', { head: true, count: 'exact' }).eq('status', 'telat')
        
        // Count due today installments that are unpaid
        const todayStr = new Date().toISOString().split('T')[0]
        const { count: angsuranHariIni } = await supabase
          .from('angsuran')
          .select('*', { head: true, count: 'exact' })
          .eq('tanggal_jatuh_tempo', todayStr)
          .neq('status', 'lunas')

        // Sum total savings (pokok + wajib + sukarela)
        const { data: p } = await supabase.from('simpanan_pokok').select('jumlah')
        const { data: w } = await supabase.from('simpanan_wajib').select('jumlah')
        const { data: sSetor } = await supabase.from('simpanan_sukarela').select('jumlah').eq('jenis', 'setor')
        const { data: sTarik } = await supabase.from('simpanan_sukarela').select('jumlah').eq('jenis', 'tarik')
        
        const sumPokok = (p || []).reduce((sum, item) => sum + parseFloat(item.jumlah as any), 0)
        const sumWajib = (w || []).reduce((sum, item) => sum + parseFloat(item.jumlah as any), 0)
        const sumSukarela = (sSetor || []).reduce((sum, item) => sum + parseFloat(item.jumlah as any), 0) - (sTarik || []).reduce((sum, item) => sum + parseFloat(item.jumlah as any), 0)
        
        return {
          data: {
            sukses: true,
            data: {
              total_anggota: totalAnggota || 0,
              total_simpanan: sumPokok + sumWajib + sumSukarela,
              pinjaman_aktif: pinjamanAktif || 0,
              angsuran_telat: telatAngsuran || 0,
              angsuran_hari_ini: angsuranHariIni || 0
            }
          }
        }
      }

      // 10. GET /laporan
      if (urlParts[0] === 'laporan') {
        if (urlParts[1] === 'transaksi') {
          const b = parseInt(params.bulan) || new Date().getMonth() + 1
          const y = parseInt(params.tahun) || new Date().getFullYear()
          const start = `${y}-${String(b).padStart(2, '0')}-01`
          const end = `${y}-${String(b).padStart(2, '0')}-${new Date(y, b, 0).getDate()}`

          const { data: sp } = await supabase.from('simpanan_pokok').select('jumlah').gte('tanggal_bayar', start).lte('tanggal_bayar', end)
          const { data: sw } = await supabase.from('simpanan_wajib').select('jumlah').eq('bulan', b).eq('tahun', y)
          const { data: ssSetor } = await supabase.from('simpanan_sukarela').select('jumlah').eq('jenis', 'setor').gte('tanggal', start).lte('tanggal', end)
          const { data: ssTarik } = await supabase.from('simpanan_sukarela').select('jumlah').eq('jenis', 'tarik').gte('tanggal', start).lte('tanggal', end)
          const { data: angs } = await supabase.from('angsuran').select('pokok, bunga, denda').eq('status', 'lunas').gte('tanggal_bayar', start).lte('tanggal_bayar', end)
          const { data: pinj } = await supabase.from('pinjaman').select('jumlah_pinjaman').eq('status', 'cair').gte('tanggal_cair', start).lte('tanggal_cair', end)

          const sumPokok = (sp || []).reduce((sum, r) => sum + parseFloat(r.jumlah as any), 0)
          const sumWajib = (sw || []).reduce((sum, r) => sum + parseFloat(r.jumlah as any), 0)
          const sumSukarelaMasuk = (ssSetor || []).reduce((sum, r) => sum + parseFloat(r.jumlah as any), 0)
          const sumSukarelaKeluar = (ssTarik || []).reduce((sum, r) => sum + parseFloat(r.jumlah as any), 0)
          const sumAngsuran = (angs || []).reduce((sum, r) => sum + parseFloat(r.pokok as any) + parseFloat(r.bunga as any) + parseFloat(r.denda as any), 0)
          const sumPinjamanCair = (pinj || []).reduce((sum, r) => sum + parseFloat(r.jumlah_pinjaman as any), 0)

          const totalPemasukan = sumPokok + sumWajib + sumSukarelaMasuk + sumAngsuran
          const totalPengeluaran = sumSukarelaKeluar + sumPinjamanCair

          return {
            data: {
              sukses: true,
              data: {
                pemasukan: {
                  simpanan_pokok: sumPokok,
                  simpanan_wajib: sumWajib,
                  simpanan_sukarela_masuk: sumSukarelaMasuk,
                  angsuran_masuk: sumAngsuran,
                  total: totalPemasukan
                },
                pengeluaran: {
                  simpanan_sukarela_keluar: sumSukarelaKeluar,
                  pinjaman_cair: sumPinjamanCair,
                  total: totalPengeluaran
                }
              }
            }
          }
        }

        if (urlParts[1] === 'shu') {
          const y = parseInt(params.tahun) || new Date().getFullYear()
          const start = `${y}-01-01`
          const end = `${y}-12-31`

          const { data: angsuran } = await supabase
            .from('angsuran')
            .select('bunga, denda')
            .eq('status', 'lunas')
            .gte('tanggal_bayar', start)
            .lte('tanggal_bayar', end)

          const totalBunga = (angsuran || []).reduce((sum, item) => sum + parseFloat(item.bunga as any), 0)
          const totalDenda = (angsuran || []).reduce((sum, item) => sum + parseFloat(item.denda as any), 0)
          const totalShuKotor = totalBunga + totalDenda

          return {
            data: {
              sukses: true,
              data: {
                total_shu_kotor: totalShuKotor,
                alokasi: {
                  anggota: totalShuKotor * 0.40,
                  pengurus: totalShuKotor * 0.20,
                  cadangan: totalShuKotor * 0.40
                }
              }
            }
          }
        }

        // Tabular Reports
        if (urlParts[1] === 'simpanan') {
          const { data: members, error } = await supabase.from('anggota').select('id, nik, nama')
          if (error) throw error
          
          const reports = []
          for (const m of (members || [])) {
            const { data: p } = await supabase.from('simpanan_pokok').select('jumlah').eq('anggota_id', m.id)
            const { data: w } = await supabase.from('simpanan_wajib').select('jumlah').eq('anggota_id', m.id)
            const { data: sSetor } = await supabase.from('simpanan_sukarela').select('jumlah').eq('anggota_id', m.id).eq('jenis', 'setor')
            const { data: sTarik } = await supabase.from('simpanan_sukarela').select('jumlah').eq('anggota_id', m.id).eq('jenis', 'tarik')
            
            const sumPokok = (p || []).reduce((sum, item) => sum + parseFloat(item.jumlah as any), 0)
            const sumWajib = (w || []).reduce((sum, item) => sum + parseFloat(item.jumlah as any), 0)
            const sumSukarela = (sSetor || []).reduce((sum, item) => sum + parseFloat(item.jumlah as any), 0) - (sTarik || []).reduce((sum, item) => sum + parseFloat(item.jumlah as any), 0)
            
            reports.push({
              id: m.id,
              nik: m.nik,
              nama: m.nama,
              pokok: sumPokok,
              wajib: sumWajib,
              sukarela: sumSukarela,
              total: sumPokok + sumWajib + sumSukarela
            })
          }
          return { data: { sukses: true, data: reports } }
        }

        if (urlParts[1] === 'pinjaman') {
          let query = supabase.from('pinjaman').select('id, tanggal_pengajuan, jumlah_pinjaman, tenor_bulan, bunga_persen, status, anggota:anggota_id(nik, nama), kategori_pinjaman:kategori_id(nama_kategori)')
          if (params.start_date) {
            query = query.gte('tanggal_pengajuan', params.start_date)
          }
          if (params.end_date) {
            query = query.lte('tanggal_pengajuan', params.end_date)
          }
          const { data, error } = await query.order('tanggal_pengajuan', { ascending: false })
          if (error) throw error
          return { data: { sukses: true, data: data || [] } }
        }

        if (urlParts[1] === 'angsuran') {
          let query = supabase.from('angsuran').select('id, ke, tanggal_jatuh_tempo, tanggal_bayar, pokok, bunga, denda, status, pinjaman(anggota:anggota_id(nik, nama))')
          if (params.start_date) {
            query = query.gte('tanggal_jatuh_tempo', params.start_date)
          }
          if (params.end_date) {
            query = query.lte('tanggal_jatuh_tempo', params.end_date)
          }
          const { data, error } = await query.order('tanggal_jatuh_tempo', { ascending: false })
          if (error) throw error
          return { data: { sukses: true, data: data || [] } }
        }

        if (urlParts[1] === 'export') {
          const y = parseInt(params.tahun) || new Date().getFullYear()
          const start = `${y}-01-01`
          const end = `${y}-12-31`
          
          const { data, error } = await supabase
            .from('angsuran')
            .select('id, ke, tanggal_jatuh_tempo, tanggal_bayar, pokok, bunga, denda, status, pinjaman(anggota:anggota_id(nama, nik))')
            .gte('tanggal_jatuh_tempo', start)
            .lte('tanggal_jatuh_tempo', end)
            .order('tanggal_jatuh_tempo', { ascending: true })

          if (error) throw error
          
          const flatData = (data || []).map((a: any) => ({
            'ID Angsuran': a.id,
            'Nama Anggota': a.pinjaman?.anggota?.nama || '',
            'NIK': a.pinjaman?.anggota?.nik || '',
            'Angsuran Ke': a.ke,
            'Jatuh Tempo': a.tanggal_jatuh_tempo,
            'Tanggal Bayar': a.tanggal_bayar || '-',
            'Pokok (Rp)': parseFloat(a.pokok),
            'Bunga (Rp)': parseFloat(a.bunga),
            'Denda (Rp)': parseFloat(a.denda),
            'Total Bayar (Rp)': a.status === 'lunas' ? (parseFloat(a.pokok) + parseFloat(a.bunga) + parseFloat(a.denda)) : 0,
            'Status': a.status.toUpperCase()
          }))

          return { data: { sukses: true, data: flatData } }
        }
      }

      throw new Error(`Endpoint GET ${url} tidak disupport oleh Supabase adapter.`);
    } catch (err: any) {
      return handleException(err)
    }
  },

  post: async (url: string, data?: any, config?: any): Promise<any> => {
    try {
      const pathOnly = url.split('?')[0]
      const urlParts = pathOnly.split('/').filter(Boolean)

      // 1. POST /auth/login
      if (urlParts[0] === 'auth' && urlParts[1] === 'login') {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password
        })
        if (authErr) throw authErr

        // Fetch User Role
        const { data: roleData } = await supabase.from('user_roles').select('role').eq('id', authData.user.id).single()
        const role = roleData?.role || 'anggota'

        let anggotaId: number | null = null
        if (role === 'anggota') {
          const { data: anggota } = await supabase.from('anggota').select('id').eq('user_id', authData.user.id).single()
          anggotaId = anggota?.id || null
        }

        // Save mock token to satisfy state checking
        const mockToken = authData.session?.access_token || 'supabase-token'
        localStorage.setItem('ksp_token', mockToken)

        return {
          data: {
            sukses: true,
            pesan: 'Login berhasil.',
            data: {
              token: mockToken,
              user: {
                id: authData.user.id,
                name: authData.user.user_metadata?.name || data.email.split('@')[0],
                email: authData.user.email,
                roles: [role],
                permissions: [],
                anggota_id: anggotaId
              }
            }
          }
        }
      }

      // 2. POST /auth/logout
      if (urlParts[0] === 'auth' && urlParts[1] === 'logout') {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        localStorage.removeItem('ksp_token')
        return { data: { sukses: true, pesan: 'Logout berhasil.' } }
      }

      // 3. POST /anggota
      if (urlParts[0] === 'anggota') {
        // POST /anggota/:id/keluar
        if (urlParts[2] === 'keluar') {
          const anggotaId = parseInt(urlParts[1])
          const { data: res, error } = await supabase.rpc('proses_keluar_anggota', {
            p_anggota_id: anggotaId,
            p_keterangan: data.keterangan_keluar || ''
          })
          if (error) throw error
          return { data: { sukses: true, pesan: res.pesan || 'Anggota berhasil dikeluarkan.' } }
        }

        // POST insert anggota
        const { data: res, error } = await supabase
          .from('anggota')
          .insert({
            nik: data.nik,
            nama: data.nama,
            alamat: data.alamat,
            telepon: data.telepon,
            tanggal_gabung: data.tanggal_gabung,
            status: 'aktif'
          })
          .select()
          .single()
        
        if (error) throw error

        // Automatically set up principal savings (simpanan pokok) for new members
        const { data: configPokok } = await supabase.from('pengaturan').select('nilai').eq('kunci', 'simpanan_pokok').single()
        const nominalPokok = configPokok?.nilai || 50000

        await supabase.from('simpanan_pokok').insert({
          anggota_id: res.id,
          jumlah: nominalPokok,
          tanggal_bayar: data.tanggal_gabung,
          keterangan: 'Pendaftaran awal anggota baru'
        })

        return { data: { sukses: true, pesan: 'Anggota baru berhasil terdaftar dan simpanan pokok diisi.' } }
      }

      // 4. POST /simpanan/wajib
      if (urlParts[0] === 'simpanan' && urlParts[1] === 'wajib') {
        // Get mandatory savings nominal config
        const { data: configWajib } = await supabase.from('pengaturan').select('nilai').eq('kunci', 'simpanan_wajib_bulanan').single()
        const nominalWajib = configWajib?.nilai || 10000

        const { error } = await supabase.from('simpanan_wajib').insert({
          anggota_id: data.anggota_id,
          bulan: data.bulan,
          tahun: data.tahun,
          jumlah: nominalWajib,
          tanggal_bayar: data.tanggal_bayar
        })
        if (error) {
          if (error.code === '23505') throw new Error('Simpanan wajib bulan ini sudah dibayar.')
          throw error
        }
        return { data: { sukses: true, pesan: 'Simpanan wajib berhasil dibayar.' } }
      }

      // 5. POST /simpanan/sukarela/setor & /simpanan/sukarela/tarik
      if (urlParts[0] === 'simpanan' && urlParts[1] === 'sukarela') {
        const jenis = urlParts[2] as 'setor' | 'tarik'
        const { data: res, error } = await supabase.rpc('proses_simpanan_sukarela', {
          p_anggota_id: data.anggota_id,
          p_jenis: jenis,
          p_jumlah: data.jumlah,
          p_keterangan: data.keterangan || ''
        })
        if (error) throw error
        return { data: { sukses: true, pesan: res.pesan } }
      }

      // 6. POST /pinjaman
      if (urlParts[0] === 'pinjaman') {
        // Validate loan requirements first
        const { error: valError } = await supabase.rpc('validasi_syarat_pinjaman', {
          p_anggota_id: data.anggota_id,
          p_jumlah_pinjaman: data.jumlah_pinjaman
        })
        if (valError) throw valError

        // Calculate Simulation Details to insert
        const { data: sim, error: simError } = await supabase.rpc('hitung_simulasi_pinjaman', {
          p_jumlah_pinjaman: data.jumlah_pinjaman,
          p_tenor_bulan: data.tenor_bulan,
          p_kategori_id: data.kategori_id
        })
        if (simError || !sim || !sim[0]) throw simError || new Error('Gagal memproses simulasi angsuran.')
        
        const calc = sim[0]

        const { error } = await supabase.from('pinjaman').insert({
          anggota_id: data.anggota_id,
          kategori_id: data.kategori_id,
          penjamin_anggota_id: data.penjamin_anggota_id || null,
          jumlah_pinjaman: data.jumlah_pinjaman,
          tenor_bulan: data.tenor_bulan,
          bunga_persen: calc.bunga_persen,
          angsuran_pokok: calc.angsuran_pokok,
          angsuran_bunga: calc.angsuran_bunga,
          total_angsuran: calc.total_angsuran,
          tujuan_pinjaman: data.tujuan_pinjaman || '',
          status: 'pengajuan',
          tanggal_pengajuan: new Date().toISOString().split('T')[0]
        })
        if (error) throw error

        return { data: { sukses: true, pesan: 'Pengajuan pinjaman berhasil dikirim.' } }
      }

      // 7. POST /pinjaman/:id/pelunasan-cepat
      if (urlParts[0] === 'pinjaman' && urlParts[2] === 'pelunasan-cepat') {
        const pinjamanId = parseInt(urlParts[1])
        const { data: res, error } = await supabase.rpc('pelunasan_cepat', { p_pinjaman_id: pinjamanId })
        if (error) throw error
        return { data: { sukses: true, pesan: res.pesan } }
      }

      // 8. POST /angsuran/:id/bayar
      if (urlParts[0] === 'angsuran' && urlParts[2] === 'bayar') {
        const angsuranId = parseInt(urlParts[1])
        const { data: res, error } = await supabase.rpc('bayar_angsuran', { p_angsuran_id: angsuranId })
        if (error) throw error
        return { data: { sukses: true, pesan: res.pesan } }
      }

      // 9. POST /angsuran/generate-denda
      if (urlParts[0] === 'angsuran' && urlParts[1] === 'generate-denda') {
        const { data: count, error } = await supabase.rpc('hitung_denda_harian')
        if (error) throw error
        return { data: { sukses: true, pesan: `Berhasil memperbarui denda untuk ${count} data angsuran.` } }
      }

      // POST /users
      if (urlParts[0] === 'users') {
        const { data: res, error } = await supabase.rpc('create_user', {
          p_name: data.name,
          p_email: data.email,
          p_password: data.password || 'koperasi123',
          p_role: data.role
        })
        if (error) throw error
        return { data: { sukses: true, pesan: res.pesan || 'Pengguna baru berhasil dibuat.' } }
      }

      // POST /kategori-pinjaman
      if (urlParts[0] === 'kategori-pinjaman') {
        const { error } = await supabase.from('kategori_pinjaman').insert({
          nama_kategori: data.nama_kategori,
          bunga_persen: parseFloat(data.bunga_persen),
          keterangan: data.keterangan || ''
        })
        if (error) throw error
        return { data: { sukses: true, pesan: 'Kategori pinjaman baru berhasil dibuat.' } }
      }

      throw new Error(`Endpoint POST ${url} tidak disupport oleh Supabase adapter.`);
    } catch (err: any) {
      return handleException(err)
    }
  },

  put: async (url: string, data?: any, config?: any): Promise<any> => {
    try {
      const pathOnly = url.split('?')[0]
      const urlParts = pathOnly.split('/').filter(Boolean)

      // 1. PUT /anggota/:id
      if (urlParts[0] === 'anggota' && urlParts[1]) {
        const { error } = await supabase
          .from('anggota')
          .update({
            nama: data.nama,
            alamat: data.alamat,
            telepon: data.telepon
          })
          .eq('id', parseInt(urlParts[1]))
        if (error) throw error
        return { data: { sukses: true, pesan: 'Data anggota berhasil diperbarui.' } }
      }

      // 2. PUT /pinjaman/:id/setujui
      if (urlParts[0] === 'pinjaman' && urlParts[2] === 'setujui') {
        const pinjamanId = parseInt(urlParts[1])
        const { data: { user } } = await supabase.auth.getUser()
        const { data: res, error } = await supabase.rpc('setujui_pinjaman', {
          p_pinjaman_id: pinjamanId,
          p_admin_id: user?.id
        })
        if (error) throw error
        return { data: { sukses: true, pesan: res.pesan } }
      }

      // 3. PUT /pinjaman/:id/tolak
      if (urlParts[0] === 'pinjaman' && urlParts[2] === 'tolak') {
        const pinjamanId = parseInt(urlParts[1])
        const { error } = await supabase
          .from('pinjaman')
          .update({
            status: 'ditolak',
            catatan_penolakan: data.catatan_penolakan || 'Ditolak oleh pengurus/admin.'
          })
          .eq('id', pinjamanId)
        if (error) throw error
        return { data: { sukses: true, pesan: 'Pengajuan pinjaman berhasil ditolak.' } }
      }

      // 4. PUT /pinjaman/:id/cair
      if (urlParts[0] === 'pinjaman' && urlParts[2] === 'cair') {
        const pinjamanId = parseInt(urlParts[1])
        const { error } = await supabase
          .from('pinjaman')
          .update({
            status: 'cair',
            tanggal_cair: new Date().toISOString().split('T')[0]
          })
          .eq('id', pinjamanId)
        if (error) throw error
        return { data: { sukses: true, pesan: 'Pinjaman berhasil dicairkan. Angsuran aktif dimulai.' } }
      }

      // 5. PUT /pengaturan (bulk update)
      if (urlParts[0] === 'pengaturan') {
        // bulk update loop
        for (const item of data.settings || []) {
          await supabase.from('pengaturan').update({ nilai: item.nilai }).eq('kunci', item.kunci)
        }
        return { data: { sukses: true, pesan: 'Pengaturan berhasil diperbarui.' } }
      }

      // PUT /users/:id/toggle-aktif
      if (urlParts[0] === 'users' && urlParts[2] === 'toggle-aktif') {
        const userId = urlParts[1]
        const { data: res, error } = await supabase.rpc('toggle_user_active', { p_id: userId })
        if (error) throw error
        return { data: { sukses: true, pesan: res.pesan || 'Status pengguna berhasil diperbarui.' } }
      }

      // PUT /users/:id
      if (urlParts[0] === 'users' && urlParts[1]) {
        const userId = urlParts[1]
        const { data: res, error } = await supabase.rpc('update_user', {
          p_id: userId,
          p_name: data.name,
          p_email: data.email,
          p_password: data.password || '',
          p_role: data.role
        })
        if (error) throw error
        return { data: { sukses: true, pesan: res.pesan || 'Data pengguna berhasil diperbarui.' } }
      }

      // PUT /kategori-pinjaman/:id
      if (urlParts[0] === 'kategori-pinjaman' && urlParts[1]) {
        const { error } = await supabase
          .from('kategori_pinjaman')
          .update({
            nama_kategori: data.nama_kategori,
            bunga_persen: parseFloat(data.bunga_persen),
            keterangan: data.keterangan || ''
          })
          .eq('id', parseInt(urlParts[1]))
        if (error) throw error
        return { data: { sukses: true, pesan: 'Kategori pinjaman berhasil diperbarui.' } }
      }

      throw new Error(`Endpoint PUT ${url} tidak disupport oleh Supabase adapter.`);
    } catch (err: any) {
      return handleException(err)
    }
  },

  delete: async (url: string, config?: any): Promise<any> => {
    try {
      const pathOnly = url.split('?')[0]
      const urlParts = pathOnly.split('/').filter(Boolean)

      // 1. DELETE /anggota/:id
      if (urlParts[0] === 'anggota' && urlParts[1]) {
        const { error } = await supabase.from('anggota').delete().eq('id', parseInt(urlParts[1]))
        if (error) throw error
        return { data: { sukses: true, pesan: 'Data anggota berhasil dihapus.' } }
      }

      // DELETE /users/:id
      if (urlParts[0] === 'users' && urlParts[1]) {
        const userId = urlParts[1]
        const { data: res, error } = await supabase.rpc('delete_user', { p_id: userId })
        if (error) throw error
        return { data: { sukses: true, pesan: res.pesan || 'Pengguna berhasil dihapus.' } }
      }

      // DELETE /kategori-pinjaman/:id
      if (urlParts[0] === 'kategori-pinjaman' && urlParts[1]) {
        const { error } = await supabase.from('kategori_pinjaman').delete().eq('id', parseInt(urlParts[1]))
        if (error) throw error
        return { data: { sukses: true, pesan: 'Kategori pinjaman berhasil dihapus.' } }
      }

      // DELETE /pinjaman/:id
      if (urlParts[0] === 'pinjaman' && urlParts[1]) {
        const { error } = await supabase.from('pinjaman').delete().eq('id', parseInt(urlParts[1]))
        if (error) throw error
        return { data: { sukses: true, pesan: 'Pinjaman berhasil dihapus.' } }
      }

      throw new Error(`Endpoint DELETE ${url} tidak disupport oleh Supabase adapter.`);
    } catch (err: any) {
      return handleException(err)
    }
  }
}

export default apiClient

