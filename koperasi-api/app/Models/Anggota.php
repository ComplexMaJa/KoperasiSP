<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Anggota extends Model
{
    protected $table = 'anggota';

    protected $fillable = [
        'nik', 'nama', 'alamat', 'telepon',
        'tanggal_gabung', 'status', 'tanggal_keluar', 'keterangan_keluar',
    ];

    protected $casts = [
        'tanggal_gabung' => 'date',
        'tanggal_keluar' => 'date',
    ];

    public function simpananPokok()
    {
        return $this->hasMany(SimpananPokok::class);
    }

    public function simpananWajib()
    {
        return $this->hasMany(SimpananWajib::class);
    }

    public function simpananSukarela()
    {
        return $this->hasMany(SimpananSukarela::class);
    }

    public function pinjaman()
    {
        return $this->hasMany(Pinjaman::class);
    }

    public function pinjamanSebagaiPenjamin()
    {
        return $this->hasMany(Pinjaman::class, 'penjamin_anggota_id');
    }

    public function user()
    {
        return $this->hasOne(User::class);
    }

    /**
     * Scope: filter by status.
     */
    public function scopeStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope: search by NIK or nama.
     */
    public function scopeCari($query, string $keyword)
    {
        return $query->where(function ($q) use ($keyword) {
            $q->where('nik', 'like', "%{$keyword}%")
              ->orWhere('nama', 'like', "%{$keyword}%");
        });
    }

    /**
     * Check if anggota has active pinjaman.
     */
    public function hasPinjamanAktif(): bool
    {
        return $this->pinjaman()
            ->whereIn('status', ['pengajuan', 'disetujui', 'cair'])
            ->exists();
    }
}
