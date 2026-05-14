<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('anggota', function (Blueprint $table) {
            $table->id();
            $table->string('nik', 16)->unique();
            $table->string('nama', 150);
            $table->text('alamat')->nullable();
            $table->string('telepon', 20)->nullable();
            $table->date('tanggal_gabung');
            $table->enum('status', ['aktif', 'keluar'])->default('aktif');
            $table->date('tanggal_keluar')->nullable();
            $table->text('keterangan_keluar')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('anggota');
    }
};
