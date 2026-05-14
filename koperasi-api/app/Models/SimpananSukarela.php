<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SimpananSukarela extends Model
{
    public $timestamps = false;
    protected $table   = 'simpanan_sukarela';
    protected $fillable = ['anggota_id', 'jenis', 'jumlah', 'saldo_setelah', 'tanggal', 'keterangan'];
    protected $casts    = ['tanggal' => 'date', 'jumlah' => 'float', 'saldo_setelah' => 'float'];

    public function anggota() { return $this->belongsTo(Anggota::class); }
}
