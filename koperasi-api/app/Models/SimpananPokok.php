<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SimpananPokok extends Model
{
    public $timestamps = false;
    protected $table   = 'simpanan_pokok';
    protected $fillable = ['anggota_id', 'jumlah', 'tanggal_bayar', 'keterangan'];
    protected $casts    = ['tanggal_bayar' => 'date', 'jumlah' => 'float'];

    public function anggota() { return $this->belongsTo(Anggota::class); }
}
