<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'role'       => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'sukses' => false,
                    'pesan'  => 'Sesi habis atau tidak terautentikasi. Silakan login kembali.',
                ], 401);
            }
        });

        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'sukses' => false,
                    'pesan'  => 'Data tidak valid. Periksa kembali isian Anda.',
                    'errors' => $e->errors(),
                ], 422);
            }
        });

        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'sukses' => false,
                    'pesan'  => 'Data atau endpoint tidak ditemukan.',
                ], 404);
            }
        });

        $exceptions->render(function (\Spatie\Permission\Exceptions\UnauthorizedException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'sukses' => false,
                    'pesan'  => 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
                ], 403);
            }
        });

        $exceptions->render(function (HttpException $e, Request $request) {
            if ($request->is('api/*')) {
                $messages = [
                    400 => 'Permintaan tidak valid.',
                    403 => 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
                    404 => 'Data tidak ditemukan.',
                    405 => 'Metode HTTP tidak diizinkan.',
                    429 => 'Terlalu banyak permintaan. Coba beberapa saat lagi.',
                    500 => 'Terjadi kesalahan pada server. Hubungi administrator.',
                ];
                return response()->json([
                    'sukses' => false,
                    'pesan'  => $messages[$e->getStatusCode()] ?? $e->getMessage(),
                ], $e->getStatusCode());
            }
        });

        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($request->is('api/*') && ! app()->environment('production')) {
                return response()->json([
                    'sukses'   => false,
                    'pesan'    => 'Terjadi kesalahan tidak terduga: ' . $e->getMessage(),
                    'file'     => $e->getFile(),
                    'line'     => $e->getLine(),
                ], 500);
            }
            if ($request->is('api/*')) {
                return response()->json([
                    'sukses' => false,
                    'pesan'  => 'Terjadi kesalahan pada server. Hubungi administrator.',
                ], 500);
            }
        });

    })->create();
