import { useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Save, Settings2 } from 'lucide-react'
import apiClient from '@/api/client'

interface Pengaturan {
  id: number
  kunci: string
  nilai: number
  tipe: 'nominal' | 'persen' | 'enum' | 'integer'
  keterangan: string
}

export default function PengaturanPage() {
  const queryClient = useQueryClient()

  const { data: res, isLoading } = useQuery({
    queryKey: ['pengaturan'],
    queryFn: () => apiClient.get('/pengaturan'),
  })

  const { control, handleSubmit, reset, formState: { isSubmitting, isDirty } } = useForm()

  const pengaturanList: Pengaturan[] = res?.data?.data || []

  // Initialize form with API data
  useEffect(() => {
    if (pengaturanList.length > 0) {
      const defaultValues: Record<string, number> = {}
      pengaturanList.forEach(p => {
        defaultValues[p.kunci] = p.nilai
      })
      reset(defaultValues)
    }
  }, [pengaturanList, reset])

  const { mutate: updatePengaturan } = useMutation({
    mutationFn: (data: any) => {
      // transform form data back to API format
      const payload = Object.keys(data).map(key => ({
        kunci: key,
        nilai: Number(data[key])
      }))
      return apiClient.put('/pengaturan', { pengaturan: payload })
    },
    onSuccess: (res) => {
      toast.success(res.data.pesan)
      queryClient.invalidateQueries({ queryKey: ['pengaturan'] })
      // Reset isDirty state by pulling current values
      reset(control._formValues)
    },
    onError: (err: any) => toast.error(err.message),
  })

  // Group settings for UI
  const groups = useMemo(() => {
    return {
      Simpanan: pengaturanList.filter(p => p.kunci.includes('simpanan') || p.kunci.includes('saldo')),
      Pinjaman: pengaturanList.filter(p => p.kunci.includes('pinjaman') || p.kunci.includes('syarat')),
      Denda: pengaturanList.filter(p => p.kunci.includes('denda')),
    }
  }, [pengaturanList])

  if (isLoading) return <div className="p-6"><div className="skeleton-row h-64" /></div>

  return (
    <div className="page-content animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pengaturan Sistem</h1>
          <p className="page-desc">Konfigurasi variabel utama koperasi (simpanan, pinjaman, denda).</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => updatePengaturan(d))} className="space-y-6">
        {Object.entries(groups).map(([groupName, items]) => {
          if (items.length === 0) return null
          
          return (
            <div key={groupName} className="card p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 pb-3 border-b border-amoled-600">
                <Settings2 size={18} className="text-merah-500" />
                <h2 className="text-lg font-medium text-white">Pengaturan {groupName}</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {items.map(p => (
                  <div key={p.kunci} className="space-y-1">
                    <label className="label normal-case tracking-normal text-white/80">{p.kunci.replace(/_/g, ' ').toUpperCase()}</label>
                    <p className="text-xs text-teks-muted mb-2 min-h-[32px]">{p.keterangan}</p>
                    
                    <Controller
                      name={p.kunci}
                      control={control}
                      rules={{ required: 'Wajib diisi' }}
                      render={({ field, fieldState }) => {
                        if (p.tipe === 'enum' && p.kunci === 'denda_tipe') {
                          return (
                            <select className={`input ${fieldState.error ? 'input-error' : ''}`} {...field}>
                              <option value={1}>Nominal Harian (Rp)</option>
                              <option value={2}>Persentase Bulanan (%)</option>
                            </select>
                          )
                        }
                        
                        return (
                          <div className="relative">
                            {p.tipe === 'nominal' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-teks-muted text-sm">Rp</span>}
                            <input 
                              type="number" 
                              step={p.tipe === 'persen' ? '0.01' : '1'}
                              className={`input ${fieldState.error ? 'input-error' : ''} ${p.tipe === 'nominal' ? 'pl-9' : ''} ${p.tipe === 'persen' ? 'pr-8' : ''}`}
                              {...field}
                            />
                            {p.tipe === 'persen' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-teks-muted text-sm">%</span>}
                          </div>
                        )
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        <div className="flex justify-end pt-4 pb-12">
          <button type="submit" disabled={!isDirty || isSubmitting} className="btn-primary px-6">
            <Save size={16} />
            {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </div>
  )
}
