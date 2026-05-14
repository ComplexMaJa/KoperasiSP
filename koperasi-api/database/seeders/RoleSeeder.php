<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles & permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            // Pengaturan
            'pengaturan.lihat', 'pengaturan.ubah',
            // Anggota
            'anggota.lihat', 'anggota.tambah', 'anggota.ubah', 'anggota.hapus', 'anggota.keluar',
            // Simpanan
            'simpanan.lihat', 'simpanan.tambah', 'simpanan.tarik',
            // Pinjaman
            'pinjaman.lihat', 'pinjaman.ajukan', 'pinjaman.setujui', 'pinjaman.tolak', 'pinjaman.cair', 'pinjaman.pelunasan',
            // Angsuran
            'angsuran.lihat', 'angsuran.bayar', 'angsuran.denda',
            // Laporan
            'laporan.lihat', 'laporan.export',
            // User management
            'user.lihat', 'user.tambah', 'user.ubah', 'user.hapus',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'sanctum']);
        }

        // Admin — all permissions
        $admin = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'sanctum']);
        $admin->syncPermissions($permissions);

        // Pengurus — operational permissions (no user management, no delete)
        $pengurus = Role::firstOrCreate(['name' => 'pengurus', 'guard_name' => 'sanctum']);
        $pengurus->syncPermissions([
            'anggota.lihat', 'anggota.tambah', 'anggota.ubah', 'anggota.keluar',
            'simpanan.lihat', 'simpanan.tambah', 'simpanan.tarik',
            'pinjaman.lihat', 'pinjaman.ajukan', 'pinjaman.setujui', 'pinjaman.tolak', 'pinjaman.cair', 'pinjaman.pelunasan',
            'angsuran.lihat', 'angsuran.bayar', 'angsuran.denda',
            'laporan.lihat', 'laporan.export',
        ]);

        // Anggota — self-view only
        $anggota = Role::firstOrCreate(['name' => 'anggota', 'guard_name' => 'sanctum']);
        $anggota->syncPermissions([
            'anggota.lihat',
            'simpanan.lihat',
            'pinjaman.lihat',
            'angsuran.lihat',
        ]);
    }
}
