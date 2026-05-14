<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = User::with('roles')->latest();

        if ($request->has('search') && $request->search != '') {
            $query->where(function($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('email', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->has('role') && $request->role != '') {
            $query->role($request->role);
        }

        $limit = $request->input('limit', 10);
        $users = $query->paginate($limit);

        return $this->sukses($users, 'Data pengguna berhasil diambil.');
    }

    public function store(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:150',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role'     => 'required|exists:roles,name',
        ], [
            'name.required'     => 'Nama wajib diisi.',
            'email.required'    => 'Email wajib diisi.',
            'email.email'       => 'Format email tidak valid.',
            'email.unique'      => 'Email sudah terdaftar.',
            'password.required' => 'Kata sandi wajib diisi.',
            'password.min'      => 'Kata sandi minimal 6 karakter.',
            'role.required'     => 'Peran (Role) wajib dipilih.',
            'role.exists'       => 'Peran tidak valid.',
        ]);

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
            'is_active'=> true,
        ]);

        $user->assignRole($request->role);

        return $this->sukses($user->load('roles'), 'Pengguna berhasil ditambahkan.', 201);
    }

    public function update(Request $request, User $user)
    {
        $request->validate([
            'name'  => 'required|string|max:150',
            'email' => ['required', 'email', Rule::unique('users')->ignore($user->id)],
            'role'  => 'required|exists:roles,name',
        ], [
            'name.required'  => 'Nama wajib diisi.',
            'email.required' => 'Email wajib diisi.',
            'email.email'    => 'Format email tidak valid.',
            'email.unique'   => 'Email sudah terdaftar.',
            'role.required'  => 'Peran (Role) wajib dipilih.',
            'role.exists'    => 'Peran tidak valid.',
        ]);

        $data = [
            'name'  => $request->name,
            'email' => $request->email,
        ];

        if ($request->filled('password')) {
            $request->validate([
                'password' => 'string|min:6',
            ], [
                'password.min' => 'Kata sandi minimal 6 karakter.',
            ]);
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);
        $user->syncRoles([$request->role]);

        return $this->sukses($user->load('roles'), 'Data pengguna berhasil diperbarui.');
    }

    public function toggleAktif(Request $request, User $user)
    {
        if ($user->id === auth()->id()) {
            return $this->gagal('Anda tidak dapat menonaktifkan akun sendiri.', 400);
        }

        $user->update(['is_active' => !$user->is_active]);

        $status = $user->is_active ? 'diaktifkan' : 'dinonaktifkan';
        return $this->sukses($user, "Akun pengguna berhasil {$status}.");
    }

    public function destroy(User $user)
    {
        if ($user->id === auth()->id()) {
            return $this->gagal('Anda tidak dapat menghapus akun sendiri.', 400);
        }

        if ($user->anggota_id) {
            return $this->gagal('Tidak dapat menghapus pengguna yang terikat dengan data anggota.', 400);
        }

        $user->delete();
        return $this->sukses(null, 'Pengguna berhasil dihapus.');
    }
}
