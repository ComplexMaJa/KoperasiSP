<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pengaturan;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class PengaturanController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $pengaturan = Pengaturan::all();
        return $this->sukses($pengaturan, 'Data pengaturan berhasil diambil.');
    }

    public function bulkUpdate(Request $request)
    {
        $request->validate([
            'pengaturan' => 'required|array',
            'pengaturan.*.kunci' => 'required|string|exists:pengaturan,kunci',
            'pengaturan.*.nilai' => 'required|numeric',
        ], [
            'pengaturan.required' => 'Data pengaturan wajib diisi.',
            'pengaturan.*.kunci.exists' => 'Kunci pengaturan tidak valid.',
            'pengaturan.*.nilai.numeric' => 'Nilai harus berupa angka.',
        ]);

        foreach ($request->pengaturan as $item) {
            $pengaturan = Pengaturan::where('kunci', $item['kunci'])->first();
            if ($pengaturan) {
                $pengaturan->update(['nilai' => $item['nilai']]);
                Cache::forget("pengaturan_{$item['kunci']}");
            }
        }

        return $this->sukses(Pengaturan::all(), 'Pengaturan berhasil diperbarui.');
    }
}
