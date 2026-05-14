<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Anggota;
use App\Models\Pinjaman;
use App\Services\PinjamanService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class PinjamanController extends Controller
{
    use ApiResponse;

    protected $pinjamanService;

    public function __construct(PinjamanService $pinjamanService)
    {
        $this->pinjamanService = $pinjamanService;
    }

    public function index(Request $request)
    {
        $query = Pinjaman::with(['anggota:id,nik,nama', 'penjamin:id,nik,nama'])->latest('id');

        if ($request->has('status') && $request->status != '') {
            $query->where('status', $request->status);
        }

        if ($request->has('anggotaId') && $request->anggotaId != '') {
            $query->where('anggota_id', $request->anggotaId);
        }

        $limit = $request->input('limit', 10);
        return $this->sukses($query->paginate($limit));
    }

    public function simulasi(Request $request)
    {
        $request->validate([
            'jumlah_pinjaman' => 'required|numeric|min:1000',
            'tenor_bulan'     => 'required|integer|min:1',
            'kategori_id'     => 'required|exists:kategori_pinjaman,id',
        ]);

        $simulasi = $this->pinjamanService->hitungSimulasi($request->jumlah_pinjaman, $request->tenor_bulan, $request->kategori_id);
        return $this->sukses($simulasi);
    }

    public function store(Request $request)
    {
        $request->validate([
            'anggota_id'          => 'required|exists:anggota,id',
            'penjamin_anggota_id' => 'nullable|exists:anggota,id|different:anggota_id',
            'kategori_id'         => 'required|exists:kategori_pinjaman,id',
            'jumlah_pinjaman'     => 'required|numeric|min:1000',
            'tenor_bulan'         => 'required|integer|min:1|max:60',
            'tujuan_pinjaman'     => 'required|string',
            'tanggal_pengajuan'   => 'required|date',
        ]);

        $anggota = Anggota::findOrFail($request->anggota_id);

        try {
            $this->pinjamanService->validasiSyarat($anggota, $request->jumlah_pinjaman);

            $simulasi = $this->pinjamanService->hitungSimulasi($request->jumlah_pinjaman, $request->tenor_bulan, $request->kategori_id);

            $pinjaman = Pinjaman::create(array_merge($request->only([
                'anggota_id', 'penjamin_anggota_id', 'kategori_id', 'jumlah_pinjaman', 'tenor_bulan',
                'tujuan_pinjaman', 'tanggal_pengajuan'
            ]), [
                'status'         => 'pengajuan',
                'bunga_persen'   => $simulasi['bunga_persen'],
                'angsuran_pokok' => $simulasi['angsuran_pokok'],
                'angsuran_bunga' => $simulasi['angsuran_bunga'],
                'total_angsuran' => $simulasi['total_angsuran'],
            ]));

            return $this->sukses($pinjaman, 'Pinjaman berhasil diajukan.', 201);
        } catch (\Exception $e) {
            return $this->gagal($e->getMessage(), 422);
        }
    }

    public function show(Pinjaman $pinjaman)
    {
        $pinjaman->load(['anggota', 'penjamin', 'angsuran' => function($q) {
            $q->orderBy('ke', 'asc');
        }]);
        return $this->sukses($pinjaman);
    }

    public function setujui(Pinjaman $pinjaman)
    {
        try {
            $this->pinjamanService->setujui($pinjaman, auth()->id());
            return $this->sukses($pinjaman->fresh(), 'Pinjaman berhasil disetujui.');
        } catch (\Exception $e) {
            return $this->gagal($e->getMessage(), 400);
        }
    }

    public function tolak(Request $request, Pinjaman $pinjaman)
    {
        $request->validate([
            'catatan_penolakan' => 'required|string',
        ]);

        if ($pinjaman->status !== 'pengajuan') {
            return $this->gagal('Hanya pinjaman dengan status pengajuan yang dapat ditolak.', 400);
        }

        $pinjaman->update([
            'status' => 'ditolak',
            'catatan_penolakan' => $request->catatan_penolakan,
        ]);

        return $this->sukses($pinjaman, 'Pinjaman telah ditolak.');
    }

    public function cair(Pinjaman $pinjaman)
    {
        if ($pinjaman->status !== 'disetujui') {
            return $this->gagal('Hanya pinjaman yang disetujui yang dapat dicairkan.', 400);
        }

        $pinjaman->update([
            'status' => 'cair',
            'tanggal_cair' => now(),
        ]);

        return $this->sukses($pinjaman, 'Pinjaman berhasil dicairkan.');
    }

    public function pelunasanCepat(Pinjaman $pinjaman)
    {
        try {
            $this->pinjamanService->pelunasanCepat($pinjaman);
            return $this->sukses($pinjaman->fresh(), 'Pelunasan cepat berhasil.');
        } catch (\Exception $e) {
            return $this->gagal($e->getMessage(), 400);
        }
    }
}
