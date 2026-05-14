<?php

namespace Database\Seeders;

use App\Models\KategoriPinjaman;
use Illuminate\Database\Seeder;

class KategoriPinjamanSeeder extends Seeder
{
    public function run(): void
    {
        KategoriPinjaman::firstOrCreate([
            'nama_kategori' => 'Pinjaman Reguler',
        ], [
            'bunga_persen' => 1.5,
            'keterangan' => 'Pinjaman biasa dengan bunga standar 1.5%',
        ]);

        KategoriPinjaman::firstOrCreate([
            'nama_kategori' => 'Pinjaman Khusus',
        ], [
            'bunga_persen' => 1.0,
            'keterangan' => 'Pinjaman dengan bunga ringan 1.0%',
        ]);
    }
}
