<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Pengaturan extends Model
{
    public $timestamps = false;
    protected $table   = 'pengaturan';

    protected $fillable = ['kunci', 'nilai', 'tipe', 'keterangan'];

    protected $casts = [
        'nilai' => 'float',
    ];

    /**
     * Get a setting value by key. Cached for 1 hour.
     */
    public static function nilai(string $kunci, float $default = 0): float
    {
        return (float) Cache::remember("pengaturan_{$kunci}", 3600, function () use ($kunci, $default) {
            return static::where('kunci', $kunci)->value('nilai') ?? $default;
        });
    }

    /**
     * Get a setting as string (for enum types).
     */
    public static function teks(string $kunci, string $default = ''): string
    {
        return (string) Cache::remember("pengaturan_str_{$kunci}", 3600, function () use ($kunci, $default) {
            return static::where('kunci', $kunci)->value('nilai') ?? $default;
        });
    }

    /**
     * Flush cache for a specific key or all settings.
     */
    public static function flushCache(?string $kunci = null): void
    {
        if ($kunci) {
            Cache::forget("pengaturan_{$kunci}");
            Cache::forget("pengaturan_str_{$kunci}");
        } else {
            Cache::flush();
        }
    }
}
