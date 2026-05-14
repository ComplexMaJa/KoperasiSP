<?php

namespace App\Services;

use App\Models\Anggota;
use App\Models\Pinjaman;
use App\Models\Angsuran;
use App\Models\Pengaturan;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\DB;

class PinjamanService
{
    /**
     * Hitung Angsuran Flat
     */
    public function hitungSimulasi(float $jumlahPinjaman, int $tenorBulan, int $kategoriId): array
    {
        $kategori = \App\Models\KategoriPinjaman::findOrFail($kategoriId);
        $bungaPersen = (float) $kategori->bunga_persen;
        
        $angsuranPokok = $jumlahPinjaman / $tenorBulan;
        $angsuranBunga = $jumlahPinjaman * ($bungaPersen / 100);
        
        return [
            'jumlah_pinjaman' => $jumlahPinjaman,
            'tenor_bulan'     => $tenorBulan,
            'bunga_persen'    => $bungaPersen,
            'angsuran_pokok'  => $angsuranPokok,
            'angsuran_bunga'  => $angsuranBunga,
            'total_angsuran'  => $angsuranPokok + $angsuranBunga,
        ];
    }

    /**
     * Validasi Syarat Pengajuan
     */
    public function validasiSyarat(Anggota $anggota, float $jumlahPinjaman)
    {
        // 1. Masa Keanggotaan
        $syaratBulan = (int) (Pengaturan::where('kunci', 'syarat_masa_keanggotaan')->value('nilai') ?? 3);
        $bulanGabung = Carbon::parse($anggota->tanggal_gabung)->diffInMonths(now());
        if ($bulanGabung < $syaratBulan) {
            throw new Exception("Belum memenuhi syarat masa keanggotaan minimal {$syaratBulan} bulan.");
        }

        // 2. Tidak ada pinjaman aktif
        if ($anggota->hasPinjamanAktif()) {
            throw new Exception('Anggota masih memiliki pinjaman aktif yang belum lunas.');
        }

        // 3. Maks Pinjaman
        $totalPokok = $anggota->simpananPokok()->sum('jumlah');
        $totalWajib = $anggota->simpananWajib()->sum('jumlah');
        
        $faktor = (int) (Pengaturan::where('kunci', 'faktor_maks_pinjaman')->value('nilai') ?? 3);
        $maksStatis = (float) (Pengaturan::where('kunci', 'maks_pinjaman_statis')->value('nilai') ?? 5000000);
        
        $maksDinamis = ($totalPokok + $totalWajib) * $faktor;
        $maks = max($maksDinamis, $maksStatis);

        if ($jumlahPinjaman > $maks) {
            throw new Exception("Jumlah pinjaman melebihi batas maksimal Rp " . number_format($maks, 0, ',', '.'));
        }
    }

    /**
     * Setujui Pinjaman & Generate Jadwal Angsuran
     */
    public function setujui(Pinjaman $pinjaman, int $adminId)
    {
        if ($pinjaman->status !== 'pengajuan') {
            throw new Exception('Hanya pinjaman dengan status pengajuan yang dapat disetujui.');
        }

        return DB::transaction(function () use ($pinjaman, $adminId) {
            $pinjaman->update([
                'status'           => 'disetujui',
                'disetujui_oleh'   => $adminId,
                'tanggal_disetujui'=> now(),
            ]);

            // Generate Angsuran rows
            $tanggalJatuhTempo = now()->addMonth(); // 1st payment next month

            for ($i = 1; $i <= $pinjaman->tenor_bulan; $i++) {
                Angsuran::create([
                    'pinjaman_id'         => $pinjaman->id,
                    'ke'                  => $i,
                    'tanggal_jatuh_tempo' => $tanggalJatuhTempo->copy()->toDateString(),
                    'pokok'               => $pinjaman->angsuran_pokok,
                    'bunga'               => $pinjaman->angsuran_bunga,
                    'status'              => 'belum',
                ]);
                $tanggalJatuhTempo->addMonth();
            }

            return $pinjaman;
        });
    }

    /**
     * Pelunasan Cepat
     */
    public function pelunasanCepat(Pinjaman $pinjaman)
    {
        if ($pinjaman->status !== 'cair') {
            throw new Exception('Hanya pinjaman aktif (cair) yang bisa dilunasi cepat.');
        }

        return DB::transaction(function () use ($pinjaman) {
            $sisaAngsuran = $pinjaman->angsuran()->where('status', 'belum')->get();

            foreach ($sisaAngsuran as $angs) {
                // Bayar pokok saja
                $angs->update([
                    'tanggal_bayar' => now(),
                    'bunga'         => 0, // hapus sisa bunga
                    'denda'         => 0,
                    'total_bayar'   => $angs->pokok,
                    'status'        => 'lunas'
                ]);
            }

            $pinjaman->update([
                'status'        => 'lunas',
                'tanggal_lunas' => now()
            ]);

            return $pinjaman;
        });
    }
}
