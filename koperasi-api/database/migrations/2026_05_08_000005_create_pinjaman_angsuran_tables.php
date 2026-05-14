<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pinjaman', function (Blueprint $table) {
            $table->id();
            $table->foreignId('anggota_id')->constrained('anggota')->cascadeOnDelete();
            $table->foreignId('kategori_id')->constrained('kategori_pinjaman');
            $table->foreignId('penjamin_anggota_id')->nullable()->constrained('anggota');
            $table->decimal('jumlah_pinjaman', 15, 2);
            $table->tinyInteger('tenor_bulan')->unsigned();
            $table->decimal('bunga_persen', 5, 2);
            $table->decimal('angsuran_pokok', 15, 2);
            $table->decimal('angsuran_bunga', 15, 2);
            $table->decimal('total_angsuran', 15, 2);
            $table->text('tujuan_pinjaman')->nullable();
            $table->enum('status', ['pengajuan', 'disetujui', 'cair', 'lunas', 'ditolak'])->default('pengajuan');
            $table->foreignId('disetujui_oleh')->nullable()->constrained('users');
            $table->date('tanggal_pengajuan');
            $table->date('tanggal_disetujui')->nullable();
            $table->date('tanggal_cair')->nullable();
            $table->date('tanggal_lunas')->nullable();
            $table->text('catatan_penolakan')->nullable();
            $table->timestamps();
        });

        Schema::create('angsuran', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pinjaman_id')->constrained('pinjaman')->cascadeOnDelete();
            $table->tinyInteger('ke')->unsigned();
            $table->date('tanggal_jatuh_tempo');
            $table->date('tanggal_bayar')->nullable();
            $table->decimal('pokok', 15, 2);
            $table->decimal('bunga', 15, 2);
            $table->decimal('denda', 15, 2)->default(0);
            $table->decimal('total_bayar', 15, 2)->nullable();
            $table->enum('status', ['belum', 'lunas', 'telat'])->default('belum');
            $table->timestamps();
        });

        Schema::create('denda', function (Blueprint $table) {
            $table->id();
            $table->foreignId('angsuran_id')->constrained('angsuran')->cascadeOnDelete();
            $table->decimal('jumlah', 15, 2);
            $table->integer('hari_telat')->unsigned()->default(0);
            $table->date('tanggal_hitung');
            $table->string('keterangan', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('denda');
        Schema::dropIfExists('angsuran');
        Schema::dropIfExists('pinjaman');
    }
};
