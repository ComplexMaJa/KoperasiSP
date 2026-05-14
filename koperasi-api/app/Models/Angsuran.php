<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Angsuran extends Model
{
    protected $table = 'angsuran';

    protected $fillable = [
        'pinjaman_id', 'ke', 'tanggal_jatuh_tempo', 'tanggal_bayar',
        'pokok', 'bunga', 'denda', 'total_bayar', 'status',
    ];

    protected $casts = [
        'tanggal_jatuh_tempo' => 'date',
        'tanggal_bayar'       => 'date',
        'pokok'               => 'float',
        'bunga'               => 'float',
        'denda'               => 'float',
        'total_bayar'         => 'float',
    ];

    public function pinjaman() { return $this->belongsTo(Pinjaman::class); }
    public function denda()    { return $this->hasMany(Denda::class); }

    public function isTelat(): bool
    {
        return $this->status === 'belum' && $this->tanggal_jatuh_tempo->isPast();
    }
}
