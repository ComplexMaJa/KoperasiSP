<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Anggota;
use App\Models\Pengaturan;
use App\Models\SimpananSukarela;
use App\Models\SimpananWajib;
use App\Services\SimpananService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SimpananController extends Controller
{
    use ApiResponse;

    protected $simpananService;

    public function __construct(SimpananService $simpananService)
    {
        $this->simpananService = $simpananService;
    }

    public function indexWajib(Request $request, Anggota $anggota)
    {
        $tahun = $request->input('tahun', date('Y'));
        
        $simpanan = $anggota->simpananWajib()
            ->where('tahun', $tahun)
            ->orderBy('bulan', 'asc')
            ->get();

        return $this->sukses([
            'anggota' => $anggota,
            'simpanan_wajib' => $simpanan,
            'tahun' => $tahun
        ]);
    }

    public function bayarWajib(Request $request)
    {
        $request->validate([
            'anggota_id'    => 'required|exists:anggota,id',
            'bulan'         => 'required|integer|min:1|max:12',
            'tahun'         => 'required|integer|min:2000|max:2100',
            'tanggal_bayar' => 'required|date',
        ], [
            'anggota_id.required' => 'Anggota wajib dipilih.',
            'bulan.required'      => 'Bulan wajib diisi.',
            'tahun.required'      => 'Tahun wajib diisi.',
        ]);

        $anggota = Anggota::findOrFail($request->anggota_id);

        if ($anggota->status !== 'aktif') {
            return $this->gagal('Anggota sudah tidak aktif.', 400);
        }

        // Cek unique constraint
        $exists = SimpananWajib::where('anggota_id', $anggota->id)
            ->where('bulan', $request->bulan)
            ->where('tahun', $request->tahun)
            ->exists();

        if ($exists) {
            return $this->gagal('Simpanan wajib untuk bulan dan tahun tersebut sudah dibayar.', 400);
        }

        $nominal = Pengaturan::where('kunci', 'simpanan_wajib_bulanan')->value('nilai') ?? 10000;

        $simpanan = SimpananWajib::create([
            'anggota_id'    => $anggota->id,
            'bulan'         => $request->bulan,
            'tahun'         => $request->tahun,
            'jumlah'        => $nominal,
            'tanggal_bayar' => $request->tanggal_bayar,
        ]);

        return $this->sukses($simpanan, 'Simpanan wajib berhasil dicatat.', 201);
    }

    public function indexSukarela(Request $request, Anggota $anggota)
    {
        $limit = $request->input('limit', 10);
        $riwayat = $anggota->simpananSukarela()
            ->latest('tanggal')
            ->latest('id')
            ->paginate($limit);

        $saldo = $this->simpananService->getSaldoSukarela($anggota);

        return $this->sukses([
            'anggota' => $anggota,
            'saldo' => $saldo,
            'riwayat' => $riwayat
        ]);
    }

    public function setor(Request $request)
    {
        $request->validate([
            'anggota_id' => 'required|exists:anggota,id',
            'jumlah'     => 'required|numeric|min:1000',
            'tanggal'    => 'required|date',
            'keterangan' => 'nullable|string|max:255',
        ]);

        $anggota = Anggota::findOrFail($request->anggota_id);

        if ($anggota->status !== 'aktif') {
            return $this->gagal('Anggota sudah tidak aktif.', 400);
        }

        return DB::transaction(function () use ($request, $anggota) {
            $saldoSaatIni = $this->simpananService->getSaldoSukarela($anggota);
            $saldoSetelah = $saldoSaatIni + $request->jumlah;

            $simpanan = SimpananSukarela::create([
                'anggota_id'   => $anggota->id,
                'jenis'        => 'setor',
                'jumlah'       => $request->jumlah,
                'saldo_setelah'=> $saldoSetelah,
                'tanggal'      => $request->tanggal,
                'keterangan'   => $request->keterangan ?? 'Setor Simpanan Sukarela',
            ]);

            return $this->sukses($simpanan, 'Setoran simpanan sukarela berhasil.', 201);
        });
    }

    public function tarik(Request $request)
    {
        $request->validate([
            'anggota_id' => 'required|exists:anggota,id',
            'jumlah'     => 'required|numeric|min:1000',
            'tanggal'    => 'required|date',
            'keterangan' => 'nullable|string|max:255',
        ]);

        $anggota = Anggota::findOrFail($request->anggota_id);

        if ($anggota->status !== 'aktif') {
            return $this->gagal('Anggota sudah tidak aktif.', 400);
        }

        try {
            return DB::transaction(function () use ($request, $anggota) {
                $saldoSaatIni = $this->simpananService->validasiTarik($anggota, $request->jumlah);
                $saldoSetelah = $saldoSaatIni - $request->jumlah;

                $simpanan = SimpananSukarela::create([
                    'anggota_id'   => $anggota->id,
                    'jenis'        => 'tarik',
                    'jumlah'       => $request->jumlah,
                    'saldo_setelah'=> $saldoSetelah,
                    'tanggal'      => $request->tanggal,
                    'keterangan'   => $request->keterangan ?? 'Tarik Simpanan Sukarela',
                ]);

                return $this->sukses($simpanan, 'Penarikan simpanan sukarela berhasil.', 201);
            });
        } catch (\Exception $e) {
            return $this->gagal($e->getMessage(), 400);
        }
    }
}
