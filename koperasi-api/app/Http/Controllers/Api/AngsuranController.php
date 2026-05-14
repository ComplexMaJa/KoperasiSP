<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Angsuran;
use App\Models\Pinjaman;
use App\Services\DendaService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AngsuranController extends Controller
{
    use ApiResponse;

    protected $dendaService;

    public function __construct(DendaService $dendaService)
    {
        $this->dendaService = $dendaService;
    }

    public function index(Request $request)
    {
        $query = Angsuran::with(['pinjaman.anggota:id,nik,nama']);

        // filter by status
        if ($request->has('status') && $request->status != '') {
            $query->where('status', $request->status);
        }

        // search by NIK or Nama Anggota
        if ($request->has('search') && $request->search != '') {
            $search = $request->search;
            $query->whereHas('pinjaman.anggota', function($q) use ($search) {
                $q->where('nik', 'like', "%{$search}%")
                  ->orWhere('nama', 'like', "%{$search}%");
            });
        }

        $query->orderBy('tanggal_jatuh_tempo', 'asc');
        $limit = $request->input('limit', 20);

        return $this->sukses($query->paginate($limit));
    }

    public function byPinjaman(Pinjaman $pinjaman)
    {
        $angsuran = $pinjaman->angsuran()->orderBy('ke', 'asc')->get();
        return $this->sukses($angsuran);
    }

    public function bayar(Request $request, Angsuran $angsuran)
    {
        if ($angsuran->status === 'lunas') {
            return $this->gagal('Angsuran ini sudah lunas.', 400);
        }

        return DB::transaction(function () use ($angsuran) {
            // Hitung total bayar (pokok + bunga + denda)
            $totalBayar = $angsuran->pokok + $angsuran->bunga + $angsuran->denda;

            $angsuran->update([
                'status'        => 'lunas',
                'tanggal_bayar' => now(),
                'total_bayar'   => $totalBayar
            ]);

            // Cek apakah semua angsuran pinjaman sudah lunas
            $pinjaman = $angsuran->pinjaman;
            $sisa = $pinjaman->angsuran()->where('status', '!=', 'lunas')->count();
            
            if ($sisa === 0) {
                $pinjaman->update([
                    'status'        => 'lunas',
                    'tanggal_lunas' => now()
                ]);
            }

            return $this->sukses($angsuran->fresh(), 'Pembayaran angsuran berhasil diproses.');
        });
    }

    public function generateDenda()
    {
        $count = $this->dendaService->hitungDenda();
        return $this->sukses(['updated' => $count], "Berhasil memperbarui denda untuk {$count} data angsuran.");
    }
}
