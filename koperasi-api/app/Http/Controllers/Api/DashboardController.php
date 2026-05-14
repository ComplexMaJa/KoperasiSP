<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Anggota;
use App\Models\Pinjaman;
use App\Models\Angsuran;
use App\Models\SimpananSukarela;
use App\Models\SimpananPokok;
use App\Models\SimpananWajib;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    use ApiResponse;

    public function summary(Request $request)
    {
        $totalAnggota = Anggota::where('status', 'aktif')->count();
        
        $totalSimpanan = SimpananPokok::sum('jumlah') 
                       + SimpananWajib::sum('jumlah') 
                       + SimpananSukarela::where('jenis', 'setor')->sum('jumlah')
                       - SimpananSukarela::where('jenis', 'tarik')->sum('jumlah');

        $pinjamanAktif = Pinjaman::where('status', 'cair')->count();
        
        $angsuranTelat = Angsuran::where('status', 'telat')->count();
        
        $angsuranHariIni = Angsuran::where('status', 'belum')
                           ->whereDate('tanggal_jatuh_tempo', now()->toDateString())
                           ->count();

        return $this->sukses([
            'total_anggota'      => $totalAnggota,
            'total_simpanan'     => $totalSimpanan,
            'pinjaman_aktif'     => $pinjamanAktif,
            'angsuran_telat'     => $angsuranTelat,
            'angsuran_hari_ini'  => $angsuranHariIni,
        ]);
    }
}
