<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Anggota;
use App\Models\SimpananPokok;
use App\Models\Pengaturan;
use App\Services\AnggotaService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnggotaController extends Controller
{
    use ApiResponse;

    protected $anggotaService;

    public function __construct(AnggotaService $anggotaService)
    {
        $this->anggotaService = $anggotaService;
    }

    public function index(Request $request)
    {
        $query = Anggota::query()->latest('id');

        if ($request->has('search') && $request->search != '') {
            $query->cari($request->search);
        }

        if ($request->has('status') && $request->status != '') {
            $query->status($request->status);
        }

        $limit = $request->input('limit', 10);
        return $this->sukses($query->paginate($limit));
    }

    public function store(Request $request)
    {
        $request->validate([
            'nik'            => 'required|string|size:16|unique:anggota,nik',
            'nama'           => 'required|string|max:150',
            'alamat'         => 'required|string',
            'telepon'        => 'required|string|max:20',
            'tanggal_gabung' => 'required|date',
        ], [
            'nik.required'   => 'NIK wajib diisi.',
            'nik.size'       => 'NIK harus 16 digit.',
            'nik.unique'     => 'NIK sudah terdaftar.',
            'nama.required'  => 'Nama wajib diisi.',
            'alamat.required'=> 'Alamat wajib diisi.',
            'telepon.required'=> 'Nomor telepon wajib diisi.',
        ]);

        return DB::transaction(function () use ($request) {
            $anggota = Anggota::create([
                'nik'            => $request->nik,
                'nama'           => $request->nama,
                'alamat'         => $request->alamat,
                'telepon'        => $request->telepon,
                'tanggal_gabung' => $request->tanggal_gabung,
                'status'         => 'aktif',
            ]);

            // Tambah simpanan pokok otomatis dari pengaturan
            $nominalPokok = Pengaturan::where('kunci', 'simpanan_pokok')->value('nilai') ?? 50000;
            
            SimpananPokok::create([
                'anggota_id'    => $anggota->id,
                'jumlah'        => $nominalPokok,
                'tanggal_bayar' => $request->tanggal_gabung,
                'keterangan'    => 'Simpanan Pokok Awal',
            ]);

            return $this->sukses($anggota, 'Anggota berhasil didaftarkan.', 201);
        });
    }

    public function show(Anggota $anggota)
    {
        $anggota->load(['simpananPokok', 'simpananWajib', 'simpananSukarela', 'pinjaman']);
        return $this->sukses($anggota);
    }

    public function update(Request $request, Anggota $anggota)
    {
        $request->validate([
            'nama'    => 'required|string|max:150',
            'alamat'  => 'required|string',
            'telepon' => 'required|string|max:20',
        ], [
            'nama.required'   => 'Nama wajib diisi.',
            'alamat.required' => 'Alamat wajib diisi.',
            'telepon.required'=> 'Nomor telepon wajib diisi.',
        ]);

        $anggota->update([
            'nama'    => $request->nama,
            'alamat'  => $request->alamat,
            'telepon' => $request->telepon,
        ]);

        return $this->sukses($anggota, 'Data anggota berhasil diperbarui.');
    }

    public function keluar(Request $request, Anggota $anggota)
    {
        $request->validate([
            'keterangan_keluar' => 'required|string',
        ], [
            'keterangan_keluar.required' => 'Keterangan keluar wajib diisi.',
        ]);

        try {
            $refund = $this->anggotaService->prosesKeluar($anggota, $request->keterangan_keluar);
            return $this->sukses($refund, 'Anggota berhasil dikeluarkan.');
        } catch (\Exception $e) {
            return $this->gagal($e->getMessage(), 400);
        }
    }

    public function saldo(Anggota $anggota)
    {
        $refund = $this->anggotaService->hitungRefund($anggota);
        return $this->sukses($refund);
    }

    public function destroy(Anggota $anggota)
    {
        $anggota->delete();
        return $this->sukses(null, 'Anggota berhasil dihapus beserta seluruh data terkait.');
    }
}
