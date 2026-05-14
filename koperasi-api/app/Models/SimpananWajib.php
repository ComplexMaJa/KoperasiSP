<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SimpananWajib extends Model
{
    public $timestamps = false;
    protected $table   = 'simpanan_wajib';
    protected $fillable = ['anggota_id', 'bulan', 'tahun', 'jumlah', 'tanggal_bayar'];
    protected $casts    = ['tanggal_bayar' => 'date', 'jumlah' => 'float'];

    public function anggota() { return $this->belongsTo(Anggota::class); }
}
