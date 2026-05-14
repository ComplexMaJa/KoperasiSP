<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PengaturanSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            ['kunci' => 'simpanan_pokok',           'nilai' => 50000,   'tipe' => 'nominal',  'keterangan' => 'Nominal simpanan pokok saat pendaftaran anggota'],
            ['kunci' => 'simpanan_wajib_bulanan',    'nilai' => 10000,   'tipe' => 'nominal',  'keterangan' => 'Nominal simpanan wajib per bulan'],
            ['kunci' => 'saldo_minimal_sukarela',    'nilai' => 20000,   'tipe' => 'nominal',  'keterangan' => 'Saldo minimal yang harus tersisa di simpanan sukarela'],
            ['kunci' => 'denda_tipe',                'nilai' => 1,       'tipe' => 'enum',     'keterangan' => 'Tipe denda: 1=nominal_harian, 2=persentase_bulanan'],
            ['kunci' => 'denda_nilai',               'nilai' => 1000,    'tipe' => 'nominal',  'keterangan' => 'Nominal denda per hari (jika tipe nominal) atau persentase per bulan'],
            ['kunci' => 'syarat_masa_keanggotaan',   'nilai' => 3,       'tipe' => 'integer',  'keterangan' => 'Minimal bulan keanggotaan untuk mengajukan pinjaman'],
            ['kunci' => 'maks_pinjaman_statis',      'nilai' => 5000000, 'tipe' => 'nominal',  'keterangan' => 'Batas maksimal pinjaman statis (Rupiah)'],
            ['kunci' => 'faktor_maks_pinjaman',      'nilai' => 3,       'tipe' => 'integer',  'keterangan' => 'Faktor pengali dari total simpanan pokok+wajib untuk maks pinjaman dinamis'],
            ['kunci' => 'bunga_pinjaman_persen',     'nilai' => 1.5,     'tipe' => 'persen',   'keterangan' => 'Bunga pinjaman per bulan (flat system) dalam persen'],
        ];

        foreach ($settings as $setting) {
            DB::table('pengaturan')->updateOrInsert(
                ['kunci' => $setting['kunci']],
                $setting
            );
        }
    }
}
