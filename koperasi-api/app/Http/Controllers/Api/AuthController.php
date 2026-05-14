<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AuthController extends Controller
{
    use ApiResponse;

    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ], [
            'email.required'    => 'Email wajib diisi.',
            'email.email'       => 'Format email tidak valid.',
            'password.required' => 'Kata sandi wajib diisi.',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return $this->gagal('Email atau kata sandi salah.', 401);
        }

        if (! $user->is_active) {
            return $this->gagal('Akun Anda telah dinonaktifkan. Hubungi administrator.', 403);
        }

        // Revoke old tokens
        $user->tokens()->delete();

        $token = $user->createToken('koperasi-token')->plainTextToken;

        return $this->sukses([
            'token' => $token,
            'user'  => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'roles' => $user->getRoleNames(),
                'permissions' => $user->getAllPermissions()->pluck('name'),
                'anggota_id' => $user->anggota_id,
            ],
        ], 'Login berhasil.');
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return $this->sukses(null, 'Logout berhasil.');
    }

    public function me(Request $request)
    {
        $user = $request->user();
        return $this->sukses([
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
            'anggota_id' => $user->anggota_id,
            'is_active'  => $user->is_active,
        ]);
    }
}
