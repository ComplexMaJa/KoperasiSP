import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { PiggyBank, Eye, EyeOff, LogIn } from 'lucide-react'
import { useState } from 'react'
import apiClient from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import type { AuthUser } from '@/store/authStore'

const schema = z.object({
  email:    z.string().email('Format email tidak valid.').min(1, 'Email wajib diisi.'),
  password: z.string().min(1, 'Kata sandi wajib diisi.'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate  = useNavigate()
  const setAuth   = useAuthStore((s) => s.setAuth)
  const [show, setShow] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const { mutate: login } = useMutation({
    mutationFn: (data: FormData) => apiClient.post('/auth/login', data),
    onSuccess: (res) => {
      const { token, user } = res.data.data as { token: string; user: AuthUser }
      localStorage.setItem('ksp_token', token)
      setAuth(token, user)
      toast.success(`Selamat datang, ${user.name}!`)
      navigate('/dashboard', { replace: true })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  return (
    <div className="min-h-screen bg-amoled-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-merah-500 mb-4 shadow-merah-lg">
            <PiggyBank size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Koperasi Simpan Pinjam</h1>
          <p className="text-sm text-teks-secondary mt-1">Masuk ke akun Anda untuk melanjutkan</p>
        </div>

        {/* Form */}
        <div className="card-elevated p-6">
          <form onSubmit={handleSubmit((d) => login(d))} noValidate>
            <div className="space-y-4">
              {/* Email */}
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@koperasi.id"
                  className={errors.email ? 'input-error' : 'input'}
                  {...register('email')}
                />
                {errors.email && <p className="error-msg">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="label" htmlFor="password">Kata Sandi</label>
                <div className="relative">
                  <input
                    id="password"
                    type={show ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`${errors.password ? 'input-error' : 'input'} pr-10`}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon p-1"
                  >
                    {show ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {errors.password && <p className="error-msg">{errors.password.message}</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full mt-2"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                ) : (
                  <LogIn size={15} />
                )}
                {isSubmitting ? 'Memproses...' : 'Masuk'}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-teks-muted mt-6">
          &copy; {new Date().getFullYear()} Sistem Informasi Koperasi
        </p>
      </div>
    </div>
  )
}
