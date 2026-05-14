/** Format number as Indonesian Rupiah */
export function formatRupiah(value: number | null | undefined): string {
  if (value == null) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/** Parse Rupiah string to number */
export function parseRupiah(value: string): number {
  return Number(value.replace(/[^0-9]/g, '')) || 0
}

/** Format date to Indonesian format (DD MMMM YYYY) */
export function formatTanggal(date: string | null | undefined): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

/** Format date to short (DD/MM/YYYY) */
export function formatTanggalPendek(date: string | null | undefined): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

/** Format month number to Indonesian month name */
export function namaBulan(bulan: number): string {
  const bulanList = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']
  return bulanList[bulan - 1] ?? '-'
}

/** Combine class names (like clsx) */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

/** Truncate text */
export function truncate(text: string, max = 50): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}
