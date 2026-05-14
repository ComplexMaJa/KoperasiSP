import axios from 'axios'
import type { AxiosError } from 'axios'

const ERROR_MAP: Record<number, string> = {
  400: 'Permintaan tidak valid. Periksa kembali data Anda.',
  401: 'Sesi habis. Silakan login kembali.',
  403: 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
  404: 'Data tidak ditemukan.',
  405: 'Metode tidak diizinkan.',
  429: 'Terlalu banyak permintaan. Coba beberapa saat lagi.',
  500: 'Terjadi kesalahan pada server. Hubungi administrator.',
  503: 'Server sedang tidak tersedia. Coba beberapa saat lagi.',
}

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

// Attach token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ksp_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Normalize errors
apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ pesan?: string; errors?: Record<string, string[]> }>) => {
    if (!error.response) {
      return Promise.reject(
        new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.')
      )
    }

    const status  = error.response.status
    const apiMsg  = error.response.data?.pesan
    const message = apiMsg || ERROR_MAP[status] || `Terjadi kesalahan (${status}).`

    // Auto-logout on 401
    if (status === 401) {
      localStorage.removeItem('ksp_token')
      localStorage.removeItem('ksp_user')
      window.location.href = '/login'
    }

    const err = new Error(message) as Error & {
      status: number
      errors: Record<string, string[]> | undefined
    }
    err.status = status
    err.errors = error.response.data?.errors
    return Promise.reject(err)
  }
)

export default apiClient
