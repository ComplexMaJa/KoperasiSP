<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pinjaman extends Model
{
    protected $table = 'pinjaman';

    protected $fillable = [
        'anggota_id', 'penjamin_anggota_id', 'kategori_id', 'jumlah_pinjaman', 'tenor_bulan',
        'bunga_persen', 'angsuran_pokok', 'angsuran_bunga', 'total_angsuran',
        'tujuan_pinjaman', 'status', 'disetujui_oleh',
        'tanggal_pengajuan', 'tanggal_disetujui', 'tanggal_cair', 'tanggal_lunas',
        'catatan_penolakan',
    ];

    protected $casts = [
        'tanggal_pengajuan'  => 'date',
        'tanggal_disetujui'  => 'date',
        'tanggal_cair'       => 'date',
        'tanggal_lunas'      => 'date',
        'jumlah_pinjaman'    => 'float',
        'angsuran_pokok'     => 'float',
        'angsuran_bunga'     => 'float',
        'total_angsuran'     => 'float',
        'bunga_persen'       => 'float',
    ];

    public function anggota()       { return $this->belongsTo(Anggota::class); }
    public function penjamin()      { return $this->belongsTo(Anggota::class, 'penjamin_anggota_id'); }
    public function kategori()      { return $this->belongsTo(KategoriPinjaman::class, 'kategori_id'); }
    public function disetujuiOleh() { return $this->belongsTo(User::class, 'disetujui_oleh'); }
    public function angsuran()      { return $this->hasMany(Angsuran::class); }

    public function scopeAktif($query)
    {
        return $query->whereIn('status', ['pengajuan', 'disetujui', 'cair']);
    }
}
