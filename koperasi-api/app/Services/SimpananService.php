<?php

namespace App\Services;

use App\Models\Anggota;
use App\Models\Pengaturan;
use Exception;

class SimpananService
{
    /**
     * Dapatkan saldo sukarela anggota saat ini
     */
    public function getSaldoSukarela(Anggota $anggota): float
    {
        $setor = $anggota->simpananSukarela()->where('jenis', 'setor')->sum('jumlah');
        $tarik = $anggota->simpananSukarela()->where('jenis', 'tarik')->sum('jumlah');
        return (float) ($setor - $tarik);
    }

    /**
     * Validasi penarikan sukarela
     */
    public function validasiTarik(Anggota $anggota, float $jumlahTarik): float
    {
        $saldoSaatIni = $this->getSaldoSukarela($anggota);
        $minimalSaldo = (float) (Pengaturan::where('kunci', 'saldo_minimal_sukarela')->value('nilai') ?? 20000);

        if (($saldoSaatIni - $jumlahTarik) < $minimalSaldo) {
            throw new Exception("Penarikan gagal. Saldo minimal yang harus mengendap adalah Rp " . number_format($minimalSaldo, 0, ',', '.'));
        }

        return $saldoSaatIni;
    }
}
