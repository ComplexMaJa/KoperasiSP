<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait ApiResponse
{
    protected function sukses(mixed $data, string $pesan = 'Berhasil', int $kode = 200): JsonResponse
    {
        return response()->json([
            'sukses' => true,
            'pesan'  => $pesan,
            'data'   => $data,
        ], $kode);
    }

    protected function suksesHalaman(mixed $data, object $paginasi, string $pesan = 'Berhasil'): JsonResponse
    {
        return response()->json([
            'sukses' => true,
            'pesan'  => $pesan,
            'data'   => $data,
            'meta'   => [
                'halaman_sekarang' => $paginasi->currentPage(),
                'per_halaman'      => $paginasi->perPage(),
                'total'            => $paginasi->total(),
                'total_halaman'    => $paginasi->lastPage(),
            ],
        ]);
    }

    protected function gagal(string $pesan, int $kode = 400, mixed $errors = null): JsonResponse
    {
        return response()->json([
            'sukses' => false,
            'pesan'  => $pesan,
            'errors' => $errors,
        ], $kode);
    }
}
