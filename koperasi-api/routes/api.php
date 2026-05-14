<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PengaturanController;
use App\Http\Controllers\Api\AnggotaController;
use App\Http\Controllers\Api\SimpananController;
use App\Http\Controllers\Api\PinjamanController;
use App\Http\Controllers\Api\AngsuranController;
use App\Http\Controllers\Api\LaporanController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\KategoriPinjamanController;

/*
|--------------------------------------------------------------------------
| API Routes — Koperasi Simpan Pinjam
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // ── Public ────────────────────────────────────────────────────────────
    Route::post('/auth/login', [AuthController::class, 'login']);

    // ── Protected ─────────────────────────────────────────────────────────
    Route::middleware('auth:sanctum')->group(function () {

        // Auth
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me',      [AuthController::class, 'me']);

        // Dashboard
        Route::get('/dashboard/summary', [DashboardController::class, 'summary']);

        // User Management (Admin only)
        Route::middleware('role:admin')->group(function () {
            Route::get('/users',                    [UserController::class, 'index']);
            Route::post('/users',                   [UserController::class, 'store']);
            Route::put('/users/{user}',             [UserController::class, 'update']);
            Route::put('/users/{user}/toggle-aktif',[UserController::class, 'toggleAktif']);
            Route::delete('/users/{user}',          [UserController::class, 'destroy']);

            // Pengaturan
            Route::get('/pengaturan',  [PengaturanController::class, 'index']);
            Route::put('/pengaturan',  [PengaturanController::class, 'bulkUpdate']);

            // Kategori Pinjaman
            Route::apiResource('kategori-pinjaman', KategoriPinjamanController::class);
        });

        // Anggota
        Route::get('/anggota',              [AnggotaController::class, 'index']);
        Route::post('/anggota',             [AnggotaController::class, 'store'])->middleware('permission:anggota.tambah');
        Route::get('/anggota/{anggota}',    [AnggotaController::class, 'show']);
        Route::put('/anggota/{anggota}',    [AnggotaController::class, 'update'])->middleware('permission:anggota.ubah');
        Route::post('/anggota/{anggota}/keluar', [AnggotaController::class, 'keluar'])->middleware('permission:anggota.keluar');
        Route::delete('/anggota/{anggota}', [AnggotaController::class, 'destroy'])->middleware('role:admin');
        Route::get('/anggota/{anggota}/saldo', [AnggotaController::class, 'saldo']);

        // Simpanan
        Route::get('/simpanan/wajib/{anggota}',          [SimpananController::class, 'indexWajib']);
        Route::post('/simpanan/wajib',                    [SimpananController::class, 'bayarWajib'])->middleware('permission:simpanan.tambah');
        Route::get('/simpanan/sukarela/{anggota}',        [SimpananController::class, 'indexSukarela']);
        Route::post('/simpanan/sukarela/setor',           [SimpananController::class, 'setor'])->middleware('permission:simpanan.tambah');
        Route::post('/simpanan/sukarela/tarik',           [SimpananController::class, 'tarik'])->middleware('permission:simpanan.tarik');

        // Pinjaman
        Route::get('/pinjaman',                           [PinjamanController::class, 'index']);
        Route::post('/pinjaman',                          [PinjamanController::class, 'store'])->middleware('permission:pinjaman.ajukan');
        Route::get('/pinjaman/simulasi',                  [PinjamanController::class, 'simulasi']);
        Route::get('/pinjaman/{pinjaman}',                [PinjamanController::class, 'show']);
        Route::put('/pinjaman/{pinjaman}/setujui',        [PinjamanController::class, 'setujui'])->middleware('permission:pinjaman.setujui');
        Route::put('/pinjaman/{pinjaman}/tolak',          [PinjamanController::class, 'tolak'])->middleware('permission:pinjaman.tolak');
        Route::put('/pinjaman/{pinjaman}/cair',           [PinjamanController::class, 'cair'])->middleware('permission:pinjaman.cair');
        Route::post('/pinjaman/{pinjaman}/pelunasan-cepat',[PinjamanController::class, 'pelunasanCepat'])->middleware('permission:pinjaman.pelunasan');

        // Angsuran
        Route::get('/angsuran',                           [AngsuranController::class, 'index']);
        Route::get('/angsuran/pinjaman/{pinjaman}',       [AngsuranController::class, 'byPinjaman']);
        Route::post('/angsuran/{angsuran}/bayar',         [AngsuranController::class, 'bayar'])->middleware('permission:angsuran.bayar');
        Route::post('/angsuran/generate-denda',           [AngsuranController::class, 'generateDenda'])->middleware('role:admin|pengurus');

        // Laporan
        Route::middleware('permission:laporan.lihat')->group(function () {
            Route::get('/laporan/transaksi', [LaporanController::class, 'transaksi']);
            Route::get('/laporan/shu',       [LaporanController::class, 'shu']);
        });
        Route::get('/laporan/export', [LaporanController::class, 'export'])->middleware('permission:laporan.export');
    });
});
