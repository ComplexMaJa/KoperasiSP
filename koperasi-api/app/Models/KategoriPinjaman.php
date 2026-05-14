<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KategoriPinjaman extends Model
{
    protected $table = 'kategori_pinjaman';
    protected $fillable = ['nama_kategori', 'bunga_persen', 'keterangan'];

    public function pinjaman()
    {
        return $this->hasMany(Pinjaman::class, 'kategori_id');
    }
}
