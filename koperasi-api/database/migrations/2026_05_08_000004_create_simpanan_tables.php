<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('simpanan_pokok', function (Blueprint $table) {
            $table->id();
            $table->foreignId('anggota_id')->constrained('anggota')->cascadeOnDelete();
            $table->decimal('jumlah', 15, 2);
            $table->date('tanggal_bayar');
            $table->string('keterangan', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('simpanan_wajib', function (Blueprint $table) {
            $table->id();
            $table->foreignId('anggota_id')->constrained('anggota')->cascadeOnDelete();
            $table->tinyInteger('bulan')->unsigned();
            $table->smallInteger('tahun')->unsigned();
            $table->decimal('jumlah', 15, 2);
            $table->date('tanggal_bayar');
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['anggota_id', 'bulan', 'tahun'], 'uq_wajib_anggota_bulan_tahun');
        });

        Schema::create('simpanan_sukarela', function (Blueprint $table) {
            $table->id();
            $table->foreignId('anggota_id')->constrained('anggota')->cascadeOnDelete();
            $table->enum('jenis', ['setor', 'tarik']);
            $table->decimal('jumlah', 15, 2);
            $table->decimal('saldo_setelah', 15, 2);
            $table->date('tanggal');
            $table->string('keterangan', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('simpanan_sukarela');
        Schema::dropIfExists('simpanan_wajib');
        Schema::dropIfExists('simpanan_pokok');
    }
};
