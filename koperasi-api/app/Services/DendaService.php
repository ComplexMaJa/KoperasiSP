<?php

namespace App\Services;

use App\Models\Angsuran;
use App\Models\Pengaturan;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class DendaService
{
    /**
     * Hitung dan update denda untuk semua angsuran yang telat
     */
    public function hitungDenda()
    {
        $tipeDenda = Pengaturan::where('kunci', 'denda_tipe')->value('nilai') ?? 1; // 1 = nominal, 2 = persen
        $nilaiDenda = (float) (Pengaturan::where('kunci', 'denda_nilai')->value('nilai') ?? 1000);

        // Cari semua angsuran yang belum lunas dan sudah lewat tanggal jatuh tempo
        $angsuranTelat = Angsuran::whereIn('status', ['belum', 'telat'])
            ->whereDate('tanggal_jatuh_tempo', '<', now()->toDateString())
            ->get();

        $count = 0;

        foreach ($angsuranTelat as $angsuran) {
            $jatuhTempo = Carbon::parse($angsuran->tanggal_jatuh_tempo);
            $hariTelat = $jatuhTempo->diffInDays(now());

            if ($hariTelat > 0) {
                $nominalDenda = 0;
                
                if ($tipeDenda == 1) {
                    // Nominal harian
                    $nominalDenda = $hariTelat * $nilaiDenda;
                } else if ($tipeDenda == 2) {
                    // Persentase dari pokok bulanan per bulan telat (simplified: per 30 hari)
                    $bulanTelat = ceil($hariTelat / 30);
                    $nominalDenda = $angsuran->pokok * ($nilaiDenda / 100) * $bulanTelat;
                }

                $angsuran->update([
                    'status' => 'telat',
                    'denda'  => $nominalDenda
                ]);

                $count++;
            }
        }

        Log::info("Denda generated for {$count} angsuran records.");
        return $count;
    }
}
