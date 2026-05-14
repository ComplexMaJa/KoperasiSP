<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KategoriPinjaman;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class KategoriPinjamanController extends Controller
{
    use ApiResponse;

    public function index()
    {
        return $this->sukses(KategoriPinjaman::all());
    }

    public function store(Request $request)
    {
        $request->validate([
            'nama_kategori' => 'required|string|max:100|unique:kategori_pinjaman,nama_kategori',
            'bunga_persen'  => 'required|numeric|min:0|max:100',
            'keterangan'    => 'nullable|string'
        ]);

        $kategori = KategoriPinjaman::create($request->all());
        return $this->sukses($kategori, 'Kategori pinjaman berhasil ditambahkan.', 201);
    }

    public function show(KategoriPinjaman $kategoriPinjaman)
    {
        return $this->sukses($kategoriPinjaman);
    }

    public function update(Request $request, KategoriPinjaman $kategoriPinjaman)
    {
        $request->validate([
            'nama_kategori' => 'required|string|max:100|unique:kategori_pinjaman,nama_kategori,' . $kategoriPinjaman->id,
            'bunga_persen'  => 'required|numeric|min:0|max:100',
            'keterangan'    => 'nullable|string'
        ]);

        $kategoriPinjaman->update($request->all());
        return $this->sukses($kategoriPinjaman, 'Kategori pinjaman berhasil diperbarui.');
    }

    public function destroy(KategoriPinjaman $kategoriPinjaman)
    {
        if ($kategoriPinjaman->pinjaman()->exists()) {
            return $this->gagal('Tidak dapat menghapus kategori karena sudah digunakan pada data pinjaman.', 400);
        }

        $kategoriPinjaman->delete();
        return $this->sukses(null, 'Kategori pinjaman berhasil dihapus.');
    }
}
