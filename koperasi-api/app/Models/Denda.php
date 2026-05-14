<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Denda extends Model
{
    public $timestamps = false;
    protected $table   = 'denda';
    protected $fillable = ['angsuran_id', 'jumlah', 'hari_telat', 'tanggal_hitung', 'keterangan'];
    protected $casts    = ['tanggal_hitung' => 'date', 'jumlah' => 'float'];

    public function angsuran() { return $this->belongsTo(Angsuran::class); }
}
