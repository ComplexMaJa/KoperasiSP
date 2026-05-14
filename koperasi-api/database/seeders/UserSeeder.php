<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@koperasi.id'],
            [
                'name'     => 'Administrator',
                'password' => Hash::make('Admin@12345'),
                'is_active'=> true,
            ]
        );
        $admin->assignRole('admin');

        $pengurus = User::firstOrCreate(
            ['email' => 'pengurus@koperasi.id'],
            [
                'name'     => 'Pengurus Koperasi',
                'password' => Hash::make('Pengurus@12345'),
                'is_active'=> true,
            ]
        );
        $pengurus->assignRole('pengurus');
    }
}
