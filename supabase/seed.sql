-- Seed Pengaturan
INSERT INTO public.pengaturan (kunci, nilai, tipe, keterangan) VALUES
('simpanan_pokok', 50000.00, 'nominal', 'Simpanan pokok awal pendaftaran anggota baru'),
('simpanan_wajib_bulanan', 10000.00, 'nominal', 'Simpanan wajib yang harus dibayar setiap bulan'),
('saldo_minimal_sukarela', 20000.00, 'nominal', 'Batas minimal saldo simpanan sukarela yang harus mengendap'),
('denda_tipe', 1.00, 'integer', 'Tipe denda: 1 = nominal per hari, 2 = persentase per bulan'),
('denda_nilai', 1000.00, 'nominal', 'Nilai denda yang dikenakan jika terlambat bayar angsuran'),
('syarat_masa_keanggotaan', 3.00, 'integer', 'Syarat minimal masa keanggotaan (dalam bulan) untuk mengajukan pinjaman'),
('maks_pinjaman_statis', 5000000.00, 'nominal', 'Batas maksimal pinjaman nominal statis'),
('faktor_maks_pinjaman', 3.00, 'integer', 'Faktor pengali total simpanan (pokok + wajib) untuk batas maksimal pinjaman dinamis');

-- Seed Kategori Pinjaman
INSERT INTO public.kategori_pinjaman (nama_kategori, bunga_persen, keterangan) VALUES
('Kredit Ringan', 1.50, 'Bunga 1.5% flat per bulan untuk pinjaman reguler'),
('Kredit Sedang', 2.00, 'Bunga 2% flat per bulan untuk pinjaman menengah'),
('Kredit Khusus', 1.00, 'Bunga 1% flat per bulan untuk kebutuhan mendesak');
