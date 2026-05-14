<?php

namespace App\Services;

use App\Models\Anggota;
use Illuminate\Support\Facades\DB;
use Exception;

class AnggotaService
{
    /**
     * Hitung total refund saat anggota keluar
     */
    public function hitungRefund(Anggota $anggota)
    {
        $pokok = $anggota->simpananPokok()->sum('jumlah');
        $wajib = $anggota->simpananWajib()->sum('jumlah');
        
        $setor = $anggota->simpananSukarela()->where('jenis', 'setor')->sum('jumlah');
        $tarik = $anggota->simpananSukarela()->where('jenis', 'tarik')->sum('jumlah');
        $sukarela = $setor - $tarik;

        return [
            'pokok'    => $pokok,
            'wajib'    => $wajib,
            'sukarela' => $sukarela,
            'total'    => $pokok + $wajib + $sukarela
        ];
    }

    /**
     * Proses keluar anggota
     */
    public function prosesKeluar(Anggota $anggota, string $keterangan = '')
    {
        if ($anggota->status === 'keluar') {
            throw new Exception('Anggota sudah keluar.');
        }

        if ($anggota->hasPinjamanAktif()) {
            throw new Exception('Anggota masih memiliki pinjaman aktif yang belum lunas.');
        }

        return DB::transaction(function () use ($anggota, $keterangan) {
            $anggota->update([
                'status'            => 'keluar',
                'tanggal_keluar'    => now(),
                'keterangan_keluar' => $keterangan,
            ]);

            // Nonaktifkan user terkait
            if ($anggota->user) {
                $anggota->user->update(['is_active' => false]);
                $anggota->user->tokens()->delete();
            }

            return $this->hitungRefund($anggota);
        });
    }
}
