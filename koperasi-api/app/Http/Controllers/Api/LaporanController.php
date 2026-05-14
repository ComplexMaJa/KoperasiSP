<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Angsuran;
use App\Models\Pinjaman;
use App\Models\SimpananSukarela;
use App\Models\SimpananWajib;
use App\Models\SimpananPokok;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class LaporanController extends Controller
{
    use ApiResponse;

    public function transaksi(Request $request)
    {
        $bulan = $request->input('bulan', date('m'));
        $tahun = $request->input('tahun', date('Y'));

        // Pemasukan
        $simpananPokok = SimpananPokok::whereMonth('tanggal_bayar', $bulan)
            ->whereYear('tanggal_bayar', $tahun)->sum('jumlah');
            
        $simpananWajib = SimpananWajib::whereMonth('tanggal_bayar', $bulan)
            ->whereYear('tanggal_bayar', $tahun)->sum('jumlah');
            
        $setorSukarela = SimpananSukarela::where('jenis', 'setor')
            ->whereMonth('tanggal', $bulan)
            ->whereYear('tanggal', $tahun)->sum('jumlah');

        $angsuranMasuk = Angsuran::where('status', 'lunas')
            ->whereMonth('tanggal_bayar', $bulan)
            ->whereYear('tanggal_bayar', $tahun)
            ->sum('total_bayar');

        // Pengeluaran
        $tarikSukarela = SimpananSukarela::where('jenis', 'tarik')
            ->whereMonth('tanggal', $bulan)
            ->whereYear('tanggal', $tahun)->sum('jumlah');
            
        $pinjamanCair = Pinjaman::whereIn('status', ['cair', 'lunas'])
            ->whereMonth('tanggal_cair', $bulan)
            ->whereYear('tanggal_cair', $tahun)->sum('jumlah_pinjaman');

        return $this->sukses([
            'pemasukan' => [
                'simpanan_pokok' => $simpananPokok,
                'simpanan_wajib' => $simpananWajib,
                'simpanan_sukarela_masuk' => $setorSukarela,
                'angsuran_masuk' => $angsuranMasuk,
                'total' => $simpananPokok + $simpananWajib + $setorSukarela + $angsuranMasuk
            ],
            'pengeluaran' => [
                'simpanan_sukarela_keluar' => $tarikSukarela,
                'pinjaman_cair' => $pinjamanCair,
                'total' => $tarikSukarela + $pinjamanCair
            ],
            'periode' => "$tahun-$bulan"
        ]);
    }

    public function shu(Request $request)
    {
        $tahun = $request->input('tahun', date('Y'));

        $bunga = Angsuran::where('status', 'lunas')
            ->whereYear('tanggal_bayar', $tahun)
            ->sum('bunga');

        $denda = Angsuran::where('status', 'lunas')
            ->whereYear('tanggal_bayar', $tahun)
            ->sum('denda');

        $estimasiSHU = $bunga + $denda;

        return $this->sukses([
            'pendapatan_bunga' => $bunga,
            'pendapatan_denda' => $denda,
            'total_shu_kotor'  => $estimasiSHU,
            'alokasi' => [
                'anggota'  => $estimasiSHU * 0.40,
                'pengurus' => $estimasiSHU * 0.20,
                'cadangan' => $estimasiSHU * 0.40,
            ],
            'tahun' => $tahun
        ]);
    }
    
    public function export(Request $request)
    {
        $tahun = $request->input('tahun', date('Y'));
        
        $data = Angsuran::with(['pinjaman.anggota'])
            ->where('status', 'lunas')
            ->whereYear('tanggal_bayar', $tahun)
            ->get()
            ->map(function($a) {
                return [
                    'Tanggal Bayar' => $a->tanggal_bayar->format('Y-m-d'),
                    'NIK Peminjam'  => $a->pinjaman->anggota->nik,
                    'Nama Peminjam' => $a->pinjaman->anggota->nama,
                    'Angsuran Ke'   => $a->ke,
                    'Pokok'         => $a->pokok,
                    'Bunga'         => $a->bunga,
                    'Denda'         => $a->denda,
                    'Total Bayar'   => $a->total_bayar,
                ];
            });

        return $this->sukses($data, 'Data siap diexport');
    }
}
