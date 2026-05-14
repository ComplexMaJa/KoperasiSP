<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Modify users table to add anggota_id and is_active
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('anggota_id')->nullable()->constrained('anggota')->nullOnDelete()->after('id');
            $table->boolean('is_active')->default(true)->after('remember_token');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['anggota_id']);
            $table->dropColumn(['anggota_id', 'is_active']);
        });
    }
};
