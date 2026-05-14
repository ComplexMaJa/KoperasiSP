export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="h-9 bg-amoled-900 border-t border-amoled-600 flex items-center justify-center px-5 shrink-0">
      <p className="text-[11px] text-teks-muted">
        &copy; {year} Koperasi Simpan Pinjam &middot; Sistem Informasi Koperasi
      </p>
    </footer>
  )
}
